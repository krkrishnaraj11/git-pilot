import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors duration-100 select-none disabled:opacity-45 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        /* Primary is accent-outlined, never filled (Nocturne rule) */
        primary: "border-accent-600 text-accent-text hover:bg-accent-tint",
        secondary: "border-border-2 bg-surface-2 text-muted-2 hover:bg-surface-3 hover:text-text",
        ghost: "border-transparent text-muted-2 hover:bg-surface-3 hover:text-text",
        danger: "border-error/50 text-error hover:bg-tint-error",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-8 px-3.5 text-[13px]",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
