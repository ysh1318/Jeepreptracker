const FIREBASE_PROJECT_ID = "jeetracker-a6c9b";
const EDOFOX_ORIGIN = "https://test.edofox.com";
const EDOFOX_API_ORIGIN = "https://test.edofox.com:8443/edofox";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
function base64UrlDecodeToString(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}
function base64UrlToBytes(str) {
  const binary = base64UrlDecodeToString(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function verifyFirebaseIdToken(idToken) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(base64UrlDecodeToString(headerB64));
  const payload = JSON.parse(base64UrlDecodeToString(payloadB64));
  if (header.alg !== "RS256") throw new Error("Unexpected signing algorithm");
  if (payload.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID) {
    throw new Error("Token issued for a different project");
  }
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error("Token audience mismatch");
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) throw new Error("Token expired");
  if (!payload.sub) throw new Error("Token missing subject (uid)");
  const jwkRes = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  );
  if (!jwkRes.ok) throw new Error("Could not fetch Google's signing keys");
  const jwkSet = await jwkRes.json();
  const jwk = (jwkSet.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Signing key not found");
  const cryptoKey = await crypto.subtle.importKey(
    "jwk", jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["verify"]
  );
  const signedData = new TextEncoder().encode(headerB64 + "." + payloadB64);
  const signature = base64UrlToBytes(sigB64);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, signedData);
  if (!valid) throw new Error("Invalid token signature");
  return payload.sub;
}
async function importAesKey(base64Key) {
  const raw = base64ToBytes(base64Key);
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptPassword(plain, base64Key) {
  const key = await importAesKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plain);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const cipherBytes = new Uint8Array(cipherBuf);
  const tag = cipherBytes.slice(cipherBytes.length - 16);
  const data = cipherBytes.slice(0, cipherBytes.length - 16);
  return { iv: bytesToBase64(iv), tag: bytesToBase64(tag), data: bytesToBase64(data) };
}
async function decryptPassword(blob, base64Key) {
  const key = await importAesKey(base64Key);
  const iv = base64ToBytes(blob.iv);
  const data = base64ToBytes(blob.data);
  const tag = base64ToBytes(blob.tag);
  const combined = new Uint8Array(data.length + tag.length);
  combined.set(data, 0);
  combined.set(tag, data.length);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return new TextDecoder().decode(plainBuf);
}
function extractCookie(res, cookieName) {
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers.get("set-cookie") || "").split(/,(?=[^;]+?=)/).filter(Boolean);
  for (const c of setCookies) {
    const m = c.match(new RegExp(cookieName + "=([^;]+)"));
    if (m) return m[1];
  }
  return "";
}
async function loginToEdofox(username, password) {
  const loginRes = await fetch(EDOFOX_API_ORIGIN + "/service/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student: { rollNo: username, password } }),
  });
  if (!loginRes.ok) {
    throw new Error("Edofox login API responded with status " + loginRes.status);
  }
  const loginData = await loginRes.json();
  if (loginData.status?.statusCode !== 200) {
    throw new Error(loginData.status?.responseText || "Invalid Edofox username or password.");
  }
  const token = loginData.student?.token;
  if (!token) throw new Error("Edofox login response did not include a session token.");
  const studentId = loginData.student?.id;
  const instituteId = loginData.student?.currentPackage?.institute?.id;
  const validateRes = await fetch(
    "https://test.edofox.com/test_operations/login_validate.php?universal_token=" + token
  );
  const phpSessionId = extractCookie(validateRes, "PHPSESSID");
  if (!phpSessionId) {
    throw new Error("Could not establish an Edofox web session after login.");
  }
  return { token, phpSessionId, studentId, instituteId };
}
async function fetchAuthed(path, phpSessionId) {
  const res = await fetch(EDOFOX_ORIGIN + path, {
    headers: { Cookie: "PHPSESSID=" + phpSessionId },
    redirect: "manual",
  });
  const location = res.headers.get("location") || "";
  if (res.status >= 300 && res.status < 400 && /login\.php/i.test(location)) {
    throw new Error("Edofox session expired mid-sync. Please try again.");
  }
  if (!res.ok && res.status < 300) {
    throw new Error("Failed to fetch " + path + " (status " + res.status + ")");
  }
  return res.text();
}
function extractInputByMarker(html, marker) {
  const tagRegex = /<input\b[^>]*>/g;
  let m;
  while ((m = tagRegex.exec(html)) !== null) {
    if (m[0].includes(marker)) {
      const val = m[0].match(/\bvalue="([^"]*)"/);
      return val ? val[1] : "";
    }
  }
  return "";
}
function extractValueAfterLabel(html, labelText) {
  const idx = html.indexOf(labelText);
  if (idx === -1) return "";
  const windowHtml = html.slice(idx, idx + 500);
  const inputMatch = windowHtml.match(/<input\b[^>]*>/);
  if (!inputMatch) return "";
  const val = inputMatch[0].match(/\bvalue="([^"]*)"/);
  return val ? val[1] : "";
}
function extractSelectedOptionText(html, selectMarker) {
  const startIdx = html.indexOf(selectMarker);
  if (startIdx === -1) return "";
  const endIdx = html.indexOf("</select>", startIdx);
  if (endIdx === -1) return "";
  const selectHtml = html.slice(startIdx, endIdx);
  const m = selectHtml.match(/<option[^>]*\bselected\b[^>]*>([^<]*)<\/option>/);
  return m ? m[1].trim() : "";
}
function extractInstituteName(html) {
  const m = html.match(/<a class="navbar-brand"[^>]*>([^<]*)<\/a>/);
  return m ? m[1].trim() : "";
}
function parseProfilePage(html) {
  return {
    username: extractInputByMarker(html, 'title="Student Login Username"'),
    rollNo: extractValueAfterLabel(html, "Institute Roll No"),
    name: extractInputByMarker(html, 'id="stu_name"'),
    email: extractInputByMarker(html, 'id="stu_email"'),
    mobile: extractInputByMarker(html, 'id="stu_mobile"'),
    parentMobile: extractInputByMarker(html, 'id="stu_parent_mobile_no"'),
    gender: extractSelectedOptionText(html, 'id="stu_gender"'),
    dateOfBirth: extractInputByMarker(html, 'id="stu_date_of_birth"'),
    category: extractSelectedOptionText(html, 'id="stu_category"'),
    instituteName: extractInstituteName(html),
  };
}
const EXAM_REQUEST_TYPES = ["Active", "Upcoming", "Past"];
const IST_OFFSET_MINUTES = 5 * 60 + 30;
function formatIstDateTime(epochMs) {
  if (!epochMs) return "";
  const d = new Date(epochMs + IST_OFFSET_MINUTES * 60 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return day + " " + month + " " + year + ", " + String(hours).padStart(2, "0") + ":" + minutes + " " + ampm;
}
function formatDurationSeconds(totalSeconds) {
  if (!totalSeconds && totalSeconds !== 0) return "";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.round((totalSeconds % 3600) / 60);
  return String(hrs).padStart(2, "0") + " hr:" + String(mins).padStart(2, "0") + " min";
}
async function fetchStudentExams(token, studentId, instituteId, requestType) {
  const res = await fetch(EDOFOX_API_ORIGIN + "/service/getStudentExams", {
    method: "POST",
    headers: { "Content-Type": "application/json", AuthToken: token },
    body: JSON.stringify({
      student: { id: studentId },
      institute: { id: instituteId },
      requestType,
    }),
  });
  if (!res.ok) {
    throw new Error("getStudentExams (" + requestType + ") responded with status " + res.status);
  }
  const data = await res.json();
  if (data.status?.statusCode !== 200) {
    throw new Error(data.status?.responseText || "getStudentExams (" + requestType + ") failed");
  }
  return data.exams || [];
}
async function fetchSchedule(token, studentId, instituteId) {
  const examLists = await Promise.all(
    EXAM_REQUEST_TYPES.map((requestType) =>
      fetchStudentExams(token, studentId, instituteId, requestType).then((exams) =>
        exams.map((e) => ({ ...e, requestType }))
      )
    )
  );
  return examLists.flat().map((e) => ({
    name: e.name || "",
    classroom: e.packageName || "",
    testStartsAt: formatIstDateTime(e.startDate),
    loginDeadline: formatIstDateTime(e.endDate),
    duration: formatDurationSeconds(e.duration),
    status: e.studentStatus || e.status || "",
    category: e.requestType,
  }));
}
const HEADER_KEY_MAP = {
  "#": "rowNumber",
  "Test Name": "name",
  "Test Date": "date",
  "Appeared on": "appearedOn",
  "Marks": "marksRaw",
  "Rank": "rankRaw",
  "Topper Score": "topperScoreRaw",
  "Percentile": "percentileRaw",
  "Details": "subjectsRaw",
  "Submission mode": "submissionMode",
};
async function parseTestsListTable(html) {
  const headers = [];
  const rows = [];
  let currentRow = null;
  let currentCell = "";
  const rewriter = new HTMLRewriter()
    .on("table#testsListTable thead th", {
      element(el) {
        currentCell = "";
        el.onEndTag(() => { headers.push(currentCell.trim()); });
      },
      text(text) { currentCell += text.text; },
    })
    .on("table#testsListTable tbody tr", {
      element(el) {
        currentRow = [];
        el.onEndTag(() => { if (currentRow) rows.push(currentRow); currentRow = null; });
      },
    })
    .on("table#testsListTable tbody tr td, table#testsListTable tbody tr th", {
      element(el) {
        currentCell = "";
        el.onEndTag(() => { if (currentRow) currentRow.push(currentCell.trim()); });
      },
      text(text) { currentCell += text.text; },
    });
  const transformed = rewriter.transform(new Response(html));
  await transformed.arrayBuffer();
  return rows.map((cells) => {
    const raw = {};
    headers.forEach((h, i) => {
      const key = HEADER_KEY_MAP[h] || h;
      raw[key] = cells[i] !== undefined ? cells[i] : "";
    });
    const [marksObtained, marksTotal] = (raw.marksRaw || "").split("/").map((s) => parseFloat(s));
    const [rank, rankOutOf] = (raw.rankRaw || "").split("/").map((s) => parseFloat(s));
    const subjectsText = raw.subjectsRaw || "";
    const pMatch = subjectsText.match(/Physics\s*:?\s*(\d+)/i);
    const cMatch = subjectsText.match(/Chemistry\s*:?\s*(\d+)/i);
    const mMatch = subjectsText.match(/Math\s*:?\s*(\d+)/i);
    return {
      name: raw.name || "",
      date: raw.date || "",
      appearedOn: raw.appearedOn || "",
      marksObtained: Number.isFinite(marksObtained) ? marksObtained : 0,
      marksTotal: Number.isFinite(marksTotal) ? marksTotal : 0,
      rank: Number.isFinite(rank) ? rank : null,
      rankOutOf: Number.isFinite(rankOutOf) ? rankOutOf : null,
      topperScore: parseFloat(raw.topperScoreRaw) || 0,
      physics: pMatch ? parseFloat(pMatch[1]) : 0,
      chemistry: cMatch ? parseFloat(cMatch[1]) : 0,
      mathematics: mMatch ? parseFloat(mMatch[1]) : 0,
      submissionMode: raw.submissionMode || "",
    };
  });
}
async function performEdofoxSync(username, password) {
  const { token, phpSessionId, studentId, instituteId } = await loginToEdofox(username, password);
  if (!instituteId) {
    throw new Error("Edofox login response did not include an institute ID.");
  }
  const [profileHtml, ajaxPerformanceHtml, schedule] = await Promise.all([
    fetchAuthed("/profile.php", phpSessionId),
    fetchAuthed(
      "/test_operations/ajax_fetch_student_performance.php?student_id=" + studentId + "&institute_id=" + instituteId + "&performance_report_type=TEST",
      phpSessionId
    ),
    fetchSchedule(token, studentId, instituteId),
  ]);
  const profile = parseProfilePage(profileHtml);
  const tests = await parseTestsListTable(ajaxPerformanceHtml);
  const studentInfo = {
    ...profile,
    classroom: (schedule.find((t) => t.classroom) || {}).classroom || "",
  };
  return { studentInfo, tests, schedule };
}
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }
    const url = new URL(request.url);
    const authHeader = request.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return json({ error: "Missing Authorization: Bearer <idToken> header." }, 401);
    }
    let uid;
    try {
      uid = await verifyFirebaseIdToken(match[1]);
    } catch (e) {
      return json({ error: "Invalid or expired sign-in token. Please sign in again." }, 401);
    }
    void uid;
    try {
      if (url.pathname === "/sync-interactive") {
        const body = await request.json().catch(() => ({}));
        const username = (body?.username || "").trim();
        const password = (body?.password || "").trim();
        if (!username || !password) {
          return json({ success: false, error: "Missing username or password." }, 400);
        }
        const { studentInfo, tests, schedule } = await performEdofoxSync(username, password);
        const credentialsEnc = await encryptPassword(password, env.EDOFOX_ENC_KEY);
        return json({ success: true, studentInfo, tests, schedule, credentialsEnc });
      }
      if (url.pathname === "/sync-stored") {
        const body = await request.json().catch(() => ({}));
        const username = (body?.username || "").trim();
        const credentialsEnc = body?.credentialsEnc;
        if (!username || !credentialsEnc) {
          return json({ success: false, error: "Missing username or credentialsEnc." }, 400);
        }
        const password = await decryptPassword(credentialsEnc, env.EDOFOX_ENC_KEY);
        const { studentInfo, tests, schedule } = await performEdofoxSync(username, password);
        return json({ success: true, studentInfo, tests, schedule });
      }
      return json({ error: "Not found. Use /sync-interactive or /sync-stored." }, 404);
    } catch (e) {
      return json(
        { success: false, error: e.message || "Unknown Edofox sync error", debug: e.debug || null },
        500
      );
    }
  },
};
