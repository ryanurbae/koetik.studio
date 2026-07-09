# PRD: koetik.studio.my.id

> Photography & Creative Studio Platform
> Last updated: 2026-07-06

---

## 1. Project Overview

### Apa ini?
koetik.studio.my.id adalah platform web untuk jasa fotografi wisuda. Platform ini menangani seluruh lifecycle klien, dari pertama kali lihat portfolio sampai terima foto final.

### Current State
- **Framework**: Next.js 16.2.9 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, Framer Motion 12, Lenis (smooth scroll)
- **Fonts**: Space Grotesk (heading), Inter (body)
- **Pages**: Landing page (`/`) dan admin dashboard (`/admin`)
- **Status**: Frontend-only prototype. Tidak ada database, auth, API, atau file upload.

### Tech Stack (Final)

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Auth | Supabase Auth (email + password) |
| Hosting | Vercel |
| Domain | koetik.studio.my.id + wildcard `*.koetik.studio.my.id` |

### Nomor WhatsApp Bisnis
Konfigurasikan via environment variable `NEXT_PUBLIC_WA_NUMBER`. Format internasional tanpa `+`, contoh: `6281234567890`.

---

## 2. User Personas

### A. Calon Klien (Prospective Customer)
- Mahasiswa yang mau wisuda, cari jasa fotografer
- Akses: landing page di `koetik.studio.my.id`
- Device: dominan mobile (80%+)
- Goal: lihat portfolio, isi form, langsung chat WhatsApp

### B. Klien Aktif (Active Client)
- Sudah booking dan sudah sesi foto
- Akses: link temporary untuk pilih foto raw, link permanent untuk akses galeri final
- Device: mobile + desktop
- Goal: pilih foto yang mau diedit, download foto final

### C. Gallery Viewer
- Siapapun yang punya link galeri permanent
- Akses: `nama.koetik.studio.my.id`
- Device: mobile + desktop
- Goal: lihat dan download foto dari galeri

### D. Admin (Fotografer/Owner)
- Pemilik studio
- Akses: `/admin` (protected, login required)
- Device: desktop primary
- Goal: manage sesi, upload foto, generate link, track status

---

## 3. Feature Breakdown

### 3.1 Landing Page (Public)

**Sudah ada**, perlu ditambah:

#### Contact Form Section
Ganti section CTA yang sekarang (mailto + Instagram button) dengan form interaktif.

**Fields:**
| Field | Type | Required | Placeholder |
|---|---|---|---|
| Nama Lengkap | text | Ya | "Nama kamu" |
| Universitas | text | Ya | "Nama universitas" |
| Tanggal Wisuda | date | Ya | - |
| Nomor WhatsApp | tel | Ya | "08xxxxxxxxxx" |

**Behavior:**
1. User isi form
2. Validasi client-side (semua field required, nomor WA format Indonesia)
3. Klik "Hubungi via WhatsApp"
4. Redirect ke `https://wa.me/{WA_NUMBER}?text={encoded_message}`
5. Format message:
```
Halo koetik.studio.my.id! Saya tertarik dengan jasa foto wisuda.

Nama: {nama}
Universitas: {universitas}
Tanggal Wisuda: {tanggal}
No. WA: {nomor}

Terima kasih!
```

**Design**: Gunakan existing design system (dark bg, white text, rounded inputs). Form di dalam section `#contact` yang sudah ada.

---

### 3.2 Admin Dashboard (`/admin`)

**Protected route** - harus login dulu.

#### 3.2.1 Login Page (`/admin/login`)
- Email + password form
- Supabase Auth
- Redirect ke `/admin` setelah berhasil
- Design: centered card, dark background, minimal

#### 3.2.2 Session Management

**Create Session:**
| Field | Type | Required |
|---|---|---|
| Client Name | text | Ya |
| Client University | text | Ya |
| Graduation Date | date | Ya |
| Package Type | select | Ya |
| Max Photo Selection | number | Ya (default: 10) |
| Notes | textarea | Tidak |

**Session Status Flow:**
```
Draft -> Raw Uploaded -> Selection Open -> Selection Done -> Editing -> Delivered
```

