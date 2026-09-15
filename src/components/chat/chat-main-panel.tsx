import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { cn } from "@/lib/utils";

interface ChatMainPanelProps {
  className?: string;
}

export function ChatMainPanel({ className }: ChatMainPanelProps) {
  return (
    <section
      className={cn(
        "bg-background relative hidden flex-1 flex-col overflow-hidden lg:flex",
        className,
      )}
    >
      <div className="border-b border-border/70 px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Messages</h2>
        <p className="text-muted-foreground text-sm">Your conversations will appear here.</p>
      </div>
      <ChatEmptyState />
    </section>
  );
}
