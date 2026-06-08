/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssessmentStatus = "🟢 พร้อมรับตรวจ" | "🟡 อยู่ระหว่างปรับปรุง" | "🔴 ยังไม่พร้อม";

export interface AssessmentItem {
  Main_Category: string;       // Column A (Index 0): หมวดหมู่หลัก (หมวด 1 - 9)
  Sub_Category: string;        // Column B (Index 1): หมวดหมู่ย่อย
  Item_ID: string;             // Column C (Index 2): รหัสเกณฑ์ข้อย่อย (e.g. 1.1.1, Key หลัก)
  Criteria_Detail: string;     // Column D (Index 3): รายละเอียดข้อเกณฑ์ตรวจประเมิน
  Success_Indicator: string;   // Column E (Index 4): ตัวชี้วัดความสำเร็จ (กรอบสีเขียว)
  Status: AssessmentStatus;    // Column F (Index 5): สถานะความพร้อม (3 สถานะล็อกเป๊ะ)
  Responsible_Person: string;  // Column G (Index 6): ผู้รับผิดชอบ
  Evidence_Link: string[];     // Column H (Index 7): ลิงก์อ้างอิงหลักฐาน (เซฟในชีทเป็น JSON String Array)
  Auditor_Comment: string;     // Column I (Index 8): บันทึกข้อเสนอแนะคณะผู้ตรวจ (กรอบสีฟ้า)
  Last_Update: string;         // Column J (Index 9): วันเวลาบันทึกข้อมูลล่าสุดอัตโนมัติ (ช่องสีเหลือง)
}

export type AssessmentDatabase = Record<string, AssessmentItem>;

export interface AISessionAnalysis {
  complianceScore: number;
  suggestions: string;
  keyActionItems: string[];
}
