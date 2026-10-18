import { cn } from "@/lib/utils";

export interface TrayCardProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Elevated card shell for the bottom-right operation tray (menus/modals/tray are the only elevated surfaces). */
export function TrayCard({ className, ...props }: TrayCardProps) {
  return <div className={cn("w-80 rounded-lg border border-border-2 bg-surface shadow-md", className)} {...props} />;
}
