import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-md border border-border-2 bg-surface px-3 text-[13px] text-text placeholder:text-muted transition-colors focus:border-accent focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
