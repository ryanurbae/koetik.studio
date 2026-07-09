-- koetik.studio.my.id — schema fixes (run AFTER initial schema.sql)
-- Jalankan di Supabase Dashboard > SQL Editor

-- 1. Fix RLS: admin policies need WITH CHECK so INSERT/UPDATE/DELETE work
--    (the publishable secret key acts as role 'authenticated' on the DB)
ALTER POLICY "Admin full access" ON sessions
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
ALTER POLICY "Admin full access" ON raw_photos
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
ALTER POLICY "Admin full access" ON photo_selections
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
ALTER POLICY "Admin full access" ON edited_photos
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
ALTER POLICY "Admin full access" ON studio_settings
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 2. Brute-force protection columns for selection link
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS access_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS access_locked_until TIMESTAMPTZ;
