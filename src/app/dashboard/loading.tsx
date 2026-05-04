export default function DashboardLoading() {
  return (
    <div className="relative flex min-h-screen">
      {/* Sidebar skeleton */}
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

      {/* Main content skeleton */}
      <main className="flex-1 min-w-0 pt-[64px] lg:pt-0">
        <div className="px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          {/* Topbar skeleton */}
          <div className="mb-6 flex items-center justify-between border-b border-[var(--sg-line)] pb-5">
            <div className="flex items-center gap-3">
              <div className="h-5 w-24 bg-[var(--sg-panel-2)] animate-pulse" />
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 w-16 bg-[var(--sg-panel-2)] animate-pulse" />
                ))}
              </div>
            </div>
            <div className="h-4 w-32 bg-[var(--sg-panel-2)] animate-pulse" />
          </div>

          {/* KPI cards skeleton */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[120px] bg-[var(--sg-panel-2)] animate-pulse" />
            ))}
          </div>

          {/* Chart skeleton */}
          <div className="sg-panel p-5 mb-6">
            <div className="h-5 w-48 bg-[var(--sg-panel-2)] animate-pulse mb-4" />
            <div className="h-[240px] bg-[var(--sg-panel-2)] animate-pulse" />
          </div>

          {/* Table skeleton */}
          <div className="sg-panel">
            <div className="p-4 border-b border-[var(--sg-line)]">
              <div className="h-5 w-32 bg-[var(--sg-panel-2)] animate-pulse" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 border-b border-[var(--sg-line)] bg-[var(--sg-panel-2)] animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
