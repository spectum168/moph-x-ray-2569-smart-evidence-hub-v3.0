/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Trash2, Edit3, Save, X, Search, Lock, PlusCircle, 
  Download, Upload, RefreshCw, Key, Building2, Calendar, LayoutDashboard, Database, HelpCircle,
  Sparkles, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clientFetch as fetch } from "../clientStorage";

interface HospitalItem {
  code: string;
  originalCode?: string;
  name: string;
  password: string;
  createdAt?: string;
}

interface AdminPortalProps {
  onLogoutAdmin: () => void;
  onInspectHospital?: (hospital: { code: string; name: string }) => void;
  onHospitalUpdated?: (oldCode: string, updatedHospital: { code: string; name: string }) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  triggerConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    isDanger?: boolean,
    confirmText?: string,
    cancelText?: string
  ) => void;
}

export default function AdminPortal({ onLogoutAdmin, onInspectHospital, onHospitalUpdated, showToast, triggerConfirm }: AdminPortalProps) {
  const [hospitals, setHospitals] = useState<HospitalItem[]>([]);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<"hospitals" | "auditors" | "tree" | "admins">("hospitals");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const backupInputRef = React.useRef<HTMLInputElement>(null);
  
  // Edit State
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<HospitalItem>({ code: "", name: "", password: "" });

  // Add Direct State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ code: "", name: "", password: "" });

  // Auditor form states
  const [showAddAuditorForm, setShowAddAuditorForm] = useState(false);
  const [auditorForm, setAuditorForm] = useState({ username: "", name: "", password: "" });

  // Auditor Edit State
  const [editingAuditorUsername, setEditingAuditorUsername] = useState<string | null>(null);
  const [editAuditorForm, setEditAuditorForm] = useState({ username: "", name: "", password: "" });

  // Admins state
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: "", name: "", password: "", role: "admin" });

  // Admin Edit State
  const [editingAdminUsername, setEditingAdminUsername] = useState<string | null>(null);
  const [editAdminForm, setEditAdminForm] = useState({ username: "", name: "", password: "", role: "admin" });

  let adminCreds: any = {};
  try {
    adminCreds = JSON.parse(sessionStorage.getItem("moph_admin_creds") || "{}");
  } catch (err) {
    console.error("Failed to parse admin credentials from sessionStorage:", err);
  }
  const { username = "", password = "" } = adminCreds;
  const role = adminCreds.role || "admin";
  const isMaster = role === "master" || username === "xraymaetha";

  const fetchHospitalsList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHospitals(data.hospitals || []);
      } else {
        showToast(data.error || "ไม่สามารถดึงข้อมูลโรงพยาบาลได้", "error");
      }
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาดทางเครือข่าย: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditorsList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/auditors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditors(data.auditors || []);
      } else {
        showToast(data.error || "ไม่สามารถดึงข้อมูลผู้แนะนำได้", "error");
      }
    } catch (err: any) {
      showToast("เครือข่ายล้มเหลว: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminsList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminsList(data.admins || []);
      } else {
        console.log("Could not load admin list:", data.error);
      }
    } catch (err: any) {
      console.error("Admins list query error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (username && password) {
      fetchHospitalsList();
      fetchAuditorsList();
      fetchAdminsList();
    } else {
      onLogoutAdmin();
    }
  }, []);

  const handleStartEdit = (hospital: HospitalItem) => {
    setEditingCode(hospital.code);
    setEditForm({ ...hospital });
  };

  const handleCancelEdit = () => {
    setEditingCode(null);
  };

  // Update Hospital Profile Credentials
  const handleSaveEdit = async () => {
    if (!editForm.code.trim() || !editForm.name.trim() || !editForm.password.trim()) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึกการแก้ไข", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/hospitals/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          oldCode: editingCode,
          newCode: editForm.code,
          name: editForm.name,
          hospitalPassword: editForm.password
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("💾 แก้ไขข้อมูลสถาบันรหัสผ่าน และย้ายฐานข้อมูลแฟ้มประเมินสำเร็จเรียบร้อย!", "success");
        setHospitals(data.hospitals || []);
        if (editingCode && onHospitalUpdated) {
          onHospitalUpdated(editingCode, { code: editForm.code, name: editForm.name });
        }
        setEditingCode(null);
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (err: any) {
      showToast("เครือข่ายล้มเหลว: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Add Hospital profile directly
  const handleAddDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.code.trim() || !addForm.name.trim() || !addForm.password.trim()) {
      showToast("กรุณากรอกรหัสสถาบัน ชื่อ และรหัสผ่านที่จัดตั้ง", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/hospitals/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addForm.code,
          name: addForm.name,
          password: addForm.password
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("🎉 เพิ่มโรงพยาบาลใหม่และตั้งฐานข้อมูลจำลองเบื้องต้นสำเร็จ!", "success");
        setAddForm({ code: "", name: "", password: "" });
        setShowAddForm(false);
        fetchHospitalsList(); // Refresh list via admin view
      } else {
        showToast(data.error || "ไม่สามารถบันทึกโรงพยาบาลสมาชิกระดับสถาบันใหม่ได้", "error");
      }
    } catch (err: any) {
      showToast("ความผิดพลาดเครือข่าย: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Add / create a new auditor account
  const handleAddAuditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditorForm.username.trim() || !auditorForm.name.trim() || !auditorForm.password.trim()) {
      showToast("กรุณากรอกข้อมูลผู้แนะนำให้ครบถ้วนทุกช่อง", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/auditors/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          editUsername: auditorForm.username,
          editName: auditorForm.name,
          editPassword: auditorForm.password
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("🎉 เพิ่มพอร์ตบัญชีผู้ตรวจสายตรงสำเร็จและพร้อมแจกลิงก์โครงข่าย!", "success");
        setAuditorForm({ username: "", name: "", password: "" });
        setShowAddAuditorForm(false);
        fetchAuditorsList();
      } else {
        showToast(data.error || "ล้มเหลวในการจัดตั้งโครงข่ายผู้ตรวจใหม่", "error");
      }
    } catch (err: any) {
      showToast("ความผิดพลาดเครือข่าย: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete auditor profile
  const handleDeleteAuditor = (targetUser: string, targetName: string) => {
    triggerConfirm(
      "🔥 ต้องการลบบัญชีผู้ตรวจแนะนำรายนี้?",
      `คุณต้องการยกเลิกผู้แนะนำ/ผู้ประเมิน "${targetName}" (@${targetUser}) ทิ้งจากระบบใช่หรือไม่?\n\n* โรงพยาบาลที่เป็นดาวน์ไลน์ภายใต้ผู้ตรวจคนนี้จะยังอยู่ แต่จะสลับกลับขึ้นไปขึ้นตรงเกราะปกป้องส่วนกลาง (@auditor) โดยอ้างสิทธิ์ช่วยเหลือดูแลทันที`,
      async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/admin/auditors/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, targetUsername: targetUser })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast("🗑️ ลบโครงข่ายผู้ประเมินสำเร็จ และสลับย้ายหน่วยงานใต้สังกัดขึ้นตรงกับส่วนกลางเรียบร้อย", "success");
            setAuditors(data.auditors || []);
            fetchHospitalsList(); // Refresh assigned downlinks stats info
          } else {
            showToast(data.error || "เกิดข้อขัดข้องในการลบ", "error");
          }
        } catch (err: any) {
          showToast("ล้มเหลวทางเครือข่าย: " + err.message, "error");
        } finally {
          setIsLoading(false);
        }
      },
      true,
      "ยืนยันการลบ",
      "ยกเลิก"
    );
  };

  const handleStartAuditorEdit = (auditor: any) => {
    setEditingAuditorUsername(auditor.username);
    setEditAuditorForm({
      username: auditor.username,
      name: auditor.name,
      password: auditor.password
    });
  };

  const handleCancelAuditorEdit = () => {
    setEditingAuditorUsername(null);
  };

  const handleSaveAuditorEdit = async () => {
    if (!editAuditorForm.username.trim() || !editAuditorForm.name.trim() || !editAuditorForm.password.trim()) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึกการแก้ไข", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/auditors/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          oldUsername: editingAuditorUsername,
          newUsername: editAuditorForm.username.trim(),
          name: editAuditorForm.name.trim(),
          auditorPassword: editAuditorForm.password.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("💾 แก้ไขข้อมูลผู้ดูแลแนะนำและปรับโครงข่ายดาวน์ไลน์สำเร็จแล้ว!", "success");
        setAuditors(data.auditors || []);
        setEditingAuditorUsername(null);
        fetchHospitalsList(); // Refresh assigned downlinks stats info
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (err: any) {
      showToast("ข้อผิดพลาดเครือข่าย: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Add / create a new admin account
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.username.trim() || !adminForm.name.trim() || !adminForm.password.trim()) {
      showToast("กรุณากรอกข้อมูลผู้ดูแลระบบให้ครบถ้วนทุกช่อง", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/admins/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          editUsername: adminForm.username,
          editName: adminForm.name,
          editPassword: adminForm.password,
          editRole: adminForm.role
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("🎉 เพิ่มพอร์ตบัญชีผู้ดูแลระบบ (Admin) ใหม่สำเร็จ!", "success");
        setAdminForm({ username: "", name: "", password: "", role: "admin" });
        setShowAddAdminForm(false);
        setAdminsList(data.admins || []);
      } else {
        showToast(data.error || "ล้มเหลวในการจัดตั้งผู้ดูแลระบบใหม่", "error");
      }
    } catch (err: any) {
      showToast("ความผิดพลาดเครือข่าย: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete admin account
  const handleDeleteAdmin = (targetUser: string, targetName: string) => {
    triggerConfirm(
      "🔥 ต้องการลบบัญชีผู้ดูแลระบบรายนี้?",
      `คุณต้องการเพิกถอนสิทธิ์ผู้ดูแลระบบของ "${targetName}" (@${targetUser}) ออกจากระบบใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/admin/admins/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, targetUsername: targetUser })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast("🗑️ ลบบัญชีผู้ดูแลระบบสำเร็จเรียบร้อย", "success");
            setAdminsList(data.admins || []);
          } else {
            showToast(data.error || "เกิดข้อขัดข้องในการลบ", "error");
          }
        } catch (err: any) {
          showToast("ล้มเหลวทางเครือข่าย: " + err.message, "error");
        } finally {
          setIsLoading(false);
        }
      },
      true,
      "ยืนยันการลบ",
      "ยกเลิก"
    );
  };

  const handleStartAdminEdit = (adm: any) => {
    setEditingAdminUsername(adm.username);
    setEditAdminForm({
      username: adm.username,
      name: adm.name,
      password: adm.password || "",
      role: adm.role || "admin"
    });
  };

  const handleCancelAdminEdit = () => {
    setEditingAdminUsername(null);
  };

  const handleSaveAdminEdit = async () => {
    if (!editAdminForm.username.trim() || !editAdminForm.name.trim() || !editAdminForm.password.trim()) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึกการแก้ไข", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/admins/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          oldUsername: editingAdminUsername,
          newUsername: editAdminForm.username.trim(),
          name: editAdminForm.name.trim(),
          adminPassword: editAdminForm.password.trim(),
          role: editAdminForm.role
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("💾 แก้ไขข้อมูลบัญชีผู้ดูแลระบบสำเร็จเรียบร้อย!", "success");
        setAdminsList(data.admins || []);
        setEditingAdminUsername(null);
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch (err: any) {
      showToast("ข้อผิดพลาดเครือข่าย: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a hospital from register and physically purge assessments file
  const handleDeleteHospital = (code: string, name: string) => {
    triggerConfirm(
      "🔥 แจ้งเตือน: ลบบัญชีโรงพยาบาลและแฟ้มผลงานถาวร?",
      `คุณต้องการที่จะสั่งทำลายบัญชีสถาบัน "${name}" (${code}) ทิ้งอย่างถาวรใช่หรือไม่?\n\n* การทำรายการนี้จะ "เคลียร์ลบประวัติการตอบประเมินและลิงก์ภาพประกอบทั้งหมด" ที่โรงพยาบาลได้เคยบันทึกไว้ในโมเดลความพร้อมและคลาวด์แฟ้มข้อมูล รวมถึงประแจล็อกอินขององค์กรนี้ทันที! ไม่สามารถทำย้อนกลับคืนไฟล์ได้`,
      async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/admin/hospitals/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, code })
          });
          
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`🗑️ ลบบันทึกข้อมูลสถาบัน ${name} และทำลายพาร์ติชันข้อมูลสำเร็จเรียบร้อย`, "success");
            setHospitals(data.hospitals || []);
          } else {
            showToast(data.error || "เกิดข้อผิดพลาดในการลบสถาบัน", "error");
          }
        } catch (err: any) {
          showToast("ไม่สามารถเรียกเครือข่ายเพื่อลบข้อมูลได้: " + err.message, "error");
        } finally {
          setIsLoading(false);
        }
      },
      true, // isDanger
      "ทำลายบันทึกและลบข้อมูล",
      "ยกเลิก"
    );
  };

  // Filter list
  const filteredHospitals = hospitals.filter(h => {
    const query = searchQuery.trim().toLowerCase();
    return (
      h.code.toLowerCase().includes(query) ||
      h.name.toLowerCase().includes(query) ||
      (h.originalCode && h.originalCode.toLowerCase().includes(query))
    );
  });

  // Export JSON Backup (System-wide: inclusive of all hospitals, assessments, auditors, admins)
  const handleExportBackup = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/backup/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const datestr = new Date().toISOString().split('T')[0];
        a.download = `MOPH_XRAY_Backup_${datestr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("📥 สำรองข้อมูล (Backup) ทั้งระบบ สำเร็จเรียบร้อยแล้ว! กรุณาเก็บไฟล์นี้ไว้ในที่ปลอดภัย", "success");
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการส่งออกข้อมูลสำรอง", "error");
      }
    } catch (err: any) {
      showToast("ความผิดพลาดเครือข่าย: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Import JSON Backup and Restore Database
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerConfirm(
      "🔄 ยืนยันการกู้คืนหน่วยความจำและฐานข้อมูลทั้งหมด?",
      "⚠️ คำเตือนสำคัญ: ระบบจะทำการ 'เขียนทับขยับล้างข้อมูลปัจจุบันทั้งหมด' ในเซิร์ฟเวอร์ด้วยข้อมูลจากไฟล์สำรองที่คุณเลือก รวมถึงผลงาน ประวัติ และสิทธิ์ทุกรายยืนยันใช่หรือไม่? (หน้าจอจะทำการรีโหลดหลังจากเสร็จสิ้น)",
      async () => {
        setIsLoading(true);
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const backupJson = JSON.parse(event.target?.result as string);
              const res = await fetch("/api/admin/backup/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, backup: backupJson })
              });
              const data = await res.json();
              if (res.ok && data.success) {
                showToast("🎉 " + data.message, "success");
                if (data.hospitals) setHospitals(data.hospitals);
                if (data.admins) setAdminsList(data.admins);
                if (data.auditors) setAuditors(data.auditors);
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              } else {
                showToast(data.error || "เกิดข้อบกพร่องในการเขียนไฟล์ทับฐานข้อมูล", "error");
              }
            } catch (err: any) {
              showToast("รูปแบบไฟล์ JSON หรือระบบแบคอัปไม่ถูกต้อง: " + err.message, "error");
            } finally {
              setIsLoading(false);
            }
          };
          reader.readAsText(file);
        } catch (err: any) {
          showToast("ล้มเหลวในการอ่านไฟล์: " + err.message, "error");
          setIsLoading(false);
        }
      },
      false,
      "ยืนยันกู้คืนและเขียนทับ",
      "ยกเลิก"
    );
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#333333] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Admin Top Header Bar */}
      <header className="bg-[#4a4a35] text-white py-4 px-6 border-b border-[#5a5a40] shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD700] p-2 rounded-xl text-stone-900 shadow-inner shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] font-bold tracking-widest text-amber-300 uppercase bg-[#333324] border border-[#5A5A40] px-2 py-0.5 rounded">
                  Super Administrative Console
                </span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              </div>
              <h1 className="text-base font-bold tracking-tight text-white mt-1">
                ระบบจัดการสถาบันความพร้อมรังสีวิทยา xraymaetha
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              className="bg-stone-750 hover:bg-stone-800 border border-stone-600 text-xs text-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-semibold transition"
              title="ดาวน์โหลดไฟล์สำรองสถาบันและรายการทั้งหมด"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>สำรองฐานข้อมูลสถาบัน</span>
            </button>

            <button
              onClick={() => backupInputRef.current?.click()}
              className="bg-slate-750 hover:bg-slate-800 border border-slate-600 text-xs text-teal-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-semibold transition"
              title="อัปโหลดไฟล์ JSON สำรองข้อมูลเพื่อกู้คืนสถาบันเดิม"
            >
              <Upload className="w-3.5 h-3.5 text-teal-300" />
              <span>กู้คืนข้อมูลสำรอง (Restore)</span>
            </button>
            
            <input
              type="file"
              ref={backupInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={onLogoutAdmin}
              className="bg-[#c13c3c] hover:bg-[#a62c2c] text-white px-4 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-yellow-300" />
              <span>กลับสู่ระบบประเมินปกติ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel Content Box */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Statistics Dashboard Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-lime-50 rounded-lg flex items-center justify-center text-[#5A5A40]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">สถาบันแยกฐานข้อมูล</p>
              <p className="text-xl font-bold">{hospitals.length} โรงพยาบาล</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-700">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">สิทธิ์และระดับล็อกอินปัจจุบัน</p>
              <p className="text-sm font-bold text-emerald-800">🔑 {username} ({isMaster ? "ระดับมาสเตอร์" : "ระดับทั่วไป"})</p>
            </div>
          </div>
          <div className="bg-[#5A5A40] rounded-xl text-white p-4 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-15">
              <ShieldAlert className="w-24 h-24 stroke-1" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-yellow-300 uppercase">สถิติผู้ใช้อื่นในระบบ</p>
              <p className="text-xs leading-relaxed opacity-90 font-medium">
                มีผู้แนะนำ/เขต ({auditors.length} ท่าน) และผู้ดูแลระบบทั้งหมด ({adminsList.length || 1} บัญชี)
              </p>
            </div>
          </div>
        </div>

        {/* 📑 Admin Console Tab Swapper */}
        <div className="flex bg-white/90 border border-gray-200 p-1 rounded-xl shrink-0 self-start shadow-sm flex-wrap gap-1 w-fit">
          <button
            onClick={() => setAdminTab("hospitals")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminTab === "hospitals"
                ? "bg-[#5A5A40] text-white shadow-sm font-extrabold"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏢 จัดการโรงพยาบาล/หน่วยงาน ({hospitals.length})</span>
          </button>
          <button
            onClick={() => setAdminTab("auditors")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminTab === "auditors"
                ? "bg-[#5A5A40] text-white shadow-sm font-extrabold"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>🕵️ จัดการบัญชีผู้ตรวจ/ผู้แนะนำ ({auditors.length})</span>
          </button>
          <button
            onClick={() => setAdminTab("tree")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              adminTab === "tree"
                ? "bg-[#5A5A40] text-white shadow-sm font-extrabold"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#FFD700]" />
            <span>📊 แผนผังโครงข่ายดาวน์ไลน์ (MLM Tree)</span>
          </button>
          {isMaster && (
            <button
              onClick={() => setAdminTab("admins")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                adminTab === "admins"
                  ? "bg-[#5A5A40] text-white shadow-sm font-extrabold"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span>🔑 จัดการระดับแอดมิน ({adminsList.length})</span>
            </button>
          )}
        </div>

        {adminTab === "hospitals" && (
          <>
            {/* Action Controls & Search Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96 select-none">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ สัญลักษณ์ หรือรหัสโรงพยาบาล..."
                  className="w-full bg-gray-50 border border-gray-200 pl-9 pr-4 py-1.5 text-xs rounded-lg placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5A5A40] transition"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="w-full md:w-auto bg-[#5A5A40] hover:bg-[#4a4a35] font-semibold text-white px-4 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4 text-[#FFD700]" />
                  <span>เพิ่มโรงพยาบาลเข้าร่วมใหม่</span>
                </button>
                
                <button
                  onClick={fetchHospitalsList}
                  disabled={isLoading}
                  className="bg-gray-100 hover:bg-gray-200 border border-gray-200 p-1.5 rounded-lg text-stone-700 shrink-0 cursor-pointer transition disabled:opacity-50"
                  title="รีเฟรชข้อมูลรายการด่วน"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Add Hospital directly form (Expandable widget) */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddDirect} className="bg-white border-2 border-dashed border-[#5A5A40]/40 rounded-xl p-5 space-y-4 shadow-inner">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <div className="flex items-center gap-1.5 text-[#5A5A40] font-bold text-xs">
                        <PlusCircle className="w-4 h-4 text-[#FFD700]" />
                        <span>แบบฟอร์มจัดตั้งสถาบันขึ้นใหม่สำหรับแอดมิน</span>
                      </div>
                      <button type="button" onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase">รหัสโรงพยาบาล / โค้ดหน่วยงาน *</label>
                        <input
                          type="text"
                          required
                          value={addForm.code}
                          onChange={(e) => setAddForm(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                          placeholder="เช่น code-maetha, hosp-lampang"
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase">ชื่อสถาบันพยาบาลสมาชิกระดับเขต *</label>
                        <input
                          type="text"
                          required
                          value={addForm.name}
                          onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="ชื่อโรงพยาบาลศิริราช, รพ.ลำปาง เป็นต้น"
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase">รหัสผ่านสำหรับเจ้าหน้าที่เข้าประเมิน *</label>
                        <input
                          type="text"
                          required
                          value={addForm.password}
                          onChange={(e) => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="ตั้งรหัสผ่านสำหรับเข้าแยกโรงพยาบาล"
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const rNum = Math.floor(100+Math.random()*900);
                          setAddForm({
                            code: `moph-auto-${rNum}`,
                            name: `โรงพยาบาลทดสอบเขตสุขภาพที่ ${rNum}`,
                            password: `pass-${rNum}`
                          });
                        }}
                        className="text-stone-550 border hover:bg-stone-100 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition"
                      >
                        🎲 สุ่มฟิลด์จำลอง
                      </button>

                      <button
                        type="submit"
                        className="bg-[#5A5A40] hover:bg-[#4a4a35] text-white text-xs font-bold px-5 py-1.5 rounded-lg cursor-pointer shadow-sm transition"
                      >
                        💾 ยืนยันเพิ่มเข้าระบบหลัก
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hospitals Database Table view */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#fcfcf9] border-b border-gray-200 text-stone-500 font-bold text-[10px] uppercase tracking-wider">
                      <th className="p-4 w-12 text-center">สัญลักษณ์อักษร</th>
                      <th className="p-4">รหัส / โค้ดที่ล็อกอิน (Code)</th>
                      <th className="p-4">ชื่อสถานสถาบันพยาบาล (Hospital Name)</th>
                      <th className="p-4">รหัสผ่านที่ตั้งใช้ (Password Key)</th>
                      <th className="p-4">ผู้แนะนำ/ผู้ประเมินดูแล (Upline)</th>
                      <th className="p-4 w-28">วันที่ลงทะเบียน</th>
                      <th className="p-4 w-32 text-right">ดำเนินการ (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-xs">
                    {filteredHospitals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400 font-sans">
                          🛸 ไม่พบสติ๊กเกอร์โรงพยาบาลใดสอดคล้องกับพารามิเตอร์คำสั่งค้นหาของคุณ
                        </td>
                      </tr>
                    ) : (
                      filteredHospitals.map((hospital, idx) => {
                        const isEditing = editingCode === hospital.code;
                        const hasUpline = (hospital as any).upline || "auditor";

                        return (
                          <tr 
                            key={hospital.code} 
                            className={`hover:bg-gray-50/50 transition-colors ${isEditing ? "bg-[#fcfced]" : ""}`}
                          >
                            {/* Short initial banner */}
                            <td className="p-4 text-center">
                              <span className="w-8 h-8 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] font-bold text-[10px] flex items-center justify-center tracking-tight">
                                {hospital.name.replace(/^(โรงพยาบาล|รพ\.)/, "").slice(0, 2)}
                              </span>
                            </td>

                            {/* Hospital Login Code */}
                            <td className="p-4">
                              {isEditing ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={editForm.code}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                                    className="bg-white border border-gray-300 p-1 rounded font-mono text-xs text-stone-800 w-full focus:ring-1 focus:ring-[#5A5A40]"
                                  />
                                  <p className="text-[8px] text-[#c13c3c] font-semibold leading-none">
                                    * หากเปลี่ยนโค้ด ระบบจะเปลี่ยนชื่อจัดเก็บและโอนย้ายไฟล์ประเมินตามให้ทันที
                                  </p>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono text-gray-800 font-semibold bg-gray-100 border border-gray-100 px-2 py-0.5 rounded-md w-fit">
                                  <span className="text-[10px] text-gray-400 font-bold shrink-0">ID:</span>
                                  <span className="text-[11px] block">{hospital.code}</span>
                                </div>
                              )}
                            </td>

                            {/* Hospital Name */}
                            <td className="p-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="bg-white border border-gray-300 p-1 rounded font-sans text-xs text-stone-800 w-full focus:ring-1 focus:ring-[#5A5A40]"
                                />
                              ) : (
                                <div className="font-semibold text-stone-800 flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                  <span>{hospital.name}</span>
                                </div>
                              )}
                            </td>

                            {/* Hospital Private Password */}
                            <td className="p-4">
                              {isEditing ? (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                    className="bg-white border border-gray-300 pl-7 pr-1 py-1 rounded font-mono text-xs text-stone-800 w-full focus:ring-1 focus:ring-[#5A5A40]"
                                  />
                                  <Key className="absolute left-1.5 top-1.5 w-3.5 h-3.5 text-yellow-600" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono text-stone-700 bg-amber-500/10 border border-amber-400/20 px-2 py-0.5 rounded-md w-fit">
                                  <Key className="w-3 h-3 text-amber-700 shrink-0" />
                                  <span className="text-[11px] font-bold text-amber-900">{hospital.password}</span>
                                </div>
                              )}
                            </td>

                            {/* Upline Auditor tag */}
                            <td className="p-4 font-mono font-bold text-teal-700">
                              <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-xs">
                                @{hasUpline}
                              </span>
                            </td>

                            {/* Created Date */}
                            <td className="p-4 text-[10px] text-stone-500 font-mono">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                                <span>
                                  {hospital.createdAt 
                                    ? new Date(hospital.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) 
                                    : "ตั้งต้น"}
                                </span>
                              </div>
                            </td>

                            {/* Controls Edit/Delete */}
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={handleSaveEdit}
                                      disabled={isLoading}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 text-[10px] font-bold"
                                      title="เซฟบันทึกแก้ไขหน่วยงาน"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                      <span>เซฟ</span>
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="bg-gray-100 hover:bg-gray-200 text-stone-600 p-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-0.5 text-[10px] font-bold"
                                      title="ยกเลิกการแก้ไข"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>ยก</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {onInspectHospital && (
                                      <button
                                        onClick={() => onInspectHospital({ code: hospital.code, name: hospital.name })}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 text-[10px] font-bold shadow-sm"
                                        title="เข้าสู่สิทธิ์ดูระเบียบงานของหน่วยงานนี้โดยตรง"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-yellow-300" />
                                        <span>ดูหน้าหน่วยงาน</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleStartEdit(hospital)}
                                      className="bg-stone-100 hover:bg-stone-200 text-[#5A5A40] px-2.5 py-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 text-[10px] font-bold"
                                      title="แก้ไขรหัสผ่านและชื่อหน่วยงาน"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>แก้ไขข้อมูล</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteHospital(hospital.code, hospital.name)}
                                      className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-[#c13c3c] p-1.5 rounded-lg cursor-pointer transition"
                                      title="ลบสถาสิทธิ์และพาร์ติชันข้อมูลเกณฑ์หลักถาวร"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {adminTab === "auditors" && (
          <div className="space-y-4">
            {/* Action Controls for Auditors */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <span className="text-xs text-stone-600 font-semibold font-sans">
                แอดมินสามารถจัดตั้งผู้ตรวจ/แนะนำสายงานลงพื้นที่ระดับเขต เพื่อกระจายสิทธิ์และผูกดาวน์ไลน์ติดตามประเมินผล
              </span>
              <button
                onClick={() => setShowAddAuditorForm(!showAddAuditorForm)}
                className="bg-[#466964] hover:bg-[#324b47] font-semibold text-white px-4 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4 text-yellow-300" />
                <span>จัดตั้งผู้ตรวจ/ผู้แนะนำสายงานใหม่</span>
              </button>
            </div>

            {/* Scale Creator Widget */}
            <AnimatePresence>
              {showAddAuditorForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddAuditor} className="bg-white border-2 border-dashed border-[#466964]/40 rounded-xl p-5 space-y-4 shadow-inner">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <span className="text-[#466964] font-bold text-xs flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4 text-yellow-400" />
                        จัดสร้างพอร์ตบัญชีผู้ตรวจ (Assessor Account Builder)
                      </span>
                      <button type="button" onClick={() => setShowAddAuditorForm(false)} className="text-gray-400 hover:text-gray-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase font-sans">ชื่อบัญชีผู้ใช้สำหรับล็อกอิน (Username) *</label>
                        <input
                          type="text"
                          required
                          value={auditorForm.username}
                          onChange={(e) => setAuditorForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                          placeholder="ภาษาอังกฤษหรือตัวเลข เช่น assessor-01"
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#466964]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase font-sans">ชื่อผู้ประเมินระดับสายงาน (Full Name) *</label>
                        <input
                          type="text"
                          required
                          value={auditorForm.name}
                          onChange={(e) => setAuditorForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="เช่น นายแพทย์สมชาย ตรวจประเมินทีม A"
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#466964]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase font-sans">ประแจเข้าตรวจงาน (Password Key) *</label>
                        <input
                          type="text"
                          required
                          value={auditorForm.password}
                          onChange={(e) => setAuditorForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="ตั้งรหัสผ่านล็อกอิน"
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#466964]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        className="bg-[#466964] hover:bg-[#324b47] text-white text-xs font-bold px-5 py-1.5 rounded-lg cursor-pointer"
                      >
                        💾 มอบสิทธิ์และขึ้นทะเบียนผู้ประเมิน
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Auditors list database table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfcf9] border-b border-gray-200 text-stone-500 font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">รูป</th>
                    <th className="p-4">ชื่อบัญชีล็อกอิน (Username)</th>
                    <th className="p-4">ชื่อ-ตำแหน่งผู้แนะนำสายตรง (Full Name)</th>
                    <th className="p-4">คีย์รหัสผ่าน (Credentials Key)</th>
                    <th className="p-4">ลิงค์สมัครดาวน์ไลน์ (My Agency Invite URL)</th>
                    <th className="p-4 w-44 text-right">ดำเนินการ (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs">
                  {auditors.map((auditor) => {
                    const isAuditorEditing = editingAuditorUsername === auditor.username;
                    const currentUsernameValue = isAuditorEditing ? editAuditorForm.username : auditor.username;
                    const baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, "").replace(/\/?$/, "/");
                    const refereeUrl = baseUrl + "?ref=" + currentUsernameValue + "&mode=register";
                    const countTeam = hospitals.filter(h => (h as any).upline === auditor.username || (auditor.username === "auditor" && !(h as any).upline)).length;
                    
                    return (
                      <tr 
                        key={auditor.username} 
                        className={`hover:bg-gray-50/50 transition-colors ${isAuditorEditing ? "bg-[#fcfced]" : ""}`}
                      >
                        <td className="p-4 text-center">
                          <span className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center">
                            🕵️
                          </span>
                        </td>
                        
                        {/* Username */}
                        <td className="p-4 font-mono font-bold text-gray-800">
                          {isAuditorEditing ? (
                            <div className="space-y-1 w-40 animate-pulse">
                              <input
                                type="text"
                                disabled={auditor.username === "auditor"}
                                value={editAuditorForm.username}
                                onChange={(e) => setEditAuditorForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                                className="bg-white disabled:bg-gray-100 disabled:text-stone-400 border border-gray-300 p-1.5 rounded font-mono text-xs text-stone-850 w-full focus:ring-1 focus:ring-teal-500"
                                placeholder="ชื่อบัญชี"
                              />
                              {auditor.username === "auditor" && (
                                <p className="text-[8px] text-gray-500 font-medium leading-none">
                                  * บัญชีหลักไม่สามารถเปลี่ยน ID ได้
                                </p>
                              )}
                            </div>
                          ) : (
                            <span>@{auditor.username}</span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="p-4">
                          {isAuditorEditing ? (
                            <input
                              type="text"
                              value={editAuditorForm.name}
                              onChange={(e) => setEditAuditorForm(prev => ({ ...prev, name: e.target.value }))}
                              className="bg-white border border-gray-300 p-1.5 rounded font-sans text-xs text-stone-850 w-full focus:ring-1 focus:ring-teal-500"
                              placeholder="ระบุชื่อ-ตำแหน่งผู้แนะนำ"
                            />
                          ) : (
                            <>
                              <div className="font-bold text-stone-800 font-sans">{auditor.name}</div>
                              <div className="text-[10px] text-teal-600 mt-0.5 font-bold">🎯 มีโรงพยาบาลในสายงาน ({countTeam} สถาบัน)</div>
                            </>
                          )}
                        </td>

                        {/* Password */}
                        <td className="p-4 font-mono font-semibold text-[#5A5A40]">
                          {isAuditorEditing ? (
                            <input
                              type="text"
                              value={editAuditorForm.password}
                              onChange={(e) => setEditAuditorForm(prev => ({ ...prev, password: e.target.value }))}
                              className="bg-white border border-gray-300 p-1.5 rounded font-mono text-xs text-stone-850 w-32 focus:ring-1 focus:ring-teal-500"
                              placeholder="คีย์รหัสผ่าน"
                            />
                          ) : (
                            <span>{auditor.password}</span>
                          )}
                        </td>

                        {/* Invite Link */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 w-72">
                            <input 
                              type="text" 
                              readOnly 
                              value={refereeUrl} 
                              className="bg-gray-50 border border-gray-250 rounded p-1 font-mono text-[10px] w-full text-stone-500 focus:outline-none" 
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(refereeUrl);
                                showToast("📋 คัดลอกลิงก์รับสมัครสำหรับสายงานเรียบร้อยแล้ว!", "success");
                              }}
                              className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 px-2 py-1 rounded text-[10px] font-bold cursor-pointer shrink-0 transition"
                            >
                              คัดลอกลิงก์
                            </button>
                          </div>
                        </td>

                        {/* Controls */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAuditorEditing ? (
                              <>
                                <button
                                  onClick={handleSaveAuditorEdit}
                                  disabled={isLoading}
                                  className="bg-teal-600 hover:bg-teal-700 text-white p-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 text-[10px] font-bold"
                                  title="เซฟบันทึกการปรับปรุง"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>เซฟ</span>
                                </button>
                                <button
                                  onClick={handleCancelAuditorEdit}
                                  className="bg-gray-100 hover:bg-gray-200 text-stone-600 p-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-0.5 text-[10px] font-bold"
                                  title="ยกเลิกการปรับแก้ไข"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>ยก</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartAuditorEdit(auditor)}
                                  className="bg-teal-50 hover:bg-teal-100 border border-teal-100 text-teal-700 font-bold px-2 py-1.5 rounded-lg text-[10px] cursor-pointer inline-flex items-center gap-1 transition"
                                  title="แก้ไขข้อมูลผู้ตรวจคนนี้"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>แก้ไข</span>
                                </button>
                                <button
                                  disabled={auditor.username === "auditor"}
                                  onClick={() => handleDeleteAuditor(auditor.username, auditor.name)}
                                  className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold px-2 py-1.5 rounded-lg text-[10px] cursor-pointer disabled:opacity-30 inline-flex items-center gap-1 transition"
                                  title="ลบสิทธิ์ผู้แนะนำรายนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>ถอนโครงข่าย</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adminTab === "tree" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-8">
            <div className="text-center space-y-1">
              <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 font-sans animate-pulse">
                <Sparkles className="w-3 h-3 text-amber-500 animate-spin" />
                แผนผังดาวน์ไลน์ความรับผิดชอบและทีมงานในเขต (Regional Downline Hierarchy)
              </span>
              <h2 className="text-base font-bold text-stone-800 font-sans">แผนผังดาวน์ไลน์และหน่วยงานในเขต</h2>
            </div>

            {/* Tree Chart Visual Block */}
            <div className="flex flex-col items-center">
              {/* Level 1: Super Admin */}
              <div className="flex flex-col items-center relative pb-8">
                <div className="bg-stone-850 bg-stone-900 border-2 border-stone-700 text-[#FFD700] px-6 py-3.5 rounded-2xl shadow-xl flex flex-col items-center text-center gap-1 min-w-[200px] hover:scale-105 transition-all">
                  <span className="bg-amber-400 text-slate-900 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                    ระดับสูงสุด (Level 1 Admin Hub)
                  </span>
                  <div className="font-sans font-extrabold text-white text-xs">👑 xraymaetha (แอดมินกลาง)</div>
                  <div className="text-[10px] text-amber-200 mt-0.5 font-bold font-mono">สายงานทั้งหมด: {auditors.length} ทีมผู้ตรวจ</div>
                </div>
                {/* Visual Branch Line Down */}
                <div className="w-0.5 h-8 bg-stone-400 mt-1"></div>
              </div>

              {/* Level 2: Assessors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full check-tree-row relative pt-2 border-t-2 border-stone-300">
                
                {auditors.map((aud) => {
                  const myDownlines = hospitals.filter(h => (h as any).upline === aud.username || (aud.username === "auditor" && !(h as any).upline));
                  
                  return (
                    <div key={aud.username} className="flex flex-col items-center relative">
                      {/* Vertical line from connector */}
                      <div className="w-0.5 h-4 bg-stone-300 -translate-y-4 mb-2"></div>
                      
                      {/* Assessor Card */}
                      <div className="bg-[#466964] text-white p-4 rounded-xl shadow-lg border border-[#3b5753] min-w-[245px] hover:shadow-2xl transition-all relative">
                        <span className="absolute -top-2 left-4 bg-yellow-400 text-stone-900 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded font-sans">
                          ผู้ตรวจ (Level 2 Auditor)
                        </span>
                        <div className="font-extrabold text-xs mt-1">🕵️ @{aud.username}</div>
                        <div className="text-[11px] text-teal-100 font-semibold mt-0.5">{aud.name}</div>
                        <div className="mt-3 pt-2 border-t border-[#3b5753]/60 flex items-center justify-between text-[10px] text-teal-200 font-sans">
                          <span>หน่วยงานลูกข่าย:</span>
                          <span className="bg-[#2e4541] border border-[#3b5753] px-2 py-0.5 rounded font-bold text-white">{myDownlines.length} สถาบัน</span>
                        </div>
                      </div>

                      {/* Branch connector line from Assessor to Hospitals */}
                      {myDownlines.length > 0 && (
                        <div className="w-0.5 h-6 bg-stone-400 mt-2"></div>
                      )}

                      {/* Level 3: Hospitals */}
                      <div className="space-y-3 w-full max-w-[280px] mt-1 pl-4 border-l-2 border-dashed border-stone-300">
                        {myDownlines.map((hosp) => {
                          const hospShort = hosp.name.replace(/^(โรงพยาบาล|รพ\.)/, "").slice(0, 5);
                          return (
                            <div key={hosp.code} className="bg-white border border-gray-250 p-2.5 rounded-lg shadow-sm text-xs space-y-1 hover:border-teal-500 transition-colors relative">
                              {/* Horizontal list guide dot */}
                              <div className="absolute top-4 left-0 -translate-x-[21px] w-2.5 h-0.5 bg-stone-300"></div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-stone-800 truncate" title={hosp.name}>
                                  🏢 hosp: {hospShort}
                                </span>
                                <span className="bg-gray-100 font-mono text-[9px] text-gray-500 px-1.5 py-0.5 rounded select-none">
                                  {hosp.code}
                                </span>
                              </div>
                              <div className="text-[9px] text-[#5A5A40] font-sans flex items-center gap-1 justify-between pt-1 border-t border-gray-50">
                                <span>สายแนะนำดาวน์ไลน์ตรง</span>
                                <span className="text-teal-700 font-extrabold">ลงทะเบียนแล้ว</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {adminTab === "admins" && isMaster && (
          <div className="space-y-4">
            {/* Action Controls for Admins */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <span className="text-xs text-stone-600 font-semibold font-sans">
                สิทธิ์ระดับมาสเตอร์สามารถจัดตั้งผู้ดูแลระบบร่วม (Admin ระดับทั่วไป / Master) เพื่อร่วมดูแลระบบและช่วยเหลือสถานพยาบาล
              </span>
              <button
                onClick={() => setShowAddAdminForm(!showAddAdminForm)}
                className="bg-stone-700 hover:bg-stone-800 font-semibold text-white px-4 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4 text-yellow-300" />
                <span>แต่งตั้งผู้ดูแลระบบใหม่</span>
              </button>
            </div>

            {/* Admin Creator Widget */}
            <AnimatePresence>
              {showAddAdminForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddAdmin} className="bg-white border-2 border-dashed border-stone-400 rounded-xl p-5 space-y-4 shadow-inner">
                    <div className="flex items-center justify-between border-b pb-2 mb-2">
                      <span className="text-stone-700 font-bold text-xs flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4 text-amber-500 animate-pulse" />
                        แต่งตั้งผู้ดูแลระบบเพิ่มเติม (Super Administrator Assign)
                      </span>
                      <button type="button" onClick={() => setShowAddAdminForm(false)} className="text-gray-400 hover:text-gray-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase font-sans">ชื่อบัญชีผู้ใช้ (Username) *</label>
                        <input
                          type="text"
                          required
                          value={adminForm.username}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                          placeholder="ภาษาอังกฤษหรือตัวเลข เช่น admin-moph"
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase font-sans">ชื่อ-นามสกุล / ตำแหน่ง *</label>
                        <input
                          type="text"
                          required
                          value={adminForm.name}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="เช่น แอดมินรวิศ"
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase font-sans">รหัสผ่านลับ (Credentials Key) *</label>
                        <input
                          type="text"
                          required
                          value={adminForm.password}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="ตั้งคีย์รหัสล็อกอินแอดมิน"
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-600 block uppercase font-sans">ระดับบทบาทหน้าที่ (Access Role)</label>
                        <select
                          value={adminForm.role}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, role: e.target.value }))}
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs font-sans focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-500"
                        >
                          <option value="admin">แอดมินทั่วไป (Admin - ไม่สามารถสร้างผู้ดูแลระบบเพิ่มได้)</option>
                          <option value="master">แอดมินพลังมาสเตอร์ (Master - มีสิทธิ์เต็มในการบริหารจัดการแอดมิน)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        className="bg-stone-700 hover:bg-stone-800 text-white text-xs font-bold px-5 py-1.5 rounded-lg cursor-pointer transition shadow-sm"
                      >
                        💾 อนุมัติการแต่งตั้งผู้ดูแลระบบ
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Admins list table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fcfcf9] border-b border-gray-200 text-stone-500 font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">มิติ</th>
                    <th className="p-4">ชื่อบัญชีผู้ใช้ (Username)</th>
                    <th className="p-4">ชื่อ-ตำแหน่งผู้ดูแลระบบ (Full Name)</th>
                    <th className="p-4">รหัสกุญแจตรวจสอบ (Password Key)</th>
                    <th className="p-4">บทบาทเข้าถึง (Role Option)</th>
                    <th className="p-4 w-44 text-right">ดำเนินการ (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs">
                  {adminsList.map((adm) => {
                    const isAdminEditing = editingAdminUsername === adm.username;
                    const visualRole = adm.role === "master" ? "👑 ระดับมาสเตอร์ (Master)" : "💼 ระดับทั่วไป (Admin)";
                    
                    return (
                      <tr 
                        key={adm.username} 
                        className={`hover:bg-gray-50/50 transition-colors ${isAdminEditing ? "bg-[#fcfced]" : ""}`}
                      >
                        <td className="p-4 text-center">
                          <span className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ${adm.role === 'master' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                            🔑
                          </span>
                        </td>
                        
                        {/* Username */}
                        <td className="p-4 font-mono font-bold text-gray-800">
                          {isAdminEditing ? (
                            <div className="space-y-1 w-40 animate-pulse">
                              <input
                                type="text"
                                disabled={adm.username === "xraymaetha"}
                                value={editAdminForm.username}
                                onChange={(e) => setEditAdminForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                                className="bg-white disabled:bg-gray-100 disabled:text-stone-400 border border-gray-300 p-1.5 rounded font-mono text-xs w-full focus:ring-1 focus:ring-stone-500"
                                placeholder="ชื่อบัญชี"
                              />
                            </div>
                          ) : (
                            <span>@{adm.username}</span>
                          )}
                        </td>
 
                        {/* Name */}
                        <td className="p-4 font-sans font-bold text-gray-800">
                          {isAdminEditing ? (
                            <input
                              type="text"
                              value={editAdminForm.name}
                              onChange={(e) => setEditAdminForm(prev => ({ ...prev, name: e.target.value }))}
                              className="bg-white border border-gray-300 p-1.5 rounded font-sans text-xs w-full focus:ring-1 focus:ring-stone-500"
                              placeholder="ระบุชื่อ-ตำแหน่งผู้ประเมิน"
                            />
                          ) : (
                            <span>{adm.name}</span>
                          )}
                        </td>

                        {/* Password */}
                        <td className="p-4 font-mono font-semibold text-[#5A5A40]">
                          {isAdminEditing ? (
                            <input
                              type="text"
                              value={editAdminForm.password}
                              onChange={(e) => setEditAdminForm(prev => ({ ...prev, password: e.target.value }))}
                              className="bg-white border border-gray-300 p-1.5 rounded font-mono text-xs w-32 focus:ring-1 focus:ring-stone-500"
                              placeholder="คีย์รหัสล็อกอิน"
                            />
                          ) : (
                            <span>{adm.password || "••••••••"}</span>
                          )}
                        </td>

                        {/* Role selection */}
                        <td className="p-4 font-sans font-semibold">
                          {isAdminEditing ? (
                            <select
                              value={editAdminForm.role}
                              disabled={adm.username === "xraymaetha"}
                              onChange={(e) => setEditAdminForm(prev => ({ ...prev, role: e.target.value }))}
                              className="bg-white border border-gray-300 p-1.5 rounded font-sans text-xs focus:ring-1 focus:ring-stone-500"
                            >
                              <option value="admin">แอดมินทั่วไป (Admin)</option>
                              <option value="master">แอดมินพลังมาสเตอร์ (Master)</option>
                            </select>
                          ) : (
                            <span className={adm.role === "master" ? "text-amber-700 font-extrabold" : "text-stone-600 font-semibold"}>
                              {visualRole}
                            </span>
                          )}
                        </td>

                        {/* Controls */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdminEditing ? (
                              <>
                                <button
                                  onClick={handleSaveAdminEdit}
                                  disabled={isLoading}
                                  className="bg-[#5A5A40] hover:bg-[#4a4a35] text-white p-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-1 text-[10px] font-bold"
                                  title="บันทึกปรับปรุงสิทธิ์"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>เซฟ</span>
                                </button>
                                <button
                                  onClick={handleCancelAdminEdit}
                                  className="bg-gray-100 hover:bg-gray-200 text-stone-600 p-1.5 rounded-lg cursor-pointer transition flex items-center justify-center gap-0.5 text-[10px] font-bold"
                                  title="ยกเลิกการแก้ไข"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>ยก</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartAdminEdit(adm)}
                                  className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold px-2 py-1.5 rounded-lg text-[10px] cursor-pointer inline-flex items-center gap-1 transition"
                                  title="แก้ไขคีย์รหัสผ่านและระดับสิทธิ์และชื่อพอร์ต"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>แก้ไข</span>
                                </button>
                                <button
                                  disabled={adm.username === "xraymaetha" || adm.username === username}
                                  onClick={() => handleDeleteAdmin(adm.username, adm.name)}
                                  className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold px-2 py-1.5 rounded-lg text-[10px] cursor-pointer disabled:opacity-30 inline-flex items-center gap-1 transition"
                                  title="ปัดทิ้งสิทธิ์ผู้ดูแลระบบคนนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>ถอนสิทธิ์</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions Footer Support */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2">
          <h4 className="font-bold text-xs text-[#5A5A40] flex items-center gap-1">
            <HelpCircle className="w-4 h-4 text-[#FFD700]" />
            <span>คำแนะนำเพิ่มเติมสำหรับแอดมิน (MOPH Security Guidelines):</span>
          </h4>
          <ul className="text-xs text-gray-600 space-y-1.5 pl-5 list-disc font-sans leading-relaxed">
            <li className="text-amber-800 font-semibold bg-amber-50 rounded p-2 border border-amber-200">
              ⚠️ <strong>สำคัญเรื่องระบบ Sandbox (Cloud Run Reset Protection):</strong> เนื่องจากเซิร์ฟเวอร์นี้รันบน Google Cloud Run คอนเทนเนอร์จะทำการรีเซ็ตตัวเองเมื่อไม่มีการรันระยะหนึ่ง ส่งผลให้ข้อมูลที่กรอกระว่างทางหายไปได้ <strong>ขอให้แอดมินหมั่นกดปุ่ม "สำรองฐานข้อมูลสถาบัน"</strong> ด้านบนขวาทุกครั้ง เพื่อเก็บบันทึกไฟล์สำรอง (.json) ไว้บนคอมพิวเตอร์ และเมื่อกลับเข้ามาใหม่แล้วพบสิ่งกีดขวางหรือข้อมูลหาย <strong>ให้กดปุ่ม "กู้คืนข้อมูลสำรอง (Restore)" และอัปโหลดไฟล์แบคอัปกลับคืนเข้าไป</strong> จะสามารถฟื้นคืนข้อมูลโรงพยาบาลและคะแนนประเมินได้ทันทีใน 1 วินาที!
            </li>
            <li>
              <strong>การลืมรหัสผ่าน:</strong> เมื่อผู้ใช้งานติดต่อเข้ามาว่าลืมรหัสผ่าน ให้ค้นหาชื่อโรงพยาบาลในตารางด้านบน รหัสผ่านจริงจะแสดงในคอลัมน์สีเหลือง 
              <span className="text-amber-800 font-bold bg-amber-500/10 px-1 rounded mx-1">Password Key</span> ทันที เพื่อนำส่งกลับให้ผู้ใช้งานล็อกอินเข้าใช้งาน
            </li>
            <li>
              <strong>การโอนถ่ายแฟ้มเกณฑ์:</strong> หากมีความจำเป็นต้องเปลี่ยนรหัสโรงพยาบาล (เช่น จาก moph-123 ไปเป็น moph-main) ให้กด "แก้ไข" หน้าแถวนั้น แล้วเปลี่ยนชื่อ รหัสจะพึ่งพาระบบ Backend เปลี่ยนพาธอักษรจำลองของรังสีกายภาพให้อัตโนมัติ โดยข้อมูลการประเมินจะไม่สูญหาย
            </li>
            <li>
              <strong>ความกังวลความปลอดภัยระดับสถาบัน:</strong> แนะนำให้ใช้รหัสผ่านที่เดายาก และลบบัญชีที่ไม่ได้ใช้งานออกเพื่อป้องกันข้อมูลค้างในระบบ Cloud Run เปล่าเปลี่ยว
            </li>
          </ul>
        </div>

      </main>
    </div>
  );
}
