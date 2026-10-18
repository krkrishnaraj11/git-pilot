import { cn } from "@/lib/utils";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
}

export function IconButton({ className, size = "md", ...props }: IconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-transparent text-muted-2 transition-colors duration-100 hover:bg-surface-3 hover:text-text disabled:opacity-45 disabled:pointer-events-none",
        size === "sm" ? "h-7 w-7" : "h-8 w-8",
        className
      )}
      {...props}
    />
  );
}
