import { initialAssessments } from "./seedData";
import { AssessmentItem, AssessmentStatus } from "./types";

// Ensure we have correct initial structures
const sanitizeCategory = (cat: string): string => {
  if (!cat) return "";
  let trimmed = cat.trim();
  if (trimmed.includes("สถานยที่")) {
    return trimmed.replace("สถานยที่", "สถานที่");
  }
  return trimmed;
};

const initialAssessmentsSanitized = initialAssessments.map(item => ({
  ...item,
  Main_Category: sanitizeCategory(item.Main_Category),
}));

// LocalStorage Keys
const KEYS = {
  HOSPITALS: "moph_hospitals",
  AUDITORS: "moph_auditors",
  ADMINS: "moph_admins",
  SHEETS_PREFIX: "moph_sheets_",
};

// Seeding standard data if empty
export function initClientDatabase() {
  if (!localStorage.getItem(KEYS.HOSPITALS)) {
    const initialHospitals = [
      {
        code: "maetha",
        originalCode: "maetha",
        name: "โรงพยาบาลแม่ทา",
        password: "12345",
        upline: "auditor",
        createdAt: "2026-06-08T02:12:52.825Z"
      }
    ];
    localStorage.setItem(KEYS.HOSPITALS, JSON.stringify(initialHospitals));
  }

  if (!localStorage.getItem(KEYS.AUDITORS)) {
    const initialAuditors = [
      {
        username: "auditor",
        name: "ผู้ตรวจประเมินระดับเขต (บัญชีหลัก)",
        password: "auditor",
        createdAt: "2026-06-08T02:03:15.892Z"
      }
    ];
    localStorage.setItem(KEYS.AUDITORS, JSON.stringify(initialAuditors));
  }

  if (!localStorage.getItem(KEYS.ADMINS)) {
    const initialAdmins = [
      {
        username: "xraymaetha",
        name: "แอดมินกลาง (บัญชีหลัก/Master)",
        password: "xraymaetha",
        role: "master",
        createdAt: "2026-06-08T02:03:15.893Z"
      },
      {
        username: "maethaadmin",
        name: "maethaadmin",
        password: "maethaadmin1234",
        role: "admin",
        createdAt: "2026-06-08T02:10:44.353Z"
      }
    ];
    localStorage.setItem(KEYS.ADMINS, JSON.stringify(initialAdmins));
  }

  // Pre-seed Maetha assessments if there are none
  const maethaKey = `${KEYS.SHEETS_PREFIX}maetha`;
  if (!localStorage.getItem(maethaKey)) {
    const seedMaethaAssessments = initialAssessmentsSanitized.map(item => {
      if (item.Item_ID === "1.1.1") {
        return {
          ...item,
          Status: "🟢 พร้อมรับตรวจ" as AssessmentStatus,
          Evidence_Link: ["https://drive.google.com/file/d/12pMlANTZ4xml6adlffpMmIfOJH0X6eXq/view?usp=sharing"],
          Last_Update: "19/5/2026"
        };
      }
      if (item.Item_ID === "1.1.2") {
        return {
          ...item,
          Status: "🟢 พร้อมรับตรวจ" as AssessmentStatus,
          Evidence_Link: ["https://docs.google.com/document/d/1Af3vaNd0HA3NTeRKNnGliewEkDXA8fz5oKcKQZCKiR8/edit?usp=drive_link"],
          Last_Update: "19/5/2026"
        };
      }
      return item;
    });
    localStorage.setItem(maethaKey, JSON.stringify({ "ปี 2569": seedMaethaAssessments }));
  }

  // Pre-seed default assessments if there are none
  const defaultKey = `${KEYS.SHEETS_PREFIX}default`;
  if (!localStorage.getItem(defaultKey)) {
    localStorage.setItem(defaultKey, JSON.stringify({ "ปี 2569": initialAssessmentsSanitized }));
  }
}

// Internal Reading Helpers
function getHospitals(): any[] {
  return JSON.parse(localStorage.getItem(KEYS.HOSPITALS) || "[]");
}
function saveHospitals(hospitals: any[]) {
  localStorage.setItem(KEYS.HOSPITALS, JSON.stringify(hospitals));
}
function getAuditors(): any[] {
  return JSON.parse(localStorage.getItem(KEYS.AUDITORS) || "[]");
}
function saveAuditors(auditors: any[]) {
  localStorage.setItem(KEYS.AUDITORS, JSON.stringify(auditors));
}
function getAdmins(): any[] {
  return JSON.parse(localStorage.getItem(KEYS.ADMINS) || "[]");
}
function saveAdmins(admins: any[]) {
  localStorage.setItem(KEYS.ADMINS, JSON.stringify(admins));
}

