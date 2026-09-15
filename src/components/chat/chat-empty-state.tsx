import { MessageCircle, Search } from "lucide-react";

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
      <div className="bg-gossip/10 text-gossip mb-4 flex size-16 items-center justify-center rounded-2xl">
        <MessageCircle className="size-8" strokeWidth={1.75} />
      </div>
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
        {compact ? "No chats yet" : "Welcome to Gossips"}
      </h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
        {compact
          ? "Start a new chat or create a group when messaging arrives in Phase 4."
          : "Select a conversation from the sidebar or start a new chat. Messaging connects in Phase 4."}
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
