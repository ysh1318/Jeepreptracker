/**
 * Edofox sync Worker — Cloudflare Workers replacement for the Firebase
 * Cloud Functions callables `syncEdofox` / `syncEdofoxStored`
 * (see /functions/src/index.ts, kept in the repo for reference only —
 * it is no longer deployed or called by the client).
 *
 * WHY THIS EXISTS: Firebase Cloud Functions requires the paid "Blaze"
 * plan to run at all, even for near-zero usage. Cloudflare Workers has a
 * genuinely free tier (100,000 requests/day) that needs no billing card to
 * activate. This Worker does exactly the same login → scrape → parse →
 * encrypt/decrypt pipeline as the original Cloud Function, just running on
 * Cloudflare instead of Firebase.
 *
 * ARCHITECTURE DIFFERENCE FROM THE OLD VERSION: the old `syncEdofoxStored`
 * read the caller's own Firestore student doc directly (via firebase-admin,
 * which needs a service account). This Worker does NOT talk to Firestore at
 * all — the client already has read/write access to its own student doc via
 * the existing Firestore security rules, so the client reads its own
 * `edofoxUsername` / `edofoxPasswordEnc` fields itself and sends them in the
 * request body. This Worker only ever does the Edofox-side work and hands
 * the result back; the client is responsible for persisting it, exactly the
 * same as it already did with the old callables' return values.
 *
 * AUTH: every request must include `Authorization: Bearer <firebase-id-token>`.
 * This Worker verifies that token against Google's public keys (via `jose`)
 * so only signed-in users of *your* Firebase project can trigger a sync —
 * without this, anyone who found the Worker's URL could run arbitrary
 * Edofox logins through it.
 *
 * NOT YET LIVE-TESTED: the HTML parsing logic below (classroom scrape +
 * test score table parse) is a faithful line-for-line port of the Cloud
 * Functions version, which itself was never verified against a real
 * non-Aryabhata classroom in any prior session. Treat that part with the
 * same caution described in next-claude-prompt.md.
 */

import * as cheerio from "cheerio";
import * as crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

// ---- Fill this in before deploying (see DEPLOY.md) ----
// Your Firebase project ID (same value as `firebase use` / `.firebaserc`).
const FIREBASE_PROJECT_ID = "jeetracker-a6c9b";

// Firebase Auth ID tokens are signed by Google and verifiable against this
// well-known public key set — no secret needed on our side for this part.
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

interface EncryptedBlob {
  iv: string;
  tag: string;
  data: string;
}

function encryptPassword(plain: string, base64Key: string): EncryptedBlob {
  const key = Buffer.from(base64Key, "base64");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("base64"), tag: tag.toString("base64"), data: data.toString("base64") };
}

function decryptPassword(blob: EncryptedBlob, base64Key: string): string {
  const key = Buffer.from(base64Key, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(blob.data, "base64")), decipher.final()]);
  return plain.toString("utf8");
}

/**
 * Verifies the caller's Firebase ID token. Returns the uid on success, or
 * an error message on failure (missing/invalid/expired token, or a token
 * issued for a different Firebase project than this one).
 */
async function verifyFirebaseAuth(request: Request): Promise<{ uid: string } | { error: string }> {
  const authHeader = request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { error: "Missing Authorization: Bearer <idToken> header." };
  }
  const idToken = match[1];

  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    if (!payload.sub) {
      return { error: "Token has no subject (uid)." };
    }
    return { uid: payload.sub };
  } catch (e: any) {
    return { error: "Invalid or expired sign-in token. Please sign in again." };
  }
}

/**
 * performEdofoxSync — the actual Edofox login + scorecard fetch + parse.
 * Ported unchanged (logic-wise) from functions/src/index.ts.
 */
