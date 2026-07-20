import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_PAGE_SIZE = 50;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedOffset = Number(request.nextUrl.searchParams.get("offset"));
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit"));
  const offset = Number.isFinite(requestedOffset)
    ? Math.max(0, Math.floor(requestedOffset))
    : 0;
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(requestedLimit)))
    : 40;

  const { data: photos, count, error } = await supabase
    .from("edited_photos")
    .select("id, filename, storage_path, file_size", { count: "exact" })
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: "Gagal memuat foto edited" },
      { status: 500 }
    );
  }

  const storage = supabase.storage.from("edited-photos");
  const photosWithUrls = (photos || []).map((photo) => {
    const { data: thumbnail } = storage.getPublicUrl(photo.storage_path, {
      transform: {
        width: 420,
        height: 420,
        resize: "cover",
        quality: 70,
      },
    });
    const { data: original } = storage.getPublicUrl(photo.storage_path);

    return {
      ...photo,
      url: thumbnail.publicUrl,
      originalUrl: original.publicUrl,
    };
  });

  const total = count || 0;
  return NextResponse.json({
    photos: photosWithUrls,
    total,
    hasMore: offset + photosWithUrls.length < total,
  });
}
