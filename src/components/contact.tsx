"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Contact Form ---
export function ContactForm() {
  const [formData, setFormData] = useState({
    nama: "",
    universitas: "",
    tanggalWisuda: "",
    nomorWA: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";
    const message = `Halo koetikstudio! Saya tertarik dengan jasa foto wisuda.

Nama: ${formData.nama}
Universitas: ${formData.universitas}
Tanggal Wisuda: ${formData.tanggalWisuda}
No. WA: ${formData.nomorWA}

Terima kasih!`;

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
          Nama Lengkap
        </label>
        <input
          type="text"
          name="nama"
          value={formData.nama}
          onChange={handleChange}
          required
          placeholder="Nama kamu"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
          Universitas
        </label>
        <input
          type="text"
          name="universitas"
          value={formData.universitas}
          onChange={handleChange}
          required
          placeholder="Nama universitas"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
          Tanggal Wisuda
        </label>
        <input
          type="date"
          name="tanggalWisuda"
          value={formData.tanggalWisuda}
          onChange={handleChange}
          required
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all [color-scheme:dark]"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
          Nomor WhatsApp
        </label>
        <input
          type="tel"
          name="nomorWA"
          value={formData.nomorWA}
          onChange={handleChange}
          required
          placeholder="08xxxxxxxxxx"
          pattern="^08[0-9]{8,13}$"
          title="Masukkan nomor WA yang valid (contoh: 081234567890)"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
        />
      </div>
      <button
        type="submit"
        className="mt-2 w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black text-sm font-semibold uppercase tracking-[0.1em] rounded-full hover:bg-white/90 transition-colors duration-300"
      >
        Hubungi via WhatsApp
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </button>
      <p className="text-[11px] text-white/20 text-center mt-1">
        Kamu akan diarahkan ke WhatsApp dengan data yang sudah terisi
      </p>
    </form>
  );
}

// --- Contact Modal ---
export function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-6"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full md:max-w-lg bg-[#0a0a0a] border border-white/[0.08] md:rounded-2xl p-6 md:p-8 max-h-[92dvh] overflow-y-auto overflow-x-hidden overscroll-contain"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] uppercase tracking-[0.25em] text-white/40 font-medium">[ contact ]</span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.78 3.97L7.5 8.25L3.22 3.97L2.5 4.69L6.78 8.97L2.5 13.25L3.22 13.97L7.5 9.69L11.78 13.97L12.5 13.25L8.22 8.97L12.5 4.69L11.78 3.97Z" fill="currentColor" />
                </svg>
              </button>
            </div>

            <h3 className="text-2xl md:text-3xl font-heading font-bold tracking-tighter uppercase leading-[1] mb-2">
              Mari foto
              <br />
              wisuda.
            </h3>
            <p className="text-sm text-white/40 leading-relaxed mb-7">
              Isi form dan kamu akan langsung terhubung dengan kami via WhatsApp.
            </p>

            <ContactForm />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
