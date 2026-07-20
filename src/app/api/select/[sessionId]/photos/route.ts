import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAccessCode } from "@/lib/access-code";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const accessCode = request.headers.get("x-access-code");
  const requestedOffset = Number(request.nextUrl.searchParams.get("offset"));
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit"));
  const offset = Number.isFinite(requestedOffset)
    ? Math.max(0, Math.floor(requestedOffset))
    : 0;
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(48, Math.floor(requestedLimit)))
    : 36;

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
  const [
    { data: photos, count: photoCount },
    { data: selections },
  ] = await Promise.all([
    supabase
      .from("raw_photos")
      .select("id, filename, storage_path", { count: "exact" })
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: true })
      .order("uploaded_at", { ascending: true })
      .range(offset, offset + limit - 1),
    supabase
      .from("photo_selections")
      .select("raw_photo_id")
      .eq("session_id", sessionId),
  ]);

  const photoList = photos || [];
  if (photoList.length === 0) {
    return NextResponse.json({
      photos: [],
      selectedIds: (selections || []).map((selection) => selection.raw_photo_id),
      total: photoCount || 0,
      hasMore: false,
    });
  }

  const storage = supabase.storage.from("raw-photos");
  const [fallbackResult, thumbnailResults] = await Promise.all([
    storage.createSignedUrls(
      photoList.map((photo) => photo.storage_path),
      3600
    ),
    Promise.all(
      photoList.map((photo) =>
        storage.createSignedUrl(photo.storage_path, 3600, {
          transform: {
            width: 480,
            height: 480,
            resize: "cover",
            quality: 72,
          },
        })
      )
    ),
  ]);

  const fallbackUrls = new Map(
    (fallbackResult.data || []).map((item) => [item.path, item.signedUrl || ""])
  );
  const photosWithUrls = photoList.map((photo, index) => ({
    id: photo.id,
    filename: photo.filename,
    url:
      thumbnailResults[index]?.data?.signedUrl ||
      fallbackUrls.get(photo.storage_path) ||
      "",
  }));

  return NextResponse.json({
    photos: photosWithUrls,
    selectedIds: (selections || []).map((s) => s.raw_photo_id),
    total: photoCount || 0,
    hasMore: offset + photosWithUrls.length < (photoCount || 0),
  });
}
