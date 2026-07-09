"use client";

import { useState } from "react";
import { updateSettings } from "../actions";

export default function SettingsForm({
  settings,
}: {
  settings: Record<string, string>;
}) {
  const [waNumber, setWaNumber] = useState(settings.wa_number || "");
  const [maxSelections, setMaxSelections] = useState(
    settings.default_max_selections || "10"
  );
  const [expiryDays, setExpiryDays] = useState(
    settings.default_expiry_days || "7"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      await updateSettings([
        { key: "wa_number", value: waNumber },
        { key: "default_max_selections", value: maxSelections },
        { key: "default_expiry_days", value: expiryDays },
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg">
      <div className="p-1 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06]">
        <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
          <div className="flex flex-col gap-5">
            {/* WA Number */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-2">
                Nomor WhatsApp
              </label>
              <input
                type="text"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                placeholder="6281234567890"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              />
              <p className="text-[10px] text-white/20 mt-1.5">
                Format internasional tanpa + (contoh 6281234567890)
              </p>
            </div>

            {/* Max Selections */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-2">
                Default Max Foto Dipilih
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxSelections}
                onChange={(e) => setMaxSelections(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              />
              <p className="text-[10px] text-white/20 mt-1.5">
                Bisa di-override per session
              </p>
            </div>

            {/* Expiry Days */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-2">
                Default Expiry Link (hari)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              />
              <p className="text-[10px] text-white/20 mt-1.5">
                Berapa hari link selection aktif sebelum expired
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-white text-black text-sm font-semibold uppercase tracking-[0.08em] hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-400 font-medium animate-[fadeIn_0.3s_ease-out]">
            Tersimpan ✓
          </span>
        )}
      </div>
    </form>
  );
}
