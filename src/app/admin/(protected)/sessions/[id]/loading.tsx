function Skeleton({ className }: { className: string }) {
  return <div className={`bg-white/[0.06] ${className}`} aria-hidden="true" />;
}

export default function SessionDetailLoading() {
  return (
    <div
      className="motion-safe:animate-pulse"
      role="status"
      aria-live="polite"
      aria-label="Memuat detail sesi"
    >
      <Skeleton className="mb-5 h-3 w-24 rounded" />
      <div className="mb-10 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-7 w-52 rounded-md" />
          <Skeleton className="h-3 w-72 max-w-full rounded" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>

      {Array.from({ length: 3 }, (_, sectionIndex) => (
        <div key={sectionIndex} className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
          <div className="flex h-24 gap-2 overflow-hidden rounded-xl bg-white/[0.025] p-2 ring-1 ring-white/[0.05]">
            {Array.from({ length: 7 }, (_, photoIndex) => (
              <Skeleton
                key={photoIndex}
                className="h-20 w-20 shrink-0 rounded-lg sm:w-24"
              />
            ))}
          </div>
        </div>
      ))}

      <span className="sr-only">Memuat detail sesi</span>
    </div>
  );
}
