import React, { useState } from "react";
import { AssessmentItem, AssessmentStatus } from "../types";
import {
  Printer,
  Info,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  Building,
  Users,
  MapPin,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

interface ReportViewProps {
  assessments: AssessmentItem[];
  hospital: { code: string; name: string } | null;
}

export default function ReportView({ assessments, hospital }: ReportViewProps) {
  // --- Form Local States ---
  // Part 1: Institution Info
  const [hospitalName, setHospitalName] = useState("");
  const [province, setProvince] = useState("");
  const [bedSize, setBedSize] = useState("");
  const [assessmentDate, setAssessmentDate] = useState("");

  // Part 2: Auditor 1 (President)
  const [auditor1Name, setAuditor1Name] = useState("");
  const [auditor1Id, setAuditor1Id] = useState("");
  const [auditor1Position, setAuditor1Position] = useState("");
  const [auditor1Org, setAuditor1Org] = useState("");

  // Part 3: Auditor 2
  const [auditor2Name, setAuditor2Name] = useState("");
  const [auditor2Id, setAuditor2Id] = useState("");
  const [auditor2Position, setAuditor2Position] = useState("");
  const [auditor2Org, setAuditor2Org] = useState("");

  // --- Statistics Calculation ---
  const totalItems = assessments.length;
  const readyItems = assessments.filter(
    (i) => i.Status === "🟢 มีครบ" || i.Status === "🟢 พร้อมรับตรวจ"
  ).length;
  const inProgressItems = assessments.filter(
    (i) => i.Status === "🟡 มีบางส่วน" || i.Status === "🟡 อยู่ระหว่างปรับปรุง"
  ).length;
  const notReadyItems = assessments.filter(
    (i) => i.Status === "🔴 ไม่มี" || i.Status === "🔴 ยังไม่พร้อม"
  ).length;
  const naItems = assessments.filter(
    (i) => i.Status === "⚪ N/A ไม่เกี่ยวข้อง"
  ).length;

  const applicableItems = totalItems - naItems;
  const completionPercentage =
    applicableItems > 0 ? Math.round((readyItems / applicableItems) * 100) : 0;

  // --- Print Handler ---
  const handlePrint = () => {
    window.print();
  };

  // Status rendering utility (styled beautifully with borders like in screenshot)
  const renderStatusBadge = (status: AssessmentStatus) => {
    const isReady = status === "🟢 มีครบ" || status === "🟢 พร้อมรับตรวจ";
    const isInProgress = status === "🟡 มีบางส่วน" || status === "🟡 อยู่ระหว่างปรับปรุง";
    const isNa = status === "⚪ N/A ไม่เกี่ยวข้อง";

    if (isReady) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs">
          มีครบ ( 🟢 )
        </span>
      );
    } else if (isInProgress) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-amber-300 bg-amber-50 text-amber-800 shadow-xs">
          มีบางส่วน ( 🟡 )
        </span>
      );
    } else if (isNa) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-gray-300 bg-gray-50 text-gray-600">
          N/A ( ⚪ )
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-red-300 bg-red-50 text-red-800 shadow-xs">
          ไม่มี ( 🔴 )
        </span>
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* =========================================================================
          CONTROL PANEL (Hidden on Print)
          ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print:hidden space-y-6">
        {/* Title area */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-gray-150">
          <div>
            <h2 className="text-lg font-bold text-[#5A5A40] flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#FFD700]" />
              หน้าสร้างรายงานการตรวจประเมินอัจฉริยะ (Assessment PDF Builder)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              ป้อนข้อมูลผู้รับการตรวจประเมินและผู้ประเมิน เพื่อประทับตราประธานผู้ตรวจประเมิน 2 ท่านท้ายเอกสาร โดยระบบจะแปลงสถิติคะแนนจริงในชีทมาแสดงแบบเรียลไทม์
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="px-5 py-3 rounded-xl text-xs font-bold bg-[#5A5A40] text-white hover:bg-[#484832] transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#FFD700]" />
            <span>🖨️ เริ่มบันทึกรายงานผ่าน Google PDF (แนะนำ คมชัดสูงสุด 100%)</span>
          </button>
        </div>

        {/* Dynamic Guidelines Card */}
        <div className="bg-yellow-50/70 border border-yellow-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
              🌟 วิธีบันทึกเป็น PDF ที่สวยคมกริบแบบเวกเตอร์
            </span>
            <span className="text-[11px] text-amber-700 font-bold">
              แนะนำโดย Google Chrome
            </span>
          </div>
          <p className="text-xs text-gray-700 font-medium">
            คำแนะนำ: เพื่อรายงานการตรวจประเมินรูปแบบ A4 ที่สวยงาม ไร้รอยต่อ และตัวอักษรคมชัดสูงสุด
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/80 p-3 rounded-lg border border-yellow-100 space-y-1">
                <span className="text-xs font-bold text-amber-600 block">ขั้นตอนที่ 1</span>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  คลิกปุ่ม &quot;เริ่มบันทึกรายงานด้านบน&quot; ระบบจะรวบรวมข้อมูลทั้งหมดเป็นเล่ม A4 อัจฉริยะทันที
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-yellow-100 space-y-1">
                <span className="text-xs font-bold text-amber-600 block">ขั้นตอนที่ 2</span>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  ในกล่องพิมพ์เบราว์เซอร์ เลือกปลายทาง (Destination) เป็น <span className="font-bold text-emerald-600">&quot;บันทึกเป็น PDF&quot; (Save as PDF)</span>
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-yellow-100 space-y-1">
                <span className="text-xs font-bold text-amber-600 block">ขั้นตอนที่ 3 (สำคัญ ⚠️)</span>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  คลิก &quot;ตั้งค่าเพิ่มเติม&quot; ติ๊กถูกที่ <span className="font-bold text-amber-700">&quot;กราฟฟิกพื้นหลัง&quot;</span> และเอาติ๊กถูกที่ &quot;หัวกระดาษ/ท้ายกระดาษ&quot; ออก
                </p>
              </div>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                onClick={handlePrint}
                className="w-full md:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold bg-gray-800 text-white hover:bg-gray-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>เปิดหน้าต่างพิมพ์เบราว์เซอร์</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inputs forms divided into 3 column blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Part 1: Institution Info */}
          <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#5A5A40] flex items-center gap-1.5 uppercase tracking-wider">
              <Building className="w-4 h-4 text-amber-500" />
              ส่วนที่ 1: ผู้รับการตรวจประเมิน
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">ชื่อสถาบัน/โรงพยาบาล</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">จังหวัด</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">ขนาดเตียง (ถ้ามี)</label>
                <input
                  type="text"
                  value={bedSize}
                  onChange={(e) => setBedSize(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">วันที่ทำการตรวจประเมิน</label>
                <input
                  type="text"
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Part 2: Auditor 1 (President) */}
          <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#5A5A40] flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-500" />
              ส่วนที่ 2: ผู้ตรวจประเมินท่านที่ 1
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">ชื่อผู้ตรวจท่านที่ 1 (ประธาน/อาวุโส)</label>
                <input
                  type="text"
                  value={auditor1Name}
                  onChange={(e) => setAuditor1Name(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-emerald-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">ทะเบียน/รหัสประจำตัว</label>
                <input
                  type="text"
                  value={auditor1Id}
                  onChange={(e) => setAuditor1Id(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">ตำแหน่ง/ฝ่าย</label>
                <input
                  type="text"
                  value={auditor1Position}
                  onChange={(e) => setAuditor1Position(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">สังกัดหน่วยงาน</label>
                <input
                  type="text"
                  value={auditor1Org}
                  onChange={(e) => setAuditor1Org(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
            </div>
          </div>

          {/* Part 3: Auditor 2 */}
          <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#5A5A40] flex items-center gap-1.5 uppercase tracking-wider">
              <Users className="w-4 h-4 text-blue-500" />
              ส่วนที่ 3: ผู้ตรวจประเมินท่านที่ 2
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">ชื่อผู้ตรวจท่านที่ 2</label>
                <input
                  type="text"
                  value={auditor2Name}
                  onChange={(e) => setAuditor2Name(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-blue-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">ทะเบียน/รหัสประจำตัว</label>
                <input
                  type="text"
                  value={auditor2Id}
                  onChange={(e) => setAuditor2Id(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">ตำแหน่ง/ฝ่าย</label>
                <input
                  type="text"
                  value={auditor2Position}
                  onChange={(e) => setAuditor2Position(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">สังกัดหน่วยงาน</label>
                <input
                  type="text"
                  value={auditor2Org}
                  onChange={(e) => setAuditor2Org(e.target.value)}
                  autoComplete="off"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINTABLE CONTAINER (A4 FORMAT)
          ========================================================================= */}
      <div
        id="printable-evaluation-report"
        className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6 text-gray-900 font-sans print:border-none print:shadow-none print:p-0 print:space-y-8"
      >
        {/* Printable Header */}
        <div className="text-center space-y-2 pb-6 border-b-2 border-gray-900">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 uppercase">
            รายงานการตรวจประเมินความพร้อมและมาตรฐานบริการรังสีวิทยาและรังสีร่วมรักษา
          </h1>
          <p className="text-sm font-semibold text-gray-700">
            สำนักมาตรฐานบริการรังสีวิทยา ร่วมกับ กรมวิทยาศาสตร์การแพทย์
          </p>
          
          <div className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-left text-xs bg-gray-50 p-4 rounded-xl print:bg-transparent print:border print:border-gray-300 print:rounded-none">
            <div>
              <span className="font-bold text-gray-550 block uppercase text-[10px]">สถาบัน/โรงพยาบาล</span>
              <span className="font-bold text-gray-900 text-sm">{hospitalName}</span>
            </div>
            <div>
              <span className="font-bold text-gray-550 block uppercase text-[10px]">จังหวัดที่ตั้ง</span>
              <span className="font-semibold text-gray-850 text-sm">{province}</span>
            </div>
            <div>
              <span className="font-bold text-gray-550 block uppercase text-[10px]">ขนาดการให้บริการ</span>
              <span className="font-semibold text-gray-850 text-sm">{bedSize}</span>
            </div>
            <div>
              <span className="font-bold text-gray-550 block uppercase text-[10px]">วันที่ออกตรวจประเมิน</span>
              <span className="font-bold text-gray-900 text-sm">{assessmentDate}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Statistics Block */}
        <div className="space-y-3 page-break-inside-avoid">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            📊 สถิติอัตราความสอดคล้องตามมาตรฐาน (Compliance Overview)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="border border-gray-200 rounded-xl p-4 text-center print:rounded-none">
              <span className="text-[10px] font-bold text-gray-500 block">เกณฑ์ประเมินทั้งหมด</span>
              <span className="text-2xl font-black text-gray-900">{totalItems} ข้อ</span>
            </div>
            <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 text-center print:rounded-none">
              <span className="text-[10px] font-bold text-emerald-700 block">มีครบถ้วน (🟢)</span>
              <span className="text-2xl font-black text-emerald-800">{readyItems} ข้อ</span>
            </div>
            <div className="border border-amber-200 bg-amber-50/20 rounded-xl p-4 text-center print:rounded-none">
              <span className="text-[10px] font-bold text-amber-700 block">มีบางส่วน (🟡)</span>
              <span className="text-2xl font-black text-amber-800">{inProgressItems} ข้อ</span>
            </div>
            <div className="border border-red-200 bg-red-50/20 rounded-xl p-4 text-center print:rounded-none">
              <span className="text-[10px] font-bold text-red-700 block">ยังไม่มี (🔴)</span>
              <span className="text-2xl font-black text-red-800">{notReadyItems} ข้อ</span>
            </div>
            <div className="border border-gray-300 bg-gray-50 rounded-xl p-4 text-center print:rounded-none col-span-2 md:col-span-1 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-[#5A5A40] block">อัตราความสอดคล้อง</span>
              <span className="text-2xl font-black text-[#5A5A40]">{completionPercentage}%</span>
            </div>
          </div>
        </div>

        {/* 116 Items Detailed Evaluation Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-300">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              📝 บัญชีแยกรายละเอียดข้อเกณฑ์และเกรดประเมิน ({totalItems} รายการ)
            </h2>
            <span className="text-[11px] font-bold text-gray-500">
              สถานะ: ดึงข้อมูลอัตโนมัติแบบเรียลไทม์
            </span>
          </div>

          {/* Table representing the 116 items */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                  <th className="px-4 py-3 w-[80px] border-r border-gray-300 text-center">รหัสข้อ</th>
                  <th className="px-4 py-3 border-r border-gray-300">รายละเอียดตัวเกณฑ์มาตรฐาน (2569)</th>
                  <th className="px-4 py-3 w-[130px] border-r border-gray-300 text-center">สถานะประเมิน</th>
                  <th className="px-4 py-3 w-[300px]">คอมเมนท์พิจารณา / ไฟล์แนบอ้างอิง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs text-gray-800">
                {assessments.map((item) => {
                  const hasComment = item.Auditor_Comment && item.Auditor_Comment.trim() !== "";
                  const hasLinks = item.Evidence_Link && item.Evidence_Link.length > 0;

                  return (
                    <tr key={item.Item_ID} className="align-top hover:bg-gray-50/50 print:hover:bg-transparent">
                      <td className="px-4 py-3 font-mono font-bold text-center border-r border-gray-300 text-[11px]">
                        {item.Item_ID}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-300 leading-relaxed font-sans font-medium text-gray-900">
                        <span className="text-gray-400 text-[10px] font-semibold block mb-0.5 uppercase">
                          {item.Sub_Category}
                        </span>
                        {item.Criteria_Detail}
                      </td>
                      <td className="px-4 py-3 text-center border-r border-gray-300 whitespace-nowrap">
                        {renderStatusBadge(item.Status)}
                      </td>
                      <td className="px-4 py-3 space-y-2 leading-relaxed">
                        {/* Auditor Comment */}
                        {hasComment ? (
                          <div className="bg-sky-50 text-sky-850 p-2.5 rounded-lg border border-sky-200 text-[11px] font-sans shadow-sm font-semibold print:border-sky-300 print:bg-sky-50/50">
                            <span className="text-sky-700 block font-bold mb-0.5">ข้อแนะนำ:</span>
                            {item.Auditor_Comment}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">ไม่มีข้อบันทึกแนะ</span>
                        )}

                        {/* Evidence Files links */}
                        {hasLinks && (
                          <div className="text-[11px] space-y-1 pt-1 border-t border-gray-100">
                            <span className="text-gray-500 font-bold block">🔗 แฟ้มงานหลักฐาน:</span>
                            <div className="flex flex-wrap gap-2">
                              {item.Evidence_Link.map((link, idx) => (
                                <a
                                  key={idx}
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#5A5A40] hover:underline font-bold inline-flex items-center gap-0.5 print:text-gray-800"
                                >
                                  หลักฐานที่ {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 page-break-inside-avoid">
          {/* Auditor 1 Signature Block */}
          <div className="text-center space-y-4 max-w-[340px] mx-auto">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              ประธานผู้ตรวจประเมินท่านที่ 1
            </p>
            <div className="border-b border-dashed border-gray-500 pt-8 w-full"></div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-900">
                ( {auditor1Name} )
              </p>
              <p className="text-xs text-gray-600 font-semibold">{auditor1Position}</p>
              <p className="text-[11px] text-gray-500">{auditor1Org}</p>
              {auditor1Id && (
                <p className="text-[10px] text-gray-400 font-mono">รหัสทะเบียน: {auditor1Id}</p>
              )}
            </div>
          </div>

          {/* Auditor 2 Signature Block */}
          <div className="text-center space-y-4 max-w-[340px] mx-auto">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              ผู้ตรวจประเมินท่านที่ 2
            </p>
            <div className="border-b border-dashed border-gray-500 pt-8 w-full"></div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-900">
                ( {auditor2Name} )
              </p>
              <p className="text-xs text-gray-600 font-semibold">{auditor2Position}</p>
              <p className="text-[11px] text-gray-500">{auditor2Org}</p>
              {auditor2Id && (
                <p className="text-[10px] text-gray-400 font-mono">รหัสทะเบียน: {auditor2Id}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
