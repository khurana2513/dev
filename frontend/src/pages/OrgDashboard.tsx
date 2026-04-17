/**
 * OrgDashboard — visible to any authenticated user who owns an org.
 * Route: /org-dashboard
 *
 * States:
 *  - Loading: spinner
 *  - No org: invite to ask platform admin
 *  - Has org: full dashboard with members, invite links, settings
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2, Users, Link2, Plus, Copy, CheckCircle2,
  Trash2, Loader2, AlertCircle, Edit2, Mail, Phone,
  MapPin, BadgeCheck,
  LayoutDashboard, BookOpen, X,
  Star,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  getMyOrg, updateOrg, createInviteLink, listInviteLinks,
  deactivateInviteLink, getOrgMembers,
  OrgResponse, OrgUpdatePayload, InviteLinkResponse, OrgMember,
  TIER_LABELS, TIER_COLORS, buildInviteUrl,
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

// ─── Helpers ───────────────────────────────────────────────────────────────────
function OrgAvatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.26,
      background: `linear-gradient(135deg, hsl(${hue},55%,40%), hsl(${(hue + 45) % 360},65%,32%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.38, color: "rgba(255,255,255,0.95)", flexShrink: 0,
    }}>
      {initials || "?"}
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number | string; accent: string }) {
  return (
    <div style={{ background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accent}1a`, border: `1px solid ${accent}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 20, height: 20, color: accent }} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: TEXT3, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Edit Org Modal ────────────────────────────────────────────────────────────
function EditModal({ org, onClose, onSaved }: { org: OrgResponse; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<OrgUpdatePayload>({
    name: org.name, contact_email: org.contact_email ?? "",
    contact_phone: org.contact_phone ?? "", city: org.city ?? "",
    address: org.address ?? "", website_url: org.website_url ?? "",
    description: org.description ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const { mutate, isPending } = useMutation({
    mutationFn: () => updateOrg(org.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-org"] }); onSaved(); },
    onError: (e: any) => setErr(e?.message ?? "Failed to save"),
  });
  const inp = (): React.CSSProperties => ({ width: "100%", boxSizing: "border-box", background: CARD2, border: `1.5px solid ${BORDER_MED}`, borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 14, outline: "none", fontFamily: "DM Sans, system-ui" });
  const FIELDS: { k: keyof OrgUpdatePayload; label: string }[] = [
    { k: "name", label: "Organization Name" },
    { k: "contact_email", label: "Contact Email" },
    { k: "contact_phone", label: "Contact Phone" },
    { k: "city", label: "City" },
    { k: "website_url", label: "Website URL" },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 500, background: CARD, border: `1.5px solid ${BORDER_MED}`, borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.7)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "22px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>Edit Organization</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {err && <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#FCA5A5", fontSize: 13 }}><AlertCircle style={{ width: 15, height: 15 }} />{err}</div>}
          {FIELDS.map(({ k, label }) => (
            <div key={k}>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>
              <input style={inp()} value={(form[k] ?? "") as string} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Description</label>
            <textarea rows={3} style={{ ...inp(), resize: "none" } as React.CSSProperties} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={() => mutate()} disabled={isPending} style={{ flex: 2, padding: 12, borderRadius: 12, background: isPending ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#7C3AED,#4C1D95)", border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {isPending ? <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />Saving…</> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Links Section ──────────────────────────────────────────────────────
function InviteLinksSection({ org }: { org: OrgResponse }) {
  const qc = useQueryClient();
  const [role, setRole] = useState("student");
  const [maxUses, setMaxUses] = useState("100");
  const [expDays, setExpDays] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["my-org-links", org.id],
    queryFn: () => listInviteLinks(org.id),
    staleTime: 15_000,
  });

  const { mutate: createLink, isPending: creating } = useMutation({
    mutationFn: () => createInviteLink(org.id, { role, max_uses: parseInt(maxUses) || 100, expires_days: expDays ? parseInt(expDays) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-org-links", org.id] }); setShowForm(false); },
  });

  const { mutate: deactivate } = useMutation({
    mutationFn: (id: string) => deactivateInviteLink(org.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-org-links", org.id] }),
  });

  const copy = (link: InviteLinkResponse) => {
    navigator.clipboard.writeText(buildInviteUrl(link.code));
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeLinks = links.filter((l) => l.is_active);

  return (
    <div style={{ background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ padding: "18px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link2 style={{ width: 18, height: 18, color: "#3B82F6" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Invite Links</span>
          <span style={{ fontSize: 12, background: "rgba(59,130,246,0.12)", color: "#60A5FA", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}>
            {activeLinks.length} active
          </span>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: showForm ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          <Plus style={{ width: 13, height: 13 }} />New Link
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, background: CARD2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: 10, color: TEXT3, fontWeight: 700, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>ROLE</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%", background: CARD, border: `1.5px solid ${BORDER_MED}`, borderRadius: 8, padding: "8px 10px", color: TEXT, fontSize: 13, outline: "none", cursor: "pointer" }}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: TEXT3, fontWeight: 700, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>MAX USES</label>
              <input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: CARD, border: `1.5px solid ${BORDER_MED}`, borderRadius: 8, padding: "8px 10px", color: TEXT, fontSize: 13, outline: "none", fontFamily: "DM Sans" }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: TEXT3, fontWeight: 700, letterSpacing: 0.5, display: "block", marginBottom: 4 }}>EXPIRES (DAYS)</label>
              <input type="number" placeholder="Never" value={expDays} onChange={(e) => setExpDays(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: CARD, border: `1.5px solid ${BORDER_MED}`, borderRadius: 8, padding: "8px 10px", color: TEXT, fontSize: 13, outline: "none", fontFamily: "DM Sans" }} />
            </div>
            <button onClick={() => createLink()} disabled={creating} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 14px", borderRadius: 8, background: "linear-gradient(135deg,#3B82F6,#2563EB)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              {creating ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 13, height: 13 }} />}Create
            </button>
          </div>
        </div>
      )}

      {/* Links */}
      <div style={{ padding: isLoading || links.length === 0 ? "30px 20px" : "10px 12px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center" }}><Loader2 style={{ width: 20, height: 20, color: "#7C3AED", animation: "spin 1s linear infinite", display: "inline-block" }} /></div>
        ) : links.length === 0 ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: TEXT3 }}>No invite links yet — create one above to invite students</div>
          </div>
        ) : (
          links.map((link) => (
            <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, opacity: link.is_active ? 1 : 0.4 }}>
              <code style={{ fontFamily: "monospace, monospace", fontSize: 13, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 6, padding: "3px 8px", flexShrink: 0 }}>
                {link.code}
              </code>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: TEXT3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{buildInviteUrl(link.code)}</div>
                <div style={{ fontSize: 11, color: TEXT3, marginTop: 1 }}>{link.uses_count}/{link.max_uses} used · {link.role}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => copy(link)} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 10px", borderRadius: 7, background: copiedId === link.id ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${copiedId === link.id ? "rgba(34,197,94,0.3)" : BORDER}`, color: copiedId === link.id ? "#22C55E" : TEXT3, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {copiedId === link.id ? <CheckCircle2 style={{ width: 11, height: 11 }} /> : <Copy style={{ width: 11, height: 11 }} />}
                  {copiedId === link.id ? "Copied!" : "Copy"}
                </button>
                {link.is_active && (
                  <button onClick={() => deactivate(link.id)} style={{ display: "flex", alignItems: "center", gap: 3, padding: "5px 10px", borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    <Trash2 style={{ width: 11, height: 11 }} />Revoke
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Members Section ───────────────────────────────────────────────────────────
function MembersSection({ org }: { org: OrgResponse }) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["my-org-members", org.id],
    queryFn: () => getOrgMembers(org.id),
    staleTime: 30_000,
  });

  const STATUS_COLOR: Record<string, string> = { active: "#22C55E", inactive: "#F59E0B", closed: "#EF4444" };

  return (
    <div style={{ background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
        <Users style={{ width: 18, height: 18, color: "#22C55E" }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>Members</span>
        <span style={{ fontSize: 12, background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}>
          {members.length}
        </span>
      </div>
      <div style={{ padding: "10px 12px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}><Loader2 style={{ width: 20, height: 20, color: "#7C3AED", animation: "spin 1s linear infinite", display: "inline-block" }} /></div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Users style={{ width: 30, height: 30, color: TEXT3, margin: "0 auto 8px" }} />
            <div style={{ fontSize: 13, color: TEXT3 }}>No members yet — share an invite link</div>
          </div>
        ) : (
          members.map((m: OrgMember) => (
            <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10 }}>
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#7C3AED,#4C1D95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white", flexShrink: 0 }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{m.name}</span>
                  <span style={{ fontSize: 10, color: STATUS_COLOR[m.status] ?? TEXT3, fontWeight: 700, textTransform: "uppercase" }}>{m.status}</span>
                </div>
                <div style={{ fontSize: 11, color: TEXT3 }}>
                  {[m.course, m.level ? `L${m.level}` : null, m.branch].filter(Boolean).join(" · ") || m.email || "No details"}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, flexShrink: 0 }}>{m.total_points} pts</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── No Org State ──────────────────────────────────────────────────────────────
function NoOrgState() {
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22,
          background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.1))",
          border: "1.5px solid rgba(124,58,237,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <Building2 style={{ width: 36, height: 36, color: "#a78bfa" }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: TEXT, margin: "0 0 12px", fontFamily: "'Playfair Display', Georgia, serif" }}>
          You don't have an organization yet
        </h1>
        <p style={{ fontSize: 15, color: TEXT2, lineHeight: 1.6, margin: "0 0 32px" }}>
          Organizations are created by the BlackMonkey platform administrator. Contact the admin to set up your school or coaching centre.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <Link href="/dashboard">
            <button style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: 12,
              background: "linear-gradient(135deg,#7C3AED,#4C1D95)",
              border: "none", color: "white", fontSize: 14, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
            }}>
              <LayoutDashboard style={{ width: 16, height: 16 }} />
              Go to Dashboard
            </button>
          </Link>
          <p style={{ fontSize: 12, color: TEXT3, margin: 0 }}>
            Once your org is created, this page will show your students and invite links
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function OrgDashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const qc = useQueryClient();

  const {
    data: org, isLoading, isError,
  } = useQuery({
    queryKey: ["my-org"],
    queryFn: getMyOrg,
    staleTime: 60_000,
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["my-org-members", org?.id],
    queryFn: () => getOrgMembers(org!.id),
    staleTime: 30_000,
    enabled: !!org?.id,
  });

  const { data: links = [] } = useQuery({
    queryKey: ["my-org-links", org?.id],
    queryFn: () => listInviteLinks(org!.id),
    staleTime: 15_000,
    enabled: !!org?.id,
  });

  if (authLoading || isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Loader2 style={{ width: 36, height: 36, color: "#7C3AED", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 14, color: TEXT3 }}>Loading your organization…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 12 }}>Please sign in to view your organization</div>
          <Link href="/login"><button style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#4C1D95)", border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Sign In</button></Link>
        </div>
      </div>
    );
  }

  if (isError || !org) return <NoOrgState />;

  const tierCol = TIER_COLORS[org.subscription_tier] ?? TIER_COLORS.free;
  const activeLinks = links.filter((l) => l.is_active);

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: 80 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Hero banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(59,130,246,0.06) 60%, transparent 100%)",
        borderBottom: `1px solid ${BORDER}`, padding: "28px 32px 28px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <OrgAvatar name={org.name} size={68} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {org.name}
                </h1>
                <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 6, padding: "3px 10px" }}>
                  {org.id_prefix}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "2px 8px", borderRadius: 6, background: tierCol.bg, color: tierCol.text, border: `1px solid ${tierCol.border}` }}>
                  {TIER_LABELS[org.subscription_tier]}
                </span>
                {org.is_verified && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#22C55E", fontWeight: 700 }}>
                    <BadgeCheck style={{ width: 13, height: 13 }} />VERIFIED
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {org.city && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: TEXT3 }}><MapPin style={{ width: 12, height: 12 }} />{org.city}</span>}
                {org.contact_email && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: TEXT3 }}><Mail style={{ width: 12, height: 12 }} />{org.contact_email}</span>}
                {org.contact_phone && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: TEXT3 }}><Phone style={{ width: 12, height: 12 }} />{org.contact_phone}</span>}
              </div>
              {org.description && (
                <p style={{ fontSize: 13, color: TEXT3, margin: "8px 0 0", lineHeight: 1.5, maxWidth: 600 }}>{org.description}</p>
              )}
            </div>
            <button onClick={() => setShowEdit(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 12, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Edit2 style={{ width: 14, height: 14 }} />Edit Org
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: 1100, margin: "24px auto 0", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          <StatCard icon={Users} label="Total Members" value={members.length} accent="#22C55E" />
          <StatCard icon={Link2} label="Active Links" value={activeLinks.length} accent="#3B82F6" />
          <StatCard icon={Star} label="Max Students" value={org.max_students} accent="#F59E0B" />
          <StatCard icon={BookOpen} label="Tier" value={TIER_LABELS[org.subscription_tier]} accent="#a78bfa" />
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ maxWidth: 1100, margin: "24px auto 0", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <InviteLinksSection org={org} />
          <MembersSection org={org} />
        </div>
      </div>

      {showEdit && (
        <EditModal
          org={org}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); qc.invalidateQueries({ queryKey: ["my-org"] }); }}
        />
      )}
    </div>
  );
}
