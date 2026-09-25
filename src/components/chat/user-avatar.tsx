import Image from "next/image";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  isOnline?: boolean;
}

const sizeMap = {
  xs: "size-6 text-[11px]",
  sm: "size-9 text-sm",
  md: "size-11 text-base",
  lg: "size-16 text-xl",
  xl: "size-28 text-4xl",
};

const imageSizeMap = {
  xs: 24,
  sm: 36,
  md: 44,
  lg: 64,
  xl: 112,
};

const dotSizeMap = {
  xs: "size-2",
  sm: "size-2.5",
  md: "size-3",
  lg: "size-4",
  xl: "size-5",
};

export function UserAvatar({ name, avatarUrl, size = "md", className, isOnline = false }: UserAvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "bg-gossip/10 text-gossip flex items-center justify-center overflow-hidden rounded-full border border-border/60 font-semibold",
          sizeMap[size],
        )}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${name} avatar`}
            width={imageSizeMap[size]}
            height={imageSizeMap[size]}
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
      </div>
      {isOnline ? (
        <span
          role="img"
          aria-label="Online"
          className={cn(
            "border-background absolute right-0 bottom-0 rounded-full border-2 bg-green-500",
            dotSizeMap[size],
          )}
        />
      ) : null}
    </div>
  );
}
