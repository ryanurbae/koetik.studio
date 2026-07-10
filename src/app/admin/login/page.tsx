"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email atau password salah.");
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#0a0a0a] px-6">
      {/* Subtle background glow */}
      <div className="fixed top-[-20%] left-[30%] w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-xl font-heading font-semibold tracking-tight">
            koetik<span className="text-white/30">.studio</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.25em] text-white/30 font-medium mt-3">
            Admin Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="p-1.5 rounded-[2rem] bg-white/[0.02] ring-1 ring-white/[0.06]">
          <div className="bg-[#0a0a0a] rounded-[calc(2rem-6px)] p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
                  User
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter User"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-3">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full bg-white text-black py-3.5 rounded-xl text-sm font-semibold uppercase tracking-[0.1em] hover:bg-white/90 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/20 mt-8 uppercase tracking-[0.15em]">
          &copy; 2026 koetik.studio
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