function mergeWithLatestSOP(loadedItems: AssessmentItem[]): AssessmentItem[] {
  if (!Array.isArray(loadedItems)) {
    return initialAssessmentsSanitized;
  }
  return initialAssessmentsSanitized.map((latestItem) => {
    const counterpart = loadedItems.find((li) => li.Item_ID === latestItem.Item_ID);
    if (!counterpart) {
      return { ...latestItem };
    }
    return {
      ...latestItem,
      Status: counterpart.Status || latestItem.Status,
      Responsible_Person: counterpart.Responsible_Person !== undefined ? counterpart.Responsible_Person : latestItem.Responsible_Person,
      Evidence_Link: Array.isArray(counterpart.Evidence_Link) ? counterpart.Evidence_Link : latestItem.Evidence_Link,
      Auditor_Comment: counterpart.Auditor_Comment !== undefined ? counterpart.Auditor_Comment : latestItem.Auditor_Comment,
      Last_Update: counterpart.Last_Update || latestItem.Last_Update
    };
  });
}

function readAllSheets(hospitalCode: string): Record<string, AssessmentItem[]> {
  const cleanCode = hospitalCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "default";
  const key = `${KEYS.SHEETS_PREFIX}${cleanCode}`;
  let sheets: Record<string, AssessmentItem[]> = {};
  let isNew = false;

  const raw = localStorage.getItem(key);
  if (!raw) {
    sheets = { "ปี 2569": initialAssessmentsSanitized };
    isNew = true;
  } else {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      sheets = { "ปี 2569": parsed };
    } else {
      sheets = parsed;
    }
  }

  let changed = false;
  for (const sheetName of Object.keys(sheets)) {
    const currentItems = sheets[sheetName] || [];
    const merged = mergeWithLatestSOP(currentItems);
    if (currentItems.length !== merged.length || isNew) {
      sheets[sheetName] = merged;
      changed = true;
    } else {
      let hasMismatches = false;
      for (let i = 0; i < merged.length; i++) {
        if (
          currentItems[i].Criteria_Detail !== merged[i].Criteria_Detail ||
          currentItems[i].Main_Category !== merged[i].Main_Category ||
          currentItems[i].Sub_Category !== merged[i].Sub_Category
        ) {
          hasMismatches = true;
          break;
        }
      }
      if (hasMismatches) {
        sheets[sheetName] = merged;
        changed = true;
      }
    }
  }

  if (changed || isNew) {
    writeAllSheets(sheets, cleanCode);
  }

  return sheets;
}

function writeAllSheets(sheets: Record<string, AssessmentItem[]>, hospitalCode: string) {
  const cleanCode = hospitalCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "default";
  const key = `${KEYS.SHEETS_PREFIX}${cleanCode}`;
  localStorage.setItem(key, JSON.stringify(sheets));
}

function readAssessments(sheetName: string, hospitalCode: string): AssessmentItem[] {
  const sheets = readAllSheets(hospitalCode);
  return sheets[sheetName] || sheets[Object.keys(sheets)[0]] || initialAssessmentsSanitized;
}

function writeAssessments(items: AssessmentItem[], sheetName: string, hospitalCode: string) {
  const sheets = readAllSheets(hospitalCode);
  sheets[sheetName] = items;
  writeAllSheets(sheets, hospitalCode);
}

// Helpers for Administrative validations
function checkAdminAccess(body: any): any | null {
  const { username, password } = body;
  if (!username || !password) {
    return null;
  }
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const admins = getAdmins();
  return admins.find(a => a.username === cleanUsername && a.password === password.trim()) || null;
}

// Eager database initialization
initClientDatabase();