| Status | Artinya |
|---|---|
| Draft | Sesi baru dibuat, belum ada foto |
| Raw Uploaded | Foto raw sudah diupload |
| Selection Open | Link pilih foto sudah digenerate, klien bisa akses |
| Selection Done | Klien sudah selesai pilih foto |
| Editing | Admin sedang edit foto terpilih |
| Delivered | Foto edited sudah diupload, galeri permanent sudah dibuat |

#### 3.2.3 Photo Upload (Raw)
- Drag & drop atau file picker
- Multiple file upload
- Support: JPG, PNG, WEBP
- Max file size: 20MB per file
- Upload ke Supabase Storage bucket `raw-photos`
- Path: `{session_id}/{filename}`
- Show upload progress per file
- Thumbnail preview setelah upload

#### 3.2.4 Generate Selection Link
- Admin klik "Generate Link" pada session yang statusnya `Raw Uploaded`
- System generate:
  - **Access code**: 6 karakter alphanumeric (uppercase), contoh: `K7X2MN`
  - **Link**: `koetik.studio.my.id/select/{session_id}`
  - **Expiry**: default 7 hari (customizable)
- Admin bisa copy link + access code
- Admin bisa share langsung ke klien via WhatsApp button
- Status session berubah ke `Selection Open`

#### 3.2.5 View Selections
- Setelah klien selesai pilih, admin bisa lihat:
  - Daftar foto yang dipilih (highlighted)
  - Daftar foto yang tidak dipilih
  - Total selected vs max allowed
- Grid view dengan toggle selected/unselected

#### 3.2.6 Photo Upload (Edited)
- Sama seperti raw upload, tapi ke bucket `edited-photos`
- Path: `{session_id}/{filename}`
- Hanya bisa upload saat status `Editing` atau `Selection Done`

#### 3.2.7 Generate Permanent Gallery
- Admin set gallery slug (contoh: `alisha-2026`)
- Validasi: slug unik, lowercase, alphanumeric + dash
- Gallery akan live di `alisha-2026.koetik.studio.my.id`
- Admin bisa customize:
  - Gallery title (default: client name)
  - Gallery description (optional)
  - Cover photo (pilih dari edited photos)
- Status session berubah ke `Delivered`

#### 3.2.8 Settings
- Update WhatsApp number
- Default max selection count
- Default selection link expiry (hari)

---

### 3.3 Photo Selection Page (Client-Facing)

**Route**: `/select/[sessionId]`

#### Access Flow:
1. Klien buka link `koetik.studio.my.id/select/{session_id}`
2. Muncul halaman input access code
3. Klien masukkan 6-digit code
4. Kalau benar -> masuk ke halaman pilih foto
5. Kalau salah -> error message, max 5 attempts lalu lock 15 menit
6. Kalau link expired -> tampilkan pesan "Link sudah tidak berlaku"

#### Selection Interface:
- Grid layout foto (responsive: 2 kolom mobile, 3-4 kolom desktop)
- Klik foto untuk select/deselect (toggle)
- Visual indicator: selected foto ada border/checkmark overlay
- Counter: "X dari Y foto dipilih" (sticky di atas/bawah)
- Lightbox: klik tahan / double tap untuk lihat foto lebih besar
- Kalau sudah max -> foto lain tidak bisa diklik, tampilkan toast "Maksimum {max} foto"

#### Submit Flow:
1. Klien klik "Selesai Memilih"
2. Confirmation dialog: "Kamu sudah memilih X foto. Setelah konfirmasi, pilihan tidak bisa diubah. Lanjutkan?"
3. Kalau "Ya":
   - Simpan selections ke database
   - Update session status ke `Selection Done`
   - Mark selection link sebagai expired/used
   - Redirect ke WhatsApp:
```
Halo koetik.studio.my.id! Aku udah selesai milih foto buat diedit.

Sesi: {client_name}
Jumlah foto dipilih: {count}

Terima kasih!
```
4. Halaman berubah jadi "Terima kasih, pilihanmu sudah tersimpan"

---

### 3.4 Permanent Gallery (Subdomain)

**Route**: `{slug}.koetik.studio.my.id`

#### Public Gallery Page:
- Header: gallery title + description
- Logo: koetik.studio.my.id branding (kecil, di corner)
- Grid layout foto edited (masonry atau uniform grid)
- Lightbox view untuk tiap foto
- Download button per foto + "Download All" (zip)
- Responsive (mobile-first)
- Design: dark theme konsisten dengan main site
- Footer: "Captured by koetik.studio.my.id" + link ke main site

