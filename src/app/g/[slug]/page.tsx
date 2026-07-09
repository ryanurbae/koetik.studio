import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GalleryView from "./gallery-view";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("gallery_title, gallery_description, client_name")
    .eq("gallery_slug", slug)
    .eq("status", "delivered")
    .single();

  if (!session) {
    return { title: "Gallery Not Found" };
  }

  const title = session.gallery_title || session.client_name;

  return {
    title: `${title} — koetik.studio.my.id`,
    description:
      session.gallery_description ||
      `Gallery foto wisuda ${title} oleh koetik.studio.my.id`,
    openGraph: {
      title: `${title} — koetik.studio.my.id`,
      description:
        session.gallery_description ||
        `Gallery foto wisuda ${title} oleh koetik.studio.my.id`,
      siteName: "koetik.studio.my.id",
      type: "website",
    },
  };
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, client_name, gallery_slug, gallery_title, gallery_description, gallery_cover_photo_id, gallery_published_at, status"
    )
    .eq("gallery_slug", slug)
    .eq("status", "delivered")
    .single();

  if (!session) notFound();

  const { data: photos } = await supabase
    .from("edited_photos")
    .select("id, filename, storage_path")
    .eq("session_id", session.id)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  const photosWithUrls = (photos || []).map((photo) => {
    const { data } = supabase.storage
      .from("edited-photos")
      .getPublicUrl(photo.storage_path);
    return {
      id: photo.id,
      filename: photo.filename,
      url: data.publicUrl,
    };
  });

  return (
    <GalleryView
      title={session.gallery_title || session.client_name}
      description={session.gallery_description}
      photos={photosWithUrls}
    />
  );
}
