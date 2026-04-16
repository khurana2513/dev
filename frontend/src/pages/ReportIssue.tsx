import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Upload, X, CheckCircle, Loader2, ImagePlus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { buildApiUrl } from "../lib/apiBase";

const MAX_FILES   = 5;
const MAX_BYTES   = 5 * 1024 * 1024; // 5 MB

interface ImagePreview {
  file: File;
  url:  string;
  id:   number;
}

export default function ReportIssue() {
  const [description, setDescription] = useState("");
  const [images, setImages]           = useState<ImagePreview[]>([]);
  const [status, setStatus]           = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]       = useState("");
  const [dragging, setDragging]       = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const nextId                        = useRef(0);

  // ── Image handling ────────────────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: ImagePreview[] = [];
    for (const f of arr) {
      if (!f.type.startsWith("image/")) {
        setErrorMsg(`"${f.name}" is not an image file.`);
        return;
      }
      if (f.size > MAX_BYTES) {
        setErrorMsg(`"${f.name}" exceeds the 5 MB limit.`);
        return;
      }
      if (images.length + valid.length >= MAX_FILES) {
        setErrorMsg(`Maximum ${MAX_FILES} screenshots allowed.`);
        break;
      }
      valid.push({ file: f, url: URL.createObjectURL(f), id: nextId.current++ });
    }
    setErrorMsg("");
    setImages(prev => [...prev, ...valid].slice(0, MAX_FILES));
  }, [images.length]);

  const removeImage = (id: number) => {
    setImages(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter(i => i.id !== id);
    });
  };

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setErrorMsg("Please describe the issue in at least 10 characters.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    const form = new FormData();
    form.append("description", description.trim());
    images.forEach(img => form.append("screenshots", img.file, img.file.name));

    try {
      const res = await fetch(buildApiUrl("/api/report-issue"), {
        method: "POST",
        body:   form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail || `Server error ${res.status}`);
      }
      setStatus("success");
      // Cleanup object URLs
      images.forEach(img => URL.revokeObjectURL(img.url));
      setImages([]);
      setDescription("");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div style={{ background: "#07070F", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", paddingTop: 96 }}>
      {/* Glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto", padding: "0 20px 80px" }}>
        {/* Back link */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <Link href="/">
            <button style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 500, marginBottom: 28, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
              <ArrowLeft size={15} /> Back to Home
            </button>
          </Link>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── SUCCESS STATE ─────────────────────────────────── */}
          {status === "success" ? (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <CheckCircle size={32} color="#22c55e" />
              </div>
              <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 10px" }}>Report Sent!</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 36px" }}>
                Thanks for helping improve BlackMonkey. We'll look into this as soon as possible.
              </p>
              <button onClick={() => setStatus("idle")}
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Report Another Issue
              </button>
            </motion.div>
          ) : (
            /* ── FORM ──────────────────────────────────────────── */
            <motion.div key="form"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertCircle size={20} color="#fbbf24" />
                </div>
                <div>
                  <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Report an Issue</h1>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12.5, margin: 0 }}>Help us make BlackMonkey better</p>
                </div>
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "20px 0 28px" }} />

              <form onSubmit={handleSubmit}>
                {/* Description */}
                <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Description <span style={{ color: "#f87171" }}>*</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => { setDescription(e.target.value); if (errorMsg) setErrorMsg(""); }}
                  placeholder="Describe the issue in detail — what happened, what you expected, and how to reproduce it…"
                  rows={5}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${description.length >= 10 ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 12, padding: "14px 16px",
                    color: "#fff", fontSize: 14.5, lineHeight: 1.65,
                    fontFamily: "'DM Sans', sans-serif", resize: "vertical" as const,
                    outline: "none", transition: "border-color 0.2s",
                    minHeight: 120,
                  }}
                  onFocus={e  => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)")}
                  onBlur={e   => (e.currentTarget.style.borderColor = description.length >= 10 ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.1)")}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <span style={{ color: description.length < 10 ? "rgba(255,255,255,0.2)" : "rgba(124,58,237,0.6)", fontSize: 11 }}>
                    {description.length} / 4000
                  </span>
                </div>

                {/* Image upload */}
                <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, margin: "22px 0 8px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Screenshots <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— optional, max 5 × 5 MB</span>
                </label>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  style={{
                    border: `1.5px dashed ${dragging ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: 12, padding: "20px 16px", textAlign: "center",
                    cursor: images.length >= MAX_FILES ? "not-allowed" : "pointer",
                    background: dragging ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)",
                    transition: "all 0.2s", opacity: images.length >= MAX_FILES ? 0.5 : 1,
                  }}>
                  <ImagePlus size={24} color="rgba(255,255,255,0.3)" style={{ display: "block", margin: "0 auto 8px" }} />
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>
                    {images.length >= MAX_FILES
                      ? "Maximum screenshots reached"
                      : "Drop images here or click to browse"}
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, margin: "4px 0 0" }}>PNG, JPG, GIF, WebP — any image format</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={e => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
                />

                {/* Previews */}
                {images.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                    {images.map(img => (
                      <motion.div key={img.id}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <img src={img.url} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.75)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                          <X size={11} color="#fff" />
                        </button>
                      </motion.div>
                    ))}
                    {images.length < MAX_FILES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ width: 80, height: 80, borderRadius: 8, border: "1.5px dashed rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Upload size={16} color="rgba(255,255,255,0.3)" />
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Add more</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {(errorMsg || status === "error") && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9 }}>
                      <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ color: "#f87171", fontSize: 13, lineHeight: 1.5 }}>{errorMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={status === "loading" || description.trim().length < 10}
                  whileHover={status !== "loading" && description.trim().length >= 10 ? { scale: 1.02 } : {}}
                  whileTap={status !== "loading" && description.trim().length >= 10 ? { scale: 0.98 } : {}}
                  style={{
                    marginTop: 28, width: "100%", padding: "14px 0",
                    borderRadius: 12, border: "none", cursor: status === "loading" || description.trim().length < 10 ? "not-allowed" : "pointer",
                    background: description.trim().length >= 10
                      ? "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)"
                      : "rgba(255,255,255,0.06)",
                    color: description.trim().length >= 10 ? "#fff" : "rgba(255,255,255,0.3)",
                    fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 0.25s, color 0.25s",
                    boxShadow: description.trim().length >= 10 ? "0 4px 24px rgba(124,58,237,0.3)" : "none",
                  }}>
                  {status === "loading"
                    ? <><Loader2 size={17} style={{ animation: "spin 0.9s linear infinite" }} /> Sending…</>
                    : "Send Report"}
                </motion.button>
              </form>

              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12, marginTop: 20, lineHeight: 1.5 }}>
                Reports are sent directly to the developer. No spam, no account required.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
