import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-muted-2",
        accent: "bg-accent-tint text-accent-text",
        ok: "bg-tint-ok text-ok",
        warn: "bg-tint-warn text-changed",
        error: "bg-tint-error text-error",
        info: "bg-tint-info text-staged",
        outline: "border border-accent/60 bg-transparent text-accent",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {}

export function Tag({ className, variant, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant }), className)} {...props} />;
}

export { tagVariants };
