import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-plum text-ivory hover:bg-plum-strong",
        secondary: "border border-plum/30 bg-paper text-plum hover:border-plum hover:bg-plum-soft",
        sage: "bg-sage-strong text-paper hover:bg-[#46524a]",
        ghost: "text-plum hover:bg-plum-soft",
        danger: "bg-danger text-paper hover:bg-[#7f1624]",
        link: "min-h-0 rounded-none px-0 py-0 text-plum underline underline-offset-4 hover:text-plum-strong",
      },
      size: {
        md: "",
        sm: "min-h-10 px-4 py-2 text-sm",
        lg: "min-h-12 px-6 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
