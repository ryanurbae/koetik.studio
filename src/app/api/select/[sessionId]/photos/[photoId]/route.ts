import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAccessCode } from "@/lib/access-code";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ sessionId: string; photoId: string }>;
  }
) {
  const { sessionId, photoId } = await params;
  const accessCode = request.headers.get("x-access-code");

  if (!accessCode) {
    return NextResponse.json({ error: "Access code required" }, { status: 401 });
  }

  const supabase = createAdminClient();
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

  const { data: photo } = await supabase
    .from("raw_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("session_id", sessionId)
    .single();

  if (!photo) {
    return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
  }

  const storage = supabase.storage.from("raw-photos");
  const { data: preview } = await storage.createSignedUrl(
    photo.storage_path,
    3600,
    {
      transform: {
        width: 2400,
        resize: "contain",
        quality: 85,
      },
    }
  );

  if (preview?.signedUrl) {
    return NextResponse.json({ previewUrl: preview.signedUrl });
  }

  const { data: fallback } = await storage.createSignedUrl(
    photo.storage_path,
    3600
  );

  if (!fallback?.signedUrl) {
    return NextResponse.json(
      { error: "Preview foto gagal dibuat" },
      { status: 500 }
    );
  }

  return NextResponse.json({ previewUrl: fallback.signedUrl });
}
