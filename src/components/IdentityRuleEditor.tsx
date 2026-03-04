import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/app-store";
import type { IdentityRule } from "@/stores/types";

const RULE_TYPES = [
  { value: "path_prefix", label: "Path Prefix" },
  { value: "remote_domain", label: "Remote Domain" },
  { value: "remote_org", label: "Remote Org" },
] as const;

interface IdentityRuleEditorProps {
  identityId: string;
}

export function IdentityRuleEditor({ identityId }: IdentityRuleEditorProps) {
  const deleteRuleAction = useAppStore((s) => s.deleteRule);

  const [rules, setRules] = useState<IdentityRule[]>([]);
  const [newType, setNewType] = useState<IdentityRule["rule_type"]>("path_prefix");
  const [newValue, setNewValue] = useState("");
  const [newPriority, setNewPriority] = useState(10);

  const loadRules = async () => {
    try {
      const result = await invoke<IdentityRule[]>("get_rules_for_identity", {
        identityId,
      });
      setRules(result);
    } catch {
      // Identity might not be saved yet
      setRules([]);
    }
  };

  useEffect(() => {
    loadRules();
  }, [identityId]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    const rule: IdentityRule = {
      id: crypto.randomUUID(),
      identity_id: identityId,
      rule_type: newType,
      value: newValue.trim(),
      priority: newPriority,
    };
    try {
      await invoke("save_rule", { rule });
      setNewValue("");
      await loadRules();
    } catch (e) {
      console.error("Failed to save rule:", e);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRuleAction(id);
    await loadRules();
  };

  return (
    <div>
      <label className="block text-[13px] font-bold text-gp-text-secondary mb-3">
        Auto-Match Rules
      </label>

      {/* Existing rules */}
      {rules.length > 0 && (
        <div className="space-y-2 mb-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 px-5 py-3.5 bg-gp-surface-1 border border-gp-border rounded-xl"
            >
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-gp-purple/15 text-gp-purple shrink-0">
                {rule.rule_type.replace("_", " ")}
              </span>
              <span className="flex-1 text-[13px] font-mono text-gp-text truncate">
                {rule.value}
              </span>
              <span className="text-[12px] text-gp-text-tertiary shrink-0 font-mono">
                p:{rule.priority}
              </span>
              <button
                onClick={() => handleDelete(rule.id)}
                className="p-1.5 rounded-lg text-gp-text-tertiary hover:text-gp-danger hover:bg-gp-danger/10 transition-all shrink-0"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new rule */}
      <div className="flex items-center gap-3">
        <select
          value={newType}
          onChange={(e) =>
            setNewType(e.target.value as IdentityRule["rule_type"])
          }
          className="px-4 py-3 text-[13px] bg-gp-surface-1 border border-gp-border rounded-xl text-gp-text focus:outline-none focus:border-gp-purple/50"
        >
          {RULE_TYPES.map((rt) => (
            <option key={rt.value} value={rt.value}>
              {rt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={
            newType === "path_prefix"
              ? "/Users/me/work"
              : newType === "remote_domain"
                ? "github.com"
                : "my-org"
          }
          className="flex-1 px-4 py-3 text-[13px] font-mono bg-gp-surface-1 border border-gp-border rounded-xl text-gp-text placeholder:text-gp-text-tertiary focus:outline-none focus:border-gp-purple/50"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <input
          type="number"
          value={newPriority}
          onChange={(e) => setNewPriority(Number(e.target.value))}
          className="w-16 px-3 py-3 text-[13px] font-mono bg-gp-surface-1 border border-gp-border rounded-xl text-gp-text text-center focus:outline-none focus:border-gp-purple/50"
          title="Priority (higher = checked first)"
        />
        <button
          onClick={handleAdd}
          disabled={!newValue.trim()}
          className="px-5 py-3 text-[13px] font-bold text-gp-purple bg-gp-purple/10 border border-gp-purple/20 rounded-xl hover:bg-gp-purple/15 transition-colors disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
