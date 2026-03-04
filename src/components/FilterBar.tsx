import { useAppStore, type FilterType } from "@/stores/app-store";

interface FilterTab {
  key: FilterType;
  label: string;
  color: string;
}

const FILTERS: FilterTab[] = [
  { key: "all", label: "All Repos", color: "#E8ECF4" },
  { key: "local_changes", label: "Local Changes", color: "#F59E0B" },
  { key: "committed", label: "Committed", color: "#8B5CF6" },
  { key: "pushed", label: "Pushed", color: "#10B981" },
  { key: "clean", label: "Clean", color: "#5A647A" },
];

export function FilterBar() {
  const activeFilter = useAppStore((s) => s.activeFilter);
  const setFilter = useAppStore((s) => s.setFilter);
  const stats = useAppStore((s) => s.stats)();

  const getCount = (key: FilterType): number => {
    switch (key) {
      case "all": return stats.total;
      case "local_changes": return stats.localChanges;
      case "committed": return stats.committed;
      case "pushed": return stats.pushed;
      case "clean": return stats.clean;
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 32px" }}>
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.key;
        const count = getCount(f.key);
        return (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              border: isActive ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
              background: isActive ? "var(--color-gp-surface-2)" : "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                flexShrink: 0,
                background: isActive ? f.color : f.color + "40",
                boxShadow: isActive ? `0 0 8px ${f.color}40` : "none",
              }}
            />
            <span style={{ color: isActive ? "var(--color-gp-text)" : "var(--color-gp-text-secondary)" }}>
              {f.label}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                minWidth: "22px",
                textAlign: "center",
                padding: "2px 7px",
                borderRadius: "6px",
                fontVariantNumeric: "tabular-nums",
                background: isActive ? f.color + "20" : "rgba(255,255,255,0.04)",
                color: isActive ? f.color : "#5A647A",
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
