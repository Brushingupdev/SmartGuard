export default function HistorialLoading() {
  return (
    <div className="relative flex min-h-screen">
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col border-r border-[var(--sg-line)] bg-[var(--sg-canvas-2)]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--sg-line)]">
          <div className="h-7 w-7 bg-[var(--sg-panel-2)] animate-pulse" />
          <div className="h-4 w-32 bg-[var(--sg-panel-2)] animate-pulse" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-[var(--sg-panel-2)] animate-pulse" />
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 pt-[64px] lg:pt-0">
        <div className="px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          {/* Header skeleton */}
          <div className="mb-6 border-b border-[var(--sg-line)] pb-5">
            <div className="h-6 w-48 bg-[var(--sg-panel-2)] animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[var(--sg-panel-2)] animate-pulse" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[var(--sg-panel-2)] animate-pulse" />
            ))}
          </div>

          {/* Filters skeleton */}
          <div className="flex gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-32 bg-[var(--sg-panel-2)] animate-pulse" />
            ))}
          </div>

          {/* Table skeleton */}
          <div className="sg-panel">
            <div className="p-4 border-b border-[var(--sg-line)]">
              <div className="h-5 w-40 bg-[var(--sg-panel-2)] animate-pulse" />
            </div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 border-b border-[var(--sg-line)] bg-[var(--sg-panel-2)] animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
