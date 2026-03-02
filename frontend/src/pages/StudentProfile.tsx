import { useEffect, useState } from "react";
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
import { formatDateToIST, formatDateOnlyToIST } from "../lib/timezoneUtils";

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-4" />
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white">Failed to load profile</p>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground mb-2">
            Student Profile
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Manage your profile information and track your progress
          </p>
        </header>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            {/* Profile Header Card */}
            <div className="bg-card border border-border rounded-[2.5rem] shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-3xl font-black">
                    {profile.display_name?.[0] || user?.name?.[0] || "?"}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic text-card-foreground mb-1">
                      {profile.display_name || user?.name || "Student Profile"}
                    </h2>
                    {profile.public_id && (
                      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">ID: {profile.public_id}</p>
                    )}
                  </div>
                </div>
                {!editing && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-black text-sm hover:scale-105 transition-all shadow-lg shadow-primary/20"
                  >
                    <Edit2 className="w-5 h-5" />
                    Edit Profile
                  </button>
                )}
                {editing && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-black text-sm hover:scale-105 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              {success && (
                <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-medium">{success}</span>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-6 h-6" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
            </div>

            {/* Profile Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Basic Information */}
              <div className="bg-card border border-border rounded-[2.5rem] shadow-xl p-8">
                <h3 className="text-2xl font-black tracking-tighter uppercase italic text-card-foreground mb-6 flex items-center gap-3">
                  <User className="w-6 h-6 text-primary" />
                  Basic Information
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
                      Display Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.display_name || ""}
                        onChange={(e) => handleInputChange("display_name", e.target.value)}
                        minLength={2}
                        maxLength={50}
                        className="w-full px-4 py-3 bg-card border-2 border-border text-card-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Name shown throughout the site"
                        required
                      />
                    ) : (
                      <p className="text-card-foreground font-medium">{profile.display_name || "—"}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
                      Class
                    </label>
                    {editing ? (
                      <input
                        type="number"
                        value={formData.class_name || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                            handleInputChange("class_name", val);
                          }
                        }}
                        min={1}
                    max={12}
                    className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white dark:text-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="1-12"
                  />
                ) : (
                  <p className="text-card-foreground font-medium">{profile.class_name || "—"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Course Information */}
          <div className="bg-card border border-border rounded-[2.5rem] shadow-xl p-8">
            <h3 className="text-2xl font-black tracking-tighter uppercase italic text-card-foreground mb-6 flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-primary" />
              Course Information
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Course
                </label>
                {editing && isAdmin ? (
                  <select
                    value={formData.course || ""}
                    onChange={(e) => {
                      const newCourse = e.target.value;
                      const updatedFormData = { ...formData, course: newCourse, level: "" };
                      setFormData(updatedFormData);
                      setError(null);
                      // The useEffect will automatically trigger loadValidLevels when course changes
                    }}
                    className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white dark:text-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="" className="bg-slate-700 text-white">Select Course</option>
                    {COURSES.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-card-foreground font-medium">{profile.course || "—"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Level Type
                </label>
                {editing && isAdmin ? (
                  <select
                    value={formData.level_type || ""}
                    onChange={(e) => {
                      const newLevelType = e.target.value;
                      const updatedFormData = { ...formData, level_type: newLevelType, level: "" };
                      setFormData(updatedFormData);
                      setError(null);
                      // The useEffect will automatically trigger loadValidLevels when level_type changes
                    }}
                    className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white dark:text-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="" className="bg-slate-700 text-white">Select Level Type</option>
                    {LEVEL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-card-foreground font-medium">{profile.level_type || "—"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Level
                </label>
                {editing && isAdmin ? (
                  <select
                    value={formData.level || ""}
                    onChange={(e) => handleInputChange("level", e.target.value)}
                    disabled={!formData.course || !formData.level_type || loadingLevels || validLevels.length === 0}
                    className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white dark:text-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-600 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-slate-700 text-white">
                      {!formData.course || !formData.level_type
                        ? "Select Course and Level Type first"
                        : loadingLevels
                        ? "Loading levels..."
                        : validLevels.length === 0
                        ? "No levels available"
                        : "Select Level"}
                    </option>
                    {validLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-card-foreground font-medium">{profile.level || "—"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Branch & Status */}
          <div className="bg-card border border-border rounded-[2.5rem] shadow-xl p-8">
            <h3 className="text-2xl font-black tracking-tighter uppercase italic text-card-foreground mb-6 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-primary" />
              Branch & Status
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Branch
                </label>
                {editing && isAdmin ? (
                  <select
                    value={formData.branch || ""}
                    onChange={(e) => handleInputChange("branch", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white dark:text-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="" className="bg-slate-700 text-white">Select Branch</option>
                    {BRANCHES.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-card-foreground font-medium">{profile.branch || "—"}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Status
                </label>
                {editing && isAdmin ? (
                  <select
                    value={formData.status || "active"}
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white dark:text-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status} className="bg-slate-700 text-white">
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-card-foreground font-medium">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-bold uppercase tracking-widest ${
                        profile.status === "active"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : profile.status === "inactive"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                      }`}
                    >
                      {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dates & Contact */}
          <div className="bg-card border border-border rounded-[2.5rem] shadow-xl p-8">
            <h3 className="text-2xl font-black tracking-tighter uppercase italic text-card-foreground mb-6 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              {isAdmin ? "Dates & Contact" : "Contact"}
            </h3>
            <div className="space-y-6">
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Join Date
                    </label>
                    {editing ? (
                      <input
                        type="date"
                        value={formData.join_date || ""}
                        onChange={(e) => handleInputChange("join_date", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                      />
                    ) : (
                      <p className="text-slate-900 dark:text-slate-100">
                        {profile.join_date
                          ? formatDateOnlyToIST(profile.join_date)
                          : "—"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Finish Date
                    </label>
                    {editing ? (
                      <input
                        type="date"
                        value={formData.finish_date || ""}
                        onChange={(e) => handleInputChange("finish_date", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                      />
                    ) : (
                      <p className="text-slate-900 dark:text-slate-100">
                        {profile.finish_date
                          ? formatDateOnlyToIST(profile.finish_date)
                          : "—"}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Parent Contact Number
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.parent_contact_number || ""}
                    onChange={(e) => {
                      // Only allow numeric digits, max 10 digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      handleInputChange("parent_contact_number", value);
                    }}
                    className="w-full px-4 py-3 bg-slate-700 dark:bg-slate-700 text-white dark:text-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="1234567890"
                    maxLength={10}
                    inputMode="numeric"
                  />
                ) : (
                  <p className="text-card-foreground font-medium">{profile.parent_contact_number || "—"}</p>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

