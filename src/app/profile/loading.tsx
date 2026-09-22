export default function ProfileLoading() {
  return (
    <div className="bg-background min-h-svh">
      <div className="border-b border-border/80 h-14" />
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        <div className="bg-muted h-20 w-full animate-pulse rounded-xl" />
        <div className="bg-muted h-96 w-full animate-pulse rounded-xl" />
      </main>
    </div>
  );
}
