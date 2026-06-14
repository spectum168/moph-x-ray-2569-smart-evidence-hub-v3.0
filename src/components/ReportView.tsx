import React, { useState, useMemo, useEffect } from "react";
import { AssessmentItem, AssessmentStatus } from "../types";
import { 
  Printer, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  User, 
  Award, 
  Building2, 
  Layers, 
  CheckCircle,
  HelpCircle,
  XCircle,
  Sparkles,
  ExternalLink,
  AlertTriangle
} from "lucide-react";

interface ReportViewProps {
  assessments: AssessmentItem[];
  hospital: { code: string; name: string } | null;
}

export function ReportView({ assessments, hospital }: ReportViewProps) {
  // Check if inside an iframe (e.g. within AI Studio code sandbox preview panel)
  const isIframe = useMemo(() => {
    try {
      return typeof window !== "undefined" && window.self !== window.top;
    } catch (e) {
      return true; // fallback
    }
  }, []);

  // Assessment metadata states with localStorage persistence to support seamless transition to New Tab
  const [assessedName, setAssessedName] = useState<string>(() => {
    return localStorage.getItem("moph_rpt_assessedName") || "";
  });
  const [assessedPosition, setAssessedNamePosition] = useState<string>(() => {
    return localStorage.getItem("moph_rpt_assessedPosition") || "หัวหน้าแผนกเอกซเรย์ทางการแพทย์";
  });
  
  const [auditor1Name, setAuditor1Name] = useState<string>(() => {
    return localStorage.getItem("moph_rpt_auditor1Name") || "";
  });
  const [auditor1Position, setAuditor1Position] = useState<string>(() => {
    return localStorage.getItem("moph_rpt_auditor1Position") || "ประธานคณะกรรมการตรวจประเมิน";
  });
  
  const [auditor2Name, setAuditor2Name] = useState<string>(() => {
    return localStorage.getItem("moph_rpt_auditor2Name") || "";
  });
  const [auditor2Position, setAuditor2Position] = useState<string>(() => {
    return localStorage.getItem("moph_rpt_auditor2Position") || "กรรมการตรวจประเมินวิชาชีพ";
  });
  
  // Year-aware default date (2026/2568)
  const [evalDate, setEvalDate] = useState<string>(() => {
    return localStorage.getItem("moph_rpt_evalDate") || "14 มิถุนายน 2568";
  });
  const [overallRemarks, setOverallRemarks] = useState<string>(() => {
    return localStorage.getItem("moph_rpt_overallRemarks") || "";
  });

  // State persistence effects
  useEffect(() => {
    localStorage.setItem("moph_rpt_assessedName", assessedName);
  }, [assessedName]);
  
  useEffect(() => {
    localStorage.setItem("moph_rpt_assessedPosition", assessedPosition);
  }, [assessedPosition]);

  useEffect(() => {
    localStorage.setItem("moph_rpt_auditor1Name", auditor1Name);
  }, [auditor1Name]);

  useEffect(() => {
    localStorage.setItem("moph_rpt_auditor1Position", auditor1Position);
  }, [auditor1Position]);

  useEffect(() => {
    localStorage.setItem("moph_rpt_auditor2Name", auditor2Name);
  }, [auditor2Name]);

  useEffect(() => {
    localStorage.setItem("moph_rpt_auditor2Position", auditor2Position);
  }, [auditor2Position]);

  useEffect(() => {
    localStorage.setItem("moph_rpt_evalDate", evalDate);
  }, [evalDate]);

  useEffect(() => {
    localStorage.setItem("moph_rpt_overallRemarks", overallRemarks);
  }, [overallRemarks]);

  // Filtering which items are shown in printable table
  const [filterStatus, setFilterStatus] = useState<"all" | "ready" | "warning" | "not_ready">("all");
  const [selectedCategorySelect, setSelectedCategorySelect] = useState<string>("ทั้งหมด");

  // Get distinct categories
  const categoriesList = useMemo(() => {
    const list = Array.from(new Set(assessments.map(i => i.Main_Category))).filter(Boolean);
    return ["ทั้งหมด", ...list];
  }, [assessments]);

  // Statistics calculation
  const totalCount = assessments.length;
  const readyCount = assessments.filter(i => i.Status === "🟢 พร้อมรับตรวจ").length;
  const warningCount = assessments.filter(i => i.Status === "🟡 อยู่ระหว่างปรับปรุง").length;
  const notReadyCount = assessments.filter(i => i.Status === "🔴 ยังไม่พร้อม").length;
  
  const completionPercentage = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.round((readyCount / totalCount) * 100);
  }, [totalCount, readyCount]);

  // Category breakdown stats
  const categoryStats = useMemo(() => {
    const breakdown: Record<string, { total: number; ready: number; warning: number; not_ready: number }> = {};
    assessments.forEach(item => {
      const cat = item.Main_Category || "อื่นๆ";
      if (!breakdown[cat]) {
        breakdown[cat] = { total: 0, ready: 0, warning: 0, not_ready: 0 };
      }
      breakdown[cat].total += 1;
      if (item.Status === "🟢 พร้อมรับตรวจ") breakdown[cat].ready += 1;
      else if (item.Status === "🟡 อยู่ระหว่างปรับปรุง") breakdown[cat].warning += 1;
      else breakdown[cat].not_ready += 1;
    });
    return breakdown;
  }, [assessments]);

  // Filtered items for display table
  const displayedItems = useMemo(() => {
    return assessments.filter(item => {
      // Category filter
      if (selectedCategorySelect !== "ทั้งหมด" && item.Main_Category !== selectedCategorySelect) {
        return false;
      }
      // Status filter
      if (filterStatus === "ready" && item.Status !== "🟢 พร้อมรับตรวจ") return false;
      if (filterStatus === "warning" && item.Status !== "🟡 อยู่ระหว่างปรับปรุง") return false;
      if (filterStatus === "not_ready" && item.Status !== "🔴 ยังไม่พร้อม") return false;
      return true;
    });
  }, [assessments, selectedCategorySelect, filterStatus]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
      
      {/* ==========================================
          ON-SCREEN CONTROL DASHBOARD (HIDDEN ON PRINT)
          ========================================== */}
      <div className="bg-gradient-to-r from-amber-50 to-stone-50 border border-amber-200/60 rounded-2xl p-6 shadow-sm flex flex-col gap-6 print:hidden shrink-0">
        
        {/* Safe Iframe Sandboxing Print Alert */}
        {isIframe && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex gap-3">
              <span className="p-2 bg-rose-100 rounded-lg text-rose-700 self-start sm:self-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
              </span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-rose-900">⚠️ ตรวจพบข้อจำกัดความปลอดภัยของเบราว์เซอร์ (iFrame Blocked)</h4>
                <p className="text-[11px] text-rose-700 leading-normal max-w-4xl">
                  ขณะนี้โปรแกรมกำลังแสดงผลอยู่ภายในหน้าต่างพรีวิวของ <strong>AI Studio (iFrame)</strong> ซึ่งบราวเซอร์จะบล็อกคำสั่งสั่งพิมพ์หรือหน้าต่าง PDF ของระบบเพื่อความปลอดภัย หากท่านพบว่าปุ่มด้านขวา "เริ่มบันทึกรายงานผ่าน Google PDF" กดแล้วไม่มีอะไรคืบหน้า 
                  กรุณาคลิกปุ่ม <strong>"เปิดในแท็บใหม่เต็มหน้าจอ"</strong> สีเขียวขวามือได้เลย ระบบจะโคลนข้อมูลรายชื่อที่พิมพ์ค้างไว้ไปแสดงผลหน้าต่างเต็มบราวเวอร์ให้ทันทีโดยไม่ต้องป้อนใหม่ และสามารถสั่งพิมพ์/เซฟเป็น PDF ได้คมชัดจริง 100%
                </p>
              </div>
            </div>
            
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black py-2.5 px-4.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shrink-0 self-stretch sm:self-auto hover:scale-[1.01] active:scale-[0.99] text-center"
            >
              <ExternalLink className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span>🌐 เปิดโปรแกรมในแท็บใหม่เต็มจอเพื่อบันทึก PDF</span>
            </a>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#5A5A40]" />
              หน้าสร้างรายงานการตรวจประเมินอัจฉริยะ (Assessment PDF Builder)
            </h2>
            <p className="text-xs text-gray-500 leading-normal">
              ป้อนข้อมูลผู้รับการตรวจและผู้ประเมิน เพื่อประทับตราประธานผู้ตรวจประเมิน 2 ท่านท้ายเอกสาร โดยระบบจะแปลงสถิติคะแนนจริงในชีทมาแสดงแบบเรียลไทม์
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start md:self-auto shrink-0">
            {isIframe && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <ExternalLink className="w-4.5 h-4.5 text-emerald-250 animate-pulse" />
                <span>🌐 เปิดโปรแกรมแท็บใหม่เต็มจอเพื่อบันทึก PDF</span>
              </a>
            )}
            
            <button
              onClick={handlePrint}
              className="bg-[#5A5A40] hover:bg-[#4a4a35] text-white text-xs font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-4.5 h-4.5 text-amber-300" />
              <span>🖨️ เริ่มบันทึกรายงานผ่าน Google PDF (แนะนำ คมชัดสูงสุด 100%)</span>
            </button>
          </div>
        </div>

        {/* ==========================================
            GUIDE STEPS FOR GOOGLE PRINT-AS-PDF (HIDDEN ON PRINT)
            ========================================== */}
        <div className="bg-[#5A5A40]/5 border border-[#5A5A40]/15 rounded-xl p-4 md:p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between text-xs text-gray-700 leading-relaxed print:hidden">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#5A5A40] text-amber-300 text-[10px] font-black uppercase tracking-wider">
                🌟 วิธีบันทึกเป็น PDF ที่สวยคมกริบแบบเวกเตอร์
              </span>
              <span className="text-[11px] text-[#5A5A40] font-bold">แนะนำโดย Google Chrome</span>
            </div>
            
            <p className="font-bold text-gray-800 text-[13px]">
              คำแนะนำ: เพื่อรายงานการตรวจประเมินรูปแบบ A4 ที่สวยงาม ไร้รอบต่อ และตัวอักษรคมชัดสูงสุด
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 text-[11px] text-gray-650">
              <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
                <span className="font-black text-[#5A5A40] block mb-1">ขั้นตอนที่ 1</span>
                คลิกปุ่ม <strong className="text-gray-800">"เริ่มบันทึกรายงานด้านบน"</strong> ระบบจะรวบรวมข้อมูลทั้งหมดเป็นเล่ม A4 อัจฉริยะทันที
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
                <span className="font-black text-[#5A5A40] block mb-1">ขั้นตอนที่ 2</span>
                ในกล่องพิมพ์เบราว์เซอร์ เลือกปลายทาง (Destination) เป็น <strong className="text-emerald-700">"บันทึกเป็น PDF" (Save as PDF)</strong>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
                <span className="font-black text-[#5A5A40] block mb-1">ขั้นตอนที่ 3 (สำคัญ ⚠️)</span>
                คลิก "ตั้งค่าเพิ่มเติม" ติ๊กถูกที่ <strong className="text-[#5A5A40]">"กราฟิกพื้นหลัง" (Background graphics)</strong> และเอาติ๊กถูกที่ "หัวกระดาษ/ท้ายกระดาษ" ออก
              </div>
            </div>
          </div>
          
          <button
            onClick={handlePrint}
            className="bg-[#5A5A40] hover:bg-[#4a4a35] text-white text-xs font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shrink-0 self-stretch md:self-auto hover:scale-[1.01] cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>เปิดหน้าต่างพิมพ์เบราว์เซอร์</span>
          </button>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Section 1: Assessed facility/person */}
          <div className="bg-white border border-gray-150 p-4 rounded-xl space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-[#5A5A40] flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <User className="w-4 h-4" />
              ส่วนที่ 1: ผู้รับการตรวจประเมิน
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">ชื่อสถาบัน/โรงพยาบาล</label>
                <div className="px-3 py-1.5 bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200">
                  {hospital?.name || "ไม่ทราบสถาบัน"} ({hospital?.code})
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">ชื่อผู้รับการตรวจประเมิน</label>
                <input
                  type="text"
                  value={assessedName}
                  onChange={(e) => setAssessedName(e.target.value)}
                  placeholder="ป้อนชื่อผู้รับตรวจ เช่น พญ. สุดารัตน์ ทวีสุข"
                  className="w-full px-3 py-1.5 focus:bg-white bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">ตำแหน่งทางวิชาชีพ</label>
                <input
                  type="text"
                  value={assessedPosition}
                  onChange={(e) => setAssessedNamePosition(e.target.value)}
                  placeholder="เช่น หัวหน้าแผนกรังสีวิทยา"
                  className="w-full px-3 py-1.5 focus:bg-white bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Assessor 1 */}
          <div className="bg-white border border-gray-150 p-4 rounded-xl space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-[#5A5A40] flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Award className="w-4 h-4 text-amber-500" />
              ส่วนที่ 2: ผู้ตรวจประเมินท่านที่ 1
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">ชื่อผู้ตรวจท่านที่ 1 (ประธาน/อาวุโส)</label>
                <input
                  type="text"
                  value={auditor1Name}
                  onChange={(e) => setAuditor1Name(e.target.value)}
                  placeholder="ป้อนชื่อผู้ตรวจ เช่น นพ. วีระศักดิ์ ศิริรักษ์"
                  className="w-full px-3 py-1.5 focus:bg-white bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">ตำแหน่งหัวหน้าคณะผู้พิจารณา</label>
                <input
                  type="text"
                  value={auditor1Position}
                  onChange={(e) => setAuditor1Position(e.target.value)}
                  placeholder="เช่น ผู้ทรงคุณวุฒิด้านรังสี กระทรวงฯ"
                  className="w-full px-3 py-1.5 focus:bg-white bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">วันที่ตรวจประเมินผล</label>
                <input
                  type="text"
                  value={evalDate}
                  onChange={(e) => setEvalDate(e.target.value)}
                  className="w-full px-3 py-1.5 focus:bg-white bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Assessor 2 */}
          <div className="bg-white border border-gray-150 p-4 rounded-xl space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-[#5A5A40] flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Award className="w-4 h-4 text-emerald-500" />
              ส่วนที่ 3: ผู้ตรวจประเมินท่านที่ 2
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">ชื่อผู้ตรวจท่านที่ 2</label>
                <input
                  type="text"
                  value={auditor2Name}
                  onChange={(e) => setAuditor2Name(e.target.value)}
                  placeholder="ป้อนชื่อผู้ตรวจ เช่น ดร. กอบเกียรติ สุนทรวิทย์"
                  className="w-full px-3 py-1.5 focus:bg-white bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">ตำแหน่งกรรมการผู้พิจารณา</label>
                <input
                  type="text"
                  value={auditor2Position}
                  onChange={(e) => setAuditor2Position(e.target.value)}
                  placeholder="เช่น นักฟิสิกส์การแพทย์ชำนาญการพิเศษ"
                  className="w-full px-3 py-1.5 focus:bg-white bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">ข้อคิดเห็นหลักฐานภาพรวม (แสดงใน PDF)</label>
                <input
                  type="text"
                  value={overallRemarks}
                  onChange={(e) => setOverallRemarks(e.target.value)}
                  placeholder="เช่น แผนกผ่านเกณฑ์มาตรฐานในระดับยอดเยี่ยม"
                  className="w-full px-3 py-1.5 focus:bg-white bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Filtering Options & Mini Instructions */}
        <div className="bg-[#5A5A40]/5 border border-[#5A5A40]/15 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 text-xs text-stone-700">
          <div className="space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-900 leading-none">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              คำชี้แนะการจัดทำเอกสาร PDF:
            </span>
            <p className="text-[11px] text-stone-600 leading-normal">
              เพื่อให้รายงานพิมพ์แบบมีคุณภาพไร้ขอบกวนใจ กรุณาตรวจสอบให้แน่ใจว่าได้เลือก <strong>"Margins: None"</strong> (ไม่มีขอบ หรือ Default) และ <strong>"Background graphics: Enabled"</strong> (เปิดให้แสดงผลกราฟิกและสีรหัสสถานะพื้นหลัง) ในแผงควบคุมการพิมพ์พิมพ์ของเบราว์เซอร์
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <div>
              <span className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest leading-none mb-1 text-right">เลือกพาร์ทหมวดหมู่</span>
              <select
                value={selectedCategorySelect}
                onChange={(e) => setSelectedCategorySelect(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg text-xs font-semibold py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-stone-850"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <span className="block text-[9px] font-bold text-stone-500 uppercase tracking-widest leading-none mb-1 text-right">กรองสถานะแสดงที่ตาราง</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-white border border-gray-300 rounded-lg text-xs font-semibold py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#5A5A40]"
              >
                <option value="all">แสดงทุกสถานะ</option>
                <option value="ready">🟢 เฉพาะที่ผ่านพร้อมตรวจ</option>
                <option value="warning">🟡 เฉพาะที่รอปรับปรุง</option>
                <option value="not_ready">🔴 เฉพาะที่ยังไม่พร้อม</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* ==========================================
          ELEGANT printable A4 REPORT PAGE
          ========================================== */}
      <div 
        className="flex-1 bg-white border border-gray-250 p-6 sm:p-10 shadow-md rounded-2xl max-w-4xl mx-auto w-full font-serif text-stone-900 leading-relaxed overflow-y-visible print:border-none print:shadow-none print:p-0 print:max-w-full"
        id="printable-evaluation-report"
      >
        
        {/* Government Style Header inside report PDF */}
        <div className="text-center space-y-3 pb-8 border-b-2 border-stone-800">
          
          {/* Centered Thai Ministry Emblem placeholder (Emblem visual representation) */}
          <div className="mx-auto w-20 h-20 bg-stone-100 rounded-full border border-stone-300 flex items-center justify-center relative overflow-hidden shadow-inner print:border-stone-400 mb-2">
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-700/30 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-emerald-800" />
            </div>
            {/* Seal Ring */}
            <span className="absolute text-[6px] text-emerald-900 font-bold uppercase tracking-widest text-center inset-1 flex items-center justify-center rounded-full border border-emerald-800/10 pointer-events-none">
              MOPH THAILAND
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-md sm:text-lg font-bold text-stone-950 uppercase tracking-wide font-sans">
              เอกสารรับรองรายงานผลการตรวจประเมินตนเอง
            </h1>
            <h2 className="text-sm font-bold text-stone-850 font-sans">
              มาตรฐานระบบคุณภาพบริการทางรังสีวิทยาทางการแพทย์ ประจำปีงบประมาณ พ.ศ. 2568
            </h2>
            <p className="text-xs text-stone-600 font-sans">
              ด้านรังสีวินิจฉัยและรังสีร่วมรักษา • สำนักเครื่องมือแพทย์ กรมวิทยาศาสตร์การแพทย์ กระทรวงสาธารณสุข
            </p>
          </div>
        </div>

        {/* Document Metadata Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-b border-stone-150 text-xs font-sans text-stone-750">
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="font-bold text-stone-900 min-w-36">สถานบริการที่เข้ารับตรวจ:</span>
              <span className="border-b border-dotted border-stone-400 flex-1 truncate">{hospital?.name || "-"}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-bold text-stone-900 min-w-36">รหัสทะเบียนโรงพยาบาล:</span>
              <span className="border-b border-dotted border-stone-400 flex-1 font-mono">{hospital?.code || "-"}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-bold text-stone-900 min-w-36">เครือข่ายผู้ตรวจรับรอง (Upline):</span>
              <span className="border-b border-dotted border-stone-400 flex-1 capitalize">{(hospital as any)?.upline || "auditor"}</span>
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="font-bold text-stone-900 min-w-36">ผู้รับการประเมิน:</span>
              <span className="border-b border-dotted border-stone-400 flex-1">{assessedName || "......................................................."}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-bold text-stone-900 min-w-36">ตำแหน่งผู้รับการประเมิน:</span>
              <span className="border-b border-dotted border-stone-400 flex-1">{assessedPosition || "......................................................."}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-bold text-stone-900 min-w-36">วันที่ออกเอกสาร:</span>
              <span className="border-b border-dotted border-stone-400 flex-1">{evalDate || "......................................................."}</span>
            </p>
          </div>
        </div>

        {/* Overall Statistics Compliance Cards */}
        <div className="py-6 border-b border-stone-150 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest font-sans">
              📊 สรุปสถิติผลการตรวจวิเคราะห์ความพร้อม (Executive Readiness Scores)
            </h3>
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ความสมบูรณ์ {completionPercentage}%
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl print:bg-transparent">
              <div className="text-xs text-stone-500 font-sans">จำนวนตัวชี้วัดทั้งหมด</div>
              <div className="text-lg font-bold font-mono tracking-tight text-stone-850 mt-1">{totalCount} ข้อ</div>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl print:bg-transparent print:border-stone-300">
              <div className="text-xs text-emerald-700 font-sans font-bold flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                พร้อมรับตรวจ (🟢)
              </div>
              <div className="text-lg font-bold font-mono tracking-tight text-emerald-800 mt-1">{readyCount} ข้อ</div>
            </div>
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl print:bg-transparent print:border-stone-300">
              <div className="text-xs text-amber-700 font-sans font-bold flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                อยู่ระหว่างปรับปรุง (🟡)
              </div>
              <div className="text-lg font-bold font-mono tracking-tight text-amber-800 mt-1">{warningCount} ข้อ</div>
            </div>
            <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl print:bg-transparent print:border-stone-300">
              <div className="text-xs text-rose-700 font-sans font-bold flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                ยังไม่พร้อม (🔴)
              </div>
              <div className="text-lg font-bold font-mono tracking-tight text-rose-800 mt-1">{notReadyCount} ข้อ</div>
            </div>
          </div>

          {/* Category Progress Stats List inside PDF */}
          <div className="bg-stone-50/50 border border-stone-200 rounded-xl p-4 text-[11px] space-y-2.5 font-sans print:border-none print:p-0">
            <h4 className="font-bold text-stone-800 text-xs border-b border-stone-200 pb-1 mb-2">อัตราสถิติแยกตามหมวดหมู่หลัก (Category Statistics Summary)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-stone-700">
              {Object.entries(categoryStats).map(([catName, stats]: [string, any]) => {
                const pct = stats.total > 0 ? Math.round((stats.ready / stats.total) * 100) : 0;
                return (
                  <div key={catName} className="flex items-center justify-between gap-4 py-0.5 border-b border-stone-100 last:border-0">
                    <span className="truncate max-w-[240px] font-medium" title={catName}>{catName}</span>
                    <span className="font-mono text-stone-650 flex items-center gap-1.5 font-semibold shrink-0">
                      <span>{stats.ready}/{stats.total} ผ่าน</span>
                      <span className="text-[10px] text-emerald-700">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall Comments Header block inside A4 print copy */}
          {overallRemarks && (
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-stone-850 font-sans text-xs flex flex-col gap-1 print:bg-transparent print:border-stone-300">
              <span className="font-bold text-blue-900 uppercase tracking-widest text-[9.5px]">บันทึกบทสรุปกองวิชาการตรวจประเมินขอบข่ายทั่วไป</span>
              <p className="italic text-stone-800">" {overallRemarks} "</p>
            </div>
          )}

        </div>

        {/* Detailed Criteria Table */}
        <div className="py-6 space-y-4">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-widest font-sans">
            📝 บัญชีแยกรายละเอียดข้อเกณฑ์และเกรดประเมิน ({displayedItems.length} รายการ)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-sans text-left border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100 text-stone-850 border-b border-stone-350">
                  <th className="border border-stone-300 px-2 py-2 text-center w-12 font-bold shrink-0">รหัสข้อ</th>
                  <th className="border border-stone-300 px-3 py-2 font-bold max-w-sm">รายละเอียดตัวเกณฑ์มาตรฐาน (2568)</th>
                  <th className="border border-stone-300 px-2 py-2 text-center w-24 font-bold shrink-0">สถานะประเมิน</th>
                  <th className="border border-stone-300 px-2 py-2 w-32 font-bold">คอมเมนท์พิจารณา / ไฟล์แนบอ้างอิง</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-stone-500 italic border border-stone-400">
                      ไม่พบข้อมูลเกณฑ์ที่เข้าข่ายกับตัวกรองในแผ่นแท็บขณะนี้
                    </td>
                  </tr>
                ) : (
                  displayedItems.map(item => {
                    let statusColor = "text-stone-700 bg-stone-50 border-stone-200";
                    let simpleStatusText = "ยังไม่พร้อม (🔴)";
                    if (item.Status === "🟢 พร้อมรับตรวจ") {
                      statusColor = "text-emerald-800 bg-emerald-50/60 border-emerald-250";
                      simpleStatusText = "พร้อมรับตรวจ (🟢)";
                    } else if (item.Status === "🟡 อยู่ระหว่างปรับปรุง") {
                      statusColor = "text-amber-800 bg-amber-50/60 border-amber-250";
                      simpleStatusText = "รอปรับปรุง (🟡)";
                    }
                    
                    return (
                      <tr key={item.Item_ID} className="border-b border-stone-250 hover:bg-stone-50/40">
                        <td className="border border-stone-300 px-1 py-1.5 text-center font-mono font-bold align-top">
                          {item.Item_ID}
                        </td>
                        <td className="border border-stone-300 px-2 py-1.5 text-stone-800 leading-normal align-top">
                          <p className="font-semibold text-[10px] text-stone-500 mb-0.5">{item.Sub_Category}</p>
                          <p>{item.Criteria_Detail}</p>
                          {item.Success_Indicator && (
                            <div className="mt-1 text-[9.5px] border-l-2 border-emerald-600 bg-emerald-50/20 px-2 py-0.5 text-emerald-800 italic">
                              <strong>ตัวชี้วัดสำเร็จ:</strong> {item.Success_Indicator}
                            </div>
                          )}
                        </td>
                        <td className="border border-stone-300 px-1 py-1.5 text-center font-sans align-top">
                          <span className={`inline-block px-1.5 py-0.5 text-[9.5px] rounded border font-bold ${statusColor} print:bg-transparent print:border-none print:p-0 print:text-stone-850`}>
                            {simpleStatusText}
                          </span>
                        </td>
                        <td className="border border-stone-300 px-2 py-1.5 text-stone-700 leading-relaxed font-sans align-top space-y-1">
                          {item.Auditor_Comment ? (
                            <p className="text-blue-900 bg-blue-50/40 p-1.5 rounded text-[10px] border border-blue-100 print:bg-transparent print:border-none print:p-0">
                              <strong>ข้อแนะ:</strong> {item.Auditor_Comment}
                            </p>
                          ) : (
                            <p className="text-gray-400 italic text-[10px]">ไม่มีข้อบันทึกแนะ</p>
                          )}
                          
                          {item.Evidence_Link && item.Evidence_Link.length > 0 && (
                            <div className="text-[9.5px] space-y-0.5">
                              <span className="block font-bold text-stone-605">🔗 แฟ้มงานหลักฐาน:</span>
                              {item.Evidence_Link.map((lnk, li) => (
                                <a 
                                  key={li} 
                                  href={lnk} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="block text-emerald-700 underline truncate max-w-36 hover:text-emerald-900 print:text-stone-900"
                                >
                                  หลักฐานที่ {li + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Endorsement signature block as requested */}
        <div className="pt-8 mt-12 border-t border-stone-800 space-y-8 page-break-inside-avoid">
          <div className="text-center text-xs font-sans text-stone-700 max-w-xl mx-auto leading-relaxed">
            <p>
              กองคณะอนุกรรมการตรวจรับรองคุณสมบัติทางกระทรวงสาธารณสุข ขอลงลายมือชื่อพยานความสมบูรณ์
            </p>
            <p>
              ในการจัดทำคำขอประเมินด้วยมาตรฐานระบบงานรังสีการแพทย์ 2568 ฉบับสมบูรณ์ความพร้อมตามบัญชีแนบท้องเรื่อง ณ วันที่ตรวจรับรองข้างต้น
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 font-sans text-xs">
            
            {/* Endorsement Slot 1: Assessed Person */}
            <div className="flex flex-col items-center justify-between text-center space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">
                  ผู้รับการประเมิน
                </p>
                <div className="w-48 border-b-2 border-stone-300 pt-10 pb-1"></div>
              </div>
              <div className="space-y-0.5 text-stone-800">
                <p className="font-bold">
                  ({assessedName || "......................................................."})
                </p>
                <p className="text-[10px] text-stone-600 truncate max-w-44">
                  ตำแหน่ง: {assessedPosition || "หัวหน้าแผนกรังสีวิทยา"}
                </p>
              </div>
            </div>

            {/* Endorsement Slot 2: Auditor 1 */}
            <div className="flex flex-col items-center justify-between text-center space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">
                  ผู้ตรวจประเมินท่านที่ 1
                </p>
                <div className="w-48 border-b-2 border-stone-300 pt-10 pb-1 text-center">
                  {/* Digital Signature representation if they filled a name */}
                  {auditor1Name && (
                    <span className="font-serif italic text-emerald-800 p-0 text-[10px] animate-pulse">
                      / {auditor1Name} / (ประทับ)
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-0.5 text-stone-800">
                <p className="font-bold">
                  ({auditor1Name || "......................................................."})
                </p>
                <p className="text-[10px] text-stone-600 truncate max-w-44">
                  ตำแหน่ง: {auditor1Position || "ประธานผู้ตรวจประเมิน"}
                </p>
              </div>
            </div>

            {/* Endorsement Slot 3: Auditor 2 */}
            <div className="flex flex-col items-center justify-between text-center space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1">
                  ผู้ตรวจประเมินท่านที่ 2
                </p>
                <div className="w-48 border-b-2 border-stone-300 pt-10 pb-1 text-center">
                  {/* Digital Signature representation if they filled a name */}
                  {auditor2Name && (
                    <span className="font-serif italic text-emerald-800 p-0 text-[10px] animate-pulse">
                      / {auditor2Name} / (ประทับ)
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-0.5 text-stone-800">
                <p className="font-bold">
                  ({auditor2Name || "......................................................."})
                </p>
                <p className="text-[10px] text-stone-600 truncate max-w-44">
                  ตำแหน่ง: {auditor2Position || "กรรมการร่วมวิชาชีพ"}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Document Footer Metadata */}
        <div className="text-center text-[10px] text-gray-500 pt-12 mt-8 font-sans font-mono border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
          <span>เอกสารถูกผลิตขึ้นมาโดยอัตโนมัติจาก MOPH X-ray Smart Evidence Hub</span>
          <span>หน้า 1 จาก 1</span>
        </div>

      </div>

    </div>
  );
}
