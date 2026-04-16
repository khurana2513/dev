import React, { useEffect, useState } from "react";
import { LoadingScreen } from "../components/LoadingScreen";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import {
  getStudentProfile,
  getStudentProfileById,
  updateStudentProfile,
  updateStudentProfileById,
  getValidLevels,
  StudentProfile as StudentProfileType,
  StudentProfileUpdate,
} from "../lib/userApi";
import { formatDateOnlyToIST } from "../lib/timezoneUtils";

import {
  User,
  Edit2,
  Save,
  X,
  Calendar,
  Phone,
  MapPin,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const COURSES = ["Abacus", "Vedic Maths", "Handwriting"];
const LEVEL_TYPES = ["Regular", "Junior"];
const BRANCHES = ["Rohini-16", "Rohini-11", "Gurgaon", "Online"];
const STATUSES = ["active", "inactive", "closed"];

/* ─────────────────────────── Static palette & layout helpers (outside component to prevent remount blink) ── */
const P = {
  bg:        "#07070F",
  card:      "#0d0d1a",
  card2:     "#111125",
  border:    "rgba(255,255,255,0.07)",
  border2:   "rgba(255,255,255,0.13)",
  purple:    "#8b5cf6",
  purpleB:   "rgba(139,92,246,0.18)",
  purpleGlow:"rgba(139,92,246,0.35)",
  indigo:    "#6366f1",
  green:     "#22c55e",
  greenDim:  "rgba(34,197,94,0.1)",
  red:       "#f87171",
  redDim:    "rgba(248,113,113,0.1)",
  text:      "#f1f5f9",
  muted:     "rgba(255,255,255,0.4)",
  subtle:    "rgba(255,255,255,0.06)",
};

const iStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: `1.5px solid ${P.border2}`,
  borderRadius: 12,
  padding: "11px 14px",
  color: P.text,
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color .2s, box-shadow .2s",
};
const selStyle = {
  ...iStyle,
  background: "#0c0c1f",
  appearance: "none" as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 13px center",
  paddingRight: 36,
};
const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.5)",
  marginBottom: 7,
  fontFamily: "'DM Mono','JetBrains Mono',monospace",
};
const avatarGradients = [
  "linear-gradient(135deg,#7c3aed,#db2777)",
  "linear-gradient(135deg,#1d4ed8,#7c3aed)",
  "linear-gradient(135deg,#059669,#0891b2)",
  "linear-gradient(135deg,#d97706,#dc2626)",
  "linear-gradient(135deg,#7c3aed,#2563eb)",
  "linear-gradient(135deg,#0f766e,#7c3aed)",
];
const SCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 20, padding: "clamp(18px,3vw,26px)", ...style }}>
    {children}
  </div>
);
const SHead = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${P.border}` }}>
    <div style={{ width: 32, height: 32, borderRadius: 9, background: P.purpleB, border: `1px solid rgba(139,92,246,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", color: P.purple, flexShrink: 0 }}>
      {icon}
    </div>
    <span style={{ fontWeight: 700, fontSize: 14, color: P.text, letterSpacing: "0.01em" }}>{label}</span>
  </div>
);
const FRow = ({ label: fl, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label style={lbl}>{fl}</label>
    {children}
  </div>
);
const FVal = ({ v }: { v?: string | null }) => (
  <p style={{ fontSize: 14.5, color: v ? P.text : P.muted, fontWeight: v ? 500 : 400 }}>{v || "\u2014"}</p>
);

export default function StudentProfile() {
  const { user, isAdmin, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<StudentProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validLevels, setValidLevels] = useState<string[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [formData, setFormData] = useState<StudentProfileUpdate>({});

  
  // Get user_id from URL params if admin viewing another student
  const urlParams = new URLSearchParams(window.location.search);
  const viewUserId = urlParams.get("user_id");

  useEffect(() => {
    loadProfile();
  }, [viewUserId]);

  useEffect(() => {
    // Load valid levels when course or level_type changes in edit mode
    if (editing && formData.course && formData.level_type) {
      const trimmedCourse = formData.course.trim();
      const trimmedLevelType = formData.level_type.trim();
      if (trimmedCourse && trimmedLevelType) {
        console.log("useEffect triggered - loading levels for:", trimmedCourse, trimmedLevelType);
        loadValidLevels(trimmedCourse, trimmedLevelType);
      } else {
        setValidLevels([]);
        setLoadingLevels(false);
      }
    } else {
      setValidLevels([]);
      setLoadingLevels(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.course, formData.level_type, editing]);



  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = viewUserId && isAdmin
        ? await getStudentProfileById(parseInt(viewUserId))
        : await getStudentProfile();
      setProfile(data);
      setFormData({
        display_name: data.display_name || "",
        class_name: data.class_name || "",
        course: data.course || "",
        level_type: data.level_type || "",
        level: data.level || "",
        branch: data.branch || "",
        status: data.status || "active",
        join_date: data.join_date ? data.join_date.split("T")[0] : "",
        finish_date: data.finish_date ? data.finish_date.split("T")[0] : "",
        parent_contact_number: data.parent_contact_number || "",
      });
    } catch (err: any) {
      console.error("Failed to load profile:", err);
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const loadValidLevels = async (course: string, levelType: string) => {
    if (!course || !levelType) {
      setValidLevels([]);
      setLoadingLevels(false);
      return;
    }
    try {
      setLoadingLevels(true);
      setValidLevels([]); // Clear levels while loading
      console.log("Loading levels for course:", course, "levelType:", levelType);
      const trimmedCourse = course.trim();
      const trimmedLevelType = levelType.trim();
      console.log("Trimmed values - course:", trimmedCourse, "levelType:", trimmedLevelType);
      const result = await getValidLevels(trimmedCourse, trimmedLevelType);
      console.log("Received levels from API:", result);
      console.log("Levels array:", result.levels);
      const levels = result.levels || [];
      console.log("Setting validLevels to:", levels);
      setValidLevels(levels);
      // Reset level if current level is not valid
      if (formData.level && levels.length > 0 && !levels.includes(formData.level)) {
        setFormData({ ...formData, level: "" });
      }
    } catch (err: any) {
      console.error("Failed to load valid levels:", err);
      console.error("Error details:", err.message);
      console.error("Error stack:", err.stack);
      setValidLevels([]);
      setError(`Failed to load levels: ${err.message || "Unknown error"}`);
    } finally {
      setLoadingLevels(false);
    }
  };





  const handleEdit = () => {
    setEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setSuccess(null);
    // Reset form data to profile data
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        class_name: profile.class_name || "",
        course: profile.course || "",
        level_type: profile.level_type || "",
        level: profile.level || "",
        branch: profile.branch || "",
        status: profile.status || "active",
        join_date: profile.join_date ? profile.join_date.split("T")[0] : "",
        finish_date: profile.finish_date ? profile.finish_date.split("T")[0] : "",
        parent_contact_number: profile.parent_contact_number || "",
      });
    }
  };

  const validateForm = (): string | null => {
    // Display name validation (optional — empty is allowed)
    if (formData.display_name !== undefined && formData.display_name !== null) {
      const displayName = formData.display_name.trim();
      if (displayName.length > 0 && displayName.length < 2) {
        return "Display name must be at least 2 characters";
      }
      if (displayName.length > 50) {
        return "Display name must be less than 50 characters";
      }
    }

    // Class validation (1-12)
    if (formData.class_name !== undefined && formData.class_name !== null) {
      const className = formData.class_name.trim();
      if (className) {
        const classNum = parseInt(className);
        if (isNaN(classNum) || classNum < 1 || classNum > 12) {
          return "Class must be a number between 1 and 12";
        }
      }
    }

    // Phone validation - must be exactly 10 numeric digits
    if (formData.parent_contact_number !== undefined && formData.parent_contact_number !== null) {
      const phone = formData.parent_contact_number.trim();
      if (phone) {
        // Must be exactly 10 numeric digits
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
          return "Please enter a valid 10-digit phone number";
        }
      }
    }

    return null;
  };

  const handleSave = async () => {

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Prepare update data - students can only edit basic info, admins can edit everything
      let updateData: StudentProfileUpdate;
      
      if (isAdmin) {
        // Admins can edit everything
        updateData = {};
        if (formData.display_name !== undefined) updateData.display_name = formData.display_name?.trim() || null;
        if (formData.class_name !== undefined) updateData.class_name = formData.class_name?.trim() || null;
        if (formData.parent_contact_number !== undefined) {
          // Already cleaned in input handler (only numeric, max 10 digits)
          updateData.parent_contact_number = formData.parent_contact_number || null;
        }
        if (formData.course !== undefined) updateData.course = formData.course || null;
        if (formData.level_type !== undefined) updateData.level_type = formData.level_type || null;
        if (formData.level !== undefined) updateData.level = formData.level || null;
        if (formData.branch !== undefined) updateData.branch = formData.branch || null;
        if (formData.status !== undefined) updateData.status = formData.status;
        if (formData.join_date !== undefined) updateData.join_date = formData.join_date || null;
        if (formData.finish_date !== undefined) updateData.finish_date = formData.finish_date || null;
      } else {
        // Students can ONLY edit these three fields - create a clean object with ONLY these fields
        // Use object literal with explicit field checks to ensure no other fields are included
        updateData = {};
        
        // Only include fields that are explicitly allowed and have been modified
        if (formData.display_name !== undefined && formData.display_name !== profile?.display_name) {
          updateData.display_name = formData.display_name?.trim() || null;
        }
        if (formData.class_name !== undefined && formData.class_name !== profile?.class_name) {
          updateData.class_name = formData.class_name?.trim() || null;
        }
        if (formData.parent_contact_number !== undefined && formData.parent_contact_number !== profile?.parent_contact_number) {
          // Already cleaned in input handler (only numeric, max 10 digits)
          updateData.parent_contact_number = formData.parent_contact_number || null;
        }
        
        // CRITICAL: Create a final object with ONLY the allowed fields using explicit object construction
        // This ensures no other fields (like status) can accidentally be included
        const finalUpdateData: any = {};
        if (updateData.display_name !== undefined) finalUpdateData.display_name = updateData.display_name;
        if (updateData.class_name !== undefined) finalUpdateData.class_name = updateData.class_name;
        if (updateData.parent_contact_number !== undefined) finalUpdateData.parent_contact_number = updateData.parent_contact_number;
        
        // Verify no admin-only fields are present
        const adminOnlyFields = ['status', 'course', 'level_type', 'level', 'branch', 'join_date', 'finish_date', 'full_name'];
        for (const field of adminOnlyFields) {
          if (field in finalUpdateData) {
            delete finalUpdateData[field];
          }
        }
        
        updateData = finalUpdateData as StudentProfileUpdate;
      }
      
      // Debug log to verify what's being sent
      console.log('Sending update data:', JSON.stringify(updateData, null, 2));
      console.log('Is admin:', isAdmin);
      console.log('Update data keys:', Object.keys(updateData));

      const updated = viewUserId && isAdmin
        ? await updateStudentProfileById(parseInt(viewUserId), updateData)
        : await updateStudentProfile(updateData);
      setProfile(updated);
      
      // ✓ Refresh user data to update display_name everywhere (navbar, dashboard, etc.)
      await refreshUser();
      
      // ✓ Invalidate React Query caches to refresh admin dashboard and student dashboard
      await queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
      
      setEditing(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof StudentProfileUpdate, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setError(null);
    // If course or level_type changed, trigger level loading immediately
    if (editing && (field === "course" || field === "level_type")) {
      if (field === "course" && newFormData.level_type && value) {
        // Course changed, reload levels if level_type exists
        setTimeout(() => loadValidLevels(value, newFormData.level_type || ""), 100);
      } else if (field === "level_type" && newFormData.course && value) {
        // Level type changed, reload levels if course exists
        setTimeout(() => loadValidLevels(newFormData.course || "", value), 100);
      } else {
        // If either is cleared, clear levels
        setValidLevels([]);
      }
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#07070F' }}>
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-white text-lg font-semibold">Failed to load profile</p>
        {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
      </div>
    );
  }

  const statusCfg = {
    active:   { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)",  color: "#4ade80" },
    inactive: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "#fbbf24" },
    closed:   { bg: "rgba(248,113,113,0.12)",border: "rgba(248,113,113,0.3)",color: "#f87171" },
  };
  const sc = statusCfg[profile.status as keyof typeof statusCfg] ?? statusCfg.active;

  /* ── Avatar gradient based on name ── */
  const avatarLetter = (profile.display_name?.[0] || user?.name?.[0] || "?").toUpperCase();
  const nameHash = (profile.display_name || user?.name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const avatarGrad = avatarGradients[nameHash % avatarGradients.length];

  return (
    <>
      <style>{`
        .sp-i:focus { border-color: rgba(139,92,246,0.75) !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.14) !important; }
        .sp-i:disabled { opacity: 0.4; cursor: not-allowed; }
        .sp-i option { background: #0c0c1f; color: #f1f5f9; }
        @keyframes sp-rise { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sp-float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        @keyframes sp-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes sp-pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.5);opacity:0} }
        @keyframes sp-spin { to{transform:rotate(360deg)} }
        .sp-anim { animation: sp-rise .45s ease both; }
        .sp-anim-1 { animation-delay:.06s }
        .sp-anim-2 { animation-delay:.12s }
        .sp-anim-3 { animation-delay:.18s }
        .sp-anim-4 { animation-delay:.24s }
        .sp-avatar-pulse::after { content:''; position:absolute; inset:-4px; border-radius:50%; border:2px solid rgba(139,92,246,0.4); animation:sp-pulse-ring 2.5s ease-out infinite; }
        .sp-btn-edit:hover { transform:translateY(-1px); box-shadow: 0 8px 28px rgba(139,92,246,0.45) !important; }
        .sp-btn-cancel:hover { background: rgba(255,255,255,0.08) !important; }
        .sp-btn-save:hover { transform:translateY(-1px); box-shadow: 0 8px 28px rgba(139,92,246,0.5) !important; }
        .sp-back:hover { color: #f1f5f9 !important; }
        .sp-shimmer { background: linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%); background-size:200% auto; animation:sp-shimmer 2s linear infinite; }
      `}</style>

      <div style={{ minHeight: "100vh", background: P.bg, paddingBottom: "5rem", position: "relative", overflow: "hidden" }}>

        {/* Ambient background orbs */}
        <div style={{ position: "fixed", top: "-15%", left: "-10%", width: "50vw", height: "50vw", maxWidth: 600, maxHeight: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,66,246,0.08) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "fixed", bottom: "-10%", right: "-5%", width: "40vw", height: "40vw", maxWidth: 500, maxHeight: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "clamp(1rem,4vw,2rem) clamp(0.75rem,3vw,1.5rem)" }}>

          {/* ── Back button ── */}
          <button
            onClick={() => setLocation(isAdmin ? "/admin" : "/dashboard")}
            className="sp-back"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${P.border}`, color: P.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: "2rem", transition: "color .2s, background .2s" }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          {/* ── Hero card ── */}
          <div className="sp-anim" style={{ background: "linear-gradient(135deg,#0d0d20 0%,#0f0f25 50%,#100d1f 100%)", border: `1px solid rgba(139,92,246,0.18)`, borderRadius: 28, padding: "clamp(22px,4vw,36px)", marginBottom: 18, position: "relative", overflow: "hidden" }}>
            {/* Card shimmer line */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.7),rgba(99,102,241,0.7),transparent)", borderRadius: "28px 28px 0 0" }} />

            {/* Decorative math symbols */}
            <div aria-hidden style={{ position: "absolute", top: 20, right: 24, fontSize: 72, opacity: 0.025, fontWeight: 900, color: "#fff", pointerEvents: "none", userSelect: "none", lineHeight: 1 }}>∑</div>
            <div aria-hidden style={{ position: "absolute", bottom: 16, right: 80, fontSize: 40, opacity: 0.03, fontWeight: 900, color: "#fff", pointerEvents: "none", userSelect: "none" }}>π</div>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              {/* Left: avatar + identity */}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }} className="sp-avatar-pulse">
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-1px", boxShadow: "0 0 32px rgba(139,92,246,0.3)" }}>
                    {avatarLetter}
                  </div>
                  {/* Status dot */}
                  <div style={{ position: "absolute", bottom: 3, right: 3, width: 14, height: 14, borderRadius: "50%", background: profile.status === "active" ? "#22c55e" : profile.status === "inactive" ? "#f59e0b" : "#ef4444", border: "2.5px solid #07070F", boxShadow: profile.status === "active" ? "0 0 8px rgba(34,197,94,0.7)" : "none" }} />
                </div>

                {/* Name + meta */}
                <div>
                  <h1 style={{ fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 900, color: P.text, marginBottom: 5, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                    {profile.display_name || user?.name || "My Profile"}
                  </h1>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                    {profile.public_id && (
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: P.purple, background: P.purpleB, padding: "3px 11px", borderRadius: 100, border: "1px solid rgba(139,92,246,0.3)", letterSpacing: "0.06em" }}>
                        ID: {profile.public_id}
                      </span>
                    )}
                    <span style={{ fontSize: 12, padding: "3px 11px", borderRadius: 100, fontWeight: 700, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                      {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                    </span>
                    {profile.course && (
                      <span style={{ fontSize: 12, padding: "3px 11px", borderRadius: 100, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: `1px solid ${P.border2}`, color: "rgba(255,255,255,0.6)" }}>
                        {profile.course}
                      </span>
                    )}
                    {profile.level && (
                      <span style={{ fontSize: 12, padding: "3px 11px", borderRadius: 100, fontWeight: 600, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                        Level {profile.level}
                      </span>
                    )}
                  </div>
                  {profile.branch && (
                    <p style={{ marginTop: 7, fontSize: 12.5, color: P.muted, display: "flex", alignItems: "center", gap: 5 }}>
                      <MapPin size={11} style={{ opacity: 0.6 }} />{profile.branch}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: action buttons */}
              <div style={{ display: "flex", gap: 10, alignSelf: "flex-start", marginTop: 4 }}>
                {editing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="sp-btn-cancel"
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 11, background: "rgba(255,255,255,0.05)", border: `1px solid ${P.border2}`, color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background .2s" }}
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="sp-btn-save"
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", borderRadius: 11, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.65 : 1, transition: "transform .2s, box-shadow .2s" }}
                    >
                      {saving ? <Loader2 size={14} style={{ animation: "sp-spin 1s linear infinite" }} /> : <Save size={14} />}
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="sp-btn-edit"
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", borderRadius: 11, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "transform .2s, box-shadow .2s", boxShadow: "0 4px 18px rgba(139,92,246,0.3)" }}
                  >
                    <Edit2 size={14} /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Alerts */}
            {success && (
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: P.greenDim, border: "1px solid rgba(34,197,94,0.28)", borderRadius: 12, color: "#4ade80", fontSize: 13, fontWeight: 500 }}>
                <CheckCircle2 size={15} />{success}
              </div>
            )}
            {error && (
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: P.redDim, border: "1px solid rgba(248,113,113,0.28)", borderRadius: 12, color: P.red, fontSize: 13, fontWeight: 500 }}>
                <AlertCircle size={15} />{error}
              </div>
            )}
          </div>

          {/* ── Stats strip (visual only) ── */}
          {!editing && (
            <div className="sp-anim sp-anim-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 18 }}>
              {[
                { label: "Course",     value: profile.course || "—",              icon: "📚" },
                { label: "Level Type", value: profile.level_type || "—",          icon: "🎯" },
                { label: "Class",      value: profile.class_name ? `Class ${profile.class_name}` : "—", icon: "🏫" },
                { label: "Branch",     value: profile.branch || "—",              icon: "📍" },
              ].map(item => (
                <div key={item.label} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 18 }} aria-hidden>{item.icon}</span>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: P.muted, fontFamily: "'DM Mono',monospace" }}>{item.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: item.value === "—" ? P.muted : P.text }}>{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Main content grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: 14 }}>

            {/* ─── Basic Information ─── */}
            <SCard style={{ animationDelay: ".1s" }} >
              <div className="sp-anim sp-anim-2">
                <SHead icon={<User size={15} />} label="Basic Information" />
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <FRow label="Display Name">
                    {editing ? (
                      <input className="sp-i" style={iStyle} type="text" value={formData.display_name || ""} onChange={e => handleInputChange("display_name", e.target.value)} minLength={2} maxLength={50} placeholder="Name shown throughout the site" />
                    ) : <FVal v={profile.display_name} />}
                  </FRow>
                  <FRow label="Class">
                    {editing ? (
                      <input className="sp-i" style={iStyle} type="number" value={formData.class_name || ""} onChange={e => { const v = e.target.value; if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 12)) handleInputChange("class_name", v); }} min={1} max={12} placeholder="1 – 12" />
                    ) : <FVal v={profile.class_name ? `Class ${profile.class_name}` : undefined} />}
                  </FRow>
                  <FRow label={<><Phone size={11} style={{ display:"inline",marginRight:5 }} />Parent Contact</>  as any}>
                    {editing ? (
                      <input className="sp-i" style={iStyle} type="tel" value={formData.parent_contact_number || ""} onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); handleInputChange("parent_contact_number", v); }} placeholder="10-digit mobile number" maxLength={10} inputMode="numeric" />
                    ) : <FVal v={profile.parent_contact_number} />}
                  </FRow>
                </div>
              </div>
            </SCard>

            {/* ─── Course Information ─── */}
            <SCard>
              <div className="sp-anim sp-anim-2">
                <SHead icon={<BookOpen size={15} />} label="Course Information" />
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <FRow label="Course">
                    {editing && isAdmin ? (
                      <select className="sp-i" style={selStyle} value={formData.course || ""} onChange={e => { setFormData({ ...formData, course: e.target.value, level: "" }); setError(null); }}>
                        <option value="">Select Course</option>
                        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : <FVal v={profile.course} />}
                  </FRow>
                  <FRow label="Level Type">
                    {editing && isAdmin ? (
                      <select className="sp-i" style={selStyle} value={formData.level_type || ""} onChange={e => { setFormData({ ...formData, level_type: e.target.value, level: "" }); setError(null); }}>
                        <option value="">Select Level Type</option>
                        {LEVEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : <FVal v={profile.level_type} />}
                  </FRow>
                  <FRow label={`Level${loadingLevels ? " (loading…)" : ""}`}>
                    {editing && isAdmin ? (
                      <select className="sp-i" style={{ ...selStyle, opacity: (!formData.course || !formData.level_type || loadingLevels || validLevels.length === 0) ? 0.45 : 1 }} value={formData.level || ""} onChange={e => handleInputChange("level", e.target.value)} disabled={!formData.course || !formData.level_type || loadingLevels || validLevels.length === 0}>
                        <option value="">{!formData.course || !formData.level_type ? "Select Course & Type first" : loadingLevels ? "Loading…" : validLevels.length === 0 ? "No levels available" : "Select Level"}</option>
                        {validLevels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    ) : <FVal v={profile.level} />}
                  </FRow>
                </div>
              </div>
            </SCard>

            {/* ─── Branch & Status ─── */}
            <SCard>
              <div className="sp-anim sp-anim-3">
                <SHead icon={<MapPin size={15} />} label="Branch & Status" />
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <FRow label="Branch">
                    {editing && isAdmin ? (
                      <select className="sp-i" style={selStyle} value={formData.branch || ""} onChange={e => handleInputChange("branch", e.target.value)}>
                        <option value="">Select Branch</option>
                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    ) : <FVal v={profile.branch} />}
                  </FRow>
                  <FRow label="Status">
                    {editing && isAdmin ? (
                      <select className="sp-i" style={selStyle} value={formData.status || "active"} onChange={e => handleInputChange("status", e.target.value)}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 100, fontSize: 13, fontWeight: 700, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.color, boxShadow: profile.status === "active" ? `0 0 6px ${sc.color}` : "none" }} />
                        {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                      </span>
                    )}
                  </FRow>
                </div>
              </div>
            </SCard>

            {/* ─── Dates & Contact ─── */}
            {(isAdmin || profile.parent_contact_number) && (
              <SCard>
                <div className="sp-anim sp-anim-4">
                  <SHead icon={<Calendar size={15} />} label={isAdmin ? "Dates & Contact" : "Contact"} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {isAdmin && (
                      <>
                        <FRow label="Join Date">
                          {editing ? (
                            <input className="sp-i" style={{ ...iStyle, colorScheme: "dark" }} type="date" value={formData.join_date || ""} onChange={e => handleInputChange("join_date", e.target.value)} />
                          ) : <FVal v={profile.join_date ? formatDateOnlyToIST(profile.join_date) : undefined} />}
                        </FRow>
                        <FRow label="Finish Date">
                          {editing ? (
                            <input className="sp-i" style={{ ...iStyle, colorScheme: "dark" }} type="date" value={formData.finish_date || ""} onChange={e => handleInputChange("finish_date", e.target.value)} />
                          ) : <FVal v={profile.finish_date ? formatDateOnlyToIST(profile.finish_date) : undefined} />}
                        </FRow>
                      </>
                    )}
                    {!isAdmin && (
                      <FRow label="Parent Contact">
                        <FVal v={profile.parent_contact_number} />
                      </FRow>
                    )}
                  </div>
                </div>
              </SCard>
            )}
          </div>

          {/* ── Bottom decorative hint ── */}
          {!editing && (
            <p style={{ textAlign: "center", marginTop: 32, fontSize: 12, color: P.muted }}>
              {isAdmin ? "Admin view — all fields editable" : "You can edit your display name, class and parent contact"}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

