export default function RootLoading() {
  return (
    <div className="bg-background flex h-svh w-full">
      <aside className="border-border/70 w-full space-y-3 border-r p-4 md:w-80 md:shrink-0">
        <div className="bg-muted h-8 w-32 animate-pulse rounded" />
        <div className="bg-muted h-10 w-full animate-pulse rounded-lg" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 py-2">
            <div className="bg-muted size-12 shrink-0 animate-pulse rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="bg-muted h-3.5 w-1/2 animate-pulse rounded" />
              <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </aside>
      <div className="hidden flex-1 md:block" />
    </div>
  );
}
