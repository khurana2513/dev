import { useEffect, useState } from "react";
import { LoadingScreen } from "../components/LoadingScreen";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
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
} from "lucide-react";

const COURSES = ["Abacus", "Vedic Maths", "Handwriting"];
const LEVEL_TYPES = ["Regular", "Junior"];
const BRANCHES = ["Rohini-16", "Rohini-11", "Gurgaon", "Online"];
const STATUSES = ["active", "inactive", "closed"];

export default function StudentProfile() {
  const { user, isAdmin, refreshUser } = useAuth();
  const queryClient = useQueryClient();
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07070F' }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white">Failed to load profile</p>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  const D = {
    bg:      "#07070F",
    surf:    "#131629",
    surf2:   "#181b2e",
    border:  "rgba(255,255,255,0.08)",
    border2: "rgba(255,255,255,0.14)",
    purple:  "#7c5af6",
    purpleDim: "rgba(124,90,246,0.13)",
    green:   "#22c55e",
    greenDim: "rgba(34,197,94,0.1)",
    red:     "#f87171",
    redDim:  "rgba(248,113,113,0.1)",
    text:    "#e2e8f0",
    muted:   "rgba(255,255,255,0.45)",
    white2:  "rgba(255,255,255,0.7)",
    font:    "'Playfair Display',Georgia,serif",
    mono:    "'JetBrains Mono','DM Mono',monospace",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: `1px solid ${D.border2}`, borderRadius: 12,
    padding: "10px 14px", color: D.text, fontSize: 13.5,
    outline: "none", fontFamily: "inherit", transition: "border-color 0.2s",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, background: "#12142a",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 36,
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    fontFamily: D.mono, letterSpacing: "0.1em",
    textTransform: "uppercase", color: "#e2e8f0", marginBottom: 7,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 14.5, color: D.text, fontWeight: 500,
  };

  const sectionCard: React.CSSProperties = {
    background: D.surf, border: `1px solid ${D.border}`,
    borderRadius: 20, padding: "clamp(18px,3vw,24px) clamp(16px,3vw,28px)",
  };

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 14, borderBottom: `1px solid ${D.border}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: D.purpleDim, border: `1px solid rgba(124,90,246,0.28)`, display: "flex", alignItems: "center", justifyContent: "center", color: D.purple }}>
        {icon}
      </div>
      <h3 style={{ fontFamily: D.font, fontSize: 17, fontWeight: 700, color: D.text, margin: 0 }}>{title}</h3>
    </div>
  );

  return (
    <>
      <style>{`
        .sp-input:focus { border-color: rgba(124,90,246,0.7) !important; box-shadow: 0 0 0 3px rgba(124,90,246,0.12); }
        .sp-input:disabled { opacity: 0.45; cursor: not-allowed; }
        .sp-select option { background: #12142a; color: #e2e8f0; }
        @media(max-width:640px){
          .sp-section-card{padding:18px 16px!important;border-radius:16px!important}
        }
        @media(max-width:480px){
          .sp-section-card{padding:14px 12px!important;border-radius:14px!important}
        }
      `}</style>
      <div style={{ minHeight: "100vh", background: D.bg, paddingTop: "4rem", paddingBottom: "4rem" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(0.75rem,3vw,1.5rem)" }}>

          {/* Page Header */}
          <header style={{ marginBottom: "2.5rem" }}>
            <h1 style={{ fontFamily: D.font, fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 800, color: D.text, marginBottom: 6, lineHeight: 1.15 }}>
              Student Profile
            </h1>
            <p style={{ color: D.muted, fontSize: 15 }}>Manage your profile information and track your progress</p>
          </header>

          {/* Profile Header Card */}
          <div style={{ ...sectionCard, marginBottom: 20, borderTop: `3px solid ${D.purple}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#7c5af6,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                  {(profile.display_name?.[0] || user?.name?.[0] || "?").toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontFamily: D.font, fontSize: 22, fontWeight: 800, color: D.text, marginBottom: 4 }}>
                    {profile.display_name || user?.name || "Student Profile"}
                  </h2>
                  {profile.public_id && (
                    <span style={{ fontFamily: D.mono, fontSize: 11, color: D.purple, background: D.purpleDim, padding: "3px 10px", borderRadius: 100, border: `1px solid rgba(124,90,246,0.28)` }}>
                      ID: {profile.public_id}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {editing ? (
                  <>
                    <button onClick={handleCancel} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", border: `1px solid ${D.border2}`, borderRadius: 10, background: "rgba(255,255,255,0.05)", color: D.white2, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      <X size={15} /> Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.65 : 1, fontFamily: "inherit" }}>
                      {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button onClick={handleEdit} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    <Edit2 size={15} /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {success && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: D.greenDim, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: 12, color: D.green, fontSize: 13, fontWeight: 500 }}>
                <CheckCircle2 size={16} /> {success}
              </div>
            )}
            {error && (
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: D.redDim, border: `1px solid rgba(248,113,113,0.3)`, borderRadius: 12, color: D.red, fontSize: 13, fontWeight: 500 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>

          {/* 2-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 16 }}>

            {/* Basic Information */}
            <div style={sectionCard}>
              {sectionTitle(<User size={16} />, "Basic Information")}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={labelStyle}>Display Name</label>
                  {editing ? (
                    <input className="sp-input" style={inputStyle} type="text" value={formData.display_name || ""} onChange={(e) => handleInputChange("display_name", e.target.value)} minLength={2} maxLength={50} placeholder="Name shown throughout the site" required />
                  ) : (
                    <p style={valueStyle}>{profile.display_name || "—"}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Class</label>
                  {editing ? (
                    <input className="sp-input" style={inputStyle} type="number" value={formData.class_name || ""} onChange={(e) => { const val = e.target.value; if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 12)) handleInputChange("class_name", val); }} min={1} max={12} placeholder="1 – 12" />
                  ) : (
                    <p style={valueStyle}>{profile.class_name || "—"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Course Information */}
            <div style={sectionCard}>
              {sectionTitle(<BookOpen size={16} />, "Course Information")}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={labelStyle}>Course</label>
                  {editing && isAdmin ? (
                    <select className="sp-input sp-select" style={selectStyle} value={formData.course || ""} onChange={(e) => { const c = e.target.value; setFormData({ ...formData, course: c, level: "" }); setError(null); }}>
                      <option value="">Select Course</option>
                      {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <p style={valueStyle}>{profile.course || "—"}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Level Type</label>
                  {editing && isAdmin ? (
                    <select className="sp-input sp-select" style={selectStyle} value={formData.level_type || ""} onChange={(e) => { const lt = e.target.value; setFormData({ ...formData, level_type: lt, level: "" }); setError(null); }}>
                      <option value="">Select Level Type</option>
                      {LEVEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <p style={valueStyle}>{profile.level_type || "—"}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Level{loadingLevels ? " (loading…)" : ""}</label>
                  {editing && isAdmin ? (
                    <select className="sp-input sp-select" style={{ ...selectStyle, opacity: (!formData.course || !formData.level_type || loadingLevels || validLevels.length === 0) ? 0.5 : 1 }} value={formData.level || ""} onChange={(e) => handleInputChange("level", e.target.value)} disabled={!formData.course || !formData.level_type || loadingLevels || validLevels.length === 0}>
                      <option value="">{!formData.course || !formData.level_type ? "Select Course & Level Type first" : loadingLevels ? "Loading…" : validLevels.length === 0 ? "No levels available" : "Select Level"}</option>
                      {validLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  ) : (
                    <p style={valueStyle}>{profile.level || "—"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Branch & Status */}
            <div style={sectionCard}>
              {sectionTitle(<MapPin size={16} />, "Branch & Status")}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={labelStyle}>Branch</label>
                  {editing && isAdmin ? (
                    <select className="sp-input sp-select" style={selectStyle} value={formData.branch || ""} onChange={(e) => handleInputChange("branch", e.target.value)}>
                      <option value="">Select Branch</option>
                      {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  ) : (
                    <p style={valueStyle}>{profile.branch || "—"}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  {editing && isAdmin ? (
                    <select className="sp-input sp-select" style={selectStyle} value={formData.status || "active"} onChange={(e) => handleInputChange("status", e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  ) : (
                    <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 100, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", background: profile.status === "active" ? "rgba(34,197,94,0.12)" : profile.status === "inactive" ? "rgba(245,158,11,0.12)" : "rgba(248,113,113,0.12)", color: profile.status === "active" ? "#22c55e" : profile.status === "inactive" ? "#f59e0b" : "#f87171", border: `1px solid ${profile.status === "active" ? "rgba(34,197,94,0.3)" : profile.status === "inactive" ? "rgba(245,158,11,0.3)" : "rgba(248,113,113,0.3)"}` }}>
                      {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dates & Contact */}
            <div style={sectionCard}>
              {sectionTitle(<Calendar size={16} />, isAdmin ? "Dates & Contact" : "Contact")}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {isAdmin && (
                  <>
                    <div>
                      <label style={labelStyle}>Join Date</label>
                      {editing ? (
                        <input className="sp-input" style={{ ...inputStyle, colorScheme: "dark" }} type="date" value={formData.join_date || ""} onChange={(e) => handleInputChange("join_date", e.target.value)} />
                      ) : (
                        <p style={valueStyle}>{profile.join_date ? formatDateOnlyToIST(profile.join_date) : "—"}</p>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Finish Date</label>
                      {editing ? (
                        <input className="sp-input" style={{ ...inputStyle, colorScheme: "dark" }} type="date" value={formData.finish_date || ""} onChange={(e) => handleInputChange("finish_date", e.target.value)} />
                      ) : (
                        <p style={valueStyle}>{profile.finish_date ? formatDateOnlyToIST(profile.finish_date) : "—"}</p>
                      )}
                    </div>
                  </>
                )}
                <div>
                  <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}><Phone size={11} />Parent Contact Number</label>
                  {editing ? (
                    <input className="sp-input" style={inputStyle} type="tel" value={formData.parent_contact_number || ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); handleInputChange("parent_contact_number", v); }} placeholder="1234567890" maxLength={10} inputMode="numeric" />
                  ) : (
                    <p style={valueStyle}>{profile.parent_contact_number || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

