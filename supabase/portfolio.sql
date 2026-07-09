-- koetik.studio.my.id — portfolio visibility column (run in Supabase SQL Editor)
-- Adds a per-session flag so admins can choose which published galleries
-- appear on the public landing page portfolio (default: hidden / private).

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS show_on_portfolio BOOLEAN NOT NULL DEFAULT false;
