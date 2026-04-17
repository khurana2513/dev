import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Building2, Plus, Search, CheckCircle2,
  Mail, MapPin, Users, ArrowRight, RefreshCw, Loader2,
  AlertCircle, X, ChevronLeft, Shield,
  BadgeCheck, Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  listAllOrgs, createOrg,
  checkPrefix,
  OrgResponse, OrgCreatePayload,
  TIER_LABELS, TIER_COLORS,
} from "../lib/orgApi";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG = "#07070F";
const CARD = "#0F1120";
const CARD2 = "#141829";
const BORDER = "rgba(255,255,255,0.08)";
const BORDER_MED = "rgba(255,255,255,0.13)";
const TEXT = "#F0F2FF";
const TEXT2 = "rgba(255,255,255,0.62)";
const TEXT3 = "rgba(255,255,255,0.35)";

// ─── Org initials avatar ───────────────────────────────────────────────────────
function OrgAvatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: `linear-gradient(135deg, hsl(${hue},60%,38%), hsl(${(hue + 40) % 360},70%,30%))`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: size * 0.38, color: "rgba(255,255,255,0.95)",
        flexShrink: 0, letterSpacing: 0.5,
      }}
    >
      {initials || "?"}
    </div>
  );
}

// ─── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  const col = TIER_COLORS[tier] ?? TIER_COLORS.free;
  return (
    <span
      style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1,
        textTransform: "uppercase", padding: "2px 8px", borderRadius: 6,
        background: col.bg, color: col.text, border: `1px solid ${col.border}`,
      }}
    >
      {TIER_LABELS[tier] ?? tier}
    </span>
  );
}

