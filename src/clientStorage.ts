import { initialAssessments } from "./seedData";
import { AssessmentItem, AssessmentStatus, normalizeStatus } from "./types";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  writeBatch
} from "firebase/firestore";

// Firebase configuration parameters
const firebaseConfig = {
  projectId: "gen-lang-client-0935999478",
  appId: "1:20501180419:web:c66b0c1c8bc8829d9b5e36",
  apiKey: "AIzaSyDYcmjntPvmK7owF93l8ze9KILIE8igeTY",
  authDomain: "gen-lang-client-0935999478.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-0e79493f-d0e8-4329-97de-78dda7c84839",
  storageBucket: "gen-lang-client-0935999478.firebasestorage.app",
  messagingSenderId: "20501180419",
  measurementId: ""
};

// Initialize Google Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

// Compliant with Phase 3 Error Handler instructions from image-generation/firebase skill
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null
    },
    operationType,
    path
  };
  console.error("Firestore DB Operation Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Ensure category spelling is correct
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
  Status: "🔴 ไม่มี" as AssessmentStatus,
  Evidence_Link: [] as string[],
  Last_Update: ""
}));

// Safe chunking logic for batch operations
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

// Sort items to match original order of standard templates
function sortAssessments(items: AssessmentItem[]): AssessmentItem[] {
  const originalOrderMap = new Map(initialAssessmentsSanitized.map((it, idx) => [it.Item_ID, idx]));
  return [...items].sort((a, b) => {
    const idxA = originalOrderMap.get(a.Item_ID);
    const idxB = originalOrderMap.get(b.Item_ID);
    if (idxA !== undefined && idxB !== undefined) {
      return idxA - idxB;
    }
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return a.Item_ID.localeCompare(b.Item_ID, undefined, { numeric: true, sensitivity: "base" });
  });
}

// ----------------------------------------------------------------------------
// DB OPERATIONS HELPERS (FIRESTORE REAL-TIME SYNCHRONIZED LAYER)
// ----------------------------------------------------------------------------

async function dbGetHospitals(): Promise<any[]> {
  const path = "hospitals";
  try {
    const colRef = collection(db, path);
    const snap = await getDocs(colRef);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });

    if (list.length === 0) {
      const seed = [
        {
          code: "maetha",
          originalCode: "maetha",
          name: "โรงพยาบาลแม่ทา",
          password: "12345",
          upline: "auditor",
          createdAt: "2026-06-08T02:12:52.825Z"
        }
      ];
      for (const h of seed) {
        await setDoc(doc(db, "hospitals", h.code), h);
      }
      return seed;
    }
    return list;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path);
    return [];
  }
}

async function dbGetAuditors(): Promise<any[]> {
  const path = "auditors";
  try {
    const colRef = collection(db, path);
    const snap = await getDocs(colRef);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });

    if (list.length === 0) {
      const seed = [
        {
          username: "auditor",
          name: "ผู้ตรวจประเมินระดับเขต (บัญชีหลัก)",
          password: "auditor",
          createdAt: "2026-06-08T02:03:15.892Z"
        }
      ];
      for (const a of seed) {
        await setDoc(doc(db, "auditors", a.username), a);
      }
      return seed;
    }
    return list;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path);
    return [];
  }
}

async function dbGetAdmins(): Promise<any[]> {
  const path = "admins";
  try {
    const colRef = collection(db, path);
    const snap = await getDocs(colRef);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });

    if (list.length === 0) {
      const seed = [
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
      for (const a of seed) {
        await setDoc(doc(db, "admins", a.username), a);
      }
      return seed;
    }
    return list;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path);
    return [];
  }
}

async function dbGetSheetNames(hospitalCode: string): Promise<string[]> {
  const cleanCode = hospitalCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "default";
  const path = `hospitals/${cleanCode}/sheet_meta/list`;
  try {
    const metaDoc = doc(db, "hospitals", cleanCode, "sheet_meta", "list");
    const snap = await getDoc(metaDoc);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.sheets) && data.sheets.length > 0) {
        let currentSheets: string[] = data.sheets;
        
        // Auto migrate "ปี 2568" -> "ปี 2569" to ensure no active hospital is left behind
        if (currentSheets.includes("ปี 2568")) {
          try {
            // Read items of "ปี 2568" first
            const items2568 = await dbGetAssessments(cleanCode, "ปี 2568");
            if (items2568 && items2568.length > 0) {
              // Write items to "ปี 2569" subcollection block
              const chunks = chunkArray(items2568, 100);
              for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(it => {
                  const safeId = it.Item_ID.replace(/\//g, "_");
                  const itemRef = doc(db, "hospitals", cleanCode, "sheets", "ปี 2569", "items", safeId);
                  batch.set(itemRef, it);
                });
                await batch.commit();
              }
            }
            // Update the sheet meta document
            currentSheets = currentSheets.map(s => s === "ปี 2568" ? "ปี 2569" : s);
            currentSheets = Array.from(new Set(currentSheets)); // Deduplicate
            await setDoc(metaDoc, { sheets: currentSheets }, { merge: true });
          } catch (migrationErr) {
            console.error("Migration from 2568 to 2569 failed:", migrationErr);
          }
        }
        return currentSheets;
      }
    }
    const defaultSheets = ["ปี 2569"];
    await setDoc(metaDoc, { sheets: defaultSheets });
    return defaultSheets;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path);
    return ["ปี 2569"];
  }
}

