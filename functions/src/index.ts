import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as cheerio from "cheerio";
import * as crypto from "node:crypto";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

// Same named Firestore database the client connects to (see
// firebase-applet-config.json's firestoreDatabaseId / firebase.json).
const FIRESTORE_DATABASE_ID = "ai-studio-jeepreptracker-92e6fc67-7e4a-4dd5-b4a2-fc1903e5ccaa";

// 32-byte (256-bit) key, base64-encoded, set once via:
//   firebase functions:secrets:set EDOFOX_ENC_KEY
// e.g. generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// This key never leaves the Functions runtime — the client only ever sees
// ciphertext, and only these two callables (which both declare it in
// `secrets: [...]`) can decrypt it.
const EDOFOX_ENC_KEY = defineSecret("EDOFOX_ENC_KEY");

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
 * performEdofoxSync — the actual Edofox login + scorecard fetch + parse.
 * Shared by both callables below so there's exactly one implementation of
 * the login/scrape/parse pipeline, regardless of whether the plaintext
 * password came straight from the client (first-time verification) or was
 * decrypted server-side from a stored credential (routine re-sync).
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
    // Defaulting this to a hardcoded institute id (e.g. "1544", this school's
    // own id) would silently point the next fetch at the wrong institute's
    // scorecard data for any student whose login response doesn't include it
    // — indistinguishable from a real result, just wrong. Fail loudly instead.
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

  // 4. Best-effort classroom scrape.
  //
  // Tried in order, each only running if the previous one came up empty.
  // The old version led with a literal "XI-ARYABHATA" string search — that's
  // this one school's one classroom name, not a generic strategy, so it was
  // silently wrong (or just empty) for every other classroom/institute. It's
  // now the last-resort fallback instead of the first thing tried.
  let classroom = "";
  try {
    const indexRes = await fetch("https://test.edofox.com/index.php", {
      headers: { Cookie: `PHPSESSID=${phpSessionId}` },
    });
    if (indexRes.ok) {
      const indexHtml = await indexRes.text();

      // 4a. Structured DOM search: look for a labelled element (id/class
      // containing "classroom" or "batch") rather than assuming a fixed
      // text layout. This is the most likely to generalize across
      // different institutes' Edofox skins.
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

      // 4b. Generic "Classroom: <value>" / "Batch: <value>" label pattern
      // in the raw markup, independent of any specific classroom name.
      if (!classroom) {
        const genericMatch = indexHtml.match(/(?:Classroom|Batch)\s*:?\s*([^<\n\r]+)/i);
        if (genericMatch) classroom = genericMatch[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
      }

      // 4c. Legacy fallback: this exact string only matches Sant Tukaram's
      // "XI-ARYABHATA" classroom and is kept solely for backward
      // compatibility with that one institute in case 4a/4b regress.
      // Do not add more hardcoded classroom names here — extend 4a/4b
      // instead, since those actually generalize.
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
    // Deliberately no hardcoded fallback here: if scraping the classroom
    // fails, this comes back empty and the client's class-match check
    // (App.tsx handleVerifyAndOnboard) correctly rejects onboarding
    // instead of accidentally matching some other class by coincidence.
    classroom: classroom || "",
  };

  // 5. Parse the scorecard table server-side (was previously shipped as
  // raw HTML to the browser and parsed there with DOMParser)
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

/**
 * syncEdofox — used only for interactive credential verification (onboarding,
 * and re-verifying after a password change). The client necessarily holds
 * the plaintext password at that moment because the person just typed it in;
 * it goes over an already-TLS-encrypted callable request the same as any
 * login form would. What this function additionally does now is return an
 * `credentialsEnc` blob (AES-256-GCM ciphertext) alongside the result, so the
 * client stores *that* in Firestore instead of the raw password — closing
 * the plaintext-at-rest gap. Firestore security rules already restricted who
 * could *read* the field; this makes the stored value unreadable/unusable
 * even to someone who does get read access, since only these Cloud Functions
 * hold the decryption key (via Secret Manager).
 */
export const syncEdofox = onCall(
  { region: "asia-south1", timeoutSeconds: 30, secrets: [EDOFOX_ENC_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to sync Edofox data.");
    }

    const username = (request.data?.username || "").trim();
    const password = (request.data?.password || "").trim();
    if (!username || !password) {
      throw new HttpsError("invalid-argument", "Missing username or password.");
    }

    try {
      const { studentInfo, tests } = await performEdofoxSync(username, password);
      const credentialsEnc = encryptPassword(password, EDOFOX_ENC_KEY.value());
      return { success: true, studentInfo, tests, credentialsEnc };
    } catch (e: any) {
      throw new HttpsError("internal", e.message || "Unknown Edofox sync error");
    }
  }
);

/**
 * syncEdofoxStored — routine re-sync (background credential check, mock-test
 * auto-sync). The client passes only `classId`; the plaintext password is
 * never sent from or held by the client for this path at all. This function
 * reads the caller's own student doc (classes/{classId}/students/{uid} —
 * request.auth.uid, so a student can only ever trigger a sync for their own
 * stored credentials), decrypts edofoxPasswordEnc server-side, and runs the
 * same sync pipeline.
 */
export const syncEdofoxStored = onCall(
  { region: "asia-south1", timeoutSeconds: 30, secrets: [EDOFOX_ENC_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to sync Edofox data.");
    }

    const classId = (request.data?.classId || "").trim();
    if (!classId) {
      throw new HttpsError("invalid-argument", "Missing classId.");
    }

    const uid = request.auth.uid;
    // Must match the named Firestore database this project actually uses
    // (see firebase-applet-config.json / firebase.json — this isn't the
    // "(default)" database, so getFirestore() with no args would silently
    // point at the wrong, empty database).
    const db = getFirestore(FIRESTORE_DATABASE_ID);
    const studentSnap = await db.doc(`classes/${classId}/students/${uid}`).get();
    if (!studentSnap.exists) {
      throw new HttpsError("not-found", "No student profile found for this class.");
    }

    const data = studentSnap.data() || {};
    const username = data.edofoxUsername;
    const passwordEnc = data.edofoxPasswordEnc;
    if (!username || !passwordEnc) {
      throw new HttpsError("failed-precondition", "Edofox account is not linked yet.");
    }

    try {
      const password = decryptPassword(passwordEnc, EDOFOX_ENC_KEY.value());
      const { studentInfo, tests } = await performEdofoxSync(username, password);
      return { success: true, studentInfo, tests };
    } catch (e: any) {
      throw new HttpsError("internal", e.message || "Unknown Edofox sync error");
    }
  }
);
