import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getAllStudents,
  getVacantIds,
  VacantId,
  updateStudentPublicId,
  generateNextStudentId,
  deleteVacantId
} from "../lib/userApi";
import { Edit2, Save, X, AlertCircle, CheckCircle2, Loader2, Search, RefreshCw, Users, IdCard, Plus, Archive } from "lucide-react";
import Skeleton from "../components/Skeleton";
import { useLocation } from "wouter";

export default function AdminStudentIDManagement() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudent, setEditingStudent] = useState<number | null>(null);
  const [newPublicId, setNewPublicId] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [vacantIds, setVacantIds] = useState<VacantId[]>([]);
  const [showVacantIds, setShowVacantIds] = useState(false);
  const [_loadingVacantIds, setLoadingVacantIds] = useState(false);
  const [showVacantIdsModal, setShowVacantIdsModal] = useState(false);
  const [deletingVacantId, setDeletingVacantId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"id" | "name" | "not_assigned" | "assigned">("id");

  useEffect(() => {
    if (!isAdmin) {
      setLocation("/dashboard");
      return;
    }
    loadStudents();
    loadVacantIds();
  }, [isAdmin]);

  useEffect(() => {
    // Filter and sort students
    let filtered = students.filter(student =>
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.public_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort students
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "id":
          // Sort by public_id (TH-0001 format)
          if (!a.public_id && !b.public_id) return 0;
          if (!a.public_id) return 1;
          if (!b.public_id) return -1;
          const numA = parseInt(a.public_id.split('-')[1]) || 0;
          const numB = parseInt(b.public_id.split('-')[1]) || 0;
          return numA - numB;
        case "name":
          return (a.display_name || a.name || "").localeCompare(b.display_name || b.name || "");
        case "not_assigned":
          if (!a.public_id && !b.public_id) return 0;
          if (!a.public_id) return -1;
          if (!b.public_id) return 1;
          return 0;
        case "assigned":
          if (a.public_id && !b.public_id) return -1;
          if (!a.public_id && b.public_id) return 1;
          return 0;
        default:
          return 0;
      }
    });

    setFilteredStudents(filtered);
  }, [students, searchTerm, sortBy]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await getAllStudents();
      // Filter to only students
      const studentUsers = data.filter((user: any) => user.role === "student");
      setStudents(studentUsers);
      setFilteredStudents(studentUsers);
    } catch (err: any) {
      setError(err.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const loadVacantIds = async () => {
    try {
      setLoadingVacantIds(true);
      const response = await getVacantIds();
      setVacantIds(response.vacant_ids);
    } catch (err: any) {
      console.error("Failed to load vacant IDs:", err);
    } finally {
      setLoadingVacantIds(false);
    }
  };

  const validatePublicId = (id: string): { valid: boolean; error?: string } => {
    if (!id.trim()) {
      return { valid: false, error: "Public ID cannot be empty" };
    }
    
    // Remove TH- prefix if user typed it
    let cleanId = id.trim().toUpperCase();
    if (cleanId.startsWith("TH-")) {
      cleanId = cleanId.substring(3);
    }
    
    // Check if it's a valid number between 1 and 9999
    const num = parseInt(cleanId);
    if (isNaN(num) || num < 1 || num > 9999) {
      return { valid: false, error: "ID must be a number between 1 and 9999" };
    }
    
    return { valid: true };
  };

  const formatPublicId = (id: string): string => {
    if (!id.trim()) return "";
    
    // Remove TH- prefix if present
    let cleanId = id.trim().toUpperCase();
    if (cleanId.startsWith("TH-")) {
      cleanId = cleanId.substring(3);
    }
    
    // Validate it's a number
    const num = parseInt(cleanId);
    if (isNaN(num) || num < 1 || num > 9999) {
      return cleanId; // Return as-is if invalid, validation will catch it
    }
    
    // Format as TH-0001
    return `TH-${num.toString().padStart(4, '0')}`;
  };

  const handleEditPublicId = (student: any) => {
    setEditingStudent(student.id);
    // If student has an ID, show it without TH- prefix for editing, otherwise empty
    const existingId = student.public_id || "";
    if (existingId.startsWith("TH-")) {
      setNewPublicId(existingId.substring(3));
    } else {
      setNewPublicId(existingId);
    }
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setNewPublicId("");
    setError(null);
  };

  const handleUpdatePublicId = async () => {
    if (!editingStudent) {
      setError("No student selected for editing");
      return;
    }

    // Validate and format the ID
    const validation = validatePublicId(newPublicId);
    if (!validation.valid) {
      setError(validation.error || "Invalid public ID");
      return;
    }

    // Format the ID with TH- prefix
    const formattedId = formatPublicId(newPublicId);

    const previousStudents = students;

    // Optimistic update for immediate UI feedback
    setStudents(prev => prev.map(student =>
      student.id === editingStudent
        ? { ...student, public_id: formattedId }
        : student
    ));

    try {
      setUpdating(true);
      setError(null);

      const result = await updateStudentPublicId(editingStudent, {
        new_public_id: formattedId
      });

      setSuccess(result.message);

      // Confirm with server response (in case it normalizes the ID)
      setStudents(prev => prev.map(student =>
        student.id === editingStudent
          ? { ...student, public_id: result.new_public_id }
          : student
      ));

      // Reload vacant IDs in case one was used
      await loadVacantIds();

      setEditingStudent(null);
      setNewPublicId("");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      // Roll back optimistic update on error
      setStudents(previousStudents);
      setError(err.message || "Failed to update public ID");
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectVacantId = (vacantId: string) => {
    // Extract the number part from TH-0001 format
    if (vacantId.startsWith("TH-")) {
      setNewPublicId(vacantId.substring(3));
    } else {
      setNewPublicId(vacantId);
    }
    setShowVacantIds(false);
  };

  const handleGenerateSuggestedId = async (branch?: string) => {
    try {
      setError(null);
      const result = await generateNextStudentId(branch);
      
      // Extract the number part from TH-0001 format
      if (result.suggested_id && result.suggested_id.startsWith("TH-")) {
        setNewPublicId(result.suggested_id.substring(3));
      } else {
        setNewPublicId(result.suggested_id || "");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate suggested ID");
    }
  };

  const getStudentDisplayName = (student: any) => {
    return student.display_name || student.name || "Unknown";
  };

  const handleDeleteVacantId = async (id: number) => {
    try {
      setDeletingVacantId(id);
      await deleteVacantId(id);
      setVacantIds(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete vacant ID");
    } finally {
      setDeletingVacantId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto pt-32 pb-20 px-6">
          <div className="mb-10 space-y-4">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex gap-4 mb-8">
            <Skeleton className="h-12 w-full max-w-md rounded-xl" />
            <Skeleton className="h-12 w-40 rounded-xl" />
          </div>
          <div className="bg-card border border-border rounded-[2.5rem] p-6">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={`student-row-skeleton-${index}`} className="h-12 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground mb-2">
            Student ID Management
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Manage and assign public IDs to students
          </p>
        </header>

        {/* Search and Actions */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search students by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3  bg-slate-700  text-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "id" | "name" | "not_assigned" | "assigned")}
              className="premium-select"
            >
              <option value="id">Sort by ID</option>
              <option value="name">Sort by Name</option>
              <option value="not_assigned">Not Assigned First</option>
              <option value="assigned">Assigned First</option>
            </select>
            <button
              onClick={loadStudents}
              className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4  bg-red-900/30 border  border-red-800 rounded-2xl flex items-center gap-3  text-red-400">
            <AlertCircle className="w-6 h-6" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4  bg-green-900/30 border  border-green-800 rounded-2xl flex items-center gap-3  text-green-400">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-bold text-card-foreground">Total Students</h3>
            </div>
            <div className="text-3xl font-black text-card-foreground">{students.length}</div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <IdCard className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-bold text-card-foreground">IDs Assigned</h3>
            </div>
            <div className="text-3xl font-black text-green-600">{students.filter(s => s.public_id).length}</div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <h3 className="text-lg font-bold text-card-foreground">IDs Missing</h3>
            </div>
            <div className="text-3xl font-black text-yellow-600">{students.filter(s => !s.public_id).length}</div>
          </div>

          <button
            onClick={() => setShowVacantIdsModal(true)}
            className="bg-card border border-border rounded-2xl p-6 shadow-lg text-left hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Archive className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-all" />
              <h3 className="text-lg font-bold text-card-foreground">Vacant IDs</h3>
            </div>
            <div className="text-3xl font-black text-blue-600">{vacantIds.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Click to manage</div>
          </button>
        </div>

        {/* Students Table */}
        <div className="bg-card border border-border rounded-[2.5rem] shadow-xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-premium">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">S.No.</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Student</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Public ID</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-black">
                          {getStudentDisplayName(student)[0]}
                        </div>
                        <div>
                          <div className="font-bold text-card-foreground">{getStudentDisplayName(student)}</div>
                          {student.display_name && student.display_name !== student.name && (
                            <div className="text-sm text-muted-foreground">({student.name})</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-card-foreground">{student.email}</td>
                    <td className="px-6 py-4">
                      {editingStudent === student.id ? (
                        <div className="flex items-center gap-2 relative">
                          <div className="relative flex-1">
                            <div className="flex items-center">
                              <span className="px-3 py-2 bg-muted border border-r-0 border-border rounded-l-lg text-sm font-mono text-muted-foreground">TH-</span>
                              <input
                                type="text"
                                value={newPublicId}
                                onChange={(e) => {
                                  // Only allow numbers
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  // Limit to 4 digits
                                  const limitedValue = value.slice(0, 4);
                                  setNewPublicId(limitedValue);
                                  setShowVacantIds(false);
                                  setError(null);
                                }}
                                onFocus={() => {
                                  setShowVacantIds(true);
                                }}
                                className="w-full px-3 py-2  bg-slate-800 border border-border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-mono"
                                placeholder="0001"
                                maxLength={4}
                              />
                            </div>
                            {showVacantIds && vacantIds.length > 0 && (
                              <div 
                                className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto scrollbar-premium"
                                onMouseDown={(e) => e.preventDefault()}
                              >
                                {vacantIds.map((vacant) => (
                                  <button
                                    key={vacant.id}
                                    onClick={() => handleSelectVacantId(vacant.public_id)}
                                    className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between"
                                  >
                                    <span className="font-mono text-sm">{vacant.public_id}</span>
                                    {vacant.original_student_name && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({vacant.original_student_name})
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                            {showVacantIds && vacantIds.length === 0 && (
                              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground">
                                No vacant IDs available
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleGenerateSuggestedId(student.branch)}
                            className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                            title="Generate suggested ID (fills the input with next available ID)"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setShowVacantIds(!showVacantIds);
                              if (!showVacantIds && vacantIds.length === 0) {
                                loadVacantIds();
                              }
                            }}
                            className="p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                            title="Show vacant IDs"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-sm px-2 py-1 rounded ${
                            student.public_id
                              ? ' bg-green-900/30  text-green-300'
                              : ' bg-yellow-900/30  text-yellow-300'
                          }`}>
                            {student.public_id || "Not Assigned"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingStudent === student.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleUpdatePublicId}
                            disabled={updating}
                            className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                            title="Save the ID (will be formatted as TH-XXXX)"
                          >
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-all"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditPublicId(student)}
                          className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit ID
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No students found matching your search.</p>
            </div>
          )}
        </div>

      </div>

      {/* Vacant IDs Modal */}
      {showVacantIdsModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowVacantIdsModal(false)}
        >
          <div
            className="bg-card border border-border rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Archive className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-black tracking-tight text-card-foreground">
                  Vacant IDs
                </h2>
                <span className="text-sm font-bold text-muted-foreground">{vacantIds.length} total</span>
              </div>
              <button
                onClick={() => setShowVacantIdsModal(false)}
                className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-destructive" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 scrollbar-premium">
              {vacantIds.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground font-medium">No vacant IDs available</p>
                  <p className="text-sm text-muted-foreground mt-1">Vacant IDs appear when a student's ID is freed.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {vacantIds.map((vacant) => (
                    <div
                      key={vacant.id}
                      className="flex items-center justify-between px-4 py-3 bg-background/50 border border-border rounded-xl hover:border-primary/30 transition-all"
                    >
                      <div>
                        <span className="font-mono font-bold text-card-foreground">{vacant.public_id}</span>
                        {vacant.original_student_name && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Previously: {vacant.original_student_name}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteVacantId(vacant.id)}
                        disabled={deletingVacantId === vacant.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20  text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {deletingVacantId === vacant.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