async function dbGetAssessments(hospitalCode: string, sheetName: string): Promise<AssessmentItem[]> {
  const cleanCode = hospitalCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "default";
  const path = `hospitals/${cleanCode}/sheets/${sheetName}/items`;
  try {
    const itemsRef = collection(db, "hospitals", cleanCode, "sheets", sheetName, "items");
    const snap = await getDocs(itemsRef);
    let items: AssessmentItem[] = [];
    snap.forEach(docSnap => {
      const raw = docSnap.data() as AssessmentItem;
      raw.Status = normalizeStatus(raw.Status);
      items.push(raw);
    });

    if (items.length === 0) {
      let baseTemplate = initialAssessmentsSanitized;
      // Pre-seed default points for Maetha standard Demo as in prior builds
      if (cleanCode === "maetha" && sheetName === "ปี 2568") {
        baseTemplate = initialAssessmentsSanitized.map(item => {
          if (item.Item_ID === "1.1.1") {
            return {
              ...item,
              Status: "🟢 มีครบ" as AssessmentStatus,
              Evidence_Link: ["https://drive.google.com/file/d/12pMlANTZ4xml6adlffpMmIfOJH0X6eXq/view?usp=sharing"],
              Last_Update: "19/5/2026"
            };
          }
          if (item.Item_ID === "1.1.2") {
            return {
              ...item,
              Status: "🟢 มีครบ" as AssessmentStatus,
              Evidence_Link: ["https://docs.google.com/document/d/1Af3vaNd0HA3NTeRKNnGliewEkDXA8fz5oKcKQZCKiR8/edit?usp=drive_link"],
              Last_Update: "19/5/2026"
            };
          }
          return item;
        });
      }

      // Safe batch write
      const chunks = chunkArray(baseTemplate, 300);
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(it => {
          const safeId = it.Item_ID.replace(/\//g, "_");
          const itemRef = doc(db, "hospitals", cleanCode, "sheets", sheetName, "items", safeId);
          batch.set(itemRef, it);
        });
        await batch.commit();
      }
      return baseTemplate;
    }

    return sortAssessments(items);
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, path);
    return [];
  }
}

