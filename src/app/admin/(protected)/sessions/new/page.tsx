"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: "",
    client_university: "",
    client_whatsapp: "",
    graduation_date: "",
    package_type: "Graduation - Basic",
    max_selections: 10,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.from("sessions").insert({
      client_name: formData.client_name,
      client_university: formData.client_university || null,
      client_whatsapp: formData.client_whatsapp || null,
      graduation_date: formData.graduation_date || null,
      package_type: formData.package_type,
      max_selections: formData.max_selections,
      notes: formData.notes || null,
      status: "draft",
    }).select("id").single();

    if (error || !data) {
      alert("Gagal membuat session. Pastikan tabel database sudah dibuat.");
      setLoading(false);
      return;
    }

    router.push(`/admin/sessions/${data.id}`);
    router.refresh();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value =
      e.target.type === "number" ? parseInt(e.target.value) || 0 : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  return (
    <>
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-[11px] uppercase tracking-[0.15em] text-white/30 hover:text-white/60 transition-colors font-medium mb-4 inline-block"
        >
          &larr; Back
        </button>
        <h2 className="text-xl font-heading font-semibold tracking-tight">
          Create New Session
        </h2>
      </div>

      <div className="max-w-lg">
        <div className="p-1 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06]">
          <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Alisha Putri"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
                  University
                </label>
                <input
                  type="text"
                  name="client_university"
                  value={formData.client_university}
                  onChange={handleChange}
                  placeholder="e.g. Universitas Indonesia"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  name="client_whatsapp"
                  value={formData.client_whatsapp}
                  onChange={handleChange}
                  placeholder="e.g. 081234567890"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
                  Date
                </label>
                <input
                  type="date"
                  name="graduation_date"
                  value={formData.graduation_date}
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
                  Package Type *
                </label>
                <select
                  name="package_type"
                  value={formData.package_type}
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="Graduation - Basic" className="bg-[#0a0a0a]">
                    Graduation - Basic
                  </option>
                  <option value="Graduation - Premium" className="bg-[#0a0a0a]">
                    Graduation - Premium
                  </option>
                  <option value="Group Portrait" className="bg-[#0a0a0a]">
                    Group Portrait
                  </option>
                  <option value="Event Coverage" className="bg-[#0a0a0a]">
                    Event Coverage
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
                  Max Photo Selections *
                </label>
                <input
                  type="number"
                  name="max_selections"
                  value={formData.max_selections}
                  onChange={handleChange}
                  min={1}
                  max={100}
                  required
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
                <p className="text-[11px] text-white/20 mt-2">
                  Jumlah maksimal foto yang bisa dipilih klien
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Catatan tambahan (optional)"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-white text-black py-3.5 rounded-xl text-sm font-semibold uppercase tracking-[0.1em] hover:bg-white/90 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Session"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