export async function clientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.toString() : input.url);
    const method = (init?.method || "GET").toUpperCase();

    // Check if the URL is an API endpoint
    if (!urlStr.includes("/api/")) {
      return window.fetch(input, init);
    }

    // Helper to extract JSON body
    let body: any = {};
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch (e) {
        // Not JSON or failed parsing
      }
    }

    // Helper to get custom headers
    const customHeaders = init?.headers as Record<string, string> || {};
    const hospitalCodeFromHeader = customHeaders["x-hospital-code"] || "default";

    // API parsing pathways
    const urlObj = new URL(urlStr, window.location.origin);
    const pathname = urlObj.pathname;

    // Helper functions for mock responses
    const jsonResponse = (data: any, status = 200) => {
      const resp = new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      });
      return Promise.resolve(resp);
    };

    const errorResponse = (message: string, status = 400) => {
      return jsonResponse({ error: message }, status);
    };

    try {
      // 1. HOSPITAL REGISTRATION (POST)
      if (pathname === "/api/hospitals/register" && method === "POST") {
        const { code, name, password, upline } = body;
        if (!code || !name || !password) {
          return errorResponse("กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง (รหัสโรงพยาบาล, ชื่อโรงพยาบาล, รหัสผ่าน)");
        }
        const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (!cleanCode) {
          return errorResponse("รหัสโรงพยาบาลจะต้องประกอบด้วยภาษาอังกฤษหรือตัวเลขอย่างน้อย 1 ตัวอักษรเท่านั้น");
        }
        const hospitals = getHospitals();
        if (hospitals.some(h => h.code === cleanCode)) {
          return errorResponse(`ขออภัย รหัสโรงพยาบาล "${code}" นี้ถูกใช้งานไปแล้ว ลองใช้รหัสอื่นหรือกดปุ่มสุ่มรหัสแนะนำ`);
        }
        const cleanUpline = upline && typeof upline === "string" ? upline.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : "auditor";

        const newHospital = {
          code: cleanCode,
          originalCode: code.trim(),
          name: name.trim(),
          password: password.trim(),
          upline: cleanUpline || "auditor",
          createdAt: new Date().toISOString()
        };

        hospitals.push(newHospital);
        saveHospitals(hospitals);

        // Bootstrap sheets
        writeAllSheets({ "ปี 2569": initialAssessmentsSanitized }, cleanCode);

        return jsonResponse({ success: true, hospital: { code: cleanCode, name: newHospital.name, upline: newHospital.upline } });
      }

      // 2. HOSPITAL LOGIN (POST)
      if (pathname === "/api/hospitals/login" && method === "POST") {
        const { code, password } = body;
        if (!code || !password) {
          return errorResponse("กรุณากรอกรหัสโรงพยาบาลและรหัสผ่าน");
        }
        const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const hospitals = getHospitals();
        const hospital = hospitals.find(h => h.code === cleanCode && h.password === password.trim());

        if (hospital) {
          // Double-check initialization
          const key = `${KEYS.SHEETS_PREFIX}${cleanCode}`;
          if (!localStorage.getItem(key)) {
            writeAllSheets({ "ปี 2569": initialAssessmentsSanitized }, cleanCode);
          }
          return jsonResponse({ success: true, hospital: { code: cleanCode, name: hospital.name, upline: hospital.upline || "auditor" } });
        } else {
          return errorResponse("รหัสโรงพยาบาลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง", 401);
        }
      }

      // 3. CODE SUGGESTION (GET)
      if (pathname === "/api/hospitals/suggest-code" && method === "GET") {
        const hospitals = getHospitals();
        let suggestedCode = "";
        let isDuplicate = true;
        let attempts = 0;
        while (isDuplicate && attempts < 100) {
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          suggestedCode = `moph-${randomNum}`;
          isDuplicate = hospitals.some(h => h.code === suggestedCode);
          attempts++;
        }
        return jsonResponse({ code: suggestedCode });
      }

      // 4. ADMIN LOGIN (POST)
      if (pathname === "/api/admin/login" && method === "POST") {
        const { username, password } = body;
        if (!username || !password) {
          return errorResponse("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
        }
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const admins = getAdmins();
        const admin = admins.find(a => a.username === cleanUsername && a.password === password.trim());
        if (admin) {
          return jsonResponse({ success: true, username: admin.username, name: admin.name, role: admin.role || "admin" });
        } else {
          return errorResponse("ชื่อบัญชีแอดมินหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง", 401);
        }
      }

      // 5. BACKUP EXPORT & IMPORT (POST)
      if (pathname === "/api/admin/backup/export" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

        const backupData: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith(KEYS.SHEETS_PREFIX) || key === KEYS.HOSPITALS || key === KEYS.AUDITORS || key === KEYS.ADMINS)) {
            try {
              backupData[key] = JSON.parse(localStorage.getItem(key) || "");
            } catch (e) {}
          }
        }
        return jsonResponse({ success: true, backup: backupData });
      }

      if (pathname === "/api/admin/backup/import" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

        const { backup } = body;
        if (!backup || typeof backup !== "object") {
          return errorResponse("รูปแบบไฟล์ข้อมูลสำรองไม่ถูกต้องหรือไม่พบข้อมูล");
        }

        // Apply backup states
        Object.keys(backup).forEach(key => {
          localStorage.setItem(key, JSON.stringify(backup[key]));
        });

        // Resolve updated lists
        const hospitals = getHospitals();
        const adminsList = getAdmins();
        const auditors = getAuditors();

        return jsonResponse({
          success: true,
          message: "กู้คืนระบบและรายการฐานข้อมูลทั้งหมดสำเร็จเรียบร้อยแล้ว!",
          hospitals,
          admins: adminsList,
          auditors
        });
      }

      // 6. AUDITOR LOGIN (POST)
      if (pathname === "/api/auditor/login" && method === "POST") {
        const { username, password } = body;
        if (!username || !password) {
          return errorResponse("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
        }
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const auditors = getAuditors();
        const auditor = auditors.find(a => a.username === cleanUsername && a.password === password.trim());
        if (auditor) {
          return jsonResponse({ success: true, username: cleanUsername, name: auditor.name });
        } else {
          return errorResponse("ชื่อบัญชีผู้ตรวจประเมินหรือรหัสผ่านไม่ถูกต้อง", 401);
        }
      }

      // 7. AUDITOR QUERY PRE-ASSIGNED HOSPITALS (POST)
      if (pathname === "/api/auditor/hospitals" && method === "POST") {
        const { username, password } = body;
        if (!username || !password) {
          return errorResponse("สิทธิ์ล้มเหลว", 403);
        }
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const auditors = getAuditors();
        const auditor = auditors.find(a => a.username === cleanUsername && a.password === password.trim());
        if (!auditor) {
          return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ตรวจประเมิน", 403);
        }

        const hospitals = getHospitals()
          .filter(h => {
            const hUpline = (h.upline || "auditor").trim().toLowerCase();
            if (cleanUsername === "auditor") {
              return hUpline === "auditor" || !h.upline;
            }
            return hUpline === cleanUsername;
          })
          .map(h => ({
            code: h.code,
            name: h.name,
            upline: h.upline || "auditor",
            createdAt: h.createdAt
          }));
        return jsonResponse({ success: true, hospitals });
      }

      // 8. ADMIN QUERY ALL HOSPITALS (POST)
      if (pathname === "/api/admin/hospitals" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        const hospitals = getHospitals();
        return jsonResponse({ success: true, hospitals });
      }

      // 9. ADMIN QUERY ALL AUDITORS (POST)
      if (pathname === "/api/admin/auditors" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        const auditors = getAuditors();
        return jsonResponse({ success: true, auditors });
      }

      // 10. ADMIN CREATE AUDITOR (POST)
      if (pathname === "/api/admin/auditors/create" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        const { editUsername, editName, editPassword } = body;
        if (!editUsername || !editName || !editPassword) {
          return errorResponse("กรุณากรอกข้อมูลผู้แนะนำ/ผู้ตรวจให้ครบถ้วน");
        }
        const cleanUser = editUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (!cleanUser) {
          return errorResponse("ชื่อบัญชีไม่ถูกต้อง");
        }
        const auditors = getAuditors();
        if (auditors.some(a => a.username === cleanUser)) {
          return errorResponse(`ชื่อบัญชีผู้แนะนำ "${cleanUser}" ซ้ำในระบบ`);
        }
        const newAuditor = {
          username: cleanUser,
          name: editName.trim(),
          password: editPassword.trim(),
          createdAt: new Date().toISOString()
        };
        auditors.push(newAuditor);
        saveAuditors(auditors);
        return jsonResponse({ success: true, auditors });
      }

      // 11. ADMIN DELETE AUDITOR (POST)
      if (pathname === "/api/admin/auditors/delete" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        const { targetUsername } = body;
        const cleanTarget = targetUsername.trim().toLowerCase();
        if (cleanTarget === "auditor") {
          return errorResponse("ไม่สามารถลบผู้แนะนำหลัก (auditor) ของระบบได้");
        }
        const auditors = getAuditors();
        const idx = auditors.findIndex(a => a.username === cleanTarget);
        if (idx === -1) {
          return errorResponse("ไม่พบข้อมูลผู้แนะนำที่ต้องการลบ", 404);
        }
        auditors.splice(idx, 1);
        saveAuditors(auditors);
        return jsonResponse({ success: true, auditors });
      }

      // 12. ADMIN UPDATE AUDITOR (POST)
      if (pathname === "/api/admin/auditors/update" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        const { oldUsername, newUsername, name, auditorPassword } = body;
        if (!oldUsername || !newUsername || !name || !auditorPassword) {
          return errorResponse("กรุณากรอกข้อมูลให้ครบถ้วน");
        }
        const cleanOld = oldUsername.trim().toLowerCase();
        const cleanNew = newUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (!cleanNew) {
          return errorResponse("ชื่อบัญชีใหม่ไม่ถูกต้อง");
        }
        if (cleanOld === "auditor" && cleanNew !== "auditor") {
          return errorResponse("ไม่สามารถปรับปรุงเปลี่ยนชื่อบัญชีของ @auditor ซึ่งเป็นผู้แนะนำหลักได้");
        }
        const auditors = getAuditors();
        const audIdx = auditors.findIndex(a => a.username === cleanOld);
        if (audIdx === -1) {
          return errorResponse("ไม่พบข้อมูลผู้แนะนำที่ต้องการแก้ไข", 404);
        }
        if (cleanOld !== cleanNew && auditors.some(a => a.username === cleanNew)) {
          return errorResponse(`ชื่อบัญชีใหม่ "${cleanNew}" ซ้ำกับผู้ตรวจประเมินท่านอื่น`);
        }

        auditors[audIdx].username = cleanNew;
        auditors[audIdx].name = name.trim();
        auditors[audIdx].password = auditorPassword.trim();
        saveAuditors(auditors);

        if (cleanOld !== cleanNew) {
          const hospitals = getHospitals();
          let changed = false;
          hospitals.forEach(h => {
            if ((h.upline || "auditor").trim().toLowerCase() === cleanOld) {
              h.upline = cleanNew;
              changed = true;
            }
          });
          if (changed) {
            saveHospitals(hospitals);
          }
        }
        return jsonResponse({ success: true, auditors });
      }

      // 13. ADMINS QUERY (POST)
      if (pathname === "/api/admin/admins" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        const list = getAdmins().map(a => ({
          username: a.username,
          name: a.name,
          role: a.role || "admin",
          createdAt: a.createdAt
        }));
        return jsonResponse({ success: true, admins: list });
      }

      // 14. ADMIN CREATE ADMIN (POST)
      if (pathname === "/api/admin/admins/create" && method === "POST") {
        const requestor = checkAdminAccess(body);
        if (!requestor) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        if (requestor.role !== "master" && requestor.username !== "xraymaetha") {
          return errorResponse("คุณต้องเป็นแอดมินระดับมาสเตอร์จึงจะสร้างแอดมินได้", 403);
        }
        const { editUsername, editName, editPassword, editRole } = body;
        if (!editUsername || !editName || !editPassword) {
          return errorResponse("กรุณากรอกข้อมูลผู้ดูแลระบบให้ครบถ้วน");
        }
        const cleanUser = editUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (!cleanUser) {
          return errorResponse("ชื่อบัญชีไม่ถูกต้อง");
        }
        const admins = getAdmins();
        if (admins.some(a => a.username === cleanUser)) {
          return errorResponse(`ชื่อบัญชีผู้ดูแลระบบ "${cleanUser}" ซ้ำในระบบ`);
        }
        const newAdmin = {
          username: cleanUser,
          name: editName.trim(),
          password: editPassword.trim(),
          role: editRole === "master" ? "master" : "admin",
          createdAt: new Date().toISOString()
        };
        admins.push(newAdmin);
        saveAdmins(admins);
        return jsonResponse({
          success: true,
          admins: admins.map(a => ({ username: a.username, name: a.name, role: a.role || "admin", createdAt: a.createdAt }))
        });
      }

      // 15. ADMIN UPDATE ADMIN (POST)
      if (pathname === "/api/admin/admins/update" && method === "POST") {
        const requestor = checkAdminAccess(body);
        if (!requestor) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        if (requestor.role !== "master" && requestor.username !== "xraymaetha") {
          return errorResponse("คุณต้องเป็นแอดมินระดับมาสเตอร์จึงจะแก้ไขแอดมินได้", 403);
        }
        const { oldUsername, newUsername, name, adminPassword, role } = body;
        if (!oldUsername || !newUsername || !name || !adminPassword) {
          return errorResponse("กรุณากรอกข้อมูลให้ครบถ้วน");
        }
        const cleanOld = oldUsername.trim().toLowerCase();
        const cleanNew = newUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (!cleanNew) {
          return errorResponse("ชื่อบัญชีใหม่ไม่ถูกต้อง");
        }
        if (cleanOld === "xraymaetha" && cleanNew !== "xraymaetha") {
          return errorResponse("ไม่สามารถเปลี่ยนชื่อบัญชีของ xraymaetha ซึ่งเป็นบัญชีแอดมินหลักได้");
        }
        const admins = getAdmins();
        const admIdx = admins.findIndex(a => a.username === cleanOld);
        if (admIdx === -1) {
          return errorResponse("ไม่พบข้อมูลผู้ดูแลระบบที่ต้องการแก้ไข", 404);
        }
        if (cleanOld !== cleanNew && admins.some(a => a.username === cleanNew)) {
          return errorResponse(`ชื่อบัญชีใหม่ "${cleanNew}" ซ้ำกับผู้ดูแลระบบท่านอื่น`);
        }

        admins[admIdx].username = cleanNew;
        admins[admIdx].name = name.trim();
        admins[admIdx].password = adminPassword.trim();
        admins[admIdx].role = role === "master" ? "master" : "admin";
        saveAdmins(admins);

        return jsonResponse({
          success: true,
          admins: admins.map(a => ({ username: a.username, name: a.name, role: a.role || "admin", createdAt: a.createdAt }))
        });
      }

      // 16. ADMIN DELETE ADMIN (POST)
      if (pathname === "/api/admin/admins/delete" && method === "POST") {
        const requestor = checkAdminAccess(body);
        if (!requestor) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        if (requestor.role !== "master" && requestor.username !== "xraymaetha") {
          return errorResponse("คุณต้องเป็นแอดมินระดับมาสเตอร์จึงจะลบแอดมินได้", 403);
        }
        const { targetUsername } = body;
        const cleanTarget = (targetUsername || "").trim().toLowerCase();
        if (cleanTarget === "xraymaetha") {
          return errorResponse("ไม่สามารถลบผู้ดูแลระบบหลัก (xraymaetha) ของระบบได้");
        }
        if (cleanTarget === requestor.username) {
          return errorResponse("คุณไม่สามารถลบตัวเองออกจากระบบได้");
        }
        const admins = getAdmins();
        const idx = admins.findIndex(a => a.username === cleanTarget);
        if (idx === -1) {
          return errorResponse("ไม่พบข้อมูลผู้ดูแลระบบที่ต้องการลบ", 404);
        }
        admins.splice(idx, 1);
        saveAdmins(admins);
        return jsonResponse({
          success: true,
          admins: admins.map(a => ({ username: a.username, name: a.name, role: a.role || "admin", createdAt: a.createdAt }))
        });
      }

      // 17. ADMIN UPDATE HOSPITAL (POST)
      if (pathname === "/api/admin/hospitals/update" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        const { oldCode, newCode, name, hospitalPassword, upline } = body;
        if (!oldCode || !newCode || !name || !hospitalPassword) {
          return errorResponse("กรุณากรอกข้อมูลสถาบันที่แก้ไขให้ครบถ้วน");
        }
        const cleanOld = oldCode.trim().toLowerCase();
        const cleanNew = newCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        if (!cleanNew) {
          return errorResponse("รหัสโรงพยาบาลใหม่ไม่ถูกต้อง");
        }

        const hospitals = getHospitals();
        const idx = hospitals.findIndex(h => h.code === cleanOld);
        if (idx === -1) {
          return errorResponse("ไม่พบข้อมูลโรงพยาบาลต้องการแก้ไข", 404);
        }
        if (cleanOld !== cleanNew && hospitals.some(h => h.code === cleanNew)) {
          return errorResponse(`รหัสโรงพยาบาล "${newCode}" ซ้ำกับโรงพยาบาลอื่น`);
        }

        hospitals[idx].code = cleanNew;
        hospitals[idx].name = name.trim();
        hospitals[idx].password = hospitalPassword.trim();
        if (upline !== undefined) {
          hospitals[idx].upline = upline || "auditor";
        }
        saveHospitals(hospitals);

        // Rename dynamic sheets storage in localStorage if code changed
        if (cleanOld !== cleanNew) {
          const oldKey = `${KEYS.SHEETS_PREFIX}${cleanOld}`;
          const newKey = `${KEYS.SHEETS_PREFIX}${cleanNew}`;
          const sheetData = localStorage.getItem(oldKey);
          if (sheetData) {
            localStorage.setItem(newKey, sheetData);
            localStorage.removeItem(oldKey);
          }
        }
        return jsonResponse({ success: true, hospitals });
      }

      // 18. ADMIN DELETE HOSPITAL (POST)
      if (pathname === "/api/admin/hospitals/delete" && method === "POST") {
        const admin = checkAdminAccess(body);
        if (!admin) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);
        const { targetCode } = body;
        const cleanTarget = (targetCode || "").trim().toLowerCase();
        const hospitals = getHospitals();
        const idx = hospitals.findIndex(h => h.code === cleanTarget);
        if (idx === -1) {
          return errorResponse("ไม่พบโรงพยาบาลที่ต้องการลบ", 404);
        }
        hospitals.splice(idx, 1);
        saveHospitals(hospitals);

        // Delete sheets storage
        localStorage.removeItem(`${KEYS.SHEETS_PREFIX}${cleanTarget}`);

        return jsonResponse({ success: true, hospitals });
      }

      // 19. HOSPITAL GET LIST OF SHEETS (GET)
      if (pathname === "/api/sheets" && method === "GET") {
        const sheets = readAllSheets(hospitalCodeFromHeader);
        return jsonResponse(Object.keys(sheets));
      }

      // 20. HOSPITAL CREATE SHEET (POST)
      if (pathname === "/api/sheets/create" && method === "POST") {
        const { name } = body;
        if (!name || typeof name !== "string" || !name.trim()) {
          return errorResponse("ข้อมูลชื่อแท็บไม่ถูกต้อง");
        }
        const cleanName = name.trim();
        const sheets = readAllSheets(hospitalCodeFromHeader);
        if (sheets[cleanName]) {
          return errorResponse(`ชื่อแท็บ "${cleanName}" มีในระบบอยู่แล้ว!`);
        }
        const firstSheetName = Object.keys(sheets)[0] || "ปี 2569";
        const sourceItems = sheets[firstSheetName] || initialAssessmentsSanitized;

        const clonedItems: AssessmentItem[] = sourceItems.map((item) => ({
          Main_Category: item.Main_Category || "อื่นๆ",
          Sub_Category: item.Sub_Category || "",
          Item_ID: item.Item_ID,
          Criteria_Detail: item.Criteria_Detail || "",
          Success_Indicator: item.Success_Indicator || "",
          Status: "🔴 ยังไม่พร้อม",
          Responsible_Person: "",
          Evidence_Link: [],
          Auditor_Comment: "",
          Last_Update: new Date().toISOString()
        }));

        sheets[cleanName] = clonedItems;
        writeAllSheets(sheets, hospitalCodeFromHeader);
        return jsonResponse({ success: true, name: cleanName, sheets: Object.keys(sheets) });
      }

      // 21. HOSPITAL DELETE SHEET (POST)
      if (pathname === "/api/sheets/delete" && method === "POST") {
        const { name } = body;
        if (!name || typeof name !== "string" || !name.trim()) {
          return errorResponse("ข้อมูลชื่อแท็บต้องการลบไม่ถูกต้อง");
        }
        const cleanName = name.trim();
        const sheets = readAllSheets(hospitalCodeFromHeader);
        if (!sheets[cleanName]) {
          return errorResponse(`ไม่พบข้อมูลแท็บชื่อ "${cleanName}"`, 404);
        }
        const sheetKeys = Object.keys(sheets);
        if (sheetKeys.length <= 1) {
          return errorResponse("ไม่สามารถลบข้อมูลชุดสุดท้ายได้ในขณะนี้ ระบบต้องการให้มีอย่างน้อย 1 ปีประเมินเสมอ");
        }
        delete sheets[cleanName];
        writeAllSheets(sheets, hospitalCodeFromHeader);
        return jsonResponse({ success: true, deleted: cleanName, sheets: Object.keys(sheets) });
      }

      // 22. HOSPITAL GET ASSESSMENTS FOR SELECTED SHEET (GET)
      if (pathname === "/api/assessments" && method === "GET") {
        const sheetName = urlObj.searchParams.get("sheet") || "ปี 2569";
        const data = readAssessments(sheetName, hospitalCodeFromHeader);
        return jsonResponse(data);
      }

      // 23. HOSPITAL UPDATE INDIVIDUAL ASSESSMENT ITEM (POST)
      if (pathname === "/api/assessments/update" && method === "POST") {
        const { Item_ID, Status, Responsible_Person, Evidence_Link, Auditor_Comment, activeSheetName } = body;
        const sheetName = activeSheetName || "ปี 2569";
        if (!Item_ID) {
          return errorResponse("Missing Target ID (Item_ID) attribute.");
        }
        const currentItems = readAssessments(sheetName, hospitalCodeFromHeader);
        const idx = currentItems.findIndex(i => i.Item_ID === Item_ID);
        if (idx === -1) {
          return errorResponse(`Assessment item with ID ${Item_ID} not found in sheet ${sheetName}.`, 404);
        }

        const currentLocalTimeISO = new Date().toISOString();
        const updatedItem = {
          ...currentItems[idx],
          Status: (Status || currentItems[idx].Status) as AssessmentStatus,
          Responsible_Person: Responsible_Person !== undefined ? Responsible_Person : currentItems[idx].Responsible_Person,
          Evidence_Link: Array.isArray(Evidence_Link) ? Evidence_Link : currentItems[idx].Evidence_Link,
          Auditor_Comment: Auditor_Comment !== undefined ? Auditor_Comment : currentItems[idx].Auditor_Comment,
          Last_Update: currentLocalTimeISO
        };

        currentItems[idx] = updatedItem;
        writeAssessments(currentItems, sheetName, hospitalCodeFromHeader);
        return jsonResponse({ success: true, updatedItem });
      }

      // 24. HOSPITAL RESET SHEET TO DEMO STANDARDS (POST)
      if (pathname === "/api/assessments/reset" && method === "POST") {
        const { activeSheetName } = body;
        const sheetName = activeSheetName || "ปี 2569";
        writeAssessments(initialAssessmentsSanitized, sheetName, hospitalCodeFromHeader);
        return jsonResponse({ success: true, message: `Database reset to audit standard default template for sheet ${sheetName} successfully.` });
      }

      // 25. HOSPITAL IMPORT BATCH ITEMS (POST)
      if (pathname === "/api/assessments/import" && method === "POST") {
        const { items, activeSheetName } = body;
        const sheetName = activeSheetName || "ปี 2569";
        if (!Array.isArray(items)) {
          return errorResponse("Invalid payload, items should be an array.");
        }
        const currentItems = readAssessments(sheetName, hospitalCodeFromHeader);
        items.forEach((imported: any) => {
          const idx = currentItems.findIndex(x => x.Item_ID === imported.Item_ID);
          const updatedItem: AssessmentItem = {
            Main_Category: sanitizeCategory(imported.Main_Category) || "อื่นๆ",
            Sub_Category: imported.Sub_Category || "",
            Item_ID: imported.Item_ID,
            Criteria_Detail: imported.Criteria_Detail || "",
            Success_Indicator: imported.Success_Indicator || "",
            Status: imported.Status || "🔴 ยังไม่พร้อม",
            Responsible_Person: imported.Responsible_Person || "",
            Evidence_Link: Array.isArray(imported.Evidence_Link) ? imported.Evidence_Link : [],
            Auditor_Comment: imported.Auditor_Comment || "",
            Last_Update: imported.Last_Update || new Date().toISOString()
          };
          if (idx !== -1) {
            currentItems[idx] = updatedItem;
          } else {
            currentItems.push(updatedItem);
          }
        });
        writeAssessments(currentItems, sheetName, hospitalCodeFromHeader);
        return jsonResponse({ success: true, count: items.length });
      }

      // 26. GEMINI ADVISOR SMART COACH (POST)
      if (pathname === "/api/gemini/advisor" && method === "POST") {
        // Fallback or Standby AI response for zero-servers GitHub Pages compliance
        const resObj = {
          advice: `⚠️ **ระบบวิเคราะห์ AI อัจฉริยะแบบฝังตัว (Embed Smart Advisor)**\n\nยินดีต้อนรับเข้าสู่ช่องทางตอบถามแบบพกพา! เนื่องจากระบบถูกปรับแต่งให้เป็น **Client-Side SPA สมบูรณ์แบบ 100%** สำหรับนำขึ้น GitHub Pages ฝั่งเซิร์ฟเวอร์หลักจึงถูกปลดออก\n\n💡 **วิเคราะห์และข้อแนะนำเร่งด่วนสำหรับเกณฑ์ข้อนี้:**\n- **เกณฑ์ข้อกำหนด:** \`${body?.currentItemContext?.Criteria_Detail || "ไม่ได้ระบุ"}\`\n- **แนวทางแชร์หลักฐานดิจิทัล:** สร้างโฟลเดอร์รหัสใน Google Drive ตัวอย่าง \`${body?.currentItemContext?.Item_ID || "1.1.1"}\` แนะนำให้แปลงไฟล์ภาพหน้าต่างเครื่อง, เอกสารยืนยันผล, งานคำนวณรังสีสะสม สังกัด สรพ./กรมวิทยาศาสตร์การแพทย์ เป็นไฟล์ PDF หรือภาพ PNG ความรวดเร็วสูง แล้วนำลิงก์แชร์มาแนบในระบบ\n\n*ขอแสดงความนับถือ, ระบบประเมินอัจฉริยะ MOPH X-ray 2569 Portal*`,
          actionItems: [
            "จัดวางลิงก์ Google Drive ในองค์กรที่ผู้ตรวจสามารถเปิดได้โดยไม่ต้องลงชื่อเข้าใช้",
            "เขียนคำอธิบายเพิ่มเติมในช่องผู้รับผิดชอบเมื่ออัปเดตไฟล์เสร็จสิ้น",
            "สามารถเข้าใช้เมนูแอดมิน (xraymaetha) เพื่อดิ้นส่งแผนงานดาวน์ไลน์ของคุณได้ตลอดเวลา!"
          ]
        };
        return jsonResponse(resObj);
      }

      // FALLBACK 404
      return errorResponse(`Mock API Route Not Found: ${method} ${pathname}`, 404);

    } catch (e: any) {
      return jsonResponse({ error: "Internal Mock Service Error: " + e.message }, 500);
    }
}
