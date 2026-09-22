import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface GossipsLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: { icon: "size-7", text: "text-lg", px: 28 },
  md: { icon: "size-9", text: "text-xl", px: 36 },
  lg: { icon: "size-11", text: "text-2xl", px: 44 },
  xl: { icon: "size-24", text: "text-3xl", px: 96 },
};

export function GossipsLogo({
  className,
  showText = true,
  size = "md",
}: GossipsLogoProps) {
  const sizes = sizeMap[size];

  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("relative flex items-center justify-center shrink-0", sizes.icon)}>
        <Image
          src="/gossips-logo.png"
          alt="Gossips"
          width={sizes.px}
          height={sizes.px}
          className="size-full rounded-xl object-contain dark:hidden"
          priority
        />
        <Image
          src="/gossips-logo-dark.png"
          alt="Gossips"
          width={sizes.px}
          height={sizes.px}
          className="hidden size-full rounded-xl object-contain dark:block"
          priority
        />
      </span>
      {showText && (
        <span className={cn("font-semibold tracking-tight text-gossip", sizes.text)}>
          Gossips
        </span>
      )}
    </Link>
  );
}