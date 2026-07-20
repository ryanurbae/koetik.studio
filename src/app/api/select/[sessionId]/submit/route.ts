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

    const uniqueSelectedPhotoIds = [
      ...new Set(
        selectedPhotoIds.filter(
          (photoId): photoId is string => typeof photoId === "string"
        )
      ),
    ];

    if (uniqueSelectedPhotoIds.length !== selectedPhotoIds.length) {
      return NextResponse.json(
        { error: "Pilihan foto tidak valid" },
        { status: 400 }
      );
    }

    // Validate selection count
    if (uniqueSelectedPhotoIds.length > session.max_selections) {
      return NextResponse.json(
        {
          error: `Maksimal ${session.max_selections} foto. Kamu memilih ${uniqueSelectedPhotoIds.length}.`,
        },
        { status: 400 }
      );
    }

    if (uniqueSelectedPhotoIds.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal 1 foto" },
        { status: 400 }
      );
    }

    const { data: rawPhotos, error: rawPhotosError } = await supabase
      .from("raw_photos")
      .select("id, storage_path")
      .eq("session_id", sessionId);

    if (rawPhotosError) {
      console.error("Raw photo lookup error:", rawPhotosError);
      return NextResponse.json(
        { error: "Gagal memvalidasi pilihan foto" },
        { status: 500 }
      );
    }

    const sessionPhotoIds = new Set((rawPhotos || []).map((photo) => photo.id));
    if (uniqueSelectedPhotoIds.some((photoId) => !sessionPhotoIds.has(photoId))) {
      return NextResponse.json(
        { error: "Ada foto yang bukan milik sesi ini" },
        { status: 400 }
      );
    }

    // Delete old selections
    const { error: deleteSelectionsError } = await supabase
      .from("photo_selections")
      .delete()
      .eq("session_id", sessionId);

    if (deleteSelectionsError) {
      console.error("Selection reset error:", deleteSelectionsError);
      return NextResponse.json(
        { error: "Gagal memperbarui pilihan" },
        { status: 500 }
      );
    }

    // Insert new selections
    const insertData = uniqueSelectedPhotoIds.map((photoId) => ({
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

    // Remove unselected raw photos from storage and database in retry-safe batches.
    const selectedPhotoIdSet = new Set(uniqueSelectedPhotoIds);
    const unselectedPhotos = (rawPhotos || []).filter(
      (photo) => !selectedPhotoIdSet.has(photo.id)
    );
    const CLEANUP_BATCH_SIZE = 100;

    for (let index = 0; index < unselectedPhotos.length; index += CLEANUP_BATCH_SIZE) {
      const batch = unselectedPhotos.slice(index, index + CLEANUP_BATCH_SIZE);
      const { error: storageDeleteError } = await supabase.storage
        .from("raw-photos")
        .remove(batch.map((photo) => photo.storage_path));

      if (storageDeleteError) {
        console.error("Raw storage cleanup error:", storageDeleteError);
        return NextResponse.json(
          { error: "Gagal membersihkan foto raw. Coba kirim lagi." },
          { status: 500 }
        );
      }

      const { error: metadataDeleteError } = await supabase
        .from("raw_photos")
        .delete()
        .eq("session_id", sessionId)
        .in("id", batch.map((photo) => photo.id));

      if (metadataDeleteError) {
        console.error("Raw metadata cleanup error:", metadataDeleteError);
        return NextResponse.json(
          { error: "Gagal membersihkan data foto raw. Coba kirim lagi." },
          { status: 500 }
        );
      }
    }

    // Update session status
    const { error: sessionUpdateError } = await supabase
      .from("sessions")
      .update({
        status: "selection_done",
        selection_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (sessionUpdateError) {
      console.error("Session completion error:", sessionUpdateError);
      return NextResponse.json(
        { error: "Pilihan tersimpan, tetapi status sesi gagal diperbarui. Coba kirim lagi." },
        { status: 500 }
      );
    }

    // Generate WA message
    const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";
    const message = `Halo koetik.studio! 👋\n\nSaya ${session.client_name}, sudah selesai memilih ${uniqueSelectedPhotoIds.length} foto untuk diedit.\n\nTerima kasih!`;
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      success: true,
      selectedCount: uniqueSelectedPhotoIds.length,
      waUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
