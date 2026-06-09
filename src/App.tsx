/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import {
  Layers,
  Search,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Clock,
  Sparkles,
  ExternalLink,
  FileSpreadsheet,
  Download,
  Upload,
  User,
  MessageSquare,
  HelpCircle,
  Send,
  Loader,
  Database,
  Grid,
  TrendingUp,
  FileCheck2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AssessmentItem, AssessmentStatus } from "./types";
import DashboardView from "./components/DashboardView";
import HospitalAuthScreen from "./components/HospitalAuthScreen";
import AdminPortal from "./components/AdminPortal";
import AuditorPortal from "./components/AuditorPortal";
import { LogOut } from "lucide-react";
import { clientFetch as fetch } from "./clientStorage";

const sanitizeCategory = (cat: string): string => {
  if (!cat) return "";
  let trimmed = cat.trim();
  if (trimmed.includes("สถานยที่")) {
    return trimmed.replace("สถานยที่", "สถานที่");
  }
  return trimmed;
};

export default function App() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [activeTab, setActiveTab] = useState<"workspace" | "dashboard">("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ทั้งหมด");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ทั้งหมด");
  
  // Hospital Isolation Session State
  const [hospital, setHospital] = useState<{ code: string; name: string } | null>(() => {
    try {
      const stored = localStorage.getItem("moph_hospital");
      return stored && stored !== "undefined" ? JSON.parse(stored) : null;
    } catch (err) {
      console.error("Failed to parse moph_hospital from localStorage:", err);
      localStorage.removeItem("moph_hospital");
      return null;
    }
  });

  // Admin Mode Session State
  const [isAdminActive, setIsAdminActive] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("moph_admin_creds") !== null;
    } catch {
      return false;
    }
  });

  // Auditor Mode Session State
  const [isAuditorActive, setIsAuditorActive] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("moph_auditor_creds") !== null;
    } catch {
      return false;
    }
  });

  // Loading & Editing States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSyncPanel, setShowSyncPanel] = useState<boolean>(false);
  const [pastedCSV, setPastedCSV] = useState<string>("");
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string>("");
  const [csvErrorMessage, setCsvErrorMessage] = useState<string>("");

  // Target Item Form state
  const [editedStatus, setEditedStatus] = useState<AssessmentStatus>("🔴 ยังไม่พร้อม");
  const [editedResponsible, setEditedResponsible] = useState<string>("");
  const [editedLinks, setEditedLinks] = useState<string[]>([]);
  const [editedComment, setEditedComment] = useState<string>("");

  // AI Advisor States
  const [aiQuery, setAiQuery] = useState<string>("");
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiActionItems, setAiActionItems] = useState<string[]>([]);

  // Multi-Sheet States
  const [sheets, setSheets] = useState<string[]>(["ปี 2569"]);
  const [activeSheetName, setActiveSheetName] = useState<string>("ปี 2569");
  const [showCreateSheetModal, setShowCreateSheetModal] = useState<boolean>(false);
  const [newSheetNameInput, setNewSheetNameInput] = useState<string>("ปี 2570");

  // Category and sub-items management states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [showEditCategoryModal, setShowEditCategoryModal] = useState<boolean>(false);
  const [editCategoryOldName, setEditCategoryOldName] = useState<string>("");
  const [editCategoryNewName, setEditCategoryNewName] = useState<string>("");

  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
  const [newItemCategory, setNewItemCategory] = useState<string>("");
  const [newItemSubCategory, setNewItemSubCategory] = useState<string>("");
  const [newItemID, setNewItemID] = useState<string>("");
  const [newItemCriteria, setNewItemCriteria] = useState<string>("");
  const [newItemSuccess, setNewItemSuccess] = useState<string>("");

  const [showEditItemModal, setShowEditItemModal] = useState<boolean>(false);
  const [editingItemID, setEditingItemID] = useState<string>("");
  const [editItemCategory, setEditItemCategory] = useState<string>("");
  const [editItemSubCategory, setEditItemSubCategory] = useState<string>("");
  const [editItemID, setEditItemID] = useState<string>("");
  const [editItemCriteria, setEditItemCriteria] = useState<string>("");
  const [editItemSuccess, setEditItemSuccess] = useState<string>("");

  // Custom Confirmation & Toast Banner States
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({
      show: true,
      message,
      type,
    });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDanger = false,
    confirmText = "ยืนยัน",
    cancelText = "ยกเลิก"
  ) => {
    setCustomConfirm({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setCustomConfirm((prev) => ({ ...prev, isOpen: false }));
      },
      isDanger,
      confirmText,
      cancelText,
    });
  };

  // Selectors/Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  // Generate headers for hospital context
  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (hospital) {
      headers["x-hospital-code"] = hospital.code;
    }
    return headers;
  };

  // Fetch assessments for a specific sheet
  const fetchAssessments = async (sheetName: string = activeSheetName) => {
    if (!hospital) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assessments?sheet=${encodeURIComponent(sheetName)}`, {
        headers: getHeaders()
      });
      if (res.status === 401) {
        const errData = await res.json();
        if (errData.error === "INVALID_SESSION") {
          showToast("🔒 เซสชันความปลอดภัยหมดอายุหรือข้อมูลหน่วยสัญชาติคุณถูกปรับรหัสใหม่ กรุณาลงชื่อใหม่อีกครั้ง", "error");
          localStorage.removeItem("moph_hospital");
          setHospital(null);
          return;
        }
      }
      if (res.ok) {
        const data = await res.json();
        const sanitized = Array.isArray(data)
          ? data.map((item: any) => ({
              ...item,
              Main_Category: sanitizeCategory(item.Main_Category),
            }))
          : [];
        setAssessments(sanitized);
        if (sanitized.length > 0) {
          // If previous selection doesn't exist in new sheet items, fallback to first item
          const stillExists = sanitized.some((item: any) => item.Item_ID === selectedId);
          if (!stillExists || !selectedId) {
            setSelectedId(data[0].Item_ID);
          }
        } else {
          setSelectedId(null);
        }
      } else {
        console.error("HTTP error reading assessments");
      }
    } catch (err) {
      console.error("Error fetching assessments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch sheets list from DB
  const fetchSheetsList = async () => {
    if (!hospital) return;
    try {
      const res = await fetch("/api/sheets", {
        headers: getHeaders()
      });
      if (res.status === 401) {
        const errData = await res.json();
        if (errData.error === "INVALID_SESSION") {
          localStorage.removeItem("moph_hospital");
          setHospital(null);
          return;
        }
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSheets(data);
          // If the activeSheetName is no longer valid, fallback to first sheet
          if (!data.includes(activeSheetName)) {
            setActiveSheetName(data[0]);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching sheets list:", err);
    }
  };

  // Create new sheet
  const handleCreateNewSheet = async (name: string) => {
    const trimmedVal = name.trim();
    if (!trimmedVal) {
      showToast("กรุณาระบุชื่อแท็บประเมินที่ต้องการก่อนยืนยัน", "error");
      return;
    }
    try {
      const res = await fetch("/api/sheets/create", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name: trimmedVal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`🎉 สร้างชุดการประเมินแยกแท็บ "${trimmedVal}" สำเร็จเรียบร้อย! โครงสร้างพร้อมข้อมูลตั้งต้นจัดตั้งใหม่แล้ว`, "success");
        setNewSheetNameInput("");
        setShowCreateSheetModal(false);
        // Sync sheets list
        if (Array.isArray(data.sheets)) {
          setSheets(data.sheets);
        } else {
          await fetchSheetsList();
        }
        // Switched tab to the newly created one
        setActiveSheetName(trimmedVal);
      } else {
        showToast(`❌ ผิดพลาด: ${data.error || "ไม่สามารถสร้างแผ่นแท็บประเมินชุดใหม่ได้"}`, "error");
      }
    } catch (err: any) {
      showToast(`❌ ข้อผิดพลาด: ${err.message}`, "error");
    }
  };

  // Delete sheet/dataset
  const handleDeleteSheet = (name: string) => {
    triggerConfirm(
      "🗑️ ยืนยันการลบชุดข้อมูลประเมิน",
      `คุณต้องการลบแผ่นประเมินแท็บ "${name}" และรายการที่เกี่ยวข้องทั้งหมดออกจากระบบถาวรใช่หรือไม่?\n\n(ข้อมูลความคืบหน้า ไฟล์แนบ และคำอธิบายความพร้อมในแท็บ/ปีนี้จะถูกเคลียร์ล้างทั้งหมดและไม่สามารถเรียกคืนได้)`,
      async () => {
        try {
          const res = await fetch("/api/sheets/delete", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ name }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(`🗑️ ลบแผ่นประเมินแท็บ "${name}" พร้อมข้อมูลภายในทั้งหมดเสร็จสิ้นเรียบร้อย`, "success");
            
            const updatedSheets = Array.isArray(data.sheets) ? data.sheets : [];
            setSheets(updatedSheets);
            
            // If the deleted sheet was selected, move to the first available sheet
            if (activeSheetName === name && updatedSheets.length > 0) {
              setActiveSheetName(updatedSheets[0]);
            } else {
              await fetchSheetsList();
            }
          } else {
            showToast(`❌ ผิดพลาด: ${data.error || "ไม่สามารถลบแท็บหรือปีประเมินชุดนี้ได้"}`, "error");
          }
        } catch (err: any) {
          showToast(`❌ ข้อผิดพลาดเครือข่าย: ${err.message}`, "error");
        }
      },
      true // isDanger
    );
  };

  // Sync initial configuration when hospital is authenticated
  useEffect(() => {
    if (hospital) {
      fetchSheetsList();
    }
  }, [hospital]);

  // Sync assessments whenever active sheet name changes or hospital changes
  useEffect(() => {
    if (hospital) {
      fetchAssessments(activeSheetName);
    }
  }, [hospital, activeSheetName]);

  // Sync edit form with selected item
  const selectedItem = assessments.find((item) => item.Item_ID === selectedId) || null;

  useEffect(() => {
    if (selectedItem) {
      setEditedStatus(selectedItem.Status);
      setEditedResponsible(selectedItem.Responsible_Person || "");
      setEditedLinks(selectedItem.Evidence_Link && selectedItem.Evidence_Link.length > 0 ? [...selectedItem.Evidence_Link] : [""]);
      setEditedComment(selectedItem.Auditor_Comment || "");
      // Clear AI advice for new items to prevent confusion
      setAiAdvice("");
      setAiActionItems([]);
      setAiQuery("");
    }
  }, [selectedId, selectedItem]);

  // Auto-scroll the evidence panel to the top or scroll it into view on smaller viewports
  useEffect(() => {
    if (selectedId && inspectorRef.current) {
      if (window.innerWidth < 1024) {
        // Scroll smoothly to the panel on mobile/tablet viewports
        inspectorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // Scroll inside the form workspace back to the top on desktop
        const innerScrollable = inspectorRef.current.querySelector(".overflow-y-auto");
        if (innerScrollable) {
          innerScrollable.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }
  }, [selectedId]);

  // Extract unique main categories
  const categoriesList: string[] = [
    "ทั้งหมด",
    ...([...new Set(assessments.map((item) => item.Main_Category))].sort() as string[]),
  ];

  // Dynamic link box management
  const handleAddLinkField = () => {
    setEditedLinks([...editedLinks, ""]);
  };

  const handleLinkChange = (index: number, val: string) => {
    const updated = [...editedLinks];
    updated[index] = val;
    setEditedLinks(updated);
  };

  const handleRemoveLinkField = (index: number) => {
    const updated = editedLinks.filter((_, i) => i !== index);
    setEditedLinks(updated.length > 0 ? updated : [""]);
  };

  // 💾 บันทึกข้อมูล (updateRecord) with backend API
  const handleSaveItem = async () => {
    if (!selectedId || !selectedItem) return;
    setIsSaving(true);
    
    // Clean up empty links before sending
    const cleanedLinks = editedLinks.filter((link) => link.trim() !== "");

    try {
      const response = await fetch("/api/assessments/update", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          Item_ID: selectedId,
          Status: editedStatus,
          Responsible_Person: editedResponsible,
          Evidence_Link: cleanedLinks,
          Auditor_Comment: editedComment,
          activeSheetName: activeSheetName, // Locked to currently open page/sheet tab
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update client-side item in state
          setAssessments((prev) =>
            prev.map((item) =>
              item.Item_ID === selectedId ? result.updatedItem : item
            )
          );
          // Briefly prompt status
          const originalName = selectedItem.Item_ID;
          showToast(`💾 บันทึกข้อมูลเกณฑ์มาตรฐานข้อ ${originalName} สำเร็จในแท็บ "${activeSheetName}" เรียบร้อยแล้ว!`, "success");
        }
      } else {
        const errData = await response.json();
        showToast(`❌ ผิดพลาด: ${errData.error || "ไม่สามารถเซฟข้อมูลได้"}`, "error");
      }
    } catch (err: any) {
      showToast(`❌ ข้อผิดพลาดทางเครือข่าย: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset database to standard template
  const handleResetDatabase = () => {
    triggerConfirm(
      "⚠️ รีเซ็ตข้อมูลสำรองกลับค่าเริ่มต้น",
      `คุณต้องการรีเซ็ตข้อมูลเกณฑ์ประเมินของแท็บ "${activeSheetName}" กลับเป็นค่ามาตรฐานดั้งเดิมใช่หรือไม่?\n\n(ข้อมูลความคืบหน้าและการเชื่อมโยง Drive ทั้งหมดที่คุณเคยกรอกบันทึกในแท็บนี้จะถูกเคลียร์ล้างออกและไม่สามารถเรียกคืนได้)`,
      async () => {
        try {
          const res = await fetch("/api/assessments/reset", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              activeSheetName: activeSheetName,
            }),
          });
          if (res.ok) {
            showToast(`🔄 รีเซ็ตข้อมูลในแท็บ "${activeSheetName}" เป็นค่าเริ่มต้นเสร็จสิ้นเรียบร้อย!`, "success");
            setSelectedId(null);
            fetchAssessments(activeSheetName);
          }
        } catch (err: any) {
          showToast(`❌ ผิดพลาดในการรีเซ็ต: ${err.message}`, "error");
        }
      },
      true, // isDanger
      "ยืนยันล้างข้อมูลหลัก",
      "ยกเลิก"
    );
  };

  // 📁 Manage Categories & Checklist Sub-Items (ข้อย่อย)
  const handleCreateCategory = async (newCatName: string) => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      showToast("กรุณาระบุชื่อหมวดหมู่ด้วยค่ะ", "error");
      return;
    }
    const currentCats = [...new Set(assessments.map(item => item?.Main_Category || "ไม่ระบุหมวด"))];
    if (currentCats.includes(trimmed)) {
      showToast("หมวดหมู่นี้มีอยู่ในระบบแล้วค่ะ", "error");
      return;
    }
    // Add a placeholder item
    const placeholderItem: AssessmentItem = {
      Main_Category: trimmed,
      Sub_Category: "ข้อกำหนดหลัก",
      Item_ID: `custom-${Date.now()}`,
      Criteria_Detail: "เกณฑ์ประเมินเริ่มต้น (สามารถกดเพื่อแก้ไขระบุข้อกำหนดจริงได้)",
      Success_Indicator: "ระบุเป้าหมายความสำเร็จของเกณฑ์ข้อนี้",
      Status: "🔴 ยังไม่พร้อม",
      Responsible_Person: "",
      Evidence_Link: [],
      Auditor_Comment: "",
      Last_Update: new Date().toISOString()
    };
    const updated = [...assessments, placeholderItem];
    
    try {
      const res = await fetch("/api/assessments/set-all", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ items: updated, activeSheetName })
      });
      if (res.ok) {
        setAssessments(updated);
        setSelectedCategoryFilter(trimmed);
        setSelectedId(placeholderItem.Item_ID);
        showToast(`➕ สร้างหมวดหมู่ "${trimmed}" สำเร็จแล้ว!`, "success");
        setShowAddCategoryModal(false);
        setNewCategoryName("");
      } else {
        showToast("ไม่สามารถสร้างหมวดหมู่ใหม่ได้", "error");
      }
    } catch (e: any) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + e.message, "error");
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      showToast("กรุณากรอกชื่อหมวดใหม่", "error");
      return;
    }
    if (trimmedNew === oldName) {
      setShowEditCategoryModal(false);
      return;
    }
    const updated = assessments.map(item => {
      if (item.Main_Category === oldName) {
        return { ...item, Main_Category: trimmedNew };
      }
      return item;
    });

    try {
      const res = await fetch("/api/assessments/set-all", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ items: updated, activeSheetName })
      });
      if (res.ok) {
        setAssessments(updated);
        setSelectedCategoryFilter(trimmedNew);
        showToast(`✏️ เปลี่ยนชื่อหมวดเป็น "${trimmedNew}" เรียบร้อยแล้ว`, "success");
        setShowEditCategoryModal(false);
      } else {
        showToast("ไม่สามารถแก้ไขชื่อหมวดหมู่ได้", "error");
      }
    } catch (e: any) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + e.message, "error");
    }
  };

  const handleDeleteCategory = (catName: string) => {
    triggerConfirm(
      "🗑️ ยินยอมลบหมวดหมู่ประเมินหรือไม่?",
      `คุณแน่ใจว่าต้องการลบหมวด "${catName}" และข้อย่อยในหมวดนี้ทั้งหมดใช่หรือไม่?\n\n(ขั้นตอนนี้จะไม่สามารถย้อนกลับคืนข้อมูลได้)`,
      async () => {
        const updated = assessments.filter(item => item.Main_Category !== catName);
        try {
          const res = await fetch("/api/assessments/set-all", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ items: updated, activeSheetName })
          });
          if (res.ok) {
            setAssessments(updated);
            setSelectedCategoryFilter("ทั้งหมด");
            setSelectedId(updated.length > 0 ? updated[0].Item_ID : null);
            showToast(`🗑️ ลบหมวดหมู่และเกณฑ์ประเมินที่เกี่ยวข้องออกหมดแล้ว`, "success");
          } else {
            showToast("ไม่สามารถลบหมวดหมู่ได้", "error");
          }
        } catch (e: any) {
          showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + e.message, "error");
        }
      },
      true // isDanger
    );
  };

  const handleCreateItem = async (
    category: string,
    subCategory: string,
    itemId: string,
    criteria: string,
    success: string
  ) => {
    const trimmedId = itemId.trim();
    const trimmedCriteria = criteria.trim();
    const trimmedCat = category.trim();
    if (!trimmedCat) {
      showToast("กรุณาเลือกหรือระบุหมวดหมู่หลัก", "error");
      return;
    }
    if (!trimmedId || !trimmedCriteria) {
      showToast("กรุณาระบุรหัสข้อเกณฑ์และเนื้อหาเกณฑ์ทั้งหมด", "error");
      return;
    }
    // Check if ID already exists
    if (assessments.some(item => item.Item_ID === trimmedId)) {
      showToast(`รหัสเกณฑ์ประเมินสำเร็จ (Item_ID) "${trimmedId}" ซ้ำกับรายการที่มีอยู่แล้วในระบบ`, "error");
      return;
    }

    const newItem: AssessmentItem = {
      Main_Category: trimmedCat,
      Sub_Category: subCategory.trim() || "ตรวจสอบย่อย",
      Item_ID: trimmedId,
      Criteria_Detail: trimmedCriteria,
      Success_Indicator: success.trim(),
      Status: "🔴 ยังไม่พร้อม",
      Responsible_Person: "",
      Evidence_Link: [],
      Auditor_Comment: "",
      Last_Update: new Date().toISOString()
    };

    const updated = [...assessments, newItem];
    try {
      const res = await fetch("/api/assessments/set-all", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ items: updated, activeSheetName })
      });
      if (res.ok) {
        setAssessments(updated);
        setSelectedId(trimmedId);
        setSelectedCategoryFilter(trimmedCat);
        showToast(`➕ เพิ่มข้อเกณฑ์ประเมิน "${trimmedId}" ลงในหมวด "${trimmedCat}" สำเร็จ!`, "success");
        setShowAddItemModal(false);
        // reset form state
        setNewItemSubCategory("");
        setNewItemID("");
        setNewItemCriteria("");
        setNewItemSuccess("");
      } else {
        showToast("ไม่สามารถสร้างเกณฑ์ประเมินใหม่ได้", "error");
      }
    } catch (e: any) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  const handleUpdateItemDefinition = async (
    oldId: string,
    newId: string,
    category: string,
    subCategory: string,
    criteria: string,
    success: string
  ) => {
    const trimmedNewId = newId.trim();
    const trimmedCriteria = criteria.trim();
    const trimmedCat = category.trim();
    if (!trimmedCat) {
      showToast("กรุณาเลือกหมวดหลัก", "error");
      return;
    }
    if (!trimmedNewId || !trimmedCriteria) {
      showToast("กรุณากรอกรหัสและข้อกำหนดเกณฑ์ประเมิน", "error");
      return;
    }
    if (trimmedNewId !== oldId && assessments.some(item => item.Item_ID === trimmedNewId)) {
      showToast(`รหัสเกณฑ์ประเมินสำเร็จ "${trimmedNewId}" มีการใช้อยู่แล้วในระบบ`, "error");
      return;
    }

    const updated = assessments.map(item => {
      if (item.Item_ID === oldId) {
        return {
          ...item,
          Item_ID: trimmedNewId,
          Main_Category: trimmedCat,
          Sub_Category: subCategory.trim() || item.Sub_Category,
          Criteria_Detail: trimmedCriteria,
          Success_Indicator: success.trim(),
          Last_Update: new Date().toISOString()
        };
      }
      return item;
    });

    try {
      const res = await fetch("/api/assessments/set-all", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ items: updated, activeSheetName })
      });
      if (res.ok) {
        setAssessments(updated);
        setSelectedId(trimmedNewId);
        showToast(`✏️ แก้ไขเนื้อหาข้อเกณฑ์มาตรฐาน "${trimmedNewId}" สำเร็จแล้ว!`, "success");
        setShowEditItemModal(false);
      } else {
        showToast("ไม่สามารถบันทึกการแก้ไขเกณฑ์ข้อมูลหลักได้", "error");
      }
    } catch (e: any) {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  const handleDeleteItem = (itemId: string) => {
    triggerConfirm(
      "🗑️ ยืนยันลบข้อประเมินมาตรฐานนี้?",
      `คุณแน่ใจว่าต้องการลบเกณฑ์ประเมินรหัส "${itemId}" ออกจากระบบถาวรใช่หรือไม่?`,
      async () => {
        const updated = assessments.filter(item => item.Item_ID !== itemId);
        try {
          const res = await fetch("/api/assessments/set-all", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ items: updated, activeSheetName })
          });
          if (res.ok) {
            setAssessments(updated);
            const remainingForCat = updated.filter(item => item.Main_Category === selectedCategoryFilter);
            if (selectedId === itemId) {
              setSelectedId(remainingForCat.length > 0 ? remainingForCat[0].Item_ID : (updated.length > 0 ? updated[0].Item_ID : null));
            }
            showToast(`🗑️ ลบเกณฑ์ประเมินข้อ "${itemId}" สำเร็จแล้ว`, "success");
          } else {
            showToast("ไม่สามารถลบเกณฑ์ประเมินได้", "error");
          }
        } catch (e: any) {
          showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        }
      },
      true
    );
  };

  // AI Compliance Advisor Client
  const handleAskAIAdvisor = async (suggestedPrompt?: string) => {
    if (!selectedItem) {
      showToast("กรุณาเลือกข้อประเมินที่คุณต้องการคำปรึกษาจากตารางด้านซ้ายก่อน", "info");
      return;
    }
    const queryToSend = suggestedPrompt || aiQuery;
    if (!queryToSend.trim()) {
      showToast("กรุณากรอกคำถามหรือสิ่งที่ต้องการให้ AI แนะนำก่อนกดส่ง", "info");
      return;
    }

    setAiLoading(true);
    setAiAdvice("");
    setAiActionItems([]);

    try {
      const response = await fetch("/api/gemini/advisor", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          query: queryToSend,
          currentItemContext: {
            Item_ID: selectedItem.Item_ID,
            Main_Category: selectedItem.Main_Category,
            Sub_Category: selectedItem.Sub_Category,
            Criteria_Detail: selectedItem.Criteria_Detail,
            Success_Indicator: selectedItem.Success_Indicator,
            Status: editedStatus, // take actual state
            Auditor_Comment: editedComment,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiAdvice(data.advice);
        if (data.actionItems) {
          setAiActionItems(data.actionItems);
        }
      } else {
        setAiAdvice("❌ เกิดปัญหาในการสื่อสารกับเซิร์ฟเวอร์ AI กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      setAiAdvice(`❌ ไม่สามารถเชื่อมต่อกับ AI Advisor ได้: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Export to standard CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = [
      "Main_Category",
      "Sub_Category",
      "Item_ID",
      "Criteria_Detail",
      "Success_Indicator",
      "Status",
      "Responsible_Person",
      "Evidence_Link",
      "Auditor_Comment",
      "Last_Update",
    ];

    const csvRows = [headers.join(",")];

    assessments.forEach((item) => {
      const row = [
        item.Main_Category,
        item.Sub_Category,
        item.Item_ID,
        item.Criteria_Detail,
        item.Success_Indicator,
        item.Status,
        item.Responsible_Person || "",
        JSON.stringify(item.Evidence_Link || []), // Save as raw JSON string list
        item.Auditor_Comment || "",
        item.Last_Update || "",
      ].map((val) => {
        const escaped = ("" + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(row.join(","));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MOPH_Xray_Evidence_Hub_Export_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Simple CSV parser for Import Data from Google Sheets
  const handleImportCSVData = async () => {
    if (!pastedCSV.trim()) {
      setCsvErrorMessage("กรุณาวางโค้ดหรือข้อความแบบ CSV ก่อนกดยืนยัน");
      return;
    }

    try {
      setCsvErrorMessage("");
      setCsvSuccessMessage("");
      
      const lines = pastedCSV.split(/\r?\n/);
      if (lines.length < 2) {
        setCsvErrorMessage("โครงสร้างไฟล์ไม่ถูกต้อง ต้องมีอย่างน้อยแถวหัวตารางและแถวข้อมูล");
        return;
      }

      // Simple CSV Line Parser that handles quotes
      const parseCSVLine = (text: string): string[] => {
        const result: string[] = [];
        let curVal = "";
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
              curVal += '"';
              i++; // skip escaped double quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            result.push(curVal);
            curVal = "";
          } else {
            curVal += char;
          }
        }
        result.push(curVal);
        return result;
      };

      const headerLine = parseCSVLine(lines[0]);
      
      // Determine index mapping
      const mapping: Record<string, number> = {};
      headerLine.forEach((h, idx) => {
        const trimmed = h.trim().replace(/^[\uFEFF"]|["]$/g, "");
        mapping[trimmed] = idx;
      });

      // Essential columns validation
      const reqCols = ["Item_ID", "Status", "Main_Category"];
      const missing = reqCols.filter((col) => mapping[col] === undefined);
      if (missing.length > 0) {
        setCsvErrorMessage(`ไม่พบคอลัมน์หลักในหัวตาราง CSV: ${missing.join(", ")}`);
        return;
      }

      const importedItems: AssessmentItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const rowData = parseCSVLine(lines[i]);
        if (rowData.length < 3) continue;

        const itemId = rowData[mapping["Item_ID"]]?.trim() || "";
        if (!itemId) continue;

        // Parse Evidence Link (JSON lists)
        let links: string[] = [];
        const rawLinks = rowData[mapping["Evidence_Link"]]?.trim() || "[]";
        try {
          if (rawLinks.startsWith("[") && rawLinks.endsWith("]")) {
            links = JSON.parse(rawLinks);
          } else if (rawLinks) {
            links = [rawLinks];
          }
        } catch (e) {
          // split by comma if parse fails
          links = rawLinks.split(",").map((s) => s.trim()).filter((s) => s.startsWith("http"));
        }

        // Sanitize status to lock peh-peh
        let status: AssessmentStatus = "🔴 ยังไม่พร้อม";
        const rawStatus = rowData[mapping["Status"]]?.trim() || "";
        if (rawStatus.includes("พร้อมรับตรวจ") || rawStatus.includes("พร้อม")) {
          status = "🟢 พร้อมรับตรวจ";
        } else if (rawStatus.includes("ปรับปรุง") || rawStatus.includes("อยู่ระหว่าง")) {
          status = "🟡 อยู่ระหว่างปรับปรุง";
        }

        importedItems.push({
          Main_Category: rowData[mapping["Main_Category"]]?.trim() || "อื่นๆ",
          Sub_Category: rowData[mapping["Sub_Category"]]?.trim() || "",
          Item_ID: itemId,
          Criteria_Detail: rowData[mapping["Criteria_Detail"]]?.trim() || "",
          Success_Indicator: rowData[mapping["Success_Indicator"]]?.trim() || "",
          Status: status,
          Responsible_Person: rowData[mapping["Responsible_Person"]]?.trim() || "",
          Evidence_Link: links,
          Auditor_Comment: rowData[mapping["Auditor_Comment"]]?.trim() || "",
          Last_Update: rowData[mapping["Last_Update"]]?.trim() || new Date().toISOString(),
        });
      }

      if (importedItems.length === 0) {
        setCsvErrorMessage("ไม่พบข้อมูลเกณฑ์ประเมินที่ต้องการจัดเก็บในข้อความ CSV นี้");
        return;
      }

      const response = await fetch("/api/assessments/import", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          items: importedItems,
          activeSheetName: activeSheetName,
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCsvSuccessMessage(`🎉 นำเข้าและอัปเดตเกณฑ์ประเมินสำเร็จจำนวน ${data.count || importedItems.length} รายการ ลงในแท็บ "${activeSheetName}" เรียบร้อยแล้ว!`);
          fetchAssessments(activeSheetName);
        } else {
          setCsvErrorMessage(data.error || "เกิดความผิดพลาดระหว่างบันทึกข้อมูล");
        }
      } else {
        setCsvErrorMessage("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลได้");
      }
    } catch (e: any) {
      setCsvErrorMessage(`เกิดข้อผิดพลาดในการพาร์สหรือส่งข้อมูล: ${e.message}`);
    }
  };

  const handleCSVFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPastedCSV(text || "");
    };
    reader.readAsText(file, "UTF-8");
  };
  const filteredAssessments = assessments.filter((item) => {
    const matchesCategory =
      selectedCategoryFilter === "ทั้งหมด" ||
      (item?.Main_Category || "ไม่ระบุหมวด") === selectedCategoryFilter;

    const matchesStatus =
      statusFilter === "ทั้งหมด" || item?.Status === statusFilter;

    const queryLower = searchQuery.toLowerCase();
    const matchesSearch =
      (item?.Item_ID || "").toLowerCase().includes(queryLower) ||
      (item?.Criteria_Detail || "").toLowerCase().includes(queryLower) ||
      (item?.Success_Indicator || "").toLowerCase().includes(queryLower) ||
      ((item?.Responsible_Person || "").toLowerCase().includes(queryLower));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Calculate high-performance overall statistics & Completion percentages
  const totalItems = assessments.length;
  const readyItems = assessments.filter((i) => i.Status === "🟢 พร้อมรับตรวจ").length;
  const inProgressItems = assessments.filter((i) => i.Status === "🟡 อยู่ระหว่างปรับปรุง").length;
  const notReadyItems = assessments.filter((i) => i.Status === "🔴 ยังไม่พร้อม").length;
  const totalEvidenceLinks = assessments.reduce(
    (sum, item) => sum + (item.Evidence_Link ? item.Evidence_Link.length : 0),
    0
  );
  
  const completionPercentage = totalItems > 0 ? Math.round((readyItems / totalItems) * 100) : 0;

  const safeFormatSimpleDate = (isoString?: string) => {
    if (!isoString) return "ไม่เคยระบุ";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toISOString().slice(0, 10);
    } catch {
      return isoString;
    }
  };

  // Render Time string
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "ยังไม่มีประวัติบันทึก";
    try {
      const date = new Date(isoString);
      return date.toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC"
      }) + " น. (UTC)";
    } catch {
      return isoString;
    }
  };

  // Extract human-friendly name of category
  const getCleanCategoryNumRef = (catName?: string) => {
    if (!catName) return "ไม่ระบุหมวด";
    try {
      const match = catName.match(/^(\d+)/);
      const suffix = catName.length > 15 ? "..." : "";
      return match ? `หมวดที่ ${match[1]}` : catName.slice(0, 15) + suffix;
    } catch {
      return String(catName);
    }
  };

  if (isAdminActive) {
    return (
      <AdminPortal 
        onLogoutAdmin={() => {
          sessionStorage.removeItem("moph_admin_creds");
          setIsAdminActive(false);
          setHospital(null);
        }}
        onInspectHospital={(h) => {
          setHospital(h);
          setIsAdminActive(false);
        }}
        onHospitalUpdated={(oldCode, updated) => {
          if (hospital && hospital.code === oldCode) {
            const nextHospObj = { ...hospital, code: updated.code, name: updated.name };
            setHospital(nextHospObj);
            localStorage.setItem("moph_hospital", JSON.stringify(nextHospObj));
          }
        }}
        showToast={showToast}
        triggerConfirm={triggerConfirm}
      />
    );
  }

  if (isAuditorActive) {
    return (
      <AuditorPortal
        onLogoutAuditor={() => {
          sessionStorage.removeItem("moph_auditor_creds");
          setIsAuditorActive(false);
          setHospital(null);
        }}
        onInspectHospital={(h) => {
          setHospital(h);
          setIsAuditorActive(false);
        }}
        showToast={showToast}
      />
    );
  }

  if (!hospital) {
    return (
      <HospitalAuthScreen 
        onAuthSuccess={(h) => setHospital(h)} 
        onAdminSuccess={() => setIsAdminActive(true)}
        onAuditorSuccess={() => setIsAuditorActive(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#333333] font-sans antialiased flex flex-col selection:bg-[#5A5A40] selection:text-white">
      
      {/* 🕵️ Auditor Evaluation Inspection Banner */}
      {sessionStorage.getItem("moph_auditor_creds") !== null && (
        <div className="bg-[#466964] border-b border-[#3b5753] text-[#FFD700] px-4 py-2 text-xs font-bold flex items-center justify-between shadow-inner sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="bg-[#FFD700] text-stone-900 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold animate-pulse font-sans">
              🕵️ Auditor Mode
            </span>
            <span className="text-white">
              กำลังตรวจสอบข้อมูลประเมินและไฟล์หลักฐานของ: <strong className="underline text-yellow-300 font-extrabold">{hospital?.name} ({hospital?.code})</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setHospital(null);
              setIsAuditorActive(true);
            }}
            className="bg-[#2e4541] hover:bg-[#253734] text-white hover:text-yellow-300 font-sans px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition shadow-sm flex items-center gap-1 shrink-0 border border-[#3b5753]"
          >
            <span>กลับสู่หน้าผู้ตรวจประเมินหลัก (Auditor Panel)</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* 👑 Admin Mode Banner */}
      {sessionStorage.getItem("moph_admin_creds") !== null && (
        <div className="bg-[#FFD700] border-b border-[#cca700] text-stone-900 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-inner sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="bg-[#333324] text-[#FFD700] px-1.5 py-0.5 rounded text-[9px] uppercase font-bold animate-pulse font-sans">
              👑 Admin Mode
            </span>
            <span>
              ผู้ดูแลระบบหลักกำลังช่วยตรวจสอบหน่วยงาน: <strong className="underline text-stone-950 font-extrabold">{hospital?.name} ({hospital?.code})</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setHospital(null);
              setIsAdminActive(true);
            }}
            className="bg-[#333324] hover:bg-stone-850 text-white hover:text-yellow-300 font-sans px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition shadow-sm flex items-center gap-1 shrink-0"
          >
            <span>กลับสู่หน้าผู้ดูแลระบบหลัก (Admin Panel)</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* 🚀 Top Navigation / Brand */}
      <header className="bg-[#5A5A40] text-white border-b border-[#6b6b4d] shrink-0 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col gap-3.5">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#6b6b4d] rounded-lg text-white shadow-inner flex items-center justify-center">
                <Layers className="w-6 h-6 animate-pulse text-[#FFD700]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] tracking-wider text-[#FFD700] bg-[#4a4a35] border border-[#6b6b4d] px-2 py-0.5 rounded uppercase font-semibold">
                    MOPH X-Ray Accreditation 2569
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-teal-300 bg-[#4a4a35] border border-[#6b6b4d] px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                    <span>รพ: {hospital?.name} ({hospital?.code})</span>
                  </span>
                  {hospital && (hospital as any).upline && (
                    <span className="font-mono text-[10px] tracking-wider text-[#FFD700] bg-[#342a20] border border-[#524422] px-2 py-0.5 rounded font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFD700] animate-pulse" />
                      <span>โครงข่ายผู้ดูแล (Upline): {(hospital as any).upline}</span>
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 mt-0.5">
                  MOPH X-ray 2569 Smart Evidence Hub
                  <span className="text-[#FFD700] text-sm font-semibold">v3.0</span>
                </h1>
              </div>
            </div>

            {/* Quick Stats Summary Strip */}
            <div className="flex items-center flex-wrap gap-2.5">
              <button
                onClick={() => setShowSyncPanel(!showSyncPanel)}
                className="bg-[#6b6b4d] hover:bg-[#4a4a35] text-white px-3 py-1.5 rounded-lg border border-[#4a4a35] flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                title="นำเข้า/ออกไฟล์ข้อมูล Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                <span>ซิงค์ Sheets (CSV)</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="bg-[#6b6b4d] hover:bg-[#4a4a35] text-white px-3 py-1.5 rounded-lg border border-[#4a4a35] flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                title="ดาวน์โหลดไฟล์ CSV สำหรับอัปเดตลง Google Sheets"
              >
                <Download className="w-4 h-4 text-[#FFD700]" />
                <span>นำเข้าออกไฟล์</span>
              </button>

              <button
                onClick={handleResetDatabase}
                className="bg-[#4a4a35] border border-red-750 hover:bg-red-900/40 text-red-200 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                title="รีเซ็ตเกณฑ์ข้อความมาตรฐานเริ่มต้น"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ล้างฐานข้อมูล</span>
              </button>

              <button
                onClick={() => {
                  triggerConfirm(
                    "🚪 ออกจากระบบสลับโรงพยาบาล",
                    `คุณต้องการออกจากระบบแยกโรงพยาบาล "${hospital?.name}" ในขณะนี้ใช่หรือไม่?\n\n* ข้อมูลความพร้อม เอกสารอ้างอิง และแผ่นแท็บประเมินจะคงถูกบันทึกไว้อย่างปลอดภัยบนระบบคลาวด์ 100% คุณสามารถย้อนกลับมาเข้าผ่านโค้ดโรงพยาบาลได้ทุกเมื่อ`,
                    () => {
                      localStorage.removeItem("moph_hospital");
                      setHospital(null);
                    },
                    false,
                    "ออกจากระบบ",
                    "ยกเลิก"
                  );
                }}
                className="bg-red-955/60 hover:bg-red-900 border border-red-500/35 text-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                title="ออกจากระบบสลับโรงพยาบาล"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>

          {/* 📂 Multi-Sheet Tabs Bar (ระบบจัดการแบบหลายชุดข้อมูล) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#6b6b4d]/60 pt-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-wrap">
              <span className="text-[11px] font-bold text-amber-200 tracking-wider uppercase flex items-center gap-1.5 mr-1.5">
                <Database className="w-4 h-4 text-amber-300" />
                <span>ชุดข้อมูล:</span>
              </span>
              {sheets.map((sheet) => {
                const isSelected = activeSheetName === sheet;
                return (
                  <div
                    key={sheet}
                    className="relative flex items-center group transition shrink-0"
                  >
                    <button
                      id={`sheet-tab-${sheet}`}
                      onClick={() => setActiveSheetName(sheet)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        sheets.length > 1 ? "pl-3.5 pr-7" : "px-3.5"
                      } ${
                        isSelected
                          ? "bg-[#FFD700] text-gray-950 font-extrabold hover:bg-yellow-400 scale-[1.03]"
                          : "bg-[#4a4a35] hover:bg-[#6b6b4d] text-gray-200 hover:text-white border border-transparent"
                      }`}
                    >
                      <span className="text-xs">📊</span>
                      <span>{sheet}</span>
                    </button>
                    {sheets.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSheet(sheet);
                        }}
                        className={`absolute right-1.5 p-0.5 rounded cursor-pointer hover:bg-red-600 hover:text-white transition-colors duration-150 ${
                          isSelected ? "text-gray-800" : "text-gray-400"
                        }`}
                        title={`ลบชุดข้อมูล "${sheet}"`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowCreateSheetModal(true)}
              className="bg-[#3a9668] hover:bg-[#2c7752] text-white font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs cursor-pointer shadow-sm border border-[#2c7752] transition-colors shrink-0"
              title="สร้างชุดการประเมินแยกแผ่นแท็บใหม่"
            >
              <Plus className="w-4 h-4" />
              <span>➕ สร้างชุดประเมินใหม่</span>
            </button>
          </div>

        </div>
      </header>

      {/* 📊 Top Smart Infographics Dashboard Strip */}
      <section className="bg-white/90 backdrop-blur px-4 py-5 border-b border-gray-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Progress Card */}
          <div className="bg-[#f5f5f0]/60 border border-gray-200 text-gray-800 p-4 rounded-xl flex items-center space-x-4 shadow-sm">
            <div className="relative flex items-center justify-center shrink-0">
              {/* Micro circular progress */}
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" className="stroke-gray-200 fill-none" strokeWidth="3" />
                <circle cx="24" cy="24" r="20" className="stroke-[#5A5A40] fill-none" strokeWidth="3.5"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - completionPercentage / 100)}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute font-mono text-xs font-bold text-[#5A5A40]">{completionPercentage}%</span>
            </div>
            <div>
              <p className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">อัตราความพร้อมรวม</p>
              <h3 className="text-xl font-bold font-mono text-gray-850 mt-0.5">Accreditation</h3>
              <p className="text-[10px] text-[#5A5A40] font-medium">ของเกณฑ์ประเมินที่ผ่านทั้งหมด</p>
            </div>
          </div>

          {/* Core metrics */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">🟢 พร้อมรับตรวจ</p>
              <h3 className="text-2xl font-bold font-mono text-emerald-700 mt-1">{readyItems} <span className="text-xs font-sans text-gray-500">ข้อ</span></h3>
              <p className="text-[10px] text-gray-400 mt-0.5">เป้าหมายมาตรฐาน 100%</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">🟡 อยู่ระหว่างปรับปรุง</p>
              <h3 className="text-2xl font-bold font-mono text-amber-700 mt-1">{inProgressItems} <span className="text-xs font-sans text-gray-500">ข้อ</span></h3>
              <p className="text-[10px] text-gray-400 mt-0.5">ความเสี่ยงปานกลาง</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
              <Hourglass className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">🔴 ยังไม่พร้อม</p>
              <h3 className="text-2xl font-bold font-mono text-red-700 mt-1">{notReadyItems} <span className="text-xs font-sans text-gray-500">ข้อ</span></h3>
              <p className="text-[10px] text-gray-400 mt-0.5">ต้องจัดทำแผนด่วนพิเศษ</p>
            </div>
            <div className="p-2.5 bg-red-50 text-red-750 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">📂 ไฟล์หลักฐานที่บันทึกแล้ว</p>
              <h3 className="text-2xl font-bold font-mono text-[#5A5A40] mt-1">{totalEvidenceLinks} <span className="text-xs font-sans text-gray-500">ลิงก์</span></h3>
              <p className="text-[10px] text-gray-400 mt-0.5">ใน Google Drive แฟ้มงาน</p>
            </div>
            <div className="p-2.5 bg-[#5A5A40]/10 text-[#5A5A40] rounded-lg">
              <Database className="w-5 h-5" />
            </div>
          </div>

        </div>
      </section>

      {/* Main Content Split Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-hidden">
        
        {/* 🎛️ Tab Switcher (Stakeholder Hub) */}
        <div className="flex bg-white/90 border border-gray-100 p-1 rounded-xl shrink-0 self-start shadow-sm flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-[#5A5A40] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <TrendingUp className={`w-4 h-4 ${activeTab === "dashboard" ? "text-[#FFD700]" : "text-[#5A5A40]"}`} />
            <span>📊 สถิติและแดชบอร์ดความพร้อม (Summary Dashboard)</span>
          </button>
          <button
            onClick={() => setActiveTab("workspace")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "workspace"
                ? "bg-[#5A5A40] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            <Layers className={`w-4 h-4 ${activeTab === "workspace" ? "text-[#FFD700]" : "text-[#5A5A40]"}`} />
            <span>📑 จัดการแฟ้มข้อมูลหลักฐาน (Evidence Base Workspace)</span>
          </button>
        </div>
        
        {/* 📑 Sheets Synchronization & CSV Importer Panel (Toggleable Drawer) */}
        <AnimatePresence>
          {showSyncPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border border-gray-250 rounded-xl overflow-hidden shadow-xl shrink-0"
            >
              <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/70">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">ระบบอัปเดตและนำเข้าข้อมูลร่วมกับ Google Sheets (แท็บ Self_Assessment)</h3>
                </div>
                <button
                  onClick={() => setShowSyncPanel(false)}
                  className="text-slate-400 hover:text-white font-mono text-sm uppercase px-2 py-1 rounded bg-slate-800 text-xs border border-slate-700 cursor-pointer"
                >
                  ✖️ ปิด
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                {/* Manual CSV Paste / Upload */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-750">
                      วางรหัส CSV จาก Google Sheets
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold px-2.5 py-1 rounded border border-gray-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-gray-600" />
                        <span>อัปโหลดไฟล์ชุด .csv</span>
                      </button>
                      <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleCSVFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <textarea
                    value={pastedCSV}
                    onChange={(e) => setPastedCSV(e.target.value)}
                    placeholder={`Main_Category,Sub_Category,Item_ID,Criteria_Detail,Success_Indicator,Status,Responsible_Person,Evidence_Link,Auditor_Comment,Last_Update
"1. ข้อกำหนดทั่วไป","1.1 โครงสร้าง","1.1.1","เอกสารประเมิน","มีแผนภูมิ","🟢 พร้อมรับตรวจ","ยรรยง","[\"https://drive.google.com/...\"]","คอมเมนต์",""
...`}
                    rows={6}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-850 p-3 rounded-lg font-mono text-xs focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />

                  <div className="mt-3 flex items-center justify-end gap-2.5">
                    <button
                      onClick={handleImportCSVData}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>ยืนยันการบันทึกทับ</span>
                    </button>
                  </div>

                  {csvSuccessMessage && (
                    <div className="p-3 bg-emerald-950/85 text-emerald-400 border border-emerald-800 rounded-lg mt-3 text-xs flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{csvSuccessMessage}</span>
                    </div>
                  )}

                  {csvErrorMessage && (
                    <div className="p-3 bg-rose-950/85 text-rose-400 border border-rose-900 rounded-lg mt-3 text-xs flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{csvErrorMessage}</span>
                    </div>
                  )}

                </div>

                {/* Guide to Google Sheets integration */}
                <div className="text-xs text-gray-700 space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1">
                    <HelpCircle className="w-4 h-4 text-teal-600" />
                    <span>คำแนะนำในการคัดลอกข้อมูลไป-กลับ Google Sheets</span>
                  </h4>
                  <p>
                    เพื่อให้การแลกเปลี่ยนข้อมูลระหว่างแอปพลิเคชันและ Google Sheets ดำเนินไปอย่างสมบูรณ์แบบโดยไม่ต้องใช้ API Key Google คลาวด์ซับซ้อน:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600">
                    <li>
                      <span className="text-gray-800 font-semibold">คัดลอกจาก Sheets:</span> เปิดชีท <span className="text-teal-700 font-semibold">Self_Assessment</span> กด <span className="kbd">ไฟล์ &gt; ดาวน์โหลด &gt; ค่าที่คั่นด้วยจุลภาค (.csv)</span> จากนั้นนำไฟล์มาอัปโหลดหรือเปิดคลิกขวาเปิดมาวางในกล่องซ้ายมือ กดบันทึกเพื่อเข้าสู่ระบบของเราทันที
                    </li>
                    <li>
                      <span className="text-gray-800 font-semibold">บันทึกบนเว็บ:</span> บันทึกแก้ไขสถานะ แนบลิงก์หลักฐาน ได้แบบไดนามิกจากหน้ากรอกข้อมูล
                    </li>
                    <li>
                      <span className="text-gray-800 font-semibold">ส่งกลับไปยัง Sheets:</span> กดปุ่ม <span className="text-teal-700 font-semibold">"นำเข้าออกไฟล์"</span> ด้านบนเพื่อโหลด .csv ฉบับล่าสุด (ระบบจะจัดโครงสร้าง 10 คอลัมน์และแปลงลิงก์สะสมเป็น JSON ถาวรให้อัตโนมัติในช่อง H) จากนั้นไปที่ Google Sheets กด <span className="kbd">นำเข้า &gt; อัปโหลดไฟล์ใหม่แทนที่ชีทเดิม</span>
                    </li>
                  </ol>
                  <p className="text-[11px] text-amber-600 font-semibold">
                    ⚠️ ข้อควรจำ: คอลัมน์ C (Item_ID) จะต้องห้ามเว้นเพื่อเป็นคีย์ดัชนีในการดึงข้อมูลเสมอ
                  </p>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "dashboard" ? (
          <DashboardView
            assessments={assessments}
            onSelectCategory={setSelectedCategoryFilter}
            onSwitchTab={setActiveTab}
          />
        ) : (
          /* 🎛️ Dual Column Interactive Body */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
          
          {/* ==========================================
              LEFT COLUMN: SEARCH, LISTING & FILTERS (col-span-12 full width for Style 2)
              ========================================== */}
          <div className="lg:col-span-12 flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden min-h-0 shadow-sm">
            
            {/* Header / Filter Toolbar */}
            <div className="p-4 bg-white border-b border-gray-150 space-y-3 shrink-0">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-755 uppercase tracking-widest flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-[#5A5A40]" />
                    รายการข้อเกณฑ์การตรวจประเมิน
                  </span>
                  <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-full font-bold">
                    แสดง {filteredAssessments.length}/{totalItems} ข้อ
                  </span>
                </div>

                {/* ➕ Category & Item Manage Action buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setNewCategoryName("");
                      setShowAddCategoryModal(true);
                    }}
                    className="bg-[#5A5A40] text-white hover:bg-[#4a4a35] text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition-transform hover:scale-[1.02] cursor-pointer"
                    title="สร้างหมวดการตรวจประเมินข้อใหม่"
                  >
                    <span>➕ เพิ่มหมวด</span>
                  </button>
                  <button
                    onClick={() => {
                      setNewItemCategory(selectedCategoryFilter === "ทั้งหมด" ? (categoriesList[1] || "") : selectedCategoryFilter);
                      setNewItemSubCategory("");
                      setNewItemID("");
                      setNewItemCriteria("");
                      setNewItemSuccess("");
                      setShowAddItemModal(true);
                    }}
                    className="bg-[#3a9668] hover:bg-[#2c7752] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition-transform hover:scale-[1.02] cursor-pointer"
                    title="สร้างข้อกำหนดเกณฑ์ประเมินย่อยภายในหมวดหลัก"
                  >
                    <span>➕ เพิ่มข้อย่อย</span>
                  </button>
                </div>
              </div>

              {/* Dynamic search input and status selector */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                
                {/* text search input */}
                <div className="sm:col-span-7 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ป้อนคำค้นหา: รหัสข้อ, ตัวชี้วัด..."
                    className="w-full bg-gray-50 border border-gray-300 text-gray-800 pl-9 pr-4 py-2 rounded-lg text-xs placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1.5 text-gray-500 hover:text-gray-800 text-xs bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      ล้าง
                    </button>
                  )}
                </div>

                {/* status select filter */}
                <div className="sm:col-span-5">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-705 py-2 px-3 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="ทั้งหมด">📊 ทุกสถานะความพร้อม</option>
                    <option value="🟢 พร้อมรับตรวจ">🟢 พร้อมรับตรวจ</option>
                    <option value="🟡 อยู่ระหว่างปรับปรุง">🟡 อยู่ระหว่างปรับปรุง</option>
                    <option value="🔴 ยังไม่พร้อม">🔴 ยังไม่พร้อม</option>
                  </select>
                </div>

              </div>

              {/* Category Management Banner (เมื่อเลือกหมวดใดหมวดหนึ่ง) */}
              {selectedCategoryFilter !== "ทั้งหมด" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl text-xs shadow-inner">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-amber-750 font-bold">📂 หมวดที่เลือก:</span>{" "}
                    <span className="text-slate-900 font-extrabold">{getCleanCategoryNumRef(selectedCategoryFilter)}</span>
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() => {
                        setEditCategoryOldName(selectedCategoryFilter);
                        setEditCategoryNewName(selectedCategoryFilter);
                        setShowEditCategoryModal(true);
                      }}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 font-bold px-2.5 py-1 rounded-md text-[10px] transition-colors cursor-pointer"
                      title="แก้ไขชื่อหรือรหัสอ้างอิงของหมวดนี้"
                    >
                      ✏️ แก้ไขชื่อหมวด
                    </button>
                  </div>
                </div>
              )}

              {/* Horizontal Category Filtering Buttons (MOPH 9-Category Sidebar equivalents) */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-gray-200">
                {categoriesList.map((cat, idx) => {
                  const isSelected = selectedCategoryFilter === cat;
                  // Count total items under this category
                  const itemInCat = assessments.filter(
                    (i) => cat === "ทั้งหมด" || i.Main_Category === cat
                  ).length;
                  const readyInCat = assessments.filter(
                    (i) => (cat === "ทั้งหมด" || i.Main_Category === cat) && i.Status === "🟢 พร้อมรับตรวจ"
                  ).length;
                  const inProgressInCat = assessments.filter(
                    (i) => (cat === "ทั้งหมด" || i.Main_Category === cat) && i.Status === "🟡 อยู่ระหว่างปรับปรุง"
                  ).length;
                  const displayLabel = cat === "ทั้งหมด" ? "💡 ดูทุกหมวด" : getCleanCategoryNumRef(cat);

                  // Decide styles recursively based on completion status
                  let buttonStyle = "";
                  let pillStyle = "";

                  if (cat === "ทั้งหมด") {
                    buttonStyle = isSelected
                      ? "bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/30 font-semibold shadow-inner"
                      : "bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100 hover:text-gray-85";
                    pillStyle = isSelected
                      ? "bg-[#5A5A40]/25 text-[#5A5A40] font-bold"
                      : "bg-gray-250 text-gray-600";
                  } else if (itemInCat > 0 && readyInCat === itemInCat) {
                    // สีเขียว: ตอบครบแล้ว (ทุกข้อเป็น 🟢 พร้อมรับตรวจ)
                    buttonStyle = isSelected
                      ? "bg-emerald-50 text-emerald-800 border-emerald-400 font-bold ring-1 ring-emerald-400/30 shadow-xs"
                      : "bg-emerald-50/40 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-850 hover:border-emerald-300";
                    pillStyle = isSelected
                      ? "bg-emerald-200 text-emerald-900 font-bold"
                      : "bg-emerald-100/70 text-emerald-800";
                  } else if (itemInCat > 0 && (readyInCat > 0 || inProgressInCat > 0)) {
                    // สีเหลือง: ตอบบางส่วน (มีข้อ 🟢 หรือ 🟡 บันทึกไว้แล้ว)
                    buttonStyle = isSelected
                      ? "bg-amber-50 text-amber-800 border-amber-400 font-bold ring-1 ring-amber-400/30 shadow-xs"
                      : "bg-amber-50/45 text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-850 hover:border-amber-300";
                    pillStyle = isSelected
                      ? "bg-amber-200 text-amber-900 font-bold"
                      : "bg-amber-100/70 text-amber-800";
                  } else {
                    // คงสีเดิม (ยังไม่ได้ตอบ: ทุกข้อเป็น 🔴 ยังไม่พร้อม)
                    buttonStyle = isSelected
                      ? "bg-[#5A5A40]/10 text-[#5A5A40] border-[#5A5A40]/30 font-semibold shadow-inner"
                      : "bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100 hover:text-gray-85";
                    pillStyle = isSelected
                      ? "bg-[#5A5A40]/25 text-[#5A5A40] font-bold"
                      : "bg-gray-250 text-gray-600";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-all flex items-center space-x-1 cursor-pointer ${buttonStyle}`}
                    >
                      <span>{displayLabel}</span>
                      <span className={`font-mono text-[9px] px-1 rounded-md ${pillStyle}`}>
                        {readyInCat}/{itemInCat}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* List entries */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50">
              
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-2">
                  <Loader className="w-8 h-8 text-[#5A5A40] animate-spin" />
                  <p className="text-xs text-gray-500">กำลังดึงข้อมูลใบประเมินตามมาตรฐานจากระบบฐานข้อมูล...</p>
                </div>
              ) : filteredAssessments.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-gray-300 bg-white shadow-xs">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">ไม่พบความสอดคล้องกับข้อกำหนดที่คุณระบุ</p>
                  <p className="text-xs text-gray-400 mt-1">กรุณาลองเปลี่ยนหมวดหมู่ตัวเลือก หรือลบตัวคัดกรองคำค้นหาออก</p>
                </div>
              ) : (
                filteredAssessments.map((item) => {
                  const isSelected = selectedId === item.Item_ID;
                  const countLinks = item.Evidence_Link ? item.Evidence_Link.length : 0;
                  
                  // Card color outline based on status
                  const statusColors = {
                    "🟢 พร้อมรับตรวจ": "border-l-emerald-500",
                    "🟡 อยู่ระหว่างปรับปรุง": "border-l-amber-500",
                    "🔴 ยังไม่พร้อม": "border-l-rose-500"
                  };

                  return (
                    <div
                      key={item.Item_ID}
                      onClick={() => setSelectedId(item.Item_ID)}
                      className={`relative rounded-xl border border-gray-200 bg-white hover:bg-gray-50 p-4 shrink-0 transition-all cursor-pointer border-l-4 shadow-sm ${
                        statusColors[item.Status] || "border-l-gray-400"
                      } ${
                        isSelected
                          ? "ring-2 ring-[#5A5A40]/60 bg-[#f5f5f0]/40 border-gray-300"
                          : ""
                      }`}
                    >
                      
                      {/* Top Header Row of Item Details */}
                      <div className="flex items-start justify-between gap-2.5">
                        
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-[#5A5A40] bg-[#f5f5f0] border border-gray-200 px-2.5 py-0.5 rounded">
                            {item.Item_ID}
                          </span>
                          <span className="text-[10px] text-gray-550 font-medium truncate max-w-[120px] sm:max-w-xs">
                            {getCleanCategoryNumRef(item.Main_Category)}
                          </span>
                        </div>

                        {/* Status Label Pill */}
                        <div className="flex items-center space-x-2">
                          {countLinks > 0 && (
                            <span className="font-mono text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              📄 {countLinks} ลิงก์
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${
                              item.Status === "🟢 พร้อมรับตรวจ"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                                : item.Status === "🟡 อยู่ระหว่างปรับปรุง"
                                ? "bg-amber-50 text-amber-700 border-amber-150"
                                : "bg-rose-50 text-rose-700 border-rose-150"
                            }`}
                          >
                            {item.Status}
                          </span>
                        </div>

                      </div>

                      {/* Criteria Text Content */}
                      <p className="mt-2.5 text-xs text-gray-800 leading-relaxed font-sans line-clamp-2">
                        {item.Criteria_Detail}
                      </p>

                      {/* Footer Info inside list card item */}
                      <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {safeFormatSimpleDate(item.Last_Update)}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // prevent select action
                            handleDeleteItem(item.Item_ID);
                          }}
                          className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-all flex items-center gap-1 font-bold font-sans cursor-pointer"
                          title="ลบเกณฑ์ประเมินข้อนี้ออกจากหมวด"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>ลบข้อนี้</span>
                        </button>
                      </div>

                    </div>
                  );
                })
              )}

            </div>

          </div>

          {/* ==========================================
              RIGHT COLUMN: ACTIVE ITEM INSPECTOR & EDIT FORM (Slide-Over Drawer v2 - Style 2)
              ========================================== */}
          <AnimatePresence>
            {selectedItem && (
              <>
                {/* Blur backdrop mask to focus attention */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedId(null)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[80] cursor-pointer"
                />

                {/* Sliding side drawer */}
                <motion.div
                  ref={inspectorRef}
                  initial={{ x: "100%", opacity: 0.9 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0.9 }}
                  transition={{ type: "spring", damping: 26, stiffness: 220 }}
                  className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[90] overflow-hidden flex flex-col border-l border-gray-200"
                >
                  <div className="flex-1 flex flex-col min-h-0 bg-white">
                    
                    {/* Fixed Inspector Title Banner */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0 font-sans">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-extrabold text-[#5A5A40] bg-white border border-gray-200 px-2.5 py-1 rounded">
                          {selectedItem.Item_ID}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">แผงจัดการข้อมูลหลักฐานประเมิน</h4>
                          <p className="text-[10px] text-gray-500 truncate max-w-[150px] sm:max-w-[180px]">
                            {selectedItem.Sub_Category}
                          </p>
                        </div>
                      </div>
                      
                      {/* Action buttons with edit definition, delete, and close panel */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingItemID(selectedItem.Item_ID);
                            setEditItemCategory(selectedItem.Main_Category);
                            setEditItemSubCategory(selectedItem.Sub_Category);
                            setEditItemID(selectedItem.Item_ID);
                            setEditItemCriteria(selectedItem.Criteria_Detail);
                            setEditItemSuccess(selectedItem.Success_Indicator);
                            setShowEditItemModal(true);
                          }}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 font-bold px-2 py-1 rounded-md text-[10px] transition-all cursor-pointer flex items-center justify-center text-center leading-none"
                          title="แก้ไขเกณฑ์มาตรฐาน / ข้อกำหนดเป้าหมาย"
                        >
                          ✏️ แก้ไขเกณฑ์
                        </button>
                        <button
                          onClick={() => handleDeleteItem(selectedItem.Item_ID)}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 font-bold px-2 py-1 rounded-md text-[10px] transition-all cursor-pointer flex items-center justify-center text-center leading-none"
                          title="ลบเกณฑ์มาตรฐานข้อนี้ออกถาวร"
                        >
                          🗑️ ลบข้อนี้
                        </button>
                        <button
                          onClick={() => setSelectedId(null)}
                          className="bg-gray-150 hover:bg-gray-200 text-gray-700 border border-gray-350 font-bold px-2.5 py-1 rounded-md text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1 text-center"
                          title="ปิดแผงจัดการนี้"
                        >
                          <X className="w-3.5 h-3.5 text-gray-600" />
                          <span>ปิดแผง</span>
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Form Workspace of active item */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white font-sans">
                      
                      {/* Part 1: Green Box for Criteria & Success Indicator & Hyperlink Buttons */}
                      <div className="bg-emerald-50/50 border border-emerald-150 p-4 rounded-xl space-y-3 shadow-inner">
                        
                        <div className="flex items-start justify-between">
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-105 border border-emerald-250 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            ตัวชี้วัดความสำเร็จ (Success Indicator)
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-800 leading-relaxed font-sans bg-white p-2.5 rounded-lg border border-gray-150">
                          {selectedItem.Success_Indicator || "ไม่ได้ระบุความคาดหวังเฉพาะ"}
                        </p>

                        <div className="text-[11px] text-gray-700">
                          <span className="font-bold text-emerald-705 text-emerald-700">เกณฑ์ประเมินจริง:</span> {selectedItem.Criteria_Detail}
                        </div>

                        {/* 📂 Automatic Yellow Hyperlinks Buttons for Attached Google Drive Links! */}
                        <div className="pt-2 border-t border-emerald-900/40 space-y-1.5">
                          <span className="block text-[10px] font-bold text-gray-500">
                            🔗 ลิงก์แฟ้มประจักษ์หลักฐาน (เปิดใน Tab ใหม่):
                          </span>

                          {selectedItem.Evidence_Link && selectedItem.Evidence_Link.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {selectedItem.Evidence_Link.map((link, lIdx) => {
                                // Ensure typical absolute link protocol is satisfied
                                const hrefVal = link.startsWith("http") ? link : `https://${link}`;
                                return (
                                  <a
                                    key={lIdx}
                                    href={hrefVal}
                                    target="_blank"
                                    rel="noopener noreferrer referrer"
                                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-[11px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-center group truncate shadow"
                                    title={link}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0 group-hover:scale-110" />
                                    <span className="truncate">📂 เปิดหลักฐานแฟ้มที่ {lIdx + 1}</span>
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-amber-700 text-[11px] font-semibold bg-amber-50 border border-amber-200 p-2 rounded flex items-center justify-center gap-1">
                              <span>📭 ข้อนี้ยังไม่ได้แนบลิงก์หลักฐาน</span>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Part 2: Interactive Controls Form */}
                      <div className="space-y-3.5 pt-1">
                        
                        {/* Status Pill Select Range */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                            สถานะความพร้อมรับการตรวจ (ล็อกตามมาตรฐาน)
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { val: "🟢 พร้อมรับตรวจ", c: "bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100" },
                              { val: "🟡 อยู่ระหว่างปรับปรุง", c: "bg-amber-50 border-amber-250 text-amber-700 hover:bg-amber-100" },
                              { val: "🔴 ยังไม่พร้อม", c: "bg-rose-50 border-rose-205 text-rose-700 hover:bg-rose-100" }
                            ].map((statOpt) => {
                              const active = editedStatus === statOpt.val;
                              return (
                                <button
                                  key={statOpt.val}
                                  type="button"
                                  onClick={() => setEditedStatus(statOpt.val as AssessmentStatus)}
                                  className={`py-2 px-1 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                                    active
                                      ? statOpt.val === "🟢 พร้อมรับตรวจ"
                                        ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                                        : statOpt.val === "🟡 อยู่ระหว่างปรับปรุง"
                                        ? "bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-900/20"
                                        : "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-950/20"
                                      : statOpt.c
                                  }`}
                                >
                                  {statOpt.val}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-gray-500 flex items-center gap-1">
                              <span>กล่องลิงก์อ้างอิง Google Drive (มากกว่า 1 ลิงก์)</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleAddLinkField}
                              className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-gray-600" />
                              <span>➕ เพิ่มลิงก์อื่นเพิ่ม</span>
                            </button>
                          </div>

                          {editedLinks.length === 0 ? (
                            <div className="p-3 text-center rounded-lg border border-dashed border-gray-250 bg-gray-50 text-[11px] text-gray-500">
                              ยังไม่มีข้อมูลลิงก์ แนะนำให้คลิกปุ่มด้านขวาบนเพื่อกรอกลิงก์ Google Drive แฟ้มหลักฐาน
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {editedLinks.map((link, idx) => (
                                <div key={idx} className="flex items-center space-x-1.5">
                                  <span className="font-mono text-[10px] text-gray-400 shrink-0 select-none w-4">
                                    #{idx + 1}
                                  </span>
                                  <input
                                    type="url"
                                    value={link}
                                    onChange={(e) => handleLinkChange(idx, e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    className="flex-1 bg-white border border-gray-300 text-gray-800 px-2 py-1.5 rounded-lg text-xs placeholder:text-gray-400 focus:ring-1 focus:ring-teal-555 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLinkField(idx)}
                                    className="p-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-500 rounded-lg text-xs border border-gray-200 cursor-pointer shrink-0 transition-all"
                                    title="ลบลิงก์ย่อยนี้"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Auditor Comment */}
                        <div>
                          <label className="block text-xs font-bold text-sky-700 mb-1.5 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                            <span>ความคิดเห็นผู้ตรวจประเมิน (Auditor Comment)</span>
                          </label>
                          <textarea
                            value={editedComment}
                            onChange={(e) => setEditedComment(e.target.value)}
                            placeholder="สำหรับคณะผู้ตรวจประเมินใช้บันทึกความคิดเห็น ข้อบกพร่อง หรือประเด็นที่ต้องเสนอแนะ..."
                            rows={3.5}
                            className="w-full bg-sky-50/50 border border-sky-200 text-gray-800 p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none placeholder:text-gray-450"
                          />
                        </div>

                        {/* Last Update (Yellow Tinted Display) */}
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] text-amber-800 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>วันเวลาอัปเดตล่าสุด (Last_Update):</span>
                          </span>
                          <span className="font-bold underline">
                            {formatDateTime(selectedItem.Last_Update)}
                          </span>
                        </div>

                        {/* Big Action Save Button */}
                        <button
                          type="button"
                          onClick={handleSaveItem}
                          disabled={isSaving}
                          className="w-full bg-[#5A5A40] hover:bg-[#4a4a35] disabled:bg-gray-300 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                        >
                          {isSaving ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          <span>💾 บันทึกข้อมูลเกณฑ์ {selectedItem.Item_ID} ลงชีทจำลอง</span>
                        </button>

                      </div>

                    </div>

                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>
        )}

      </main>

      {/* 🚀 Sticky Footer / Developer Credentials */}
      <footer className="bg-gray-100 border-t border-gray-200 py-4 shrink-0 text-center text-[11px] text-gray-500 mt-auto font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-600">
          <p className="flex items-center gap-1">
            <span>© 2026 MOPH Smart Evidence Hub v3.0</span>
            <span className="text-teal-600 font-medium">●</span>
            <span className="font-semibold text-gray-700">กลุ่มงานรังสีการแพทย์สาธารณสุขไทย</span>
          </p>
          <p className="text-xs text-gray-400">
            ระบบจัดสรร JSON อ้างอิงลิงก์ Google Drive คอลัมน์ H ด้วยคีย์หลัก Item_ID ประสิทธิภาพสูง
          </p>
          <div className="flex items-center space-x-1">
            <span className="font-mono text-[10px] text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded">
              Local Storage Mode: ONLINE
            </span>
          </div>
        </div>
      </footer>

      {/* ➕ Modal สำหรับสร้างแผ่นเกณฑ์ประเมินชุดใหม่ */}
      <AnimatePresence>
        {showCreateSheetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-150 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-[#5A5A40] text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-300" />
                  <h3 className="font-bold text-sm">สร้างชุดประเมินความพร้อมใหม่</h3>
                </div>
                <button
                  onClick={() => setShowCreateSheetModal(false)}
                  className="text-white/85 hover:text-white font-bold text-lg cursor-pointer px-1 outline-none"
                >
                  ✕
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  ระบบจะทำการสั่งการจำลองโคลนโครงสร้างเกณฑ์มาตรฐานเริ่มต้นจากแผ่นแรก และคัดลอกมาสร้างเป็นแผ่นแท็บประเมินชุดใหม่ พร้อมล้างค่าคอลัมน์วิเคราะห์ฝั่งขวาทั้งหมด (สถานะ, ลิงก์, คอมเมนต์ผู้ตรวจ) เพื่อเริ่มทำแบบประเมินชุดใหม่ (เช่น ปีงบประมาณถัดไป) ได้ทันที
                </p>

                <div className="space-y-1.5 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    ระบุชื่อแท็บประเมินชุดใหม่ (เช่น ปี 2569 หรือ แผนกทันตกรรม)
                  </label>
                  <input
                    type="text"
                    value={newSheetNameInput}
                    onChange={(e) => setNewSheetNameInput(e.target.value)}
                    placeholder="ป้อนชื่อแท็บ เช่น ปี 2569, ปี 2570"
                    className="w-full px-3.5 py-2 mx-auto block bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateNewSheet(newSheetNameInput);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateSheetModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-150 rounded-lg border border-gray-250 cursor-pointer shadow-xs transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateNewSheet(newSheetNameInput)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#5A5A40] hover:bg-[#4a4a35] rounded-lg cursor-pointer shadow-sm hover:shadow transition-all"
                >
                  🚀 ยืนยันสร้างชุดประเมิน
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📁 Modal สำหรับเพิ่มหมวดหมู่ใหม่ */}
      <AnimatePresence>
        {showAddCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-150 overflow-hidden font-sans"
            >
              <div className="bg-[#5A5A40] text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-300" />
                  <h3 className="font-bold text-sm">📁 เพิ่มหมวดสืบค้นใหม่ (Add Category)</h3>
                </div>
                <button
                  onClick={() => setShowAddCategoryModal(false)}
                  className="text-white/85 hover:text-white font-bold text-lg cursor-pointer px-1 outline-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 font-sans">
                <p className="text-xs text-gray-500 leading-relaxed font-sans">
                  สร้างหมวดหมู่การตรวจประเมินอัจฉริยะขึ้นใหม่ในแท็บ "{activeSheetName}" โดยระบบจะสร้างหมวดนี้พร้อมการสอดแทรกรายการข้อประเมินเริ่มต้น (Placeholder) เสมอ เพื่อการแสดงผลที่ถูกต้องในทุกแดชบอร์ดความพร้อม
                </p>

                <div className="space-y-1.5 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    ชื่อหมวดหมู่ (เช่น "10. หมวดการประเมินรังสีและสภาพความยืดหยุ่น")
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="ป้อนตัวเลขนำหน้าตามเหมาะสมเพื่อความสอดคล้อง"
                    className="w-full px-3.5 py-2 mx-auto block bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-bold font-sans focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateCategory(newCategoryName);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-150 rounded-lg border border-gray-250 cursor-pointer shadow-xs transition-colors font-sans"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateCategory(newCategoryName)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#5A5A40] hover:bg-[#4a4a35] rounded-lg cursor-pointer shadow-sm hover:shadow transition-all font-sans"
                >
                  ➕ สร้างหมวดหมู่ใหม่
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ Modal สำหรับแก้ไขชื่อหมวดหมู่ */}
      <AnimatePresence>
        {showEditCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-150 overflow-hidden font-sans"
            >
              <div className="bg-[#5A5A40] text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-300" />
                  <h3 className="font-bold text-sm">✏️ แก้ไขชื่อหมวดหมู่ (Rename Category)</h3>
                </div>
                <button
                  onClick={() => setShowEditCategoryModal(false)}
                  className="text-white/85 hover:text-white font-bold text-lg cursor-pointer px-1 outline-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 font-sans focus-within:text-[#5A5A40]">
                <p className="text-xs text-gray-500 leading-relaxed font-sans">
                  การแก้ไขชื่อหมวด จะเปลี่ยนชื่อของหัวข้อคุมมาตรฐาน <span className="text-slate-900 font-extrabold">{editCategoryOldName}</span> ให้เป็นชื่อใหม่ทันที โดยมีผลต่อเกณฑ์ประเมินย่อยภายในหมวดนี้ทุกข้อในแท็บ "{activeSheetName}"
                </p>

                <div className="space-y-1.5 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    ชื่อหมวดหมู่ใหม่
                  </label>
                  <input
                    type="text"
                    value={editCategoryNewName}
                    onChange={(e) => setEditCategoryNewName(e.target.value)}
                    placeholder="แก้ไขรหัสหรือข้อความหมวดหมู่หลัก"
                    className="w-full px-3.5 py-2 mx-auto block bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-bold font-sans focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRenameCategory(editCategoryOldName, editCategoryNewName);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditCategoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-150 rounded-lg border border-gray-250 cursor-pointer shadow-xs transition-colors font-sans"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleRenameCategory(editCategoryOldName, editCategoryNewName)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#5A5A40] hover:bg-[#4a4a35] rounded-lg cursor-pointer shadow-sm hover:shadow transition-all font-sans"
                >
                  💾 บันทึกเปลี่ยนชื่อ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ➕ Modal สำหรับเพิ่มเกณฑ์ประเมิน / ข้อย่อยใหม่ */}
      <AnimatePresence>
        {showAddItemModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-150 overflow-hidden font-sans"
            >
              <div className="bg-[#5A5A40] text-white p-5 flex justify-between items-center bg-emerald-700">
                <div className="flex items-center gap-2">
                  <Grid className="w-5 h-5 text-emerald-300" />
                  <h3 className="font-bold text-sm text-white">➕ เพิ่มชุดเกณฑ์และข้อย่อยใหม่ (Add Inspection Criteria)</h3>
                </div>
                <button
                  onClick={() => setShowAddItemModal(false)}
                  className="text-white/85 hover:text-white font-bold text-lg cursor-pointer px-1 outline-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto block text-left font-sans">
                {/* Main Category Selector */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    หมวดหมู่หลัก (Main Category) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 text-gray-850 border border-gray-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  >
                    <option value="">-- กรุณาเลือกหมวดหมู่ --</option>
                    {categoriesList.filter(c => c !== "ทั้งหมด").map((cat, cIdx) => (
                      <option key={cIdx} value={cat}>{getCleanCategoryNumRef(cat)}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-Category Name Input */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    หัวข้อย่อยหรือหัวข้อตรวจสอบ (Sub Category)
                  </label>
                  <input
                    type="text"
                    value={newItemSubCategory}
                    onChange={(e) => setNewItemSubCategory(e.target.value)}
                    placeholder="เช่น 'ทางเลือกระบบความปลอดภัย' หรือ 'บุคลากรทั่วไป'"
                    className="w-full px-3 py-2 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  />
                </div>

                {/* Item ID Input */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    รหัสเกณฑ์ประเมินสำเร็จ (Item ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItemID}
                    onChange={(e) => setNewItemID(e.target.value)}
                    placeholder="ความสอดคล้องรหัส เช่น '1.1.4' หรือ '9.1.1' ควรรองรับการจัดเรียงได้"
                    className="w-full px-3 py-2 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  />
                </div>

                {/* Criteria Detail Textarea */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    รายละเอียดเกณฑ์ประเมินหลัก (Criteria Detail) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={newItemCriteria}
                    onChange={(e) => setNewItemCriteria(e.target.value)}
                    placeholder="เขียนอธิบายเกณฑ์ข้อกำหนดรังสีการแพทย์ เครื่อง หรือสถานประกอบการ..."
                    className="w-full px-3 py-2 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  />
                </div>

                {/* Success Indicator Detail Textarea */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    ตัวชี้วัดความสำเร็จ / ความคาดหวังเฉพาะ (Success Indicator)
                  </label>
                  <textarea
                    rows={2}
                    value={newItemSuccess}
                    onChange={(e) => setNewItemSuccess(e.target.value)}
                    placeholder="การประเมินเทียบผ่าน: เช่น 'มีบันทึกรายงานครบ 100%' หรือ 'ได้รับการประเมินจากวิศวกร'"
                    className="w-full px-3 py-2 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-150 rounded-lg border border-gray-250 cursor-pointer shadow-xs transition-colors font-sans"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateItem(newItemCategory, newItemSubCategory, newItemID, newItemCriteria, newItemSuccess)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-sm hover:shadow transition-all font-sans"
                >
                  🚀 ยืนยันเพิ่มเกณฑ์ข้อใหม่
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✏️ Modal สำหรับแก้ไขเกณฑ์ประเมิน / ข้อย่อย */}
      <AnimatePresence>
        {showEditItemModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-150 overflow-hidden font-sans"
            >
              <div className="bg-[#5A5A40] text-white p-5 flex justify-between items-center bg-amber-500">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-amber-950" />
                  <h3 className="font-bold text-sm text-amber-950">✏️ แก้ไขข้อกำหนดเกณฑ์มาตรฐาน (Edit Criteria Details)</h3>
                </div>
                <button
                  onClick={() => setShowEditItemModal(false)}
                  className="text-amber-900/80 hover:text-amber-950 font-bold text-lg cursor-pointer px-1 outline-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto block text-left font-sans">
                {/* Main Category */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    หมวดหมู่หลัก (Main Category)
                  </label>
                  <select
                    value={editItemCategory}
                    onChange={(e) => setEditItemCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 text-gray-850 border border-gray-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  >
                    {categoriesList.filter(c => c !== "ทั้งหมด").map((cat, cIdx) => (
                      <option key={cIdx} value={cat}>{getCleanCategoryNumRef(cat)}</option>
                    ))}
                  </select>
                </div>

                {/* Sub Category */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    หัวข้อย่อยหรือหัวข้อตรวจสอบ (Sub Category)
                  </label>
                  <input
                    type="text"
                    value={editItemSubCategory}
                    onChange={(e) => setEditItemSubCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  />
                </div>

                {/* Item ID */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    รหัสเกณฑ์ประเมินเฉพาะ (Item ID)
                  </label>
                  <input
                    type="text"
                    value={editItemID}
                    onChange={(e) => setEditItemID(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 text-gray-850 border border-gray-300 rounded-lg text-xs font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  />
                </div>

                {/* Criteria Detail */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    รายละเอียดเกณฑ์ประเมินหลัก (Criteria Detail)
                  </label>
                  <textarea
                    rows={3}
                    value={editItemCriteria}
                    onChange={(e) => setEditItemCriteria(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  />
                </div>

                {/* Success Indicator */}
                <div className="space-y-1 focus-within:text-[#5A5A40]">
                  <label className="block text-xs font-bold text-gray-700">
                    ตัวชี้วัดความสำเร็จ / ความคาดหวังเฉพาะ (Success Indicator)
                  </label>
                  <textarea
                    rows={2}
                    value={editItemSuccess}
                    onChange={(e) => setEditItemSuccess(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 text-gray-800 border border-gray-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-150 rounded-lg border border-gray-250 cursor-pointer shadow-xs transition-colors font-sans"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateItemDefinition(editingItemID, editItemID, editItemCategory, editItemSubCategory, editItemCriteria, editItemSuccess)}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg cursor-pointer shadow-sm hover:shadow transition-all font-sans"
                >
                  💾 บันทึกเปลี่ยนเกณฑ์
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔔 Custom Alert/Toast Banner */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[200] max-w-sm p-4 rounded-xl shadow-2xl border flex items-start gap-3 justify-between ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-250 text-emerald-900"
                : toast.type === "error"
                ? "bg-rose-50 border-rose-250 text-rose-900"
                : "bg-blue-50 border-blue-250 text-blue-900"
            }`}
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                {toast.type === "success" && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />}
                {toast.type === "error" && <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />}
                {toast.type === "info" && <HelpCircle className="w-4.5 h-4.5 text-blue-600 shrink-0" />}
                <span>{toast.type === "success" ? "ทำรายการสำเร็จ" : toast.type === "error" ? "เกิดข้อผิดพลาด" : "ข้อมูลแจ้งเตือน"}</span>
              </div>
              <p className="text-xs leading-relaxed opacity-95 whitespace-pre-line font-sans font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-gray-400 hover:text-gray-700 text-xs font-bold leading-none cursor-pointer outline-none ml-2 pt-0.5 shrink-0"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⚠️ Custom Confirmation Dialogue Modal */}
      <AnimatePresence>
        {customConfirm.isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-150 overflow-hidden"
            >
              <div className={`p-5 flex items-center gap-2.5 border-b ${customConfirm.isDanger ? "bg-rose-50 border-rose-100 text-rose-900" : "bg-[#5A5A40] text-white"}`}>
                {customConfirm.isDanger ? (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <Database className="w-5 h-5 text-amber-300 shrink-0" />
                )}
                <h3 className="font-bold text-sm tracking-tight">{customConfirm.title}</h3>
              </div>
              
              <div className="p-6 space-y-3">
                <p className="text-xs text-gray-600 leading-relaxed font-sans whitespace-pre-line">
                  {customConfirm.message}
                </p>
              </div>

              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCustomConfirm((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-150 rounded-lg border border-gray-250 cursor-pointer shadow-xs transition-colors"
                >
                  {customConfirm.cancelText || "ยกเลิก"}
                </button>
                <button
                  type="button"
                  onClick={customConfirm.onConfirm}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-lg cursor-pointer shadow-sm hover:shadow transition-all ${
                    customConfirm.isDanger
                      ? "bg-[#c13c3c] hover:bg-[#a62c2c]"
                      : "bg-[#5A5A40] hover:bg-[#4a4a35]"
                  }`}
                >
                  {customConfirm.confirmText || "ยืนยัน"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
