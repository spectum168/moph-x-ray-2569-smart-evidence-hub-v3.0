/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Search, ShieldAlert, BookOpen, FileCheck, CheckCircle2, AlertCircle, 
  RefreshCw, LayoutDashboard, Database, HelpCircle, ArrowRight, Eye, Download,
  Sparkles
} from "lucide-react";
import { clientFetch as fetch } from "../clientStorage";

interface HospitalSummary {
  code: string;
  name: string;
  createdAt?: string;
  progressPercent?: number; // Estimated progress if available
  completedSections?: number;
}

interface AuditorPortalProps {
  onLogoutAuditor: () => void;
  onInspectHospital: (hospital: { code: string; name: string }) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function AuditorPortal({ onLogoutAuditor, onInspectHospital, showToast }: AuditorPortalProps) {
  const [hospitals, setHospitals] = useState<HospitalSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  let auditorCreds: any = {};
  try {
    auditorCreds = JSON.parse(sessionStorage.getItem("moph_auditor_creds") || "{}");
  } catch (err) {
    console.error("Failed to parse auditor credentials from sessionStorage:", err);
  }
  const { username = "", password = "" } = auditorCreds;

  const fetchHospitalsList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auditor/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHospitals(data.hospitals || []);
      } else {
        showToast(data.error || "ไม่สามารถดึงข้อมูลรายการตรวจประเมินได้", "error");
      }
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาดทางเครือข่าย: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (username && password) {
      fetchHospitalsList();
    } else {
      onLogoutAuditor();
    }
  }, []);

  // Filter list
  const filteredHospitals = hospitals.filter(h => {
    const query = searchQuery.trim().toLowerCase();
    return (
      h.code.toLowerCase().includes(query) ||
      h.name.toLowerCase().includes(query)
    );
  });

  const handleExportSummary = () => {
    try {
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + ["รหัสโรงพยาบาล,ชื่อหน่วยงาน,วันที่เข้าร่วมระบบ"].join(",") + "\n"
        + filteredHospitals.map(h => `"${h.code}","${h.name}","${h.createdAt ? new Date(h.createdAt).toLocaleDateString("th-TH") : "-"}"`).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `moph_auditor_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("📊 ส่งออกรายงาน CSV เรียบร้อยแล้ว!", "success");
    } catch (e: any) {
      showToast("ไม่สามารถสร้างรายงานได้: " + e.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#333333] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Auditor Header Bar */}
      <header className="bg-[#466964] text-white py-4 px-6 border-b border-[#3b5753] shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD700] p-2 rounded-xl text-stone-900 shadow-inner shrink-0">
              <FileCheck className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] font-bold tracking-widest text-[#FFD700] uppercase bg-[#2e4541] border border-[#3b5753] px-2 py-0.5 rounded">
                  MOPH Regional Auditor Portal
                </span>
                <span className="text-[10px] text-teal-300 font-mono font-bold">
                  (@{username})
                </span>
                <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping"></span>
              </div>
              <h1 className="text-base font-bold tracking-tight text-white mt-1">
                บัญชีผู้แนะนำ: {username === "auditor" ? "ผู้ประเมินหลักของเขต" : (auditorCreds.name || "ผู้ประเมินรหัส " + username)}
              </h1>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportSummary}
              className="bg-[#2e4541] hover:bg-[#253734] border border-[#3b5753] text-xs text-amber-100 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer font-semibold transition w-full sm:w-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกตารางตรวจประเมิน</span>
            </button>

            <button
              onClick={onLogoutAuditor}
              className="bg-[#b33a3a] hover:bg-[#962e2e] text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition shadow-sm w-full sm:w-auto"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-yellow-300" />
              <span>ออกจากระบบผู้ประเมิน</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* 🔗 MLM Downline Invite Link Card */}
        <div className="bg-gradient-to-r from-[#466964] to-[#2e4541] rounded-xl text-white p-6 shadow-md border border-[#3b5753] relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5">
            <Database className="w-48 h-48" />
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="bg-yellow-400 text-stone-900 text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded font-sans flex items-center gap-1 w-fit animate-pulse">
                <Sparkles className="w-3 h-3 text-stone-900" />
                ลิงค์สมัครดาวน์ไลน์ส่วนตัวของคุณ (Custom Downline Link)
              </span>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>🔗 ลิงค์สมัครดาวน์ไลน์สำหรับรับสมัครหน่วยงานในทีมของคุณ: {username}</span>
              </h2>
              <p className="text-xs text-teal-100 max-w-2xl leading-relaxed">
                คัดลอกลิงก์เฉพาะนี้ส่งให้กับหน่วยงาน/โรงพยาบาลในเครือเพื่อระบบจะตั้งให้โรงพยาบาลดังกล่าวเป็นดาวน์ไลน์สายงานตรงในสายการดูแลตรวจสอบของคุณอัติโนมัติเมื่อเขากรอกสมัคร!
              </p>
              <div className="bg-[#21322f] px-3 py-2 rounded-lg border border-[#253734] flex items-center justify-between gap-2 max-w-xl font-mono text-[11px] text-teal-200 overflow-x-auto truncate">
                <span>{(() => {
                  const baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, "").replace(/\/?$/, "/");
                  return baseUrl + "?ref=" + username + "&mode=register";
                })()}</span>
              </div>
            </div>
            <button
              onClick={() => {
                const baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, "").replace(/\/?$/, "/");
                const inviteUrl = baseUrl + "?ref=" + username + "&mode=register";
                navigator.clipboard.writeText(inviteUrl);
                showToast("📋 คัดลอกลิงค์สมัครดาวน์ไลน์เรียบร้อยแล้ว!", "success");
              }}
              className="bg-yellow-400 hover:bg-yellow-350 text-stone-900 px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition shrink-0 uppercase tracking-wide border-b-2 border-yellow-600"
            >
              <span>คัดลอกลิงค์สมัครดาวน์ไลน์</span>
            </button>
          </div>
        </div>
        
        {/* Helper Top Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center text-[#466964]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">สถาบันที่เตรียมรับการตรวจ</p>
              <p className="text-xl font-bold">{hospitals.length} โรงพยาบาลสมาชิก</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center text-yellow-700">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">บทบาทสมาชิกในระบบ</p>
              <p className="text-sm font-bold text-teal-800">🕵️ ผู้ตรวจประเมินคณะกรรมการ</p>
            </div>
          </div>
          <div className="bg-[#466964] rounded-xl text-white p-4 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-10">
              <FileCheck className="w-24 h-24 stroke-1" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-yellow-300 uppercase font-sans">หน้าที่ผู้ตรวจประเมิน</p>
              <p className="text-[11px] leading-relaxed opacity-90 font-medium">
                ให้กดปุ่ม "และเข้าตรวจเกณฑ์" เพื่อเปิดดูไฟล์เอกสารหลักฐานอ้างอิง และทำการบันทึกข้อเสนอแนะในการตอบแบบสอบถามระบบอัจฉริยะแบบแยกสิทธิ์
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96 select-none">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อโรงพยาบาลหรือรหัสหน่วยงาน..."
              className="w-full bg-gray-50 border border-gray-200 pl-9 pr-4 py-1.5 text-xs rounded-lg placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#466964] transition"
            />
          </div>

          <button
            onClick={fetchHospitalsList}
            disabled={isLoading}
            className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 border border-gray-200 px-4 py-1.5 rounded-lg text-stone-700 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>คำนวณและรีโหลดความคืบหน้า</span>
          </button>
        </div>

        {/* Hospitals Table List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfcf9] border-b border-gray-200 text-stone-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">สัญลักษณ์</th>
                  <th className="p-4">รหัสโรงพยาบาล (Code)</th>
                  <th className="p-4">ชื่อสถาบันพยาบาลสมาชิกระดับเขต</th>
                  <th className="p-4">วันที่ลงทะเบียนร่วมงาน</th>
                  <th className="p-4 w-36 text-right">การตรวจสอบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-xs">
                {filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 font-sans">
                      🔍 ไม่พบข้อมูลโรงพยาบาลหรือคำค้นหาไม่สอดคล้องกับพอร์ตของผู้ประเมิน
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map((hospital) => {
                    const hospitalShort = hospital.name.replace(/^(โรงพยาบาล|รพ\.)/, "").slice(0, 2);
                    return (
                      <tr key={hospital.code} className="hover:bg-gray-50/40 transition">
                        {/* Circle Short banner */}
                        <td className="p-4 text-center">
                          <span className="w-8 h-8 rounded-full bg-[#466964]/10 text-[#466964] font-bold text-[10px] flex items-center justify-center tracking-tight">
                            {hospitalShort}
                          </span>
                        </td>

                        {/* ID */}
                        <td className="p-4 font-mono font-semibold text-gray-700">
                          <span className="bg-gray-100 border border-gray-200/50 px-2.5 py-0.5 rounded text-[11px] block w-fit">
                            {hospital.code}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="p-4 font-bold text-stone-800 text-[13px]">
                          {hospital.name}
                        </td>

                        {/* Date Registered */}
                        <td className="p-4 text-stone-500 font-mono text-[11px]">
                          {hospital.createdAt 
                            ? new Date(hospital.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) 
                            : "ตั้งต้นระบบ"}
                        </td>

                        {/* Control View */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => onInspectHospital({ code: hospital.code, name: hospital.name })}
                            className="bg-[#466964] hover:bg-[#324b47] text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
                          >
                            <Eye className="w-3.5 h-3.5 text-yellow-300" />
                            <span>ตรวจประเมิน</span>
                            <ArrowRight className="w-3 h-3 text-white/70" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions footer for auditor */}
        <div className="bg-[#eef5f4] border border-teal-250 rounded-xl p-5 shadow-sm space-y-2">
          <h4 className="font-bold text-xs text-[#466964] flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>แนวทางปฏิบัติตนสำหรับผู้ตรวจประเมินเขตสุขภาพ (Auditor Protocol):</span>
          </h4>
          <ul className="text-xs text-[#2e4541] space-y-1.5 pl-5 list-disc leading-relaxed">
            <li>
              <strong>การรักษาความมั่นคงปลอดภัย:</strong> สิทธิ์ผู้ประเมินใช้สำหรับเรียกดูแฟ้มตอบข้อมูล และไฟล์อัปโหลด เพื่อให้คำแนะนำในการรับรองระบบสถาบันอย่างยุติธรรม โดย<strong>ไม่สามารถมองเห็นความลับรหัสผ่านของโรงพยาบาลได้</strong> เพื่อความปลอดภัยด้านไอทีสูงสุด
            </li>
            <li>
              <strong>การตอบเสนอแนะรายข้อหลักฐาน:</strong> สลับเข้าระบบด้วยปุ่ม "ตรวจประเมิน" สีเขียวด้านบนเพื่อป้อนบันทึกแนะนำเพิ่มเติมรายข้อในช่องคำแนะนำ และพิมพ์เป็นเช็คลิสต์ตรวจงานทางการ
            </li>
          </ul>
        </div>

      </main>
    </div>
  );
}
