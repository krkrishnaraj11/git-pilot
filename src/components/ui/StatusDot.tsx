import { cn } from "@/lib/utils";

const tones = {
  ok: "bg-ok",
  warn: "bg-changed",
  error: "bg-error",
  info: "bg-staged",
  accent: "bg-accent",
  muted: "bg-muted",
} as const;

export type StatusDotTone = keyof typeof tones;

export function StatusDot({ tone, className }: { tone: StatusDotTone; className?: string }) {
  return <span aria-hidden className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", tones[tone], className)} />;
}
