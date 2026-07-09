"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";


// ============================================
// SESSION ACTIONS
// ============================================

export async function updateSessionStatus(sessionId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/admin/sessions");
  revalidatePath("/admin");
}

export async function deleteSession(sessionId: string) {
  const supabase = await createClient();

  // Delete storage files first
  const { data: rawPhotos } = await supabase
    .from("raw_photos")
    .select("storage_path")
    .eq("session_id", sessionId);

  const { data: editedPhotos } = await supabase
    .from("edited_photos")
    .select("storage_path")
    .eq("session_id", sessionId);

  if (rawPhotos?.length) {
    await supabase.storage
      .from("raw-photos")
      .remove(rawPhotos.map((p) => p.storage_path));
  }
  if (editedPhotos?.length) {
    await supabase.storage
      .from("edited-photos")
      .remove(editedPhotos.map((p) => p.storage_path));
  }

  // Delete session (cascades to photos + selections)
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/sessions");
  revalidatePath("/admin");
  redirect("/admin/sessions");
}

// ============================================
// SELECTION LINK
// ============================================

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function generateSelectionLink(
  sessionId: string,
  expiryDays: number = 7
) {
  const supabase = await createClient();
  const accessCode = generateAccessCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { error } = await supabase
    .from("sessions")
    .update({
      access_code: accessCode,
      selection_expires_at: expiresAt.toISOString(),
      status: "selection_open",
      access_attempts: 0,
      access_locked_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/admin/sessions");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://koetik.studio.my.id";
  return {
    link: `${siteUrl}/select/${sessionId}`,
    accessCode,
    expiresAt: expiresAt.toISOString(),
  };
}

// ============================================
// PHOTO UPLOAD
// ============================================

export async function uploadRawPhotos(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const files = formData.getAll("files") as File[];
  const results = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `${sessionId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("raw-photos")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      continue;
    }

    const { error: dbError } = await supabase.from("raw_photos").insert({
      session_id: sessionId,
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
    });

    if (dbError) {
      console.error("DB error:", dbError);
      continue;
    }

    results.push({ filename: file.name, storagePath });
  }

  // Update session status if first upload
  const { data: session } = await supabase
    .from("sessions")
    .select("status")
    .eq("id", sessionId)
    .single();

  if (session?.status === "draft") {
    await supabase
      .from("sessions")
      .update({ status: "raw_uploaded", updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  revalidatePath(`/admin/sessions/${sessionId}`);
  return { uploaded: results.length, total: files.length };
}

export async function deleteRawPhoto(photoId: string, sessionId: string) {
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("raw_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  if (photo) {
    await supabase.storage.from("raw-photos").remove([photo.storage_path]);
  }

  await supabase.from("raw_photos").delete().eq("id", photoId);
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function uploadEditedPhotos(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const files = formData.getAll("files") as File[];
  const results = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `${sessionId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("edited-photos")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      continue;
    }

    const { error: dbError } = await supabase.from("edited_photos").insert({
      session_id: sessionId,
      filename: file.name,
      storage_path: storagePath,
      file_size: file.size,
    });

    if (dbError) {
      console.error("DB error:", dbError);
      continue;
    }

    results.push({ filename: file.name, storagePath });
  }

  // Update status to editing if needed
  const { data: session } = await supabase
    .from("sessions")
    .select("status")
    .eq("id", sessionId)
    .single();

  if (session?.status === "selection_done") {
    await supabase
      .from("sessions")
      .update({ status: "editing", updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  }

  revalidatePath(`/admin/sessions/${sessionId}`);
  return { uploaded: results.length, total: files.length };
}

export async function deleteEditedPhoto(photoId: string, sessionId: string) {
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("edited_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  if (photo) {
    await supabase.storage.from("edited-photos").remove([photo.storage_path]);
  }

  await supabase.from("edited_photos").delete().eq("id", photoId);
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function uploadGalleryThumbnail(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("file") as File;
  
  if (!file) throw new Error("No file uploaded");

  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `${sessionId}/thumbnail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("edited-photos")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data: photo, error: dbError } = await supabase.from("edited_photos").insert({
    session_id: sessionId,
    filename: file.name,
    storage_path: storagePath,
    file_size: file.size,
  }).select("id").single();

  if (dbError) throw new Error(dbError.message);

  // set it as cover
  const { error: updateError } = await supabase.from("sessions").update({
    gallery_cover_photo_id: photo.id,
    updated_at: new Date().toISOString()
  }).eq("id", sessionId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/admin/sessions/${sessionId}`);
  return photo.id;
}

// ============================================
// GALLERY
// ============================================

// ============================================
// SETTINGS
// ============================================

export async function getSettings() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("studio_settings")
    .select("key, value");

  const settings: Record<string, string> = {};
  (data || []).forEach((row: { key: string; value: string }) => {
    settings[row.key] = row.value;
  });
  return settings;
}

export async function updateSettings(
  updates: { key: string; value: string }[]
) {
  const supabase = await createClient();

  for (const { key, value } of updates) {
    const { error } = await supabase
      .from("studio_settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/settings");
}

// ============================================
// GALLERY
// ============================================

export async function publishGallery(
  sessionId: string,
  slug: string,
  title: string,
  description?: string,
  coverPhotoId?: string,
  showOnPortfolio: boolean = false
) {
  const supabase = await createClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("sessions")
    .select("id")
    .eq("gallery_slug", slug)
    .neq("id", sessionId)
    .single();

  if (existing) {
    throw new Error("Slug sudah digunakan. Pilih nama lain.");
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      gallery_slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      gallery_title: title,
      gallery_description: description || null,
      gallery_cover_photo_id: coverPhotoId || null,
      gallery_published_at: new Date().toISOString(),
      show_on_portfolio: showOnPortfolio,
      status: "delivered",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/admin/sessions");
  revalidatePath("/admin");
}

export async function updatePortfolioVisibility(
  sessionId: string,
  show: boolean
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sessions")
    .update({
      show_on_portfolio: show,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/sessions/${sessionId}`);
  revalidatePath("/admin/sessions");
  revalidatePath("/");
}
