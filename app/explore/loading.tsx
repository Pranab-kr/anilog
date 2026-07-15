export default function ExploreLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md h-14" />

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-28">
        <div className="flex gap-6">
          {/* Sidebar skeleton (desktop) */}
          <div className="hidden lg:flex flex-col w-52 shrink-0 gap-2">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-xl bg-muted/50 animate-pulse"
                style={{ opacity: 1 - i * 0.04 }}
              />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="flex-1 min-w-0">
            {/* Grid skeleton */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-muted/50 animate-pulse">
                  <div className="aspect-[2/3] w-full bg-muted" />
                  <div className="p-2 space-y-1">
                    <div className="h-2.5 bg-muted rounded w-full" />
                    <div className="h-2.5 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
