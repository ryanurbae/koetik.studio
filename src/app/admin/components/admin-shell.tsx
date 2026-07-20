"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOutAction } from "../actions";

const navItems = [
  { label: "Overview", href: "/admin" },
  { label: "Client Sessions", href: "/admin/sessions" },
  { label: "Settings", href: "/admin/settings" },
];

// Hamburger icon
function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
      <path
        d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Close (X) icon
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
      <path
        d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-white/30 transition-colors hover:bg-white/[0.03] hover:text-white/60 disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

export default function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Default tertutup di semua ukuran layar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const activeLabel =
    navItems.find((item) => isActive(item.href))?.label || "Admin";

  return (
    <div className="min-h-[100dvh] flex bg-[#0a0a0a] font-sans text-white">
      {/* Overlay (semua ukuran layar) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — selalu fixed, default tertutup */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 p-6 border-r border-white/[0.04] bg-[#0d0d0d] transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo + close button */}
        <div className="mb-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center" onClick={() => setSidebarOpen(false)}>
            <Image src="/logo-white-rev.png" alt="koetik.studio" width={140} height={36} className="h-9 w-auto" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-white/40 hover:bg-white/[0.1] hover:text-white transition-all"
          >
            <IconClose />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-300 text-left text-sm font-medium ${
                  active
                    ? "bg-white/[0.08] text-white ring-1 ring-white/[0.06]"
                    : "text-white/40 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col gap-3">
          {/* User info */}
          <div className="px-4 py-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white/60">
                {getInitials(email || "AD")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/70 truncate">
                  {email}
                </p>
              </div>
            </div>
          </div>

          {/* Logout */}
          <form action={signOutAction}>
            <SignOutButton />
          </form>
        </div>
      </aside>

      {/* Main content — full width karena sidebar selalu fixed */}
      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        {/* Top header */}
        <header className="w-full px-5 py-5 flex justify-between items-center z-10 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            {/* Toggle sidebar button — selalu tampil */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/50 hover:bg-white/[0.08] hover:text-white transition-all"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <IconClose /> : <IconMenu />}
            </button>
            <h1 className="text-xl font-heading font-semibold tracking-tight">
              {activeLabel}
            </h1>
          </div>

          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.15em] text-white/30 hover:text-white/60 transition-colors font-medium"
          >
            View site
          </Link>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
