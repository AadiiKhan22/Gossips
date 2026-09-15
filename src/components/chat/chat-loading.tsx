import { cn } from "@/lib/utils";

function ChatListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="bg-muted size-11 shrink-0 animate-pulse rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="bg-muted h-3.5 w-2/5 animate-pulse rounded" />
        <div className="bg-muted h-3 w-4/5 animate-pulse rounded" />
      </div>
    </div>
  );
}

interface ChatLoadingProps {
  count?: number;
  className?: string;
}

export function ChatLoading({ count = 6, className }: ChatLoadingProps) {
  return (
    <div className={cn("divide-y divide-border/60", className)} aria-busy="true" aria-label="Loading chats">
      {Array.from({ length: count }).map((_, index) => (
        <ChatListItemSkeleton key={index} />
      ))}
    </div>
  );
}

export function ChatSidebarLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border/70 p-4">
        <div className="bg-muted h-9 animate-pulse rounded-md" />
        <div className="flex gap-2">
          <div className="bg-muted h-9 flex-1 animate-pulse rounded-md" />
          <div className="bg-muted h-9 flex-1 animate-pulse rounded-md" />
        </div>
      </div>
      <ChatLoading className="flex-1 overflow-hidden" />
    </div>
  );
}
