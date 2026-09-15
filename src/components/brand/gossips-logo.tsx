import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface GossipsLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { icon: "size-7", text: "text-lg" },
  md: { icon: "size-9", text: "text-xl" },
  lg: { icon: "size-11", text: "text-2xl" },
};

export function GossipsLogo({
  className,
  showText = true,
  size = "md",
}: GossipsLogoProps) {
  const sizes = sizeMap[size];

  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "gossip-gradient flex items-center justify-center rounded-xl text-gossip-foreground shadow-sm",
          sizes.icon,
        )}
      >
        <MessageCircle className="size-[55%]" strokeWidth={2.25} />
      </span>
      {showText && (
        <span className={cn("font-semibold tracking-tight", sizes.text)}>Gossips</span>
      )}
    </Link>
  );
}
