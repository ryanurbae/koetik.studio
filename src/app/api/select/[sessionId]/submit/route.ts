import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAccessCode } from "@/lib/access-code";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  try {
    const { accessCode, selectedPhotoIds } = await request.json();

    if (!accessCode || !Array.isArray(selectedPhotoIds)) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify session & access code
    const { data: session } = await supabase
      .from("sessions")
      .select(
        "id, access_code, status, selection_expires_at, max_selections, client_name"
      )
      .eq("id", sessionId)
      .single();

    if (!session || !verifyAccessCode(accessCode, session.access_code)) {
      return NextResponse.json({ error: "Invalid access" }, { status: 403 });
    }

    if (session.status !== "selection_open") {
      return NextResponse.json(
        { error: "Selection not open" },
        { status: 403 }
      );
    }

    if (
      session.selection_expires_at &&
      new Date(session.selection_expires_at) < new Date()
    ) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // Validate selection count
    if (selectedPhotoIds.length > session.max_selections) {
      return NextResponse.json(
        {
          error: `Maksimal ${session.max_selections} foto. Kamu memilih ${selectedPhotoIds.length}.`,
        },
        { status: 400 }
      );
    }

    if (selectedPhotoIds.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal 1 foto" },
        { status: 400 }
      );
    }

    // Delete old selections
    await supabase
      .from("photo_selections")
      .delete()
      .eq("session_id", sessionId);

    // Insert new selections
    const insertData = selectedPhotoIds.map((photoId: string) => ({
      session_id: sessionId,
      raw_photo_id: photoId,
    }));

    const { error: insertError } = await supabase
      .from("photo_selections")
      .insert(insertData);

    if (insertError) {
      console.error("Selection insert error:", insertError);
      return NextResponse.json(
        { error: "Gagal menyimpan pilihan" },
        { status: 500 }
      );
    }

    // Update session status
    await supabase
      .from("sessions")
      .update({
        status: "selection_done",
        selection_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Generate WA message
    const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";
    const message = `Halo koetik.studio! 👋\n\nSaya ${session.client_name}, sudah selesai memilih ${selectedPhotoIds.length} foto untuk diedit.\n\nTerima kasih!`;
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      success: true,
      selectedCount: selectedPhotoIds.length,
      waUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