async function performEdofoxSync(username: string, password: string) {
  // 1. Authenticate against Edofox
  const loginRes = await fetch("http://test.edofox.com:8080/edofox/service/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student: { rollNo: username, password } }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login API responded with status ${loginRes.status}`);
  }
  const loginData: any = await loginRes.json();
  if (loginData.status?.statusCode !== 200) {
    throw new Error(loginData.status?.responseText || "Invalid Edofox credentials");
  }

  const token = loginData.student?.token;
  const studentId = loginData.student?.id;
  const instituteId = loginData.student?.currentPackage?.institute?.id;
  if (!instituteId) {
    // Do not default this to a hardcoded institute id — that would silently
    // point the next fetch at the wrong institute's scorecard data for any
    // student whose login response doesn't include it. Fail loudly instead.
    throw new Error("Edofox login response did not include an institute ID — cannot safely fetch scorecard data.");
  }

  // 2. Validate token, grab session cookie
  const validateRes = await fetch(
    `https://test.edofox.com/test_operations/login_validate.php?universal_token=${token}`
  );
  const cookiesHeader = validateRes.headers.get("set-cookie");
  let phpSessionId = "";
  if (cookiesHeader) {
    const match = cookiesHeader.match(/PHPSESSID=([^;]+)/);
    if (match) phpSessionId = match[1];
  }

  // 3. Fetch the performance/scorecard report
  const ajaxUrl = `https://test.edofox.com/test_operations/ajax_fetch_student_performance.php?student_id=${studentId}&institute_id=${instituteId}&performance_report_type=TEST`;
  const ajaxRes = await fetch(ajaxUrl, {
    headers: { Cookie: `PHPSESSID=${phpSessionId}` },
  });
  if (!ajaxRes.ok) {
    throw new Error(`Scorecard fetch failed with status ${ajaxRes.status}`);
  }
  const html = await ajaxRes.text();

  // 4. Best-effort classroom scrape — same three-tier fallback as before:
  //    4a. structured DOM search, 4b. generic "Classroom:"/"Batch:" label,
  //    4c. legacy "XI-ARYABHATA" literal string (last resort only).
  let classroom = "";
  try {
    const indexRes = await fetch("https://test.edofox.com/index.php", {
      headers: { Cookie: `PHPSESSID=${phpSessionId}` },
    });
    if (indexRes.ok) {
      const indexHtml = await indexRes.text();

      const $$ = cheerio.load(indexHtml);
      const domCandidates = $$(
        "[id*='classroom' i], [class*='classroom' i], [id*='batch' i], [class*='batch' i]"
      );
      for (let i = 0; i < domCandidates.length && !classroom; i++) {
        const text = $$(domCandidates[i]).text().trim();
        if (text && text.length < 60) {
          classroom = text;
        }
      }

      if (!classroom) {
        const genericMatch = indexHtml.match(/(?:Classroom|Batch)\s*:?\s*([^<\n\r]+)/i);
        if (genericMatch) classroom = genericMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
      }

      if (!classroom) {
        const idx = indexHtml.indexOf("XI-ARYABHATA");
        if (idx !== -1) {
          const sub = indexHtml.substring(idx, idx + 40);
          const match = sub.match(/^[A-Za-z0-9_-]+/);
          if (match) classroom = match[0];
        }
      }
    }
  } catch (err) {
    console.warn("Failed to scrape classroom from index.php:", err);
  }

  const studentInfo = {
    name: loginData.student?.name,
    rollNo: loginData.student?.rollNo,
    email: loginData.student?.email,
    phone: loginData.student?.phone,
    instituteName: loginData.student?.currentPackage?.institute?.name,
    classroom: classroom || "",
  };

  // 5. Parse the scorecard table
  const $ = cheerio.load(html);
  const tests: Array<{
    id: string;
    name: string;
    date: string;
    physics: number;
    chemistry: number;
    mathematics: number;
    rank: string;
    topperScore: number;
  }> = [];

  $("#testsListTable tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    const idCell = $(cells[0]).text().trim();
    if (!idCell) return;

    let testDate = "";
    for (let i = 1; i < cells.length; i++) {
      const text = $(cells[i]).text().trim();
      if (
        /\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}/.test(text) ||
        /\d{4}-\d{2}-\d{2}/.test(text) ||
        /\d{1,2}-\d{2}-\d{4}/.test(text)
      ) {
        testDate = text;
        break;
      }
    }

    const subjectsCellText = $(cells[9]).text() || "";
    const pMatch = subjectsCellText.match(/Physics\s*:\s*(\d+)/i);
    const cMatch = subjectsCellText.match(/Chemistry\s*:\s*(\d+)/i);
    const mMatch = subjectsCellText.match(/Math\s*:\s*(\d+)/i);

    tests.push({
      id: idCell,
      name: $(cells[1]).text().trim(),
      date: testDate,
      physics: pMatch ? parseFloat(pMatch[1]) : 0,
      chemistry: cMatch ? parseFloat(cMatch[1]) : 0,
      mathematics: mMatch ? parseFloat(mMatch[1]) : 0,
      rank: $(cells[6]).text().trim() || "N/A",
      topperScore: parseFloat($(cells[7]).text().trim()) || 0,
    });
  });

  return { studentInfo, tests };
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export interface Env {
  EDOFOX_ENC_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);

    const authResult = await verifyFirebaseAuth(request);
    if ("error" in authResult) {
      return json({ error: authResult.error }, 401);
    }
    const uid = authResult.uid;

    try {
      if (url.pathname === "/sync-interactive") {
        const body: any = await request.json().catch(() => ({}));
        const username = (body?.username || "").trim();
        const password = (body?.password || "").trim();
        if (!username || !password) {
          return json({ success: false, error: "Missing username or password." }, 400);
        }

        const { studentInfo, tests } = await performEdofoxSync(username, password);
        const credentialsEnc = encryptPassword(password, env.EDOFOX_ENC_KEY);
        return json({ success: true, studentInfo, tests, credentialsEnc });
      }

      if (url.pathname === "/sync-stored") {
        const body: any = await request.json().catch(() => ({}));
        const username = (body?.username || "").trim();
        const credentialsEnc = body?.credentialsEnc;
        if (!username || !credentialsEnc) {
          return json({ success: false, error: "Missing username or credentialsEnc." }, 400);
        }

        const password = decryptPassword(credentialsEnc, env.EDOFOX_ENC_KEY);
        const { studentInfo, tests } = await performEdofoxSync(username, password);
        return json({ success: true, studentInfo, tests });
      }

      return json({ error: "Not found. Use /sync-interactive or /sync-stored." }, 404);
    } catch (e: any) {
      // uid is verified but unused beyond authentication (no per-user
      // rate limiting/logging implemented yet — fine at this scale, worth
      // revisiting if abuse ever becomes a concern).
      void uid;
      return json({ success: false, error: e.message || "Unknown Edofox sync error" }, 500);
    }
  },
};
