import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn("flex min-h-svh flex-col bg-background", className)}>{children}</div>
  );
}

interface AppHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function AppHeader({ children, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </header>
  );
}

interface AppMainProps {
  children: React.ReactNode;
  className?: string;
}

export function AppMain({ children, className }: AppMainProps) {
  return (
    <main className={cn("mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8", className)}>
      {children}
    </main>
  );
}

interface AppFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function AppFooter({ children, className }: AppFooterProps) {
  return (
    <footer className={cn("border-t border-border/80 bg-muted/30", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        {children}
      </div>
    </footer>
  );
}
