import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAccessCode } from "@/lib/access-code";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    const { sessionId, accessCode } = await request.json();

    if (!sessionId || !accessCode) {
      return NextResponse.json(
        { error: "Session ID dan access code wajib diisi" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: session, error } = await supabase
      .from("sessions")
      .select(
        "id, client_name, status, access_code, selection_expires_at, max_selections, selection_completed_at, access_attempts, access_locked_until"
      )
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: "Session tidak ditemukan" },
        { status: 404 }
      );
    }

    // Brute-force lock check
    if (
      session.access_locked_until &&
      new Date(session.access_locked_until) > new Date()
    ) {
      const retryAfter = Math.ceil(
        (new Date(session.access_locked_until).getTime() - Date.now()) / 1000
      );
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti." },
        { status: 423, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Verify access code
    if (!verifyAccessCode(accessCode, session.access_code)) {
      const attempts = (session.access_attempts || 0) + 1;
      const lockUntil =
        attempts >= MAX_ATTEMPTS
          ? new Date(Date.now() + LOCK_MINUTES * 60000)
          : null;

      await supabase
        .from("sessions")
        .update({
          access_attempts: attempts,
          access_locked_until: lockUntil ? lockUntil.toISOString() : null,
        })
        .eq("id", sessionId);

      if (lockUntil) {
        return NextResponse.json(
          {
            error: `Terlalu banyak percobaan. Kode terkunci ${LOCK_MINUTES} menit.`,
          },
          {
            status: 423,
            headers: { "Retry-After": String(LOCK_MINUTES * 60) },
          }
        );
      }

      return NextResponse.json({ error: "Access code salah" }, { status: 403 });
    }

    // Correct: reset attempts/lock
    if (session.access_attempts !== 0 || session.access_locked_until) {
      await supabase
        .from("sessions")
        .update({ access_attempts: 0, access_locked_until: null })
        .eq("id", sessionId);
    }

    // Check if selection is still open
    if (session.status !== "selection_open") {
      if (session.selection_completed_at) {
        return NextResponse.json(
          { error: "Pemilihan foto sudah selesai" },
          { status: 410 }
        );
      }
      return NextResponse.json(
        { error: "Link pemilihan belum aktif" },
        { status: 403 }
      );
    }

    // Check expiry
    if (
      session.selection_expires_at &&
      new Date(session.selection_expires_at) < new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "Link sudah expired. Hubungi koetikstudio.my.id untuk link baru.",
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      clientName: session.client_name,
      maxSelections: session.max_selections,
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
