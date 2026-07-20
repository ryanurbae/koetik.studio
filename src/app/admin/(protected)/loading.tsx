function Skeleton({ className }: { className: string }) {
  return <div className={`bg-white/[0.06] ${className}`} aria-hidden="true" />;
}

export default function AdminLoading() {
  return (
    <div
      className="motion-safe:animate-pulse"
      role="status"
      aria-live="polite"
      aria-label="Memuat halaman admin"
    >
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-6 w-48 rounded-md" />
        </div>
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="min-h-36 rounded-2xl bg-white/[0.025] p-6 ring-1 ring-white/[0.05]"
          >
            <Skeleton className="mb-8 h-3 w-24 rounded" />
            <Skeleton className="mb-3 h-9 w-16 rounded-md" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      <span className="sr-only">Memuat halaman admin</span>
    </div>
  );
}