#### Gallery Features:
- Publicly accessible (no auth required)
- Permanent (selama domain aktif)
- SEO-friendly (meta tags, og:image dari cover photo)
- Share button (copy link)

---

## 4. Database Schema

### Supabase Auth
Menggunakan built-in `auth.users` table. Admin register manual via Supabase dashboard atau invite.

### Tables

```sql
-- Sessions: satu record per sesi foto klien
CREATE TABLE sessions (
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
  
  -- Gallery fields  
  gallery_slug TEXT UNIQUE,
  gallery_title TEXT,
  gallery_description TEXT,
  gallery_cover_photo_id UUID,
  gallery_published_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Raw photos: foto mentah yang diupload admin
CREATE TABLE raw_photos (
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

-- Photo selections: foto yang dipilih klien
CREATE TABLE photo_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  raw_photo_id UUID NOT NULL REFERENCES raw_photos(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(session_id, raw_photo_id)
);

-- Edited photos: foto final yang sudah diedit
CREATE TABLE edited_photos (
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

-- Studio settings: konfigurasi global
CREATE TABLE studio_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default settings
INSERT INTO studio_settings (key, value) VALUES
  ('wa_number', '6281234567890'),
  ('default_max_selections', '10'),
  ('default_expiry_days', '7');
```

### Indexes
```sql
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_gallery_slug ON sessions(gallery_slug) WHERE gallery_slug IS NOT NULL;
CREATE INDEX idx_raw_photos_session ON raw_photos(session_id);
CREATE INDEX idx_edited_photos_session ON edited_photos(session_id);
CREATE INDEX idx_photo_selections_session ON photo_selections(session_id);
```

### Row Level Security (RLS)
```sql
-- Sessions: admin only (via auth)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON sessions
  FOR ALL USING (auth.role() = 'authenticated');

-- Raw photos: admin full access
ALTER TABLE raw_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON raw_photos
  FOR ALL USING (auth.role() = 'authenticated');

-- Photo selections: admin read, public insert (via server action with validation)
ALTER TABLE photo_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON photo_selections
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public insert via API" ON photo_selections
  FOR INSERT WITH CHECK (true);

-- Edited photos: admin full, public read (for gallery)
ALTER TABLE edited_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON edited_photos
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for published galleries" ON edited_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = edited_photos.session_id
      AND s.gallery_slug IS NOT NULL
      AND s.status = 'delivered'
    )
  );

-- Studio settings: admin only
ALTER TABLE studio_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON studio_settings
  FOR ALL USING (auth.role() = 'authenticated');
```

---

## 5. Supabase Storage

### Buckets

| Bucket | Access | Purpose |
|---|---|---|
| `raw-photos` | Private (admin only) | Foto mentah dari sesi |
| `edited-photos` | Public read | Foto final untuk galeri permanent |

### Path Convention
```
raw-photos/
  {session_id}/
    IMG_001.jpg
    IMG_002.jpg

edited-photos/
  {session_id}/
    final_001.jpg
    final_002.jpg
```

### Storage Policies
```sql
-- raw-photos: admin only upload/read
CREATE POLICY "Admin upload raw" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'raw-photos' AND auth.role() = 'authenticated'
  );
CREATE POLICY "Admin read raw" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'raw-photos' AND auth.role() = 'authenticated'
  );

-- edited-photos: admin upload, public read
CREATE POLICY "Admin upload edited" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'edited-photos' AND auth.role() = 'authenticated'
  );
CREATE POLICY "Public read edited" ON storage.objects
  FOR SELECT USING (bucket_id = 'edited-photos');
```

### Image Transforms
Gunakan Supabase Image Transforms untuk thumbnail:
- Thumbnail (selection grid): `?width=400&height=400&resize=cover`
- Medium (lightbox): `?width=1200&resize=contain`
- Full: original file

---

## 6. API Routes

### Server Actions (Mutations)
Gunakan Next.js Server Actions (`"use server"`) untuk operasi yang butuh auth.

