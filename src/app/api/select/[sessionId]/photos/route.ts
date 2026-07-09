import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAccessCode } from "@/lib/access-code";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const accessCode = request.headers.get("x-access-code");

  if (!accessCode) {
    return NextResponse.json({ error: "Access code required" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Verify session & access code
  const { data: session } = await supabase
    .from("sessions")
    .select("id, access_code, status, selection_expires_at")
    .eq("id", sessionId)
    .single();

  if (!session || !verifyAccessCode(accessCode, session.access_code)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 403 });
  }

  if (session.status !== "selection_open") {
    return NextResponse.json({ error: "Selection not open" }, { status: 403 });
  }

  if (
    session.selection_expires_at &&
    new Date(session.selection_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Get raw photos with signed URLs
  const { data: photos } = await supabase
    .from("raw_photos")
    .select("id, filename, storage_path")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  const photosWithUrls = await Promise.all(
    (photos || []).map(async (photo) => {
      const { data } = await supabase.storage
        .from("raw-photos")
        .createSignedUrl(photo.storage_path, 3600);
      return {
        id: photo.id,
        filename: photo.filename,
        url: data?.signedUrl || "",
      };
    })
  );

  // Get existing selections
  const { data: selections } = await supabase
    .from("photo_selections")
    .select("raw_photo_id")
    .eq("session_id", sessionId);

  return NextResponse.json({
    photos: photosWithUrls,
    selectedIds: (selections || []).map((s) => s.raw_photo_id),
  });
}
