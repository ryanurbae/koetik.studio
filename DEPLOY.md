# Deployment Guide — koetik.studio.my.id

## Prerequisites
- Akun Vercel (free tier cukup)
- Akun Supabase (free tier cukup)
- Domain koetik.studio.my.id (sudah beli / managed di registrar)

---

## 1. Setup Supabase

### a. Buat project baru di supabase.com
1. Buat project, pilih region **Southeast Asia (Singapore)**
2. Simpan **Project URL**, **anon key**, dan **service role key**

### b. Jalankan schema
1. Buka **SQL Editor** di Supabase Dashboard
2. Copy-paste isi file `supabase/schema.sql`
3. Klik **Run**

### c. Buat admin user
Pilih salah satu cara:

**Cara 1 (Dashboard):**
- Buka **Authentication > Users > Add User**
- Isi email + password
- Centang **Auto Confirm User**

**Cara 2 (Script):**
```bash
node --env-file=.env.local scripts/seed-admin.mjs
```

---

## 2. Deploy ke Vercel

### a. Push ke GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/koetik-studio.git
git push -u origin main
```

### b. Import di Vercel
1. Buka vercel.com/new
2. Import repo dari GitHub
3. Framework preset otomatis detect **Next.js**
4. Tambahkan **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `NEXT_PUBLIC_WA_NUMBER` | `628xxxxxxxxxx` |
| `NEXT_PUBLIC_SITE_URL` | `https://koetik.studio.my.id` |

5. Klik **Deploy**

---

## 3. Setup Domain

### a. Primary domain
1. Di Vercel project > **Settings > Domains**
2. Add `koetik.studio.my.id`
3. Ikuti instruksi DNS (A record atau CNAME)

### b. Wildcard subdomain (untuk gallery)
1. Di Vercel, add domain: `*.koetik.studio.my.id`
2. Di DNS registrar, tambahkan:
   ```
   Type: CNAME
   Name: *
   Value: cname.vercel-dns.com
   ```
3. Tunggu propagasi DNS (biasanya 5-30 menit)

### c. Verifikasi
- Buka `https://koetik.studio.my.id` — landing page
- Buka `https://koetik.studio.my.id/admin` — redirect ke login
- Setelah publish gallery, buka `https://nama.koetik.studio.my.id` — gallery klien

---

## 4. Setup Supabase Auth Redirect

1. Buka Supabase Dashboard > **Authentication > URL Configuration**
2. Set **Site URL**: `https://koetik.studio.my.id`
3. Tambahkan **Redirect URLs**:
   - `https://koetik.studio.my.id/auth/callback`
   - `https://koetik.studio.my.id/admin`

---

## 5. Troubleshooting

### Middleware warning
Next.js 16 menunjukkan warning `middleware → proxy`. Ini deprecation notice, build tetap jalan normal. Akan dimigrasi di update berikutnya.

### Gallery subdomain tidak jalan
- Pastikan wildcard CNAME `*.koetik.studio.my.id` sudah di-set di DNS
- Pastikan `*.koetik.studio.my.id` sudah ditambahkan di Vercel domains
- Cek propagasi DNS: `dig *.koetik.studio.my.id`

### Upload foto gagal
- Pastikan storage buckets sudah dibuat (jalankan schema.sql)
- Cek apakah RLS policies sudah aktif
- Pastikan SUPABASE_SERVICE_ROLE_KEY benar (bukan anon key)

### Login gagal
- Pastikan admin user sudah dibuat di Supabase Auth
- Pastikan email sudah confirmed
- Cek apakah Supabase URL dan anon key benar di env vars
