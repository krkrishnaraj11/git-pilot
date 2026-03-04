import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppStore } from "@/stores/app-store";
import type { DbIdentity } from "@/stores/types";
import { IdentityRuleEditor } from "./IdentityRuleEditor";

const COLOR_SWATCHES = [
  "#8B5CF6",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
];

function generateId() {
  return crypto.randomUUID();
}

function emptyIdentity(): DbIdentity {
  return {
    id: generateId(),
    label: "",
    git_name: "",
    git_email: "",
    color: COLOR_SWATCHES[0],
    ssh_key_path: null,
    gpg_key_id: null,
    is_strict: false,
    created_at: new Date().toISOString(),
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 18px",
  fontSize: "14px",
  background: "var(--color-gp-surface-1)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "10px",
  color: "var(--color-gp-text)",
  outline: "none",
  transition: "border-color 0.15s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 700,
  color: "var(--color-gp-text-secondary)",
  marginBottom: "8px",
};

export function IdentityManager() {
  const open = useAppStore((s) => s.identityManagerOpen);
  const setOpen = useAppStore((s) => s.setIdentityManagerOpen);
  const editingIdentity = useAppStore((s) => s.editingIdentity);
  const setEditingIdentity = useAppStore((s) => s.setEditingIdentity);
  const saveIdentity = useAppStore((s) => s.saveIdentity);
  const deleteIdentityAction = useAppStore((s) => s.deleteIdentity);
  const dbIdentities = useAppStore((s) => s.dbIdentities);
  const loadDbIdentities = useAppStore((s) => s.loadDbIdentities);
  const scannedIdentities = useAppStore((s) => s.identities);

  const [form, setForm] = useState<DbIdentity>(emptyIdentity());
  const [showList, setShowList] = useState(true);

  useEffect(() => {
    if (open) {
      loadDbIdentities();
      if (editingIdentity) {
        setForm(editingIdentity);
        setShowList(false);
      } else {
        setForm(emptyIdentity());
        setShowList(true);
      }
    }
  }, [open, editingIdentity]);

  const handleSave = async () => {
    if (!form.label.trim() || !form.git_name.trim() || !form.git_email.trim())
      return;
    await saveIdentity(form);
    setShowList(true);
    setEditingIdentity(null);
  };

  const handleDelete = async () => {
    await deleteIdentityAction(form.id);
    setShowList(true);
    setEditingIdentity(null);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIdentity(null);
  };

  const startEditing = (identity: DbIdentity) => {
    setForm(identity);
    setShowList(false);
  };

  const startNew = () => {
    setForm(emptyIdentity());
    setShowList(false);
  };

  // Deduplicated scanned identities (by name+email)
  const localIdentities = scannedIdentities.filter(
    (si) =>
      !dbIdentities.some(
        (db) => db.git_name === si.git_name && db.git_email === si.git_email
      )
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            zIndex: 50,
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "640px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            background: "var(--color-gp-bg)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            zIndex: 50,
            animation: "spotlightIn 0.2s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px 28px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "var(--color-gp-surface-1)",
              borderRadius: "20px 20px 0 0",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <Dialog.Title style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-gp-text)", letterSpacing: "-0.02em" }}>
                  {showList ? "Identity Manager" : editingIdentity ? "Edit Identity" : "New Identity"}
                </Dialog.Title>
                <Dialog.Description style={{ fontSize: "13px", color: "var(--color-gp-text-tertiary)", marginTop: "6px" }}>
                  {showList
                    ? "Manage your Git identities and matching rules"
                    : "Configure identity details and auto-matching rules"}
                </Dialog.Description>
              </div>
              <Dialog.Close
                style={{
                  padding: "8px",
                  borderRadius: "10px",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-gp-text-tertiary)",
                  cursor: "pointer",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Dialog.Close>
            </div>
          </div>

          <div style={{ padding: "24px 28px", flex: 1, overflowY: "auto" }}>
            {showList ? (
              <div>
                {/* ── Scanned (Local) Identities ── */}
                {localIdentities.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-gp-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>
                      Detected from Repos ({localIdentities.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {localIdentities.map((si) => (
                        <div
                          key={si.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                            padding: "14px 20px",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.04)",
                            borderRadius: "12px",
                            opacity: 0.6,
                          }}
                        >
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              background: si.color + "15",
                              border: `1px solid ${si.color}25`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={si.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-gp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {si.git_name || "Unknown"}
                            </div>
                            <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {si.git_email || "no email"}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-gp-text-tertiary)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: "6px" }}>
                              {si.repos.length} repo{si.repos.length !== 1 ? "s" : ""}
                            </span>
                            <span
                              style={{
                                fontSize: "9px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: "var(--color-gp-text-tertiary)",
                                background: "rgba(255,255,255,0.04)",
                                padding: "3px 8px",
                                borderRadius: "6px",
                              }}
                            >
                              Local
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Configured Identities ── */}
                <div style={{ marginBottom: "20px" }}>
                  {dbIdentities.length > 0 && (
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-gp-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "10px" }}>
                      Configured ({dbIdentities.length})
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {dbIdentities.length === 0 && localIdentities.length === 0 && (
                      <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "14px", color: "var(--color-gp-text-tertiary)" }}>
                        No identities configured yet
                      </div>
                    )}
                    {dbIdentities.map((id) => (
                      <button
                        key={id.id}
                        onClick={() => startEditing(id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          padding: "14px 20px",
                          background: "var(--color-gp-card)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "12px",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            background: id.color + "15",
                            border: `1px solid ${id.color}25`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: id.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-gp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {id.label}
                          </div>
                          <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)", marginTop: "2px" }}>
                            {id.git_name} &lt;{id.git_email}&gt;
                          </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gp-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startNew}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "14px 20px",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#8B5CF6",
                    background: "rgba(139, 92, 246, 0.08)",
                    border: "1px solid rgba(139, 92, 246, 0.15)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>+</span>
                  Add Identity
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Label */}
                <div>
                  <label style={labelStyle}>Label</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="e.g. Work, Personal, Open Source"
                    style={inputStyle}
                  />
                </div>

                {/* Git name + email */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Git Name</label>
                    <input
                      type="text"
                      value={form.git_name}
                      onChange={(e) => setForm({ ...form, git_name: e.target.value })}
                      placeholder="John Doe"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Git Email</label>
                    <input
                      type="email"
                      value={form.git_email}
                      onChange={(e) => setForm({ ...form, git_email: e.target.value })}
                      placeholder="john@example.com"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Color swatches */}
                <div>
                  <label style={labelStyle}>Color</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {COLOR_SWATCHES.map((color) => (
                      <button
                        key={color}
                        onClick={() => setForm({ ...form, color })}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: color,
                          border: "none",
                          cursor: "pointer",
                          outline: form.color === color ? `2px solid ${color}` : "2px solid transparent",
                          outlineOffset: "3px",
                          transition: "outline 0.15s ease",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* SSH key + GPG key */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>SSH Key Path</label>
                    <input
                      type="text"
                      value={form.ssh_key_path || ""}
                      onChange={(e) => setForm({ ...form, ssh_key_path: e.target.value || null })}
                      placeholder="~/.ssh/id_ed25519"
                      style={{ ...inputStyle, fontFamily: "monospace" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>GPG Key ID</label>
                    <input
                      type="text"
                      value={form.gpg_key_id || ""}
                      onChange={(e) => setForm({ ...form, gpg_key_id: e.target.value || null })}
                      placeholder="ABCDEF1234567890"
                      style={{ ...inputStyle, fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                {/* Strict toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    background: "var(--color-gp-surface-1)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "12px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-gp-text)" }}>Strict Mode</span>
                    <p style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", marginTop: "2px" }}>
                      Warn when repos don't match any rule
                    </p>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, is_strict: !form.is_strict })}
                    style={{
                      width: "44px",
                      height: "24px",
                      borderRadius: "12px",
                      border: "none",
                      cursor: "pointer",
                      background: form.is_strict ? "#8B5CF6" : "var(--color-gp-surface-3)",
                      position: "relative",
                      transition: "background 0.2s ease",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "2px",
                        left: form.is_strict ? "22px" : "2px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.2s ease",
                      }}
                    />
                  </button>
                </div>

                {/* Commit preview */}
                <div
                  style={{
                    padding: "14px 20px",
                    background: "var(--color-gp-surface-1)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "12px",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-gp-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Commit Preview
                  </span>
                  <p style={{ fontSize: "14px", fontFamily: "monospace", color: "var(--color-gp-text)", marginTop: "8px" }}>
                    {form.git_name || "Name"}{" "}
                    <span style={{ color: "var(--color-gp-text-tertiary)" }}>
                      &lt;{form.git_email || "email"}&gt;
                    </span>
                  </p>
                </div>

                {/* Rules editor */}
                <IdentityRuleEditor identityId={form.id} />
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          {!showList && (
            <div
              style={{
                padding: "18px 28px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "var(--color-gp-surface-1)",
                borderRadius: "0 0 20px 20px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => { setShowList(true); setEditingIdentity(null); }}
                  style={{
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--color-gp-text-secondary)",
                    background: "var(--color-gp-surface-2)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  Back
                </button>
                {editingIdentity && (
                  <button
                    onClick={handleDelete}
                    style={{
                      padding: "10px 18px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#EF4444",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "10px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={!form.label.trim() || !form.git_name.trim() || !form.git_email.trim()}
                style={{
                  padding: "10px 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#fff",
                  background: (form.label.trim() && form.git_name.trim() && form.git_email.trim()) ? "#8B5CF6" : "rgba(139,92,246,0.3)",
                  border: "none",
                  borderRadius: "10px",
                  cursor: (form.label.trim() && form.git_name.trim() && form.git_email.trim()) ? "pointer" : "not-allowed",
                  opacity: (form.label.trim() && form.git_name.trim() && form.git_email.trim()) ? 1 : 0.4,
                  boxShadow: "0 4px 16px rgba(139,92,246,0.25)",
                }}
              >
                Save Identity
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