| Action | File | Purpose |
|---|---|---|
| `createSession` | `src/app/admin/actions.ts` | Buat sesi baru |
| `updateSession` | `src/app/admin/actions.ts` | Update sesi (status, settings) |
| `deleteSession` | `src/app/admin/actions.ts` | Hapus sesi + cascade |
| `generateSelectionLink` | `src/app/admin/actions.ts` | Generate access code + set expiry |
| `uploadRawPhotos` | `src/app/admin/actions.ts` | Upload ke raw-photos bucket |
| `uploadEditedPhotos` | `src/app/admin/actions.ts` | Upload ke edited-photos bucket |
| `publishGallery` | `src/app/admin/actions.ts` | Set gallery slug, publish |
| `updateSettings` | `src/app/admin/actions.ts` | Update studio_settings |

### Route Handlers (Public API)
Untuk endpoint yang diakses tanpa auth (client-facing).

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/select/verify` | Verify access code untuk selection page |
| GET | `/api/select/[sessionId]/photos` | Get foto raw untuk selection (setelah verify) |
| POST | `/api/select/[sessionId]/submit` | Submit foto selections |
| GET | `/api/gallery/[slug]` | Get gallery data (untuk subdomain) |
| GET | `/api/gallery/[slug]/photos` | Get edited photos untuk gallery |

### Validation
Semua public API routes harus validate:
- Access code match (untuk selection endpoints)
- Session belum expired
- Session status sesuai
- Max selections tidak terlampaui
- Rate limiting (brute force protection)

---

## 7. Page/Route Structure

```
src/app/
  layout.tsx                          # Root layout (fonts, metadata)
  page.tsx                            # Landing page (public)
  globals.css                         # Global styles + Tailwind @theme

  admin/
    layout.tsx                        # Admin layout (auth guard, sidebar)
    page.tsx                          # Dashboard overview
    actions.ts                        # Server actions
    login/
      page.tsx                        # Login page
    sessions/
      page.tsx                        # Session list
      new/
        page.tsx                      # Create session form
      [id]/
        page.tsx                      # Session detail (upload, manage)
        raw/
          page.tsx                    # Upload/manage raw photos
        selections/
          page.tsx                    # View client selections
        edited/
          page.tsx                    # Upload/manage edited photos
        gallery/
          page.tsx                    # Configure & publish gallery
    settings/
      page.tsx                        # Studio settings

  select/
    [sessionId]/
      page.tsx                        # Photo selection page (client)

  g/
    [slug]/
      page.tsx                        # Permanent gallery (fallback for non-subdomain)

  api/
    select/
      verify/
        route.ts                      # POST: verify access code
      [sessionId]/
        photos/
          route.ts                    # GET: raw photos for selection
        submit/
          route.ts                    # POST: submit selections
    gallery/
      [slug]/
        route.ts                      # GET: gallery metadata
        photos/
          route.ts                    # GET: edited photos list
