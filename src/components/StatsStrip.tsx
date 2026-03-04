import { useAppStore, type FilterType } from "@/stores/app-store";

interface StatItemProps {
  label: string;
  value: number;
  color: string;
  filterKey?: FilterType;
  isActive?: boolean;
  onClick?: () => void;
}

function StatItem({ label, value, color, isActive, onClick }: StatItemProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 12px",
        borderRadius: "10px",
        cursor: onClick ? "pointer" : "default",
        background: isActive ? color + "12" : "transparent",
        border: isActive ? `1px solid ${color}25` : "1px solid transparent",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          flexShrink: 0,
          background: color,
          boxShadow: isActive ? `0 0 10px ${color}60` : `0 0 8px ${color}50`,
        }}
      />
      <span
        style={{
          fontSize: "18px",
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          color,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "11px",
          color: isActive ? color : "var(--color-gp-text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 700,
          transition: "color 0.15s ease",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function StatsStrip() {
  const stats = useAppStore((s) => s.stats)();
  const activeFilter = useAppStore((s) => s.activeFilter);
  const setFilter = useAppStore((s) => s.setFilter);

  const items: { label: string; value: number; color: string; filterKey: FilterType }[] = [
    { label: "Repos", value: stats.total, color: "#E8ECF4", filterKey: "all" },
    { label: "Local Changes", value: stats.localChanges, color: "#F59E0B", filterKey: "local_changes" },
    { label: "Committed", value: stats.committed, color: "#8B5CF6", filterKey: "committed" },
    { label: "Pushed", value: stats.pushed, color: "#10B981", filterKey: "pushed" },
    { label: "Clean", value: stats.clean, color: "#5A647A", filterKey: "clean" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "var(--color-gp-surface-1)",
      }}
    >
      {items.map((item, i) => (
        <div key={item.filterKey} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {i > 0 && <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.06)" }} />}
          <StatItem
            label={item.label}
            value={item.value}
            color={item.color}
            isActive={activeFilter === item.filterKey}
            onClick={() => setFilter(item.filterKey)}
          />
        </div>
      ))}
      <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.06)" }} />
      <StatItem label="Identities" value={stats.identityCount} color="#3B82F6" />
    </div>
  );
}
