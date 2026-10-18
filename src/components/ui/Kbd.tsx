import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border-2 bg-surface px-1 font-mono text-[10px] leading-none text-muted",
        className
      )}
    >
      {children}
    </kbd>
  );
}
