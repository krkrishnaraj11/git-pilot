import { cn } from "@/lib/utils";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Flat surface container — 8px radius, 1px border. No shadow (Nocturne rule). */
export function Panel({ className, ...props }: PanelProps) {
  return <div className={cn("rounded-lg border border-border bg-surface", className)} {...props} />;
}
