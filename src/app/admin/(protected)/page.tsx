import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminOverview() {
  const supabase = await createClient();

  // Try to fetch sessions count - will work once tables are created
  let sessionCount = 0;
  let pendingCount = 0;
  let deliveredCount = 0;

  try {
    const { count: total } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true });
    sessionCount = total || 0;

    const { count: pending } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .in("status", ["selection_open", "selection_done"]);
    pendingCount = pending || 0;

    const { count: delivered } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("status", "delivered");
    deliveredCount = delivered || 0;
  } catch {
    // Tables don't exist yet - that's okay
  }

  const stats = [
    { label: "Total Sessions", value: sessionCount.toString(), desc: "All client sessions" },
    { label: "Pending Action", value: pendingCount.toString(), desc: "Awaiting selection or editing" },
    { label: "Delivered", value: deliveredCount.toString(), desc: "Completed sessions" },
  ];

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-1 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.04]"
          >
            <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-6 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] flex flex-col justify-between">
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium mb-6">
                {stat.label}
              </p>
              <div>
                <h3 className="text-3xl md:text-4xl font-heading font-bold tracking-tighter text-white mb-1">
                  {stat.value}
                </h3>
                <p className="text-xs font-medium text-white/30">
                  {stat.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium mb-2">
          [quick actions]
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/sessions/new"
            className="group p-5 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06] hover:ring-white/[0.1] transition-all duration-300"
          >
            <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
              + New Session
            </p>
            <p className="text-xs text-white/30 mt-1">
              Create a new client photo session
            </p>
          </Link>
          <Link
            href="/admin/sessions"
            className="group p-5 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06] hover:ring-white/[0.1] transition-all duration-300"
          >
            <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
              View All Sessions
            </p>
            <p className="text-xs text-white/30 mt-1">
              Manage existing client sessions
            </p>
          </Link>
        </div>
      </div>

      {/* Setup notice */}
      {sessionCount === 0 && (
        <div className="mt-8 p-5 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01]">
          <p className="text-sm text-white/40 font-medium">
            Belum ada session. Buat session pertama untuk mulai mengelola foto klien.
          </p>
          <p className="text-xs text-white/20 mt-2">
            Pastikan tabel database sudah dibuat di Supabase dashboard.
          </p>
        </div>
      )}
    </>
  );
}