// ─── Create Org Modal ──────────────────────────────────────────────────────────
interface CreateOrgModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateOrgModal({ onClose, onCreated }: CreateOrgModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<OrgCreatePayload>({
    name: "", id_prefix: "", contact_email: "", contact_phone: "",
    city: "", address: "", logo_url: "", website_url: "", description: "",
  });
  const [prefixStatus, setPrefixStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [prefixTimer, setPrefixTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { mutate: doCreate, isPending } = useMutation({
    mutationFn: () => createOrg(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orgs"] });
      onCreated();
    },
    onError: (e: any) => setFormError(e?.message ?? "Failed to create organization"),
  });

  const set = (k: keyof OrgCreatePayload, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Live prefix availability check
  useEffect(() => {
    const val = form.id_prefix.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (val.length < 2) { setPrefixStatus("idle"); return; }
    if (prefixTimer) clearTimeout(prefixTimer);
    setPrefixStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await checkPrefix(val);
        setPrefixStatus(res.available ? "available" : "taken");
      } catch {
        setPrefixStatus("idle");
      }
    }, 400);
    setPrefixTimer(t);
    return () => clearTimeout(t);
  }, [form.id_prefix]);

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) return setFormError("Organization name is required");
    if (!form.id_prefix || form.id_prefix.length < 2) return setFormError("ID prefix must be 2–3 characters");
    if (prefixStatus === "taken") return setFormError("That prefix is already taken — choose another");
    setFormError(null);
    doCreate();
  }, [form, prefixStatus, doCreate]);

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: "100%", background: CARD2, border: `1.5px solid ${BORDER_MED}`,
    borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 14,
    outline: "none", fontFamily: "DM Sans, system-ui, sans-serif",
    boxSizing: "border-box", ...style,
  });

  const prefixColor =
    prefixStatus === "available" ? "#22C55E" :
    prefixStatus === "taken" ? "#EF4444" :
    prefixStatus === "checking" ? "#F59E0B" : TEXT3;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%", maxWidth: 560, background: CARD,
          border: `1.5px solid ${BORDER_MED}`, borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg,#7C3AED,#4C1D95)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Building2 style={{ width: 20, height: 20, color: "white" }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: TEXT }}>New Organization</div>
              <div style={{ fontSize: 12, color: TEXT3, marginTop: 1 }}>Add a school or coaching centre to BlackMonkey</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", padding: 4, borderRadius: 8 }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          {formError && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10, color: "#FCA5A5", fontSize: 13,
            }}>
              <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />{formError}
            </div>
          )}

          {/* Name + Prefix row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
                ORGANIZATION NAME *
              </label>
              <input style={inp()} placeholder="e.g. BlackMonkey Academy" value={form.name}
                onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
                ID PREFIX *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  style={inp({
                    textTransform: "uppercase", fontFamily: "monospace, monospace", fontWeight: 700,
                    borderColor: prefixStatus === "available" ? "rgba(34,197,94,0.5)"
                      : prefixStatus === "taken" ? "rgba(239,68,68,0.5)" : BORDER_MED,
                  })}
                  placeholder="TH"
                  maxLength={3}
                  value={form.id_prefix}
                  onChange={(e) => set("id_prefix", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                />
                {prefixStatus !== "idle" && (
                  <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                    {prefixStatus === "checking" ? (
                      <Loader2 style={{ width: 12, height: 12, color: "#F59E0B", animation: "spin 1s linear infinite" }} />
                    ) : prefixStatus === "available" ? (
                      <CheckCircle2 style={{ width: 12, height: 12, color: "#22C55E" }} />
                    ) : (
                      <X style={{ width: 12, height: 12, color: "#EF4444" }} />
                    )}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: prefixColor, marginTop: 4 }}>
                {prefixStatus === "available" ? "Available!" :
                 prefixStatus === "taken" ? "Already taken" :
                 prefixStatus === "checking" ? "Checking…" : "2–3 chars, e.g. TH"}
              </div>
            </div>
          </div>

          {/* Contact row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>EMAIL</label>
              <input style={inp()} type="email" placeholder="contact@org.com" value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>PHONE</label>
              <input style={inp()} placeholder="+91 9999999999" value={form.contact_phone}
                onChange={(e) => set("contact_phone", e.target.value)} />
            </div>
          </div>

          {/* City + Website */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>CITY</label>
              <input style={inp()} placeholder="New Delhi" value={form.city}
                onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>WEBSITE</label>
              <input style={inp()} placeholder="https://org.com" value={form.website_url}
                onChange={(e) => set("website_url", e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, letterSpacing: 0.5, display: "block", marginBottom: 6 }}>DESCRIPTION</label>
            <textarea
              rows={3}
              style={inp({ resize: "none" }) as React.CSSProperties}
              placeholder="Brief description of the organization…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "12px", borderRadius: 12,
              background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`,
              color: TEXT2, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                flex: 2, padding: "12px", borderRadius: 12,
                background: isPending ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7C3AED,#4C1D95)",
                border: "none", color: "white", fontSize: 14, fontWeight: 700,
                cursor: isPending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {isPending ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />Creating…</> : "Create Organization"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Org Card ──────────────────────────────────────────────────────────────────
function OrgCard({ org, onClick }: { org: OrgResponse; onClick: () => void }) {
  const tierCol = TIER_COLORS[org.subscription_tier] ?? TIER_COLORS.free;
  return (
    <div
      onClick={onClick}
      style={{
        background: CARD, border: `1.5px solid ${BORDER}`,
        borderRadius: 18, overflow: "hidden", cursor: "pointer",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget as HTMLDivElement;
        t.style.borderColor = "rgba(124,58,237,0.4)";
        t.style.transform = "translateY(-2px)";
        t.style.boxShadow = "0 12px 40px rgba(124,58,237,0.15)";
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget as HTMLDivElement;
        t.style.borderColor = BORDER;
        t.style.transform = "translateY(0)";
        t.style.boxShadow = "none";
      }}
    >
      {/* Top accent strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${tierCol.text}, transparent)` }} />

      <div style={{ padding: "20px 20px 16px" }}>
        {/* Avatar + badges row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <OrgAvatar name={org.name} size={52} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <TierBadge tier={org.subscription_tier} />
            {org.is_verified ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#22C55E" }}>
                <BadgeCheck style={{ width: 11, height: 11 }} />
                <span style={{ fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Verified</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#F59E0B" }}>
                <Clock style={{ width: 11, height: 11 }} />
                <span style={{ fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Name + prefix */}
        <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, marginBottom: 4, lineHeight: 1.3 }}>
          {org.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <span style={{
            fontFamily: "monospace, monospace", fontSize: 11, fontWeight: 700,
            color: "#a78bfa", background: "rgba(167,139,250,0.12)",
            border: "1px solid rgba(167,139,250,0.25)", borderRadius: 6,
            padding: "2px 8px",
          }}>
            {org.id_prefix}
          </span>
          {org.city && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: TEXT3 }}>
              <MapPin style={{ width: 11, height: 11 }} />{org.city}
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: TEXT3 }}>
            <Users style={{ width: 13, height: 13 }} />
            <span>Max {org.max_students} students</span>
          </div>
          {org.contact_email && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: TEXT3, overflow: "hidden" }}>
              <Mail style={{ width: 13, height: 13, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                {org.contact_email}
              </span>
            </div>
          )}
        </div>

        {/* View button */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "10px", borderRadius: 10,
          background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
          color: "#a78bfa", fontSize: 13, fontWeight: 700,
          transition: "background 0.2s",
        }}>
          View Details <ArrowRight style={{ width: 13, height: 13 }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminOrgs() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Guard
  useEffect(() => {
    if (!isAdmin) setLocation("/admin");
  }, [isAdmin, setLocation]);

  const {
    data: orgs = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-orgs"],
    queryFn: listAllOrgs,
    staleTime: 30_000,
    enabled: isAdmin,
  });

  const filtered = orgs.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      o.id_prefix.toLowerCase().includes(q) ||
      (o.city ?? "").toLowerCase().includes(q) ||
      (o.contact_email ?? "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: orgs.length,
    verified: orgs.filter((o) => o.is_verified).length,
    pending: orgs.filter((o) => !o.is_verified).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: 80 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ao-fadeup { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .ao-card { animation: ao-fadeup 0.35s ease both; }
      `}</style>

      {/* Page header */}
      <div style={{
        background: "linear-gradient(180deg, rgba(124,58,237,0.1) 0%, transparent 100%)",
        borderBottom: `1px solid ${BORDER}`, padding: "28px 32px 24px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Link href="/admin">
              <button style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: TEXT3, fontSize: 13, cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />Admin
              </button>
            </Link>
            <span style={{ color: TEXT3, fontSize: 13 }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa" }}>Organizations</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: "linear-gradient(135deg,#7C3AED,#4C1D95)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
              }}>
                <Building2 style={{ width: 24, height: 24, color: "white" }} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: TEXT, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Organization Management
                </h1>
                <p style={{ fontSize: 13, color: TEXT3, margin: "4px 0 0", fontFamily: "DM Sans, system-ui" }}>
                  Create and manage schools & coaching centers on BlackMonkey
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 16px", borderRadius: 10,
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`,
                  color: TEXT3, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                <RefreshCw style={{ width: 14, height: 14, animation: isFetching ? "spin 1s linear infinite" : "none" }} />
                Refresh
              </button>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 10,
                  background: "linear-gradient(135deg,#7C3AED,#4C1D95)",
                  border: "none", color: "white", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                New Organization
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 24, maxWidth: 500 }}>
            {[
              { label: "Total", value: stats.total, color: "#a78bfa", icon: Building2 },
              { label: "Verified", value: stats.verified, color: "#22C55E", icon: BadgeCheck },
              { label: "Pending", value: stats.pending, color: "#F59E0B", icon: Clock },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} style={{
                background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12,
                padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
              }}>
                <Icon style={{ width: 16, height: 16, color }} />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 10, color: TEXT3, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ maxWidth: 1200, margin: "24px auto 0", padding: "0 32px" }}>
        <div style={{ position: "relative", maxWidth: 480 }}>
          <Search style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            width: 16, height: 16, color: TEXT3,
          }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orgs by name, prefix, or city…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: CARD, border: `1.5px solid ${BORDER}`,
              borderRadius: 12, padding: "11px 14px 11px 42px",
              color: TEXT, fontSize: 14, outline: "none",
              fontFamily: "DM Sans, system-ui, sans-serif",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(124,58,237,0.4)")}
            onBlur={(e) => (e.target.style.borderColor = BORDER)}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: TEXT3, cursor: "pointer",
            }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "24px auto 0", padding: "0 32px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 }}>
            <Loader2 style={{ width: 36, height: 36, color: "#7C3AED", animation: "spin 1s linear infinite" }} />
            <span style={{ color: TEXT3, fontSize: 14 }}>Loading organizations…</span>
          </div>
        ) : isError ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 12,
          }}>
            <AlertCircle style={{ width: 40, height: 40, color: "#EF4444" }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>Failed to load organizations</div>
            <button onClick={() => refetch()} style={{
              padding: "8px 20px", borderRadius: 10, background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", fontSize: 13, cursor: "pointer",
            }}>
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Building2 style={{ width: 52, height: 52, color: "rgba(124,58,237,0.25)", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: TEXT2, marginBottom: 8 }}>
              {search ? "No organizations match your search" : "No organizations yet"}
            </div>
            <div style={{ fontSize: 14, color: TEXT3, marginBottom: 24 }}>
              {search ? "Try a different name or prefix" : "Create the first organization to get started"}
            </div>
            {!search && (
              <button onClick={() => setShowCreate(true)} style={{
                padding: "12px 24px", borderRadius: 12,
                background: "linear-gradient(135deg,#7C3AED,#4C1D95)",
                border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>
                Create First Organization
              </button>
            )}
          </div>
        ) : (
          <>
            {search && (
              <div style={{ fontSize: 13, color: TEXT3, marginBottom: 16 }}>
                Showing {filtered.length} of {orgs.length} organizations
              </div>
            )}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}>
              {filtered.map((org, i) => (
                <div
                  key={org.id}
                  className="ao-card"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <OrgCard
                    org={org}
                    onClick={() => setLocation(`/admin/orgs/${org.id}`)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Admin indicator */}
      <div style={{
        position: "fixed", bottom: 24, right: 24,
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 20,
        background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
        color: "#a78bfa", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      }}>
        <Shield style={{ width: 12, height: 12 }} />
        PLATFORM ADMIN
      </div>

      {showCreate && (
        <CreateOrgModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
