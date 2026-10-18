import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div role="tablist" className={cn("inline-flex items-center gap-0.5 rounded-md border border-border bg-panel p-0.5", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-[26px] items-center rounded-[5px] px-2.5 text-xs font-medium transition-colors",
              active ? "bg-surface-3 text-text" : "text-muted hover:text-muted-2"
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn("ml-1.5 font-mono text-[10px]", active ? "text-muted-2" : "text-muted")}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