```

---

## 8. Subdomain Routing

### DNS Setup
Di DNS provider (Cloudflare, Namecheap, dll):
```
Type: CNAME
Name: *
Target: cname.vercel-dns.com
```

### Vercel Config
Di Vercel dashboard:
1. Add domain `koetik.studio.my.id`
2. Add wildcard domain `*.koetik.studio.my.id`
3. Keduanya point ke project yang sama

### Next.js Middleware
File: `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const mainDomains = ['koetik.studio.my.id', 'www.koetik.studio.my.id', 'localhost:3000'];
  
  // Kalau bukan main domain, berarti subdomain (gallery)
  if (!mainDomains.some(d => hostname.includes(d))) {
    const slug = hostname.split('.')[0];
    
    // Rewrite ke /g/[slug]
    const url = request.nextUrl.clone();
    url.pathname = `/g/${slug}${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
```

### Local Development
Untuk test subdomain di local:
1. Edit file hosts (`C:\Windows\System32\drivers\etc\hosts`):
```
127.0.0.1 koetik.local
127.0.0.1 alisha-2026.koetik.local
```
2. Atau gunakan `localhost:3000/g/alisha-2026` sebagai fallback

---

## 9. Security

### Authentication
- Supabase Auth dengan email + password
- Session token di HTTP-only cookie
- Admin routes dilindungi via middleware check `auth.getUser()`
- Tidak ada public registration. Admin dibuat manual via Supabase dashboard.

### Access Code Protection
- Access code: 6 karakter uppercase alphanumeric
- Hashed sebelum disimpan di database (bcrypt atau argon2)
- Max 5 attempts per session, lock 15 menit setelah 5x gagal
- Tracking via IP + session ID

### Storage Security
- `raw-photos` bucket: private, hanya authenticated users
- `edited-photos` bucket: public read, authenticated write
- File type validation server-side (hanya accept image/*)
- Max file size: 20MB enforced di client + server

### Selection Link Expiry
- Default 7 hari (customizable per session)
- Cek `selection_expires_at` pada setiap request
- Setelah klien submit selections, link otomatis expired
- Tidak bisa submit ulang setelah `selection_completed_at` terisi

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_WA_NUMBER=6281234567890
NEXT_PUBLIC_SITE_URL=https://koetik.studio.my.id
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Setup Supabase project (database + storage + auth)
- [ ] Install dependencies (`@supabase/supabase-js`, `@supabase/ssr`)
- [ ] Create database tables + RLS policies
- [ ] Create storage buckets
- [ ] Setup Supabase client (browser + server)
- [ ] Setup middleware untuk auth guard di `/admin`
- [ ] Build login page `/admin/login`
- [ ] Test: bisa login/logout

### Phase 2: Landing Page Contact Form (Week 1-2)
- [ ] Ganti CTA section di `page.tsx` dengan contact form
- [ ] Implement WhatsApp redirect dengan prefilled message
- [ ] Validasi form (client-side)
- [ ] Test: isi form -> redirect ke WA dengan data benar

### Phase 3: Admin Session CRUD (Week 2-3)
- [ ] Rebuild admin dashboard dengan real data dari Supabase
- [ ] Session list page (all sessions + status badges)
- [ ] Create session form
- [ ] Session detail page
- [ ] Update session status
- [ ] Delete session
- [ ] Test: buat session, lihat list, update status, hapus

### Phase 4: Photo Upload + Selection Flow (Week 3-4)
- [ ] Raw photo upload UI (drag & drop, progress bar)
- [ ] Upload ke Supabase Storage
- [ ] Generate selection link + access code
- [ ] Build selection page `/select/[sessionId]`
- [ ] Access code verification
- [ ] Photo grid dengan select/deselect
- [ ] Submit selections + WhatsApp redirect
- [ ] View selections di admin
- [ ] Test: upload raw -> generate link -> klien pilih -> admin lihat hasil

### Phase 5: Edited Photos + Permanent Gallery (Week 5-6)
- [ ] Edited photo upload UI
- [ ] Gallery configuration (slug, title, description, cover)
- [ ] Build gallery page `/g/[slug]`
- [ ] Subdomain routing middleware
- [ ] Gallery UI (photo grid, lightbox, download)
- [ ] Test: upload edited -> publish gallery -> akses via subdomain

### Phase 6: Polish & Deploy (Week 6-7)
- [ ] Responsive testing semua halaman
- [ ] Error handling + loading states
- [ ] SEO meta tags (terutama gallery pages)
- [ ] Setup Vercel deployment
- [ ] Setup custom domain + wildcard DNS
- [ ] Setup environment variables di Vercel
- [ ] Final testing end-to-end
- [ ] Launch!

---

## Appendix

### A. WhatsApp URL Template
```
https://wa.me/{number}?text={encoded_text}
```
- `number`: format internasional tanpa `+` atau spasi (contoh: `6281234567890`)
- `text`: URL-encoded message

### B. Dependencies to Install
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### C. Design Tokens (Existing)
| Token | Value | Usage |
|---|---|---|
| `--font-heading` | Space Grotesk | Headings, logo |
| `--font-body` | Inter | Body text |
| Background | `#0a0a0a` | Main surfaces |
| Background alt | `#080808` | Alternate sections |
| Text primary | `white` | Headlines |
| Text secondary | `white/50` | Body |
| Text muted | `white/30` - `white/40` | Labels, captions |
| Border | `white/[0.04]` - `white/[0.06]` | Dividers |
| Selection | `bg-white text-black` | Text selection |
| Admin accent | `#9f1239` | Buttons, status indicators |
| Easing (landing) | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Scroll animations |
| Easing (admin) | `cubic-bezier(0.32, 0.72, 0, 1)` | UI interactions |
| Section label | `[text]` uppercase 11px tracking-[0.25em] | Category labels |
