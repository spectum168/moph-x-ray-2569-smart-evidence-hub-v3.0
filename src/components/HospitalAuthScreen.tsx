/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Building2, Key, ShieldCheck, RefreshCw, KeyRound, Sparkles, LogIn, UserPlus, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clientFetch as fetch } from "../clientStorage";

interface HospitalAuthScreenProps {
  onAuthSuccess: (hospital: { code: string; name: string }) => void;
  onAdminSuccess: () => void;
  onAuditorSuccess: () => void;
}

export default function HospitalAuthScreen({ onAuthSuccess, onAdminSuccess, onAuditorSuccess }: HospitalAuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "admin" | "auditor">("login");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [upline, setUpline] = useState<string>("auditor");

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("moph_remember_me") !== "false";
  });

  // Sync remembered credentials when activeTab or rememberMe changes
  useEffect(() => {
    if (rememberMe) {
      let savedCode = "";
      let savedPassword = "";
      if (activeTab === "login" || activeTab === "register") {
        savedCode = localStorage.getItem("moph_remembered_hospital_code") || "";
        savedPassword = localStorage.getItem("moph_remembered_hospital_password") || "";
      } else if (activeTab === "auditor") {
        savedCode = localStorage.getItem("moph_remembered_auditor_username") || "";
        savedPassword = localStorage.getItem("moph_remembered_auditor_password") || "";
      } else if (activeTab === "admin") {
        savedCode = localStorage.getItem("moph_remembered_admin_username") || "";
        savedPassword = localStorage.getItem("moph_remembered_admin_password") || "";
      }
      setCode(savedCode);
      setPassword(savedPassword);
    } else {
      setCode("");
      setPassword("");
    }
  }, [activeTab, rememberMe]);

  // Automatically switch tab based on URL parameters or hashes for separate link entries
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") || params.get("role");
    const ref = params.get("ref") || params.get("upline");
    const hash = window.location.hash;

    if (ref) {
      setUpline(ref.trim().toLowerCase());
    }

    if (mode === "auditor" || hash === "#auditor" || hash === "#/auditor") {
      setActiveTab("auditor");
    } else if (mode === "admin" || hash === "#admin" || hash === "#/admin") {
      setActiveTab("admin");
    } else if (mode === "register" || hash === "#register" || hash === "#/register" || ref) {
      setActiveTab("register");
    }
  }, []);

  // Query server to auto-generate a unique suggested hospital code
  const handleSuggestCode = async () => {
    setIsSuggesting(true);
    setError(null);
    try {
      const res = await fetch("/api/hospitals/suggest-code");
      if (res.ok) {
        const data = await res.json();
        setCode(data.code || "");
        setSuccess(`💡 แนะนำรหัส "${data.code}" ให้ทดลองใช้ (คุณสามารถปรับเปลี่ยนเองได้)`);
      } else {
        setError("ไม่สามารถขอรหัสแนะนำได้ในขณะนี้");
      }
    } catch (err: any) {
      setError("ข้อผิดพลาดเครือข่าย: " + err.message);
    } finally {
      setIsSuggesting(false);
    }
  };

  // Submit Sign In or Sign Up Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const trimmedPassword = password.trim();

    if (!trimmedCode || !trimmedPassword) {
      setError("กรุณากรอกข้อมูลเพื่อระบุตัวตนและรหัสผ่านเข้าใช้งาน");
      return;
    }

    if (activeTab === "register" && !trimmedName) {
      setError("กรุณากรอกชื่อสถาบัน/โรงพยาบาล");
      return;
    }

    setIsLoading(true);

    try {
      let endpoint = "/api/hospitals/login";
      if (activeTab === "register") {
        endpoint = "/api/hospitals/register";
      } else if (activeTab === "admin") {
        endpoint = "/api/admin/login";
      } else if (activeTab === "auditor") {
        endpoint = "/api/auditor/login";
      }

      const payload = activeTab === "login"
        ? { code: trimmedCode, password: trimmedPassword }
        : activeTab === "register"
          ? { code: trimmedCode, name: trimmedName, password: trimmedPassword, upline: upline }
          : { username: trimmedCode, password: trimmedPassword };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        if (rememberMe) {
          localStorage.setItem("moph_remember_me", "true");
          if (activeTab === "login" || activeTab === "register") {
            localStorage.setItem("moph_remembered_hospital_code", trimmedCode);
            localStorage.setItem("moph_remembered_hospital_password", trimmedPassword);
          } else if (activeTab === "auditor") {
            localStorage.setItem("moph_remembered_auditor_username", trimmedCode);
            localStorage.setItem("moph_remembered_auditor_password", trimmedPassword);
          } else if (activeTab === "admin") {
            localStorage.setItem("moph_remembered_admin_username", trimmedCode);
            localStorage.setItem("moph_remembered_admin_password", trimmedPassword);
          }
        } else {
          localStorage.setItem("moph_remember_me", "false");
          localStorage.removeItem("moph_remembered_hospital_code");
          localStorage.removeItem("moph_remembered_hospital_password");
          localStorage.removeItem("moph_remembered_auditor_username");
          localStorage.removeItem("moph_remembered_auditor_password");
          localStorage.removeItem("moph_remembered_admin_username");
          localStorage.removeItem("moph_remembered_admin_password");
        }

        if (activeTab === "admin") {
          // Double verify credentials and store
          sessionStorage.setItem("moph_admin_creds", JSON.stringify({ username: trimmedCode, password: trimmedPassword }));
          setSuccess("🔑 ตรวจสอบสิทธิ์ผู้ดูแลระบบสำเร็จ! กำลังเข้าสู่ Super Console...");
          setTimeout(() => {
            onAdminSuccess();
          }, 1000);
        } else if (activeTab === "auditor") {
          // Store auditor session
          sessionStorage.setItem("moph_auditor_creds", JSON.stringify({ username: trimmedCode, password: trimmedPassword }));
          setSuccess("🕵️ ตรวจสอบสิทธิ์ผู้ตรวจประเมินสำเร็จ! กำลังเปิดแดชบอร์ดความพร้อม...");
          setTimeout(() => {
            onAuditorSuccess();
          }, 1000);
        } else if (activeTab === "register") {
          setSuccess("🎉 สมัครสมาชิกโรงพยาบาลสำเร็จเรียบร้อย! กำลังสลับไปหน้าแดชบอร์ด...");
          setTimeout(() => {
            // Persist locally
            localStorage.setItem("moph_hospital", JSON.stringify(data.hospital));
            onAuthSuccess(data.hospital);
          }, 1500);
        } else {
          // Persist locally
          localStorage.setItem("moph_hospital", JSON.stringify(data.hospital));
          onAuthSuccess(data.hospital);
        }
      } else {
        setError(data.error || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์");
      }
    } catch (err: any) {
      setError("เครือข่ายขัดข้อง: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#333333] font-sans antialiased flex flex-col items-center justify-center p-4 selection:bg-[#5A5A40] selection:text-white">
      
      {/* Container Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden relative">
        
        {/* Brand Banner */}
        <div className={`text-white p-6 text-center space-y-2 relative transition-colors duration-300 ${
          activeTab === "admin" 
            ? "bg-amber-800" 
            : activeTab === "auditor" 
              ? "bg-[#466964]" 
              : "bg-[#5A5A40]"
        }`}>
          <div className="mx-auto w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white shadow-inner mb-2">
            <Building2 className="w-6 h-6 text-[#FFD700]" />
          </div>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono tracking-widest text-[#FFD700] bg-black/20 border border-white/20 px-2.5 py-0.5 rounded uppercase font-bold">
            {activeTab === "admin" 
              ? "Systems Administration Mode" 
              : activeTab === "auditor"
                ? "MOPH Regional Auditor Mode"
                : "MOPH X-Ray Accreditation 2568"}
          </span>
          <h2 className="text-lg font-bold tracking-tight">
            {activeTab === "admin" 
              ? "MOPH Cloud Administration" 
              : activeTab === "auditor"
                ? "ผู้ตรวจประเมิน MOPH XRAY"
                : "MOPH X-ray Smart Evidence Hub"}
          </h2>
          <p className="text-xs text-gray-300">
            {activeTab === "admin" 
              ? "แผงควบคุมระบบคลาวด์สำหรับผู้รับผิดชอบดูแลสระลงทะเบียนหลัก" 
              : activeTab === "auditor"
                ? "แดชบอร์ดตรวจสอบหลักฐานและวิเคราะห์ระดับความสำเร็จ"
                : "ระบบประเมินความพร้อมและแฟ้มผลงานรังสีวิทยาแยกโรงพยาบาล"}
          </p>
        </div>

        {/* Tab Selection */}
        {activeTab !== "admin" ? (
          <div className="flex border-b border-gray-150 text-center select-none font-sans">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-3 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === "login"
                  ? "bg-white text-[#5A5A40] border-b-2 border-[#5A5A40]"
                  : "bg-gray-50/50 text-gray-500 hover:text-gray-850"
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-stone-400" />
              <span>เข้าสู่ระบบหน่วยงาน</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setActiveTab("auditor");
                setError(null);
                setSuccess(null);
                setCode("");
                setPassword("");
              }}
              className={`flex-1 py-3 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === "auditor"
                  ? "bg-white text-[#466964] border-b-2 border-[#466964]"
                  : "bg-gray-50/50 text-gray-500 hover:text-gray-850"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-stone-850">ผู้ตรวจประเมิน</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-3 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === "register"
                  ? "bg-white text-[#5A5A40] border-b-2 border-[#5A5A40]"
                  : "bg-gray-50/50 text-gray-500 hover:text-gray-850"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-stone-400" />
              <span>ลงทะเบียนใหม่</span>
            </button>
          </div>
        ) : (
          <div className="flex border-b border-gray-150 text-center select-none">
            <button
              type="button"
              className="flex-1 py-3 text-[11px] font-bold bg-amber-50 text-amber-900 border-b-2 border-amber-700 flex items-center justify-center gap-1.5 cursor-default"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>โหมดผู้ดูแลระบบหลัก (Admin Console Only)</span>
            </button>
          </div>
        )}

        {/* Form area */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-red-55/70 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-1.5 leading-normal"
              >
                <span className="font-semibold shrink-0">⚠️ แจ้งเตือน:</span>
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-emerald-55/70 border border-emerald-250 rounded-lg text-xs text-emerald-800 flex items-start gap-1.5 leading-normal"
              >
                <span className="font-semibold shrink-0">💡 ข้อมูล:</span>
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === "register" && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 flex flex-col gap-1">
              <span className="font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                ลิงก์แนะนำสายงาน (Upline Assessor)
              </span>
              <p className="opacity-90 leading-relaxed text-[11px]">
                คุณกำลังลงทะเบียนเป็น <strong>ดาวน์ไลน์ (หน่วยงานลูกทีม)</strong> ของผู้แนะนำ: <span className="bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-950 font-bold font-mono">{upline}</span>
              </p>
            </div>
          )}

          {/* Hospital Code ID input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
              {activeTab === "admin" 
                ? "ชื่อบัญชีผู้ดูแลระบบ (Admin Username) *" 
                : activeTab === "auditor" 
                  ? "ชื่อบัญชีผู้ตรวจประเมิน (Auditor Username) *" 
                  : "รหัสโรงพยาบาล / โค้ดหน่วยงาน *"}
            </label>
            <div className="relative">
              {activeTab === "login" ? (
                <>
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-gray-400 select-none">
                    ID
                  </span>
                  <input
                    type="text"
                    id="moph-username"
                    name="username"
                    autoComplete="username"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="เช่น moph-phayathai, pyp-109"
                    className="w-full bg-gray-50 border border-gray-300 text-gray-800 pl-11 pr-4 py-2 rounded-lg text-xs placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-[#5A5A40] focus:outline-none shadow-inner"
                  />
                </>
              ) : activeTab === "register" ? (
                <>
                  <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-gray-400 select-none">
                    ID
                  </span>
                  <input
                    type="text"
                    id="moph-username"
                    name="username"
                    autoComplete="username"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="เช่น moph-phayathai, pyp-109"
                    className="w-full bg-gray-50 border border-gray-300 text-gray-800 pl-11 pr-24 py-2 rounded-lg text-xs placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-[#5A5A40] focus:outline-none shadow-inner"
                  />
                </>
              ) : (
                <>
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 select-none" />
                  <input
                    type="text"
                    id="moph-username"
                    name="username"
                    autoComplete="username"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder={activeTab === "admin" ? "ป้อนชื่อบัญชีแอดมิน" : "ป้อนชื่อบัญชีผู้ประเมิน"}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-800 pl-9 pr-4 py-2 rounded-lg text-xs placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-[#5A5A40] focus:outline-none shadow-inner"
                  />
                </>
              )}
              
              {activeTab === "register" && (
                <button
                  type="button"
                  onClick={handleSuggestCode}
                  disabled={isSuggesting}
                  className="absolute right-1.5 top-1.5 text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded cursor-pointer disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isSuggesting ? "animate-spin" : ""}`} />
                  <span>แนะนำรหัส</span>
                </button>
              )}
            </div>
            {activeTab !== "admin" && activeTab !== "auditor" && (
              <p className="text-[9px] text-gray-400 font-medium">
                * ใช้พิมพ์สำหรับล็อกอิน สัญลักษณ์พิเศษได้แค่อักษรภาษาอังกฤษ ตัวเลข และเครื่องหมายลบ/ขีดล่าง
              </p>
            )}
            {activeTab === "auditor" && (
              <p className="text-[9px] text-[#466964] font-medium">
                * สำหรับเข้าตรวจเกณฑ์ประเมินสถาบันระดับเขต (บัญชีทดลองใช้หลัก: auditor)
              </p>
            )}
          </div>

          {/* Hospital Name Input (Register Only) */}
          {activeTab === "register" && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                ชื่อสถาบัน / ชื่อโรงพยาบาล <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required={activeTab === "register"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น โรงพยาบาลศูนย์พญาไท"
                  className="w-full bg-gray-50 border border-gray-300 text-gray-800 pl-9 pr-4 py-2 rounded-lg text-xs placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
              {activeTab === "admin" 
                ? "รหัสผ่านผู้ดูแลระบบ (Admin Password) *" 
                : activeTab === "auditor"
                  ? "รหัสผ่านเข้าตรวจพอร์ทัล *"
                  : "รหัสผ่านเข้าใช้งาน *"}
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="password"
                id="moph-password"
                name="password"
                autoComplete={activeTab === "register" ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  activeTab === "admin" 
                    ? "ป้อนรหัสผ่านแอดมิน" 
                    : activeTab === "auditor"
                      ? "ระบุรหัสผ่านผู้ประเมิน"
                      : "กำหนดรหัสผ่านสำหรับเข้าแยกโรงพยาบาล"
                }
                className="w-full bg-gray-50 border border-gray-300 text-gray-800 pl-9 pr-4 py-2 rounded-lg text-xs placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-[#5A5A40] focus:outline-none"
              />
            </div>
          </div>

          {/* 💡 Remember Me Checkbox & Forgot Password Helper Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-600 hover:text-gray-850 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-[#5A5A40] focus:ring-[#5A5A40] cursor-pointer"
              />
              <span className="font-sans font-bold">จดจำข้อมูลเพื่อล็อกอินในเครื่องนี้</span>
            </label>

            {activeTab === "login" && (
              <span className="text-[10px] text-gray-600 font-sans italic block sm:text-right">
                🔑 ติดต่อแอดมิน: <strong className="text-stone-800 bg-stone-50 px-1 py-0.5 rounded border border-gray-200 font-mono select-all">xraymaetha@gmail.com</strong>
              </span>
            )}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white font-bold py-2 px-4 rounded-lg text-xs text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg disabled:opacity-50 transition-all font-sans ${
              activeTab === "admin" 
                ? "bg-amber-600 hover:bg-amber-700" 
                : activeTab === "auditor"
                  ? "bg-[#466964] hover:bg-[#324b47]" 
                  : "bg-[#5A5A40] hover:bg-[#4a4a35]"
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : activeTab === "login" ? (
              <>
                <LogIn className="w-4 h-4 text-[#FFD700]" />
                <span>เข้าสู่ระบบแดชบอร์ด</span>
              </>
            ) : activeTab === "register" ? (
              <>
                <ShieldCheck className="w-4 h-4 text-[#FFD700]" />
                <span>ยืนยันตั้งระบบโรงพยาบาลใหม่</span>
              </>
            ) : activeTab === "auditor" ? (
              <>
                <ShieldCheck className="w-4 h-4 text-[#FFD700]" />
                <span>🕵️ เข้าสู่บัญชีพอร์ทัลผู้ประเมิน</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 text-amber-200" />
                <span>เข้าสู่แผงควบคุมระบบ (Admin Panel)</span>
              </>
            )}
          </button>

          {activeTab === "admin" && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setError(null);
                setSuccess(null);
                setCode("");
                setPassword("");
              }}
              className="w-full text-stone-500 hover:text-stone-850 font-bold text-[11px] underline py-1 text-center"
            >
              ยกเลิกแล้วสลับกลับหน้าล็อกอินโรงพยาบาลปกติ
            </button>
          )}

        </form>

        {/* Footer Support Info with Admin Console link */}
        <div className="bg-[#f5f5f0] p-4 text-center border-t border-gray-150 text-[10px] text-gray-500 leading-relaxed font-sans flex flex-col gap-2 items-center justify-center">
          <div>
            <strong>💡 คำแนะนำสําหรับวิชาชีพ:</strong> ระบบแยกโค้ดนี้เหมาะกับโรงพยาบาลตรวจประเมินเดี่ยว 
            หรือใช้ควบคุมข้อมูลความมั่นคงปลอดภัยตามมาตรฐาน และเกณฑ์ประเมินปี 2568
          </div>
          {activeTab !== "admin" && (
            <button
              onClick={() => {
                setActiveTab("admin");
                setError(null);
                setSuccess(null);
                setCode("");
                setPassword("");
              }}
              className="text-[#5A5A40] hover:text-[#3e3e2c] underline font-bold mt-1 text-[10px] cursor-pointer inline-flex items-center gap-1"
            >
              🔧 ตู้ควบคุมสำหรับผู้ดูแลระบบ (Admin Console Mode)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
