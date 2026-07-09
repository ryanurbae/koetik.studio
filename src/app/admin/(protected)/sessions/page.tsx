import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Session = {
  id: string;
  client_name: string;
  client_university?: string | null;
  client_whatsapp?: string | null;
  graduation_date?: string | null;
  package_type: string;
  max_selections: number;
  status: "draft" | "raw_uploaded" | "selection_open" | "selection_done" | "editing" | "delivered";
  created_at: string;
};

const statusColors: Record<string, string> = {
  draft: "bg-white/10 text-white/60 ring-white/10",
  raw_uploaded: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  selection_open: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  selection_done: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
  editing: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  raw_uploaded: "Raw Uploaded",
  selection_open: "Selection Open",
  selection_done: "Selection Done",
  editing: "Editing",
  delivered: "Delivered",
};

export default async function SessionsPage() {
  const supabase = await createClient();

  let sessions: Session[] = [];
  try {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });
    sessions = (data as Session[]) || [];
  } catch {
    // Table might not exist yet
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">
          [all sessions]
        </p>
        <Link
          href="/admin/sessions/new"
          className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold uppercase tracking-[0.08em] hover:bg-white/90 transition-colors"
        >
          + New Session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
          <p className="text-white/40 text-sm font-medium mb-2">
            Belum ada session
          </p>
          <p className="text-white/20 text-xs mb-6">
            Buat session pertama untuk mulai mengelola foto klien
          </p>
          <Link
            href="/admin/sessions/new"
            className="px-6 py-3 rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] text-sm font-medium text-white/70 hover:bg-white/[0.1] transition-colors"
          >
            Buat Session
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/admin/sessions/${session.id}`}
              className="group p-1 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.04] hover:ring-white/[0.08] transition-all duration-300"
            >
              <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] group-hover:bg-[#0c0c0c] transition-colors duration-500">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-[11px] font-semibold text-white/30 ring-1 ring-white/[0.04]">
                    {session.client_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium tracking-tight text-white/90 mb-0.5">
                      {session.client_name}
                    </h4>
                    <p className="text-xs text-white/30">
                      {session.client_university || session.package_type}
                      {session.graduation_date &&
                        ` · ${new Date(session.graduation_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-full ring-1 ${statusColors[session.status] || statusColors.draft}`}
                  >
                    {statusLabels[session.status] || session.status}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/40">
                      <path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
