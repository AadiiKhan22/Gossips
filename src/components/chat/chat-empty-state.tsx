import { Search } from "lucide-react";

import { GossipsLogo } from "@/components/brand/gossips-logo";
import { cn } from "@/lib/utils";

interface ChatEmptyStateProps {
  className?: string;
  compact?: boolean;
}

export function ChatEmptyState({ className, compact = false }: ChatEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-10" : "flex-1 py-16",
        className,
      )}
    >
      <GossipsLogo size={compact ? "lg" : "xl"} showText={false} className="mb-4" />
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
        {compact ? "No chats yet" : "Welcome to Gossips"}
      </h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
        {compact
          ? "Start a new chat or create a group."
          : "More Chats · More Moments"}
      </p>
    </div>
  );
}

export function ChatSearchEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Search className="text-muted-foreground mb-3 size-8" strokeWidth={1.75} />
      <p className="text-sm font-medium">No chats found</p>
      <p className="text-muted-foreground mt-1 text-xs">Try a different search term.</p>
    </div>
  );
}
