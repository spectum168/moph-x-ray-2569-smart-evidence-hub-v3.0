import React, { useState } from "react";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Database,
  Layers,
  ArrowRight,
  FileSpreadsheet,
  Grid,
  Users,
  CheckSquare,
  Sparkles
} from "lucide-react";
import { AssessmentItem, AssessmentStatus } from "../types";
import { motion } from "motion/react";

interface DashboardViewProps {
  assessments: AssessmentItem[];
  onSelectCategory: (category: string) => void;
  onSwitchTab: (tab: "workspace" | "dashboard") => void;
}

export default function DashboardView({
  assessments,
  onSelectCategory,
  onSwitchTab
}: DashboardViewProps) {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  // Aggregate stats
  const totalItems = assessments.length;
  const readyItems = assessments.filter((i) => i.Status === "🟢 มีครบ" || i.Status === "🟢 พร้อมรับตรวจ").length;
  const inProgressItems = assessments.filter((i) => i.Status === "🟡 มีบางส่วน" || i.Status === "🟡 อยู่ระหว่างปรับปรุง").length;
  const notReadyItems = assessments.filter((i) => i.Status === "🔴 ไม่มี" || i.Status === "🔴 ยังไม่พร้อม").length;
  const naItems = assessments.filter((i) => i.Status === "⚪ N/A ไม่เกี่ยวข้อง").length;
  
  const applicableItems = totalItems - naItems;
  const completionPercentage = applicableItems > 0 ? Math.round((readyItems / applicableItems) * 100) : 0;
  const progressPercentage = applicableItems > 0 ? Math.round((inProgressItems / applicableItems) * 100) : 0;
  const pendingPercentage = applicableItems > 0 ? Math.round((notReadyItems / applicableItems) * 100) : 0;
  const naPercentage = totalItems > 0 ? Math.round((naItems / totalItems) * 100) : 0;

  // Group metrics by main category
  const categoriesList = [...new Set(assessments.map(item => item?.Main_Category || "ไม่ระบุหมวด"))].sort();
  
  const categoriesWithMetrics = categoriesList.map(catName => {
    const itemsInCat = assessments.filter(item => (item?.Main_Category || "ไม่ระบุหมวด") === catName);
    const total = itemsInCat.length;
    const ready = itemsInCat.filter(item => item?.Status === "🟢 มีครบ" || item?.Status === "🟢 พร้อมรับตรวจ").length;
    const inProgress = itemsInCat.filter(item => item?.Status === "🟡 มีบางส่วน" || item?.Status === "🟡 อยู่ระหว่างปรับปรุง").length;
    const notReady = itemsInCat.filter(item => item?.Status === "🔴 ไม่มี" || item?.Status === "🔴 ยังไม่พร้อม").length;
    const na = itemsInCat.filter(item => item?.Status === "⚪ N/A ไม่เกี่ยวข้อง").length;
    const applicable = total - na;
    const score = applicable > 0 ? Math.round((ready / applicable) * 100) : 0;
    
    return {
      name: catName,
      total,
      ready,
      inProgress,
      notReady,
      na,
      score
    };
  });

  // Hotspot categories (highest count of red/pending status)
  const hotspotCategories = [...categoriesWithMetrics]
    .filter(cat => cat.notReady > 0 || cat.inProgress > 0)
    .sort((a, b) => b.notReady - a.notReady || b.inProgress - a.inProgress)
    .slice(0, 3);

  // Clean category display name
  const getCleanCategoryNumRef = (catName?: string) => {
    if (!catName) return "ไม่ระบุหมวด";
    try {
      const match = catName.match(/^(\d+)/);
      return match ? `หมวดที่ ${match[1]}` : catName;
    } catch {
      return String(catName);
    }
  };

  const handleCategoryClick = (catName: string) => {
    onSelectCategory(catName);
    onSwitchTab("workspace");
  };

  // Pie chart variables
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dash arrays
  const readyStroke = (readyItems / (totalItems || 1)) * circumference;
  const inProgressStroke = (inProgressItems / (totalItems || 1)) * circumference;
  const notReadyStroke = (notReadyItems / (totalItems || 1)) * circumference;

  const readyOffset = circumference;
  const inProgressOffset = circumference - readyStroke;
  const notReadyOffset = circumference - readyStroke - inProgressStroke;

  return (
    <div className="space-y-6">
      
      {/* 📊 Top row summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Large Left circular pie/donut visual card */}
        <div className="md:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-[#FFD700]" />
              สัดส่วนมาตรฐานความปลอดภัย
            </h3>
            <p className="text-xs text-gray-500">
              วิเคราะห์อัตราการเคลียร์เกณฑ์ประเมินจาก Google Sheet
            </p>
          </div>

          <div className="my-6 flex items-center justify-center relative">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-gray-100 fill-none"
                strokeWidth="14"
              />
              
              {/* Ready status segment */}
              {readyItems > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-emerald-600 fill-none transition-all duration-500 hover:stroke-width-16 cursor-pointer"
                  strokeWidth="14"
                  strokeDasharray={`${readyStroke} ${circumference}`}
                  strokeDashoffset={readyOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredStatus("ready")}
                  onMouseLeave={() => setHoveredStatus(null)}
                />
              )}

              {/* In Progress status segment */}
              {inProgressItems > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-amber-500 fill-none transition-all duration-500 hover:stroke-width-16 cursor-pointer"
                  strokeWidth="14"
                  strokeDasharray={`${inProgressStroke} ${circumference}`}
                  strokeDashoffset={inProgressOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredStatus("inprogress")}
                  onMouseLeave={() => setHoveredStatus(null)}
                />
              )}

              {/* Not Ready status segment */}
              {notReadyItems > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="stroke-rose-600 fill-none transition-all duration-500 hover:stroke-width-16 cursor-pointer"
                  strokeWidth="14"
                  strokeDasharray={`${notReadyStroke} ${circumference}`}
                  strokeDashoffset={notReadyOffset}
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredStatus("notready")}
                  onMouseLeave={() => setHoveredStatus(null)}
                />
              )}
            </svg>
            
            {/* Value overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold font-mono text-gray-800">
                {completionPercentage}%
              </span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                ผ่านเกณฑ์แล้ว
              </span>
            </div>
          </div>

          {/* Interactive Legends */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className={`flex items-center justify-between p-1.5 rounded-lg transition-colors text-xs ${hoveredStatus === "ready" ? "bg-emerald-50" : ""}`}>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-emerald-600 rounded-full inline-block"></span>
                <span className="font-medium text-gray-700">🟢 มีครบ</span>
              </div>
              <span className="font-mono font-bold text-gray-800">{readyItems} ข้อ ({completionPercentage}%)</span>
            </div>

            <div className={`flex items-center justify-between p-1.5 rounded-lg transition-colors text-xs ${hoveredStatus === "inprogress" ? "bg-amber-50" : ""}`}>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-amber-500 rounded-full inline-block"></span>
                <span className="font-medium text-gray-700">🟡 มีบางส่วน</span>
              </div>
              <span className="font-mono font-bold text-gray-800">{inProgressItems} ข้อ ({progressPercentage}%)</span>
            </div>

            <div className={`flex items-center justify-between p-1.5 rounded-lg transition-colors text-xs ${hoveredStatus === "notready" ? "bg-rose-50" : ""}`}>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-rose-600 rounded-full inline-block"></span>
                <span className="font-medium text-gray-700">🔴 ไม่มี</span>
              </div>
              <span className="font-mono font-bold text-gray-800">{notReadyItems} ข้อ ({pendingPercentage}%)</span>
            </div>

            <div className={`flex items-center justify-between p-1.5 rounded-lg transition-colors text-xs ${hoveredStatus === "na" ? "bg-slate-50" : ""}`}>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-slate-400 rounded-full inline-block"></span>
                <span className="font-medium text-gray-700">⚪ N/A ไม่เกี่ยวข้อง</span>
              </div>
              <span className="font-mono font-bold text-gray-800">{naItems} ข้อ ({naPercentage}%)</span>
            </div>
          </div>

        </div>

        {/* Categories Level Stacked bar chart panel */}
        <div className="md:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-[#FFD700]" />
                สัดส่วนจำแนกตามแต่ละหมวดประเมิน (Index 0: Main Category)
              </h3>
              <span className="text-[10px] text-gray-500 italic bg-[#f5f5f0] px-2 py-0.5 rounded border border-gray-200">
                รวมทั้งหมด {categoriesList.length} หมวดหลัก
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              คลิกที่ชื่อหมวดหลักด้านล่าง เพื่อเข้าไปตรวจทานและแก้ไขรายละเอียดพร้อมแนบหลักฐานข้อกำหนดรายข้อย่อย
            </p>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {categoriesWithMetrics.map((cat, idx) => {
              // Calculate percent split width
              const readyPct = cat.total > 0 ? (cat.ready / cat.total) * 100 : 0;
              const progressPct = cat.total > 0 ? (cat.inProgress / cat.total) * 100 : 0;
              const notReadyPct = cat.total > 0 ? (cat.notReady / cat.total) * 100 : 0;
              const naPct = cat.total > 0 ? (cat.na / cat.total) * 100 : 0;

              return (
                <div key={idx} className="group/item">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <button
                      onClick={() => handleCategoryClick(cat.name)}
                      className="font-semibold text-[#5A5A40] hover:text-[#FFD700] hover:underline flex items-center gap-1 cursor-pointer transition-all text-left"
                    >
                      <span className="font-mono bg-[#5A5A40]/10 text-[#5A5A40] group-hover/item:bg-[#5A5A40] group-hover/item:text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {getCleanCategoryNumRef(cat.name)}
                      </span>
                      <span className="truncate max-w-[240px] text-gray-700 font-sans font-medium text-[11px] ml-1">
                        {cat.name.replace(/^\d+[\s.]*/, "")}
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold text-gray-500">
                        {cat.ready}/{cat.total} มีครบ
                      </span>
                      <span className="font-bold font-mono text-[#5A5A40] bg-[#f5f5f0] px-1.5 py-0.2 rounded text-[10px] border border-gray-200">
                        {cat.score}%
                      </span>
                    </div>
                  </div>

                  {/* Stacked quadruple status bar */}
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner relative group cursor-pointer"
                       title={`🟢 มีครบ: ${cat.ready} | 🟡 มีบางส่วน: ${cat.inProgress} | 🔴 ไม่มี: ${cat.notReady} | ⚪ N/A: ${cat.na}`}
                       onClick={() => handleCategoryClick(cat.name)}>
                    
                    {/* Green */}
                    {cat.ready > 0 && (
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300 hover:brightness-110"
                        style={{ width: `${readyPct}%` }}
                      />
                    )}

                    {/* Yellow */}
                    {cat.inProgress > 0 && (
                      <div
                        className="bg-amber-400 h-full transition-all duration-300 hover:brightness-110"
                        style={{ width: `${progressPct}%` }}
                      />
                    )}

                    {/* Red */}
                    {cat.notReady > 0 && (
                      <div
                        className="bg-rose-500 h-full transition-all duration-300 hover:brightness-110"
                        style={{ width: `${notReadyPct}%` }}
                      />
                    )}

                    {/* Grey */}
                    {cat.na > 0 && (
                      <div
                        className="bg-slate-300 h-full transition-all duration-300 hover:brightness-110"
                        style={{ width: `${naPct}%` }}
                      />
                    )}

                    {/* Overlay count on hover */}
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-[#5A5A40]/90 text-white text-[9px] font-bold flex items-center justify-center transition-opacity duration-200">
                      มีครบ: {cat.ready} • มีบางส่วน: {cat.inProgress} • ไม่มี: {cat.notReady} • N/A: {cat.na} (คลิกดูรายการ)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* 🚀 Middle Executive Recommendation Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Spotlighting target items requiring attention */}
        <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
                จุดเฝ้าระวังความเสี่ยงสูง (High Priority Action Plan)
              </h3>
              <p className="text-xs text-gray-500">
                หมวดหมู่เกณฑ์ประเมินที่ยังมีรายการสถานะ "🔴 ไม่มี" ค้างอยู่มากที่สุด จำเป็นต้องเร่งประสานผู้รับผิดชอบ
              </p>
            </div>
            
            <button
              onClick={() => {
                onSelectCategory("ทั้งหมด");
                onSwitchTab("workspace");
              }}
              className="text-[#5A5A40] hover:text-[#FFD700] text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <span>ดูข้อมูลทั้งหมด</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hotspotCategories.length === 0 ? (
              <div className="col-span-3 text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                🎉 ยินดีด้วย! ทุกหมวดการประเมินสอดคล้องและผ่านหมด 100% เรียบร้อยแล้ว
              </div>
            ) : (
              hotspotCategories.map((hotspot, i) => (
                <div
                  key={i}
                  className="border border-gray-200 bg-[#f5f5f0]/30 hover:bg-[#f5f5f0]/50 rounded-xl p-4 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 uppercase">
                        เฝ้าระวังอันดับ {i + 1}
                      </span>
                      <span className="text-[10px] font-mono bg-white border border-gray-200 px-1.5 rounded text-gray-500 font-semibold">
                        ไม่มี {hotspot.notReady} ข้อ
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-800 line-clamp-2 min-h-[32px] font-sans">
                      {hotspot.name}
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">
                      คะแนนความก้าวหน้า
                    </span>
                    <span className="text-xs font-bold font-mono text-[#5A5A40]">
                      {hotspot.score}%
                    </span>
                  </div>

                  <button
                    onClick={() => handleCategoryClick(hotspot.name)}
                    className="mt-3 bg-[#5A5A40] hover:bg-[#4a4a35] text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <span>เข้าไปมอบหมายงาน</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Compliance Summary Card */}
        <div className="lg:col-span-4 bg-[#5A5A40] text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#4a4a35] border border-[#6b6b4d] text-[#FFD700] uppercase tracking-wider px-2 py-0.5 rounded font-mono">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD700] animate-pulse" />
              AI Executive Summary
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              สรุปคำชี้แนะระดับบริหาร 2569
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              จากการวิเคราะห์ฐานข้อมูลแบบองค์รวม: สถานะปัจจุบันพบลำดับเร่งด่วนใน{" "}
              <span className="text-[#FFD700] font-bold">หมวดที่ 2 และหมวดที่ 5</span> แนะนำให้เจ้าหน้าที่ผู้รับผิดชอบเร่งจัดอัปโหลดไฟล์ "สแกนหลักฐานพนักงาน RSO" และ "ภาพแผงป้องรังสีห้องทดสอบ" เพื่อดันอัตราความพร้อมรวมข้ามผ่านเกณฑ์มาตรฐานกระทรวงสาธารณสุข 80% (ปัจจุบันอยู่ที่ {completionPercentage}%)
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#6b6b4d]/80 text-[11px] text-amber-200 leading-normal flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#FFD700] mt-0.5" />
            <span>
              <strong>สิทธิ์การเข้าถึงลิงก์:</strong> ลิงก์เก็บข้อมูลใน Column H ควรกำหนดคุณสมบัติเป็นไฟล์แชร์สาธารณะ (Google Drive - Anyone with link can view) เพื่อให้สมาคมนักฟิสิกส์มีคะแนนตรวจรับรองรวดเร็ว
            </span>
          </div>
        </div>

      </div>

      {/* 📋 Section 4: Mini Table report view of categories details */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#5A5A40] uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
              ตารางสรุปเกณฑ์มาตรฐานรายหมวด (MOPH Self-Assessment Grid Summary)
            </h3>
            <p className="text-xs text-gray-500">
              รายละเอียดสถิติและคะแนนแต่ละหมวดความสอดคล้องตามมาตรฐานตรวจประเมิน
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase font-semibold">
                <th className="py-2.5 px-3">หมวดตามมาตรฐาน (Index 0)</th>
                <th className="py-2.5 px-3 text-center">รหัสประเมินทั้งหมด</th>
                <th className="py-2.5 px-3 text-emerald-700 text-center">🟢 มีครบ</th>
                <th className="py-2.5 px-3 text-amber-600 text-center">🟡 มีบางส่วน</th>
                <th className="py-2.5 px-3 text-rose-600 text-center">🔴 ไม่มี</th>
                <th className="py-2.5 px-3 text-slate-500 text-center">⚪ N/A</th>
                <th className="py-2.5 px-3 text-right">ความก้าวหน้าหน่วยงาน</th>
              </tr>
            </thead>
            <tbody>
              {categoriesWithMetrics.map((cat, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-3 font-medium text-gray-800">
                    <button
                      onClick={() => handleCategoryClick(cat.name)}
                      className="hover:text-[#5A5A40] hover:underline cursor-pointer font-bold text-left"
                    >
                      {cat.name}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium text-gray-600">
                    {cat.total}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-700 bg-emerald-50/20 font-bold">
                    {cat.ready}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-amber-600 bg-amber-50/20 font-bold">
                    {cat.inProgress}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-rose-600 bg-rose-50/20 font-bold">
                    {cat.notReady}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-500 bg-slate-50/25 font-bold border-l border-r border-gray-100">
                    {cat.na}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${
                      cat.score >= 80
                        ? "bg-emerald-100 text-emerald-800"
                        : cat.score >= 40
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {cat.score}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
