import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, ChevronLeft, BadgeCheck, Clock,
  Mail, Phone, MapPin, Globe, Users, Link2,
  Plus, Copy, Trash2, RefreshCw, Loader2, AlertCircle,
  CheckCircle2, X, Edit2, ExternalLink, Hash,
  Search, BookOpen, Zap,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  getOrg, verifyOrg, updateOrg,
  createInviteLink, listInviteLinks, deactivateInviteLink,
  getOrgMembers,
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
function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function OrgAvatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `linear-gradient(135deg, hsl(${hue},60%,38%), hsl(${(hue + 40) % 360},70%,30%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: size * 0.38, color: "rgba(255,255,255,0.95)",
      flexShrink: 0, letterSpacing: 0.5,
    }}>
      {initials || "?"}
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const col = TIER_COLORS[tier] ?? TIER_COLORS.free;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
      padding: "2px 8px", borderRadius: 6, background: col.bg, color: col.text,
      border: `1px solid ${col.border}`,
    }}>
      {TIER_LABELS[tier] ?? tier}
    </span>
  );
}

type Tab = "overview" | "members" | "invite-links" | "settings";

// ─── Edit Org Modal ────────────────────────────────────────────────────────────
function EditOrgModal({ org, onClose, onSaved }: { org: OrgResponse; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<OrgUpdatePayload>({
    name: org.name,
    contact_email: org.contact_email ?? "",
    contact_phone: org.contact_phone ?? "",
    city: org.city ?? "",
    address: org.address ?? "",
    logo_url: org.logo_url ?? "",
    website_url: org.website_url ?? "",
    description: org.description ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const { mutate, isPending } = useMutation({
    mutationFn: () => updateOrg(org.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-org", org.id] });
      onSaved();
    },
    onError: (e: any) => setErr(e?.message ?? "Failed to update organization"),
  });

  const inp = (): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box",
    background: CARD2, border: `1.5px solid ${BORDER_MED}`, borderRadius: 10,
    padding: "10px 14px", color: TEXT, fontSize: 14, outline: "none",
    fontFamily: "DM Sans, system-ui, sans-serif",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(8px)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 520, background: CARD,
        border: `1.5px solid ${BORDER_MED}`, borderRadius: 20,
        boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: TEXT }}>Edit Organization</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer" }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
        <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          {err && (
            <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#FCA5A5", fontSize: 13 }}>
              <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />{err}
            </div>
          )}
          {(["name", "contact_email", "contact_phone", "city", "website_url", "logo_url"] as (keyof OrgUpdatePayload)[]).map((k) => (
            <div key={k}>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                {k.replace(/_/g, " ")}
              </label>
              <input style={inp()} value={(form[k] as string) ?? ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Description</label>
            <textarea rows={3} style={{ ...inp(), resize: "none" } as React.CSSProperties}
              value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={() => mutate()} disabled={isPending} style={{ flex: 2, padding: 12, borderRadius: 12, background: isPending ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7C3AED,#4C1D95)", border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {isPending ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />Saving…</> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Links Tab ──────────────────────────────────────────────────────────
function InviteLinksTab({ org }: { org: OrgResponse }) {
  const qc = useQueryClient();
  const [role, setRole] = useState("student");
  const [maxUses, setMaxUses] = useState("100");
  const [expiresDays, setExpiresDays] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["admin-org-links", org.id],
    queryFn: () => listInviteLinks(org.id),
    staleTime: 15_000,
  });

  const { mutate: createLink, isPending: creating } = useMutation({
    mutationFn: () => createInviteLink(org.id, {
      role,
      max_uses: parseInt(maxUses) || 100,
      expires_days: expiresDays ? parseInt(expiresDays) : undefined,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-org-links", org.id] }),
  });

  const { mutate: deactivate } = useMutation({
    mutationFn: (linkId: string) => deactivateInviteLink(org.id, linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-org-links", org.id] }),
  });

  const copyLink = (link: InviteLinkResponse) => {
    navigator.clipboard.writeText(buildInviteUrl(link.code));
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const inp = (): React.CSSProperties => ({
    background: CARD2, border: `1.5px solid ${BORDER_MED}`, borderRadius: 10,
    padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none",
    fontFamily: "DM Sans, system-ui, sans-serif",
  });

  return (
    <div>
      {/* Create form */}
      <div style={{ background: CARD2, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT2, marginBottom: 14 }}>Create New Invite Link</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 11, color: TEXT3, fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: 0.5 }}>ROLE</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inp(), width: "100%", cursor: "pointer" }}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: TEXT3, fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: 0.5 }}>MAX USES</label>
            <input style={inp()} type="number" min={1} max={10000} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: TEXT3, fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: 0.5 }}>EXPIRES (DAYS)</label>
            <input style={inp()} type="number" min={1} max={365} placeholder="No expiry" value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} />
          </div>
          <button
            onClick={() => createLink()}
            disabled={creating}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10,
              background: "linear-gradient(135deg,#7C3AED,#4C1D95)", border: "none",
              color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {creating ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 14, height: 14 }} />}
            Create
          </button>
        </div>
      </div>

      {/* Links list */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Loader2 style={{ width: 24, height: 24, color: "#7C3AED", animation: "spin 1s linear infinite", display: "inline-block" }} /></div>
      ) : links.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Link2 style={{ width: 36, height: 36, color: TEXT3, margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: TEXT3 }}>No invite links yet — create one above</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((link) => (
            <div key={link.id} style={{
              background: CARD2, border: `1px solid ${link.is_active ? BORDER : "rgba(239,68,68,0.2)"}`,
              borderRadius: 12, padding: "14px 16px",
              opacity: link.is_active ? 1 : 0.5,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <code style={{ fontFamily: "monospace, monospace", fontSize: 14, fontWeight: 700, color: "#a78bfa", letterSpacing: 1 }}>
                    {link.code}
                  </code>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(124,58,237,0.15)", color: "#c4b5fd", textTransform: "uppercase" }}>
                    {link.role}
                  </span>
                  {!link.is_active && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#EF4444", background: "rgba(239,68,68,0.12)", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>
                      Deactivated
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: TEXT3 }}>
                  <span>{link.uses_count}/{link.max_uses} uses</span>
                  {link.expires_at && <span>Expires {fmt(link.expires_at)}</span>}
                  <span>Created {fmt(link.created_at)}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: TEXT3, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {buildInviteUrl(link.code)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => copyLink(link)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 8, background: copiedId === link.id ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${copiedId === link.id ? "rgba(34,197,94,0.3)" : BORDER}`, color: copiedId === link.id ? "#22C55E" : TEXT3, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                  {copiedId === link.id ? <CheckCircle2 style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  {copiedId === link.id ? "Copied!" : "Copy"}
                </button>
                {link.is_active && (
                  <button onClick={() => deactivate(link.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <Trash2 style={{ width: 12, height: 12 }} />
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Members Tab ───────────────────────────────────────────────────────────────
function MembersTab({ org }: { org: OrgResponse }) {
  const [search, setSearch] = useState("");
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin-org-members", org.id],
    queryFn: () => getOrgMembers(org.id),
    staleTime: 30_000,
  });

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q) || (m.public_id ?? "").toLowerCase().includes(q);
  });

  const STATUS_COLOR: Record<string, string> = {
    active: "#22C55E", inactive: "#F59E0B", closed: "#EF4444",
  };

  return (
    <div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 380 }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: TEXT3 }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…"
          style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36, background: CARD2, border: `1.5px solid ${BORDER_MED}`, borderRadius: 10, padding: "9px 12px 9px 34px", color: TEXT, fontSize: 13, outline: "none", fontFamily: "DM Sans, system-ui" }} />
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Loader2 style={{ width: 24, height: 24, color: "#7C3AED", animation: "spin 1s linear infinite", display: "inline-block" }} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Users style={{ width: 36, height: 36, color: TEXT3, margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: TEXT3 }}>{search ? "No members match your search" : "No members in this organization yet"}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((m: OrgMember) => (
            <div key={m.user_id} style={{
              background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
            }}>
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.name} style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#4C1D95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "white", flexShrink: 0 }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{m.name}</span>
                  {m.public_id && <span style={{ fontFamily: "monospace", fontSize: 11, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 4, padding: "1px 6px" }}>{m.public_id}</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[m.status] ?? TEXT3, textTransform: "uppercase" }}>{m.status}</span>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                  {m.email && <span style={{ fontSize: 12, color: TEXT3 }}>{m.email}</span>}
                  {m.course && <span style={{ fontSize: 12, color: TEXT3 }}>{m.course} {m.level ? `· L${m.level}` : ""}</span>}
                  {m.branch && <span style={{ fontSize: 12, color: TEXT3 }}>{m.branch}</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>{m.total_points} pts</span>
                {m.current_streak > 0 && (
                  <span style={{ fontSize: 11, color: "#F97316" }}>🔥 {m.current_streak}d</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ org }: { org: OrgResponse }) {
  const items: { icon: React.ElementType; label: string; value: string | null | undefined }[] = [
    { icon: Mail, label: "Email", value: org.contact_email },
    { icon: Phone, label: "Phone", value: org.contact_phone },
    { icon: MapPin, label: "City", value: org.city },
    { icon: Globe, label: "Website", value: org.website_url },
    { icon: BookOpen, label: "Address", value: org.address },
    { icon: Hash, label: "Prefix", value: org.id_prefix },
    { icon: Zap, label: "Tier", value: TIER_LABELS[org.subscription_tier] ?? org.subscription_tier },
    { icon: Users, label: "Max Students", value: String(org.max_students) },
    { icon: Clock, label: "Created", value: fmt(org.created_at) },
  ];

  return (
    <div>
      {org.description && (
        <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>About</div>
          <p style={{ fontSize: 14, color: TEXT2, lineHeight: 1.6, margin: 0 }}>{org.description}</p>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {items.filter((i) => i.value).map(({ icon: Icon, label, value }) => (
          <div key={label} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Icon style={{ width: 13, height: 13, color: "#a78bfa" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
            </div>
            <div style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ org, onUpdated }: { org: OrgResponse; onUpdated: () => void }) {
  const [showEdit, setShowEdit] = useState(false);
  const qc = useQueryClient();

  const { mutate: doVerify, isPending: verifying } = useMutation({
    mutationFn: () => verifyOrg(org.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-org", org.id] });
      onUpdated();
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Edit org */}
      <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Organization Details</div>
            <div style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>Edit name, contact information, and description</div>
          </div>
          <button onClick={() => setShowEdit(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Edit2 style={{ width: 13, height: 13 }} />Edit
          </button>
        </div>
      </div>

      {/* Verify org */}
      {!org.is_verified && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#F59E0B" }}>Verify Organization</div>
              <div style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>Mark this org as verified to unlock premium features and trust indicators</div>
            </div>
            <button onClick={() => doVerify()} disabled={verifying} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: verifying ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#F59E0B", fontSize: 13, fontWeight: 700, cursor: verifying ? "not-allowed" : "pointer" }}>
              {verifying ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <BadgeCheck style={{ width: 13, height: 13 }} />}
              Verify Now
            </button>
          </div>
        </div>
      )}

      {org.is_verified && (
        <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <BadgeCheck style={{ width: 18, height: 18, color: "#22C55E" }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#22C55E" }}>Organization is Verified</div>
            <div style={{ fontSize: 12, color: TEXT3, marginTop: 1 }}>Verified on {fmt(org.updated_at)}</div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditOrgModal
          org={org}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onUpdated(); }}
        />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminOrgDetail() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/admin/orgs/:id");
  const orgId = params?.id ?? "";
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAdmin) setLocation("/admin");
  }, [isAdmin, setLocation]);

  const {
    data: org, isLoading, isError, refetch,
  } = useQuery({
    queryKey: ["admin-org", orgId],
    queryFn: () => getOrg(orgId),
    staleTime: 30_000,
    enabled: isAdmin && !!orgId,
  });

  if (!match) return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "members", label: "Members", icon: Users },
    { id: "invite-links", label: "Invite Links", icon: Link2 },
    { id: "settings", label: "Settings", icon: Edit2 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: 80 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <Loader2 style={{ width: 36, height: 36, color: "#7C3AED", animation: "spin 1s linear infinite" }} />
        </div>
      ) : isError || !org ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12 }}>
          <AlertCircle style={{ width: 40, height: 40, color: "#EF4444" }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>Organization not found</div>
          <Link href="/admin/orgs"><button style={{ padding: "8px 20px", borderRadius: 10, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontSize: 13, cursor: "pointer" }}>← Back to Organizations</button></Link>
        </div>
      ) : (
        <>
          {/* Hero section */}
          <div style={{
            background: "linear-gradient(180deg, rgba(124,58,237,0.1) 0%, transparent 100%)",
            borderBottom: `1px solid ${BORDER}`, padding: "28px 32px 0",
          }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
              {/* Breadcrumb */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13 }}>
                <Link href="/admin"><button style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: TEXT3, cursor: "pointer", padding: "4px 8px", borderRadius: 6 }}><ChevronLeft style={{ width: 14, height: 14 }} />Admin</button></Link>
                <span style={{ color: TEXT3 }}>/</span>
                <Link href="/admin/orgs"><button style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", padding: "4px 8px", borderRadius: 6 }}>Organizations</button></Link>
                <span style={{ color: TEXT3 }}>/</span>
                <span style={{ color: "#a78bfa", fontWeight: 600 }}>{org.name}</span>
              </div>

              {/* Org info */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
                <OrgAvatar name={org.name} size={64} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                    <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {org.name}
                    </h1>
                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 6, padding: "3px 10px" }}>
                      {org.id_prefix}
                    </span>
                    <TierBadge tier={org.subscription_tier} />
                    {org.is_verified ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#22C55E", fontWeight: 700 }}>
                        <BadgeCheck style={{ width: 13, height: 13 }} />VERIFIED
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#F59E0B", fontWeight: 700 }}>
                        <Clock style={{ width: 13, height: 13 }} />PENDING VERIFICATION
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {org.city && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: TEXT3 }}><MapPin style={{ width: 12, height: 12 }} />{org.city}</span>}
                    {org.contact_email && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: TEXT3 }}><Mail style={{ width: 12, height: 12 }} />{org.contact_email}</span>}
                    {org.website_url && <a href={org.website_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#3B82F6", textDecoration: "none" }}><ExternalLink style={{ width: 12, height: 12 }} />{org.website_url}</a>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => refetch()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT3, fontSize: 12, cursor: "pointer" }}>
                    <RefreshCw style={{ width: 13, height: 13 }} />Refresh
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 2, paddingBottom: 0 }}>
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
                      borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: activeTab === id ? 700 : 600,
                      background: activeTab === id ? CARD : "transparent",
                      color: activeTab === id ? TEXT : TEXT3,
                      borderTop: activeTab === id ? `1.5px solid rgba(124,58,237,0.4)` : "1.5px solid transparent",
                      borderLeft: activeTab === id ? `1.5px solid ${BORDER_MED}` : "1.5px solid transparent",
                      borderRight: activeTab === id ? `1.5px solid ${BORDER_MED}` : "1.5px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <Icon style={{ width: 13, height: 13 }} />{label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab content */}
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px" }}>
            {activeTab === "overview" && <OverviewTab org={org} />}
            {activeTab === "members" && <MembersTab org={org} />}
            {activeTab === "invite-links" && <InviteLinksTab org={org} />}
            {activeTab === "settings" && <SettingsTab org={org} onUpdated={() => qc.invalidateQueries({ queryKey: ["admin-org", orgId] })} />}
          </div>
        </>
      )}
    </div>
  );
}