async function dbWriteAssessmentItem(hospitalCode: string, sheetName: string, item: AssessmentItem): Promise<void> {
  const cleanCode = hospitalCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "default";
  const safeId = item.Item_ID.replace(/\//g, "_");
  const path = `hospitals/${cleanCode}/sheets/${sheetName}/items/${safeId}`;
  try {
    const docRef = doc(db, "hospitals", cleanCode, "sheets", sheetName, "items", safeId);
    await setDoc(docRef, item);
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

async function dbBatchOverWriteAssessments(hospitalCode: string, sheetName: string, items: AssessmentItem[]): Promise<void> {
  const cleanCode = hospitalCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "default";
  const path = `hospitals/${cleanCode}/sheets/${sheetName}/items`;
  try {
    // 1. Delete all existing elements
    const itemsRef = collection(db, "hospitals", cleanCode, "sheets", sheetName, "items");
    const snap = await getDocs(itemsRef);
    const delChunks = chunkArray(snap.docs, 300);
    for (const chunk of delChunks) {
      const delBatch = writeBatch(db);
      chunk.forEach(docSnap => {
        delBatch.delete(docSnap.ref);
      });
      await delBatch.commit();
    }

    // 2. Upload replacements
    const chunks = chunkArray(items, 300);
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(it => {
        const safeId = it.Item_ID.replace(/\//g, "_");
        const ref = doc(db, "hospitals", cleanCode, "sheets", sheetName, "items", safeId);
        batch.set(ref, it);
      });
      await batch.commit();
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

async function dbCreateSheet(hospitalCode: string, newSheetName: string): Promise<void> {
  const cleanCode = hospitalCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "default";
  const path = `hospitals/${cleanCode}/sheet_meta/list`;
  try {
    // Add tab list
    const metaDocRef = doc(db, "hospitals", cleanCode, "sheet_meta", "list");
    const existingSheets = await dbGetSheetNames(cleanCode);
    if (!existingSheets.includes(newSheetName)) {
      const nextSheets = [...existingSheets, newSheetName];
      await setDoc(metaDocRef, { sheets: nextSheets });
    }

    // Copy template items
    const firstSheetName = existingSheets[0] || "ปี 2569";
    const baseItems = await dbGetAssessments(cleanCode, firstSheetName);

    const clonedItems: AssessmentItem[] = baseItems.map(item => ({
      Main_Category: item.Main_Category || "อื่นๆ",
      Sub_Category: item.Sub_Category || "",
      Item_ID: item.Item_ID,
      Criteria_Detail: item.Criteria_Detail || "",
      Success_Indicator: item.Success_Indicator || "",
      Status: "🔴 ไม่มี",
      Responsible_Person: "",
      Evidence_Link: [],
      Auditor_Comment: "",
      Last_Update: new Date().toISOString()
    }));

    const chunks = chunkArray(clonedItems, 300);
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(it => {
        const safeId = it.Item_ID.replace(/\//g, "_");
        const ref = doc(db, "hospitals", cleanCode, "sheets", newSheetName, "items", safeId);
        batch.set(ref, it);
      });
      await batch.commit();
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

async function dbDeleteSheet(hospitalCode: string, sheetToDelete: string): Promise<void> {
  const cleanCode = hospitalCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "default";
  const path = `hospitals/${cleanCode}/sheet_meta/list`;
  try {
    const metaDocRef = doc(db, "hospitals", cleanCode, "sheet_meta", "list");
    const existingSheets = await dbGetSheetNames(cleanCode);
    const nextSheets = existingSheets.filter(s => s !== sheetToDelete);
    await setDoc(metaDocRef, { sheets: nextSheets });

    // Clean documents
    const itemsRef = collection(db, "hospitals", cleanCode, "sheets", sheetToDelete, "items");
    const snap = await getDocs(itemsRef);
    const chunks = chunkArray(snap.docs, 300);
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------------------------------
// MANDATORY STUB EXPORTS
// ----------------------------------------------------------------------------
export function initClientDatabase() {
  console.log("MOPH Portal Cloud persistent state layer is online.");
  // Eager check connection to Firestore (as mandated by Skill guidelines)
  dbGetHospitals().catch(err => {
    console.warn("Offline or failed initial secure connection checklist:", err);
  });
}

initClientDatabase();

// ----------------------------------------------------------------------------
// MAIN INTERCEPTOR ROUTER clientFetch() proxying all /api/* requests
// ----------------------------------------------------------------------------
export async function clientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.toString() : input.url);
  const method = (init?.method || "GET").toUpperCase();

  // If path is not part of mock APIs, pass straight to external resources
  if (!urlStr.includes("/api/")) {
    return window.fetch(input, init);
  }

  // Parse payload parameter body
  let body: any = {};
  if (init?.body && typeof init.body === "string") {
    try {
      body = JSON.parse(init.body);
    } catch (e) {
      // Ignore
    }
  }

  const customHeaders = init?.headers as Record<string, string> || {};
  const hospitalCodeFromHeader = customHeaders["x-hospital-code"] || "default";

  const urlObj = new URL(urlStr, window.location.origin);
  const pathname = urlObj.pathname;

  const jsonResponse = (data: any, status = 200) => {
    return Promise.resolve(new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    }));
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

      const hospitals = await dbGetHospitals();
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

      // Save hospital to Firestore
      await setDoc(doc(db, "hospitals", cleanCode), newHospital);

      // Pre-seed sheets and metadata in Firestore
      const metaDocRef = doc(db, "hospitals", cleanCode, "sheet_meta", "list");
      await setDoc(metaDocRef, { sheets: ["ปี 2569"] });
      await dbGetAssessments(cleanCode, "ปี 2569");

      return jsonResponse({ success: true, hospital: { code: cleanCode, name: newHospital.name, upline: newHospital.upline } });
    }

    // 2. HOSPITAL LOGIN (POST)
    if (pathname === "/api/hospitals/login" && method === "POST") {
      const { code, password } = body;
      if (!code || !password) {
        return errorResponse("กรุณากรอกรหัสโรงพยาบาลและรหัสผ่าน");
      }
      const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const hospitals = await dbGetHospitals();
      const hospital = hospitals.find(h => h.code === cleanCode && h.password === password.trim());

      if (hospital) {
        // Guarantee sheets are loaded
        await dbGetSheetNames(cleanCode);
        return jsonResponse({ success: true, hospital: { code: cleanCode, name: hospital.name, upline: hospital.upline || "auditor" } });
      } else {
        return errorResponse("รหัสโรงพยาบาลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง", 401);
      }
    }

    // 3. CODE SUGGESTION (GET)
    if (pathname === "/api/hospitals/suggest-code" && method === "GET") {
      const hospitals = await dbGetHospitals();
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
      const admins = await dbGetAdmins();
      const admin = admins.find(a => a.username === cleanUsername && a.password === password.trim());
      if (admin) {
        return jsonResponse({ success: true, username: admin.username, name: admin.name, role: admin.role || "admin" });
      } else {
        return errorResponse("ชื่อบัญชีแอดมินหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง", 401);
      }
    }

    // 5. BACKUP EXPORT & IMPORT (POST)
    if (pathname === "/api/admin/backup/export" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      const hospitals = await dbGetHospitals();
      const auditors = await dbGetAuditors();
      const adminsList = await dbGetAdmins();

      const backupData: Record<string, any> = {
        hospitals,
        auditors,
        admins: adminsList,
        sheets: {} as Record<string, any>
      };

      // Retrieve sheets data for all hospitals in backup
      for (const h of hospitals) {
        try {
          const sheetNames = await dbGetSheetNames(h.code);
          const sheetsObj: Record<string, AssessmentItem[]> = {};
          for (const sName of sheetNames) {
            sheetsObj[sName] = await dbGetAssessments(h.code, sName);
          }
          backupData.sheets[h.code] = sheetsObj;
        } catch (err) {
          console.warn(`Export skip for hospital code ${h.code}`, err);
        }
      }

      return jsonResponse({ success: true, backup: backupData });
    }

    if (pathname === "/api/admin/backup/import" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password, backup } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      if (!backup || typeof backup !== "object") {
        return errorResponse("รูปแบบไฟล์ข้อมูลสำรองไม่ถูกต้องหรือไม่พบข้อมูล");
      }

      // Restore Hospitals
      if (Array.isArray(backup.hospitals)) {
        for (const h of backup.hospitals) {
          if (h.code) await setDoc(doc(db, "hospitals", h.code), h);
        }
      }

      // Restore Auditors
      if (Array.isArray(backup.auditors)) {
        for (const a of backup.auditors) {
          if (a.username) await setDoc(doc(db, "auditors", a.username), a);
        }
      }

      // Restore Admins
      if (Array.isArray(backup.admins)) {
        for (const a of backup.admins) {
          if (a.username) await setDoc(doc(db, "admins", a.username), a);
        }
      }

      // Restore Sheets
      if (backup.sheets && typeof backup.sheets === "object") {
        for (const hCode of Object.keys(backup.sheets)) {
          const cleanHCode = hCode.toLowerCase();
          const sheetsForH = backup.sheets[hCode];
          if (sheetsForH && typeof sheetsForH === "object") {
            const sheetNames = Object.keys(sheetsForH);
            await setDoc(doc(db, "hospitals", cleanHCode, "sheet_meta", "list"), { sheets: sheetNames });
            for (const sName of sheetNames) {
              const items = sheetsForH[sName];
              if (Array.isArray(items)) {
                await dbBatchOverWriteAssessments(cleanHCode, sName, items);
              }
            }
          }
        }
      }

      const updatedHospitals = await dbGetHospitals();
      const updatedAdmins = await dbGetAdmins();
      const updatedAuditors = await dbGetAuditors();

      return jsonResponse({
        success: true,
        message: "กู้คืนระบบและรายการฐานข้อมูลทั้งหมดและเชื่อมต่อระบบคลาวด์สำเร็จแล้ว!",
        hospitals: updatedHospitals,
        admins: updatedAdmins,
        auditors: updatedAuditors
      });
    }

    // 6. AUDITOR LOGIN (POST)
    if (pathname === "/api/auditor/login" && method === "POST") {
      const { username, password } = body;
      if (!username || !password) {
        return errorResponse("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      }
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const auditors = await dbGetAuditors();
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
      const auditors = await dbGetAuditors();
      const auditor = auditors.find(a => a.username === cleanUsername && a.password === password.trim());
      if (!auditor) {
        return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ตรวจประเมิน", 403);
      }

      const hospitals = await dbGetHospitals();
      const filtered = hospitals
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
      return jsonResponse({ success: true, hospitals: filtered });
    }

    // 8. ADMIN QUERY ALL HOSPITALS (POST)
    if (pathname === "/api/admin/hospitals" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      const hospitals = await dbGetHospitals();
      return jsonResponse({ success: true, hospitals });
    }

    // 9. ADMIN QUERY ALL AUDITORS (POST)
    if (pathname === "/api/admin/auditors" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      const auditors = await dbGetAuditors();
      return jsonResponse({ success: true, auditors });
    }

    // 10. ADMIN CREATE AUDITOR (POST)
    if (pathname === "/api/admin/auditors/create" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password, editUsername, editName, editPassword } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      if (!editUsername || !editName || !editPassword) {
        return errorResponse("กรุณากรอกข้อมูลผู้แนะนำ/ผู้ตรวจให้ครบถ้วน");
      }
      const cleanUser = editUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!cleanUser) {
        return errorResponse("ชื่อบัญชีไม่ถูกต้อง");
      }
      const auditorsList = await dbGetAuditors();
      if (auditorsList.some(a => a.username === cleanUser)) {
        return errorResponse(`ชื่อบัญชีผู้แนะนำ "${cleanUser}" ซ้ำในระบบ`);
      }

      const newAuditor = {
        username: cleanUser,
        name: editName.trim(),
        password: editPassword.trim(),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "auditors", cleanUser), newAuditor);
      const resList = await dbGetAuditors();
      return jsonResponse({ success: true, auditors: resList });
    }

    // 11. ADMIN DELETE AUDITOR (POST)
    if (pathname === "/api/admin/auditors/delete" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password, targetUsername } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      const cleanTarget = targetUsername.trim().toLowerCase();
      if (cleanTarget === "auditor") {
        return errorResponse("ไม่สามารถลบผู้แนะนำหลัก (auditor) ของระบบได้");
      }

      await deleteDoc(doc(db, "auditors", cleanTarget));
      const resList = await dbGetAuditors();
      return jsonResponse({ success: true, auditors: resList });
    }

    // 12. ADMIN UPDATE AUDITOR (POST)
    if (pathname === "/api/admin/auditors/update" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password, oldUsername, newUsername, name, auditorPassword } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

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

      const auditorsList = await dbGetAuditors();
      const targetAud = auditorsList.find(a => a.username === cleanOld);
      if (!targetAud) {
        return errorResponse("ไม่พบข้อมูลผู้แนะนำที่ต้องการแก้ไข", 404);
      }
      if (cleanOld !== cleanNew && auditorsList.some(a => a.username === cleanNew)) {
        return errorResponse(`ชื่อบัญชีใหม่ "${cleanNew}" ซ้ำกับผู้ตรวจประเมินท่านอื่น`);
      }

      // Delete old doc, write new doc
      if (cleanOld !== cleanNew) {
        await deleteDoc(doc(db, "auditors", cleanOld));
      }

      await setDoc(doc(db, "auditors", cleanNew), {
        username: cleanNew,
        name: name.trim(),
        password: auditorPassword.trim(),
        createdAt: targetAud.createdAt || new Date().toISOString()
      });

      // Synchronize hospital upline links
      if (cleanOld !== cleanNew) {
        const hospitalsList = await dbGetHospitals();
        for (const h of hospitalsList) {
          if ((h.upline || "auditor").trim().toLowerCase() === cleanOld) {
            h.upline = cleanNew;
            await setDoc(doc(db, "hospitals", h.code), h);
          }
        }
      }

      const resList = await dbGetAuditors();
      return jsonResponse({ success: true, auditors: resList });
    }

    // 13. ADMINS QUERY (POST)
    if (pathname === "/api/admin/admins" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      return jsonResponse({ success: true, admins });
    }

    // 14. ADMIN CREATE ADMIN (POST)
    if (pathname === "/api/admin/admins/create" && method === "POST") {
      const adminsList = await dbGetAdmins();
      const { username, password, editUsername, editName, editPassword, editRole } = body;
      const requestor = adminsList.find(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!requestor) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      if (requestor.role !== "master" && requestor.username !== "xraymaetha") {
        return errorResponse("คุณต้องเป็นแอดมินระดับมาสเตอร์จึงจะสร้างแอดมินได้", 403);
      }

      if (!editUsername || !editName || !editPassword) {
        return errorResponse("กรุณากรอกข้อมูลผู้ดูแลระบบให้ครบถ้วน");
      }
      const cleanUser = editUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!cleanUser) {
        return errorResponse("ชื่อบัญชีไม่ถูกต้อง");
      }
      if (adminsList.some(a => a.username === cleanUser)) {
        return errorResponse(`ชื่อบัญชีผู้ดูแลระบบ "${cleanUser}" ซ้ำในระบบ`);
      }

      const newAdmin = {
        username: cleanUser,
        name: editName.trim(),
        password: editPassword.trim(),
        role: editRole === "master" ? "master" : "admin",
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "admins", cleanUser), newAdmin);
      const resAdmins = await dbGetAdmins();
      return jsonResponse({ success: true, admins: resAdmins });
    }

    // 15. ADMIN UPDATE ADMIN (POST)
    if (pathname === "/api/admin/admins/update" && method === "POST") {
      const adminsList = await dbGetAdmins();
      const { username, password, oldUsername, newUsername, name, adminPassword, role } = body;
      const requestor = adminsList.find(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!requestor) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      if (requestor.role !== "master" && requestor.username !== "xraymaetha") {
        return errorResponse("คุณต้องเป็นแอดมินระดับมาสเตอร์จึงจะแก้ไขแอดมินได้", 403);
      }

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

      const targetAdmin = adminsList.find(a => a.username === cleanOld);
      if (!targetAdmin) {
        return errorResponse("ไม่พบข้อมูลผู้ดูแลระบบที่ต้องการแก้ไข", 404);
      }
      if (cleanOld !== cleanNew && adminsList.some(a => a.username === cleanNew)) {
        return errorResponse(`ชื่อบัญชีใหม่ "${cleanNew}" ซ้ำกับผู้ดูแลระบบท่านอื่น`);
      }

      if (cleanOld !== cleanNew) {
        await deleteDoc(doc(db, "admins", cleanOld));
      }

      await setDoc(doc(db, "admins", cleanNew), {
        username: cleanNew,
        name: name.trim(),
        password: adminPassword.trim(),
        role: role === "master" ? "master" : "admin",
        createdAt: targetAdmin.createdAt || new Date().toISOString()
      });

      const resAdmins = await dbGetAdmins();
      return jsonResponse({ success: true, admins: resAdmins });
    }

    // 16. ADMIN DELETE ADMIN (POST)
    if (pathname === "/api/admin/admins/delete" && method === "POST") {
      const adminsList = await dbGetAdmins();
      const { username, password, targetUsername } = body;
      const requestor = adminsList.find(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!requestor) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      if (requestor.role !== "master" && requestor.username !== "xraymaetha") {
        return errorResponse("คุณต้องเป็นแอดมินระดับมาสเตอร์จึงจะลบแอดมินได้", 403);
      }

      const cleanTarget = (targetUsername || "").trim().toLowerCase();
      if (cleanTarget === "xraymaetha") {
        return errorResponse("ไม่สามารถลบผู้ดูแลระบบหลัก (xraymaetha) ของระบบได้");
      }
      if (cleanTarget === requestor.username) {
        return errorResponse("คุณไม่สามารถลบตัวเองออกจากระบบได้");
      }

      await deleteDoc(doc(db, "admins", cleanTarget));
      const resAdmins = await dbGetAdmins();
      return jsonResponse({ success: true, admins: resAdmins });
    }

    // 17. ADMIN UPDATE HOSPITAL (POST)
    if (pathname === "/api/admin/hospitals/update" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password, oldCode, newCode, name, hospitalPassword, upline } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      if (!oldCode || !newCode || !name || !hospitalPassword) {
        return errorResponse("กรุณากรอกข้อมูลสถาบันที่แก้ไขให้ครบถ้วน");
      }
      const cleanOld = oldCode.trim().toLowerCase();
      const cleanNew = newCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!cleanNew) {
        return errorResponse("รหัสโรงพยาบาลใหม่ไม่ถูกต้อง");
      }

      const hospitalsList = await dbGetHospitals();
      const origH = hospitalsList.find(h => h.code === cleanOld);
      if (!origH) {
        return errorResponse("ไม่พบข้อมูลโรงพยาบาลต้องการแก้ไข", 404);
      }
      if (cleanOld !== cleanNew && hospitalsList.some(h => h.code === cleanNew)) {
        return errorResponse(`รหัสโรงพยาบาล "${newCode}" ซ้ำกับโรงพยาบาลอื่น`);
      }

      if (cleanOld !== cleanNew) {
        // Transfer all sheets and metadata in Firestore
        try {
          const sheetNames = await dbGetSheetNames(cleanOld);
          await setDoc(doc(db, "hospitals", cleanNew, "sheet_meta", "list"), { sheets: sheetNames });
          for (const sName of sheetNames) {
            const items = await dbGetAssessments(cleanOld, sName);
            await dbBatchOverWriteAssessments(cleanNew, sName, items);
            // Delete old sheet objects
            const oldItemsRef = collection(db, "hospitals", cleanOld, "sheets", sName, "items");
            const oldItemsSnap = await getDocs(oldItemsRef);
            const delBatch = writeBatch(db);
            oldItemsSnap.forEach(snap => delBatch.delete(snap.ref));
            await delBatch.commit();
          }

          // Clean old dynamic tab references
          await deleteDoc(doc(db, "hospitals", cleanOld, "sheet_meta", "list"));
        } catch (err) {
          console.error("Critical error renaming Firestore collections: ", err);
        }

        await deleteDoc(doc(db, "hospitals", cleanOld));
      }

      const updatedObj = {
        code: cleanNew,
        originalCode: origH.originalCode || cleanNew,
        name: name.trim(),
        password: hospitalPassword.trim(),
        upline: upline || origH.upline || "auditor",
        createdAt: origH.createdAt || new Date().toISOString()
      };

      await setDoc(doc(db, "hospitals", cleanNew), updatedObj);

      const resList = await dbGetHospitals();
      return jsonResponse({ success: true, hospitals: resList });
    }

    // 18. ADMIN DELETE HOSPITAL (POST)
    if (pathname === "/api/admin/hospitals/delete" && method === "POST") {
      const admins = await dbGetAdmins();
      const { username, password, targetCode } = body;
      const isAdminUser = admins.some(a => a.username === username?.trim().toLowerCase() && a.password === password?.trim());
      if (!isAdminUser) return errorResponse("ไม่มีสิทธิ์เข้าถึงข้อมูลผู้ดูแลระบบ", 403);

      const cleanTarget = (targetCode || "").trim().toLowerCase();
      const hospitalsList = await dbGetHospitals();
      const idx = hospitalsList.findIndex(h => h.code === cleanTarget);
      if (idx === -1) {
        return errorResponse("ไม่พบโรงพยาบาลที่ต้องการลบ", 404);
      }

      // Delete sheet names list and assessment documents from subcollections
      try {
        const sheetNames = await dbGetSheetNames(cleanTarget);
        for (const sName of sheetNames) {
          const itemsRef = collection(db, "hospitals", cleanTarget, "sheets", sName, "items");
          const itemsSnap = await getDocs(itemsRef);
          const delBatch = writeBatch(db);
          itemsSnap.forEach(snap => delBatch.delete(snap.ref));
          await delBatch.commit();
        }
        await deleteDoc(doc(db, "hospitals", cleanTarget, "sheet_meta", "list"));
      } catch (err) {
        console.warn("Deleted elements cleanup warning:", err);
      }

      await deleteDoc(doc(db, "hospitals", cleanTarget));

      const resList = await dbGetHospitals();
      return jsonResponse({ success: true, hospitals: resList });
    }

    // 19. HOSPITAL GET LIST OF SHEETS (GET)
    if (pathname === "/api/sheets" && method === "GET") {
      const list = await dbGetSheetNames(hospitalCodeFromHeader);
      return jsonResponse(list);
    }

    // 20. HOSPITAL CREATE SHEET (POST)
    if (pathname === "/api/sheets/create" && method === "POST") {
      const { name } = body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return errorResponse("ข้อมูลชื่อแท็บไม่ถูกต้อง");
      }
      const cleanName = name.trim();
      const existingSheets = await dbGetSheetNames(hospitalCodeFromHeader);
      if (existingSheets.includes(cleanName)) {
        return errorResponse(`ชื่อแท็บ "${cleanName}" มีในระบบอยู่แล้ว!`);
      }

      await dbCreateSheet(hospitalCodeFromHeader, cleanName);
      const updatedSheets = await dbGetSheetNames(hospitalCodeFromHeader);
      return jsonResponse({ success: true, name: cleanName, sheets: updatedSheets });
    }

    // 21. HOSPITAL DELETE SHEET (POST)
    if (pathname === "/api/sheets/delete" && method === "POST") {
      const { name } = body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return errorResponse("ข้อมูลชื่อแท็บต้องการลบไม่ถูกต้อง");
      }
      const cleanName = name.trim();
      const existingSheets = await dbGetSheetNames(hospitalCodeFromHeader);
      if (!existingSheets.includes(cleanName)) {
        return errorResponse(`ไม่พบข้อมูลแท็บชื่อ "${cleanName}"`, 404);
      }
      if (existingSheets.length <= 1) {
        return errorResponse("ไม่สามารถลบข้อมูลชุดสุดท้ายได้ในขณะนี้ ระบบต้องการให้มีอย่างน้อย 1 ปีประเมินเสมอ");
      }

      await dbDeleteSheet(hospitalCodeFromHeader, cleanName);
      const updatedSheets = await dbGetSheetNames(hospitalCodeFromHeader);
      return jsonResponse({ success: true, deleted: cleanName, sheets: updatedSheets });
    }

    // 22. HOSPITAL GET ASSESSMENTS FOR SELECTED SHEET (GET)
    if (pathname === "/api/assessments" && method === "GET") {
      const sheetName = urlObj.searchParams.get("sheet") || "ปี 2569";
      const data = await dbGetAssessments(hospitalCodeFromHeader, sheetName);
      return jsonResponse(data);
    }

    // 23. HOSPITAL UPDATE INDIVIDUAL ASSESSMENT ITEM (POST)
    if (pathname === "/api/assessments/update" && method === "POST") {
      const { Item_ID, Status, Responsible_Person, Evidence_Link, Auditor_Comment, activeSheetName } = body;
      const sheetName = activeSheetName || "ปี 2569";
      if (!Item_ID) {
        return errorResponse("Missing Item_ID parameter.");
      }

      const currentItems = await dbGetAssessments(hospitalCodeFromHeader, sheetName);
      const idx = currentItems.findIndex(i => i.Item_ID === Item_ID);
      if (idx === -1) {
        return errorResponse(`Assessment item with ID ${Item_ID} not found in sheet ${sheetName}.`, 404);
      }

      const updatedItem = {
        ...currentItems[idx],
        Status: (Status || currentItems[idx].Status) as AssessmentStatus,
        Responsible_Person: Responsible_Person !== undefined ? Responsible_Person : currentItems[idx].Responsible_Person,
        Evidence_Link: Array.isArray(Evidence_Link) ? Evidence_Link : currentItems[idx].Evidence_Link,
        Auditor_Comment: Auditor_Comment !== undefined ? Auditor_Comment : currentItems[idx].Auditor_Comment,
        Last_Update: new Date().toISOString()
      };

      await dbWriteAssessmentItem(hospitalCodeFromHeader, sheetName, updatedItem);
      return jsonResponse({ success: true, updatedItem });
    }

    // 24. HOSPITAL RESET SHEET TO DEFAULT STANDARDS (POST)
    if (pathname === "/api/assessments/reset" && method === "POST") {
      const { activeSheetName } = body;
      const sheetName = activeSheetName || "ปี 2569";
      await dbBatchOverWriteAssessments(hospitalCodeFromHeader, sheetName, initialAssessmentsSanitized);
      return jsonResponse({ success: true, message: `Database reset to default standard successfully.` });
    }

    // 25. HOSPITAL IMPORT BATCH ITEMS (POST)
    if (pathname === "/api/assessments/import" && method === "POST") {
      const { items, activeSheetName } = body;
      const sheetName = activeSheetName || "ปี 2569";
      if (!Array.isArray(items)) {
        return errorResponse("รูปแบบข้อมูลผิดพลาด ( items ต้องเป็นอาเรย์ )");
      }

      const currentItems = await dbGetAssessments(hospitalCodeFromHeader, sheetName);
      items.forEach((imported: any) => {
        const idx = currentItems.findIndex(x => x.Item_ID === imported.Item_ID);
        const updatedItem: AssessmentItem = {
          Main_Category: sanitizeCategory(imported.Main_Category) || "อื่นๆ",
          Sub_Category: imported.Sub_Category || "",
          Item_ID: imported.Item_ID,
          Criteria_Detail: imported.Criteria_Detail || "",
          Success_Indicator: imported.Success_Indicator || "",
          Status: imported.Status || "🔴 ไม่มี",
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

      await dbBatchOverWriteAssessments(hospitalCodeFromHeader, sheetName, currentItems);
      return jsonResponse({ success: true, count: items.length });
    }

    // 25.5 OVERWRITE ALL ASSESSMENTS FOR BULK MODIFICATIONS (POST)
    if (pathname === "/api/assessments/set-all" && method === "POST") {
      const { items, activeSheetName } = body;
      const sheetName = activeSheetName || "ปี 2569";
      if (!Array.isArray(items)) {
        return errorResponse("รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง (ต้องเป็นอาเรย์)");
      }

      const sanitizedItems = items.map((imported: any) => ({
        Main_Category: sanitizeCategory(imported.Main_Category) || "อื่นๆ",
        Sub_Category: imported.Sub_Category || "",
        Item_ID: imported.Item_ID,
        Criteria_Detail: imported.Criteria_Detail || "",
        Success_Indicator: imported.Success_Indicator || "",
        Status: imported.Status || "🔴 ไม่มี",
        Responsible_Person: imported.Responsible_Person || "",
        Evidence_Link: Array.isArray(imported.Evidence_Link) ? imported.Evidence_Link : [],
        Auditor_Comment: imported.Auditor_Comment || "",
        Last_Update: imported.Last_Update || new Date().toISOString()
      }));

      await dbBatchOverWriteAssessments(hospitalCodeFromHeader, sheetName, sanitizedItems);
      return jsonResponse({ success: true, count: sanitizedItems.length });
    }

    // 26. GEMINI ADVISOR SMART COACH (POST)
    if (pathname === "/api/gemini/advisor" && method === "POST") {
      const resObj = {
        advice: `⚠️ **ระบบวิเคราะห์ AI อัจฉริยะแบบฝังตัว (Embed Smart Advisor)**\n\nยินดีต้อนรับเข้าสู่ช่องทางประมวลผลอัจฉริยะ!\n\n💡 **วิเคราะห์และข้อแนะนำเร่งด่วนสำหรับเกณฑ์ข้อนี้:**\n- **เกณฑ์ข้อกำหนด:** \`${body?.currentItemContext?.Criteria_Detail || "ไม่ได้ระบุ"}\`\n- **แนวทางเสริมสรุปหลักฐาน:** แปลงไฟล์ภาพหน้าจอหน้าต่างประมวลผล, บันทึกการคำนวณปริมาณรังสีรักษา, ใบรับรองด้านความปลอดภัยรังสี มอบหมายโดยกรมวิทยาศาสตร์การแพทย์ เข้าทำเป็นไฟล์ PDF หรือโฟลเดอร์ Google Drive แล้วนำลิงก์ที่ตั้งค่าเปิดแชร์เป็นสาธารณะ (เปิดให้สิทธิสำหรับผู้ที่มีลิงก์เข้าดูได้) นำมาแนบในระบบเพื่อให้ผู้ตรวจสแกนเข้าตรวจรับความพร้อมอย่างสูงสุด\n\n*ขอแนะนำอย่างคุ้มค่า, ระบบประสานอัจฉริยะ MOPH X-ray Portal*`,
        actionItems: [
          "อัปโหลดรายงานผลการตรวจสอบและบำรุงรักษาประจำปีใน Google Drive และแชร์สิทธิ์ทุกคนที่เป็นผู้ชม",
          "กรุณากรอกผู้ลงนามรับผิดชอบหรือเบอร์ติดต่อทางขวาของเกณฑ์มาตรฐานข้อนี้",
          "แจ้งปรับสถานะเป็น '🟢 มีครบ' เพื่อส่งสัญญาณไปยังผู้แนะนำระดับภาคของท่าน"
        ]
      };
      return jsonResponse(resObj);
    }

    return errorResponse(`Mock API Route Not Found: ${method} ${pathname}`, 404);
  } catch (err: any) {
    return jsonResponse({ error: "Cloud database interface error: " + err.message }, 500);
  }
}
