import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-[#2691F0] text-white hover:bg-[#041635] shadow-lg shadow-blue-500/20",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
        outline: "border-2 border-white/20 text-white hover:bg-white/10",
        secondary: "bg-[#041635] text-white hover:bg-[#0F172A] shadow-lg shadow-navy-500/20",
        ghost: "hover:bg-white/10 text-white",
        link: "text-[#2691F0] underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-[#2691F0] to-[#041635] text-white hover:opacity-90 shadow-xl",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-md px-3",
        lg: "h-14 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
