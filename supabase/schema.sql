-- koetik.studio.my.id Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. TABLES
-- ============================================

-- Sessions: satu record per sesi foto klien
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_university TEXT,
  graduation_date DATE,
  package_type TEXT NOT NULL DEFAULT 'Graduation - Basic',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','raw_uploaded','selection_open','selection_done','editing','delivered')),
  max_selections INT NOT NULL DEFAULT 10,
  notes TEXT,

  -- Selection link fields
  access_code TEXT,
  selection_expires_at TIMESTAMPTZ,
  selection_completed_at TIMESTAMPTZ,

  -- Access code brute-force protection
  access_attempts INT NOT NULL DEFAULT 0,
  access_locked_until TIMESTAMPTZ,

  -- Gallery fields
  gallery_slug TEXT UNIQUE,
  gallery_title TEXT,
  gallery_description TEXT,
  gallery_cover_photo_id UUID,
  gallery_published_at TIMESTAMPTZ,
  show_on_portfolio BOOLEAN NOT NULL DEFAULT false,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Raw photos
CREATE TABLE IF NOT EXISTS raw_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  width INT,
  height INT,
  sort_order INT DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Photo selections
CREATE TABLE IF NOT EXISTS photo_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  raw_photo_id UUID NOT NULL REFERENCES raw_photos(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, raw_photo_id)
);

-- Edited photos
CREATE TABLE IF NOT EXISTS edited_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  width INT,
  height INT,
  sort_order INT DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Studio settings
CREATE TABLE IF NOT EXISTS studio_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default settings
INSERT INTO studio_settings (key, value) VALUES
  ('wa_number', '6281234567890'),
  ('default_max_selections', '10'),
  ('default_expiry_days', '7')
ON CONFLICT (key) DO NOTHING;


-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_gallery_slug ON sessions(gallery_slug) WHERE gallery_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_photos_session ON raw_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_edited_photos_session ON edited_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_photo_selections_session ON photo_selections(session_id);


-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

-- Sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON sessions
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Raw photos
ALTER TABLE raw_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON raw_photos
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Photo selections
ALTER TABLE photo_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON photo_selections
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Public insert via API" ON photo_selections
  FOR INSERT WITH CHECK (true);

-- Edited photos
ALTER TABLE edited_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON edited_photos
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Public read for published galleries" ON edited_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = edited_photos.session_id
      AND s.gallery_slug IS NOT NULL
      AND s.status = 'delivered'
    )
  );

-- Studio settings
ALTER TABLE studio_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON studio_settings
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- ============================================
-- 4. STORAGE BUCKETS
-- ============================================
-- Run these in Supabase Dashboard > Storage, or via SQL:

INSERT INTO storage.buckets (id, name, public) VALUES ('raw-photos', 'raw-photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('edited-photos', 'edited-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admin upload raw" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'raw-photos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admin read raw" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'raw-photos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admin delete raw" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'raw-photos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admin upload edited" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'edited-photos' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Public read edited" ON storage.objects
  FOR SELECT USING (bucket_id = 'edited-photos');

CREATE POLICY "Admin delete edited" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'edited-photos' AND auth.role() = 'authenticated'
  );
