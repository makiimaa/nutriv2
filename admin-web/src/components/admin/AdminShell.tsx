"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  School,
  Library,
  Users2,
  UserRound,
  Salad,
  CalendarDays,
  MessageSquareText,
  BarChart3,
  LogOut,
  PanelLeft,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/schools", label: "Quản lý trường", icon: School },
  { href: "/classes", label: "Quản lý lớp", icon: Library },
  { href: "/teachers", label: "Giáo viên", icon: Users2 },
  { href: "/students", label: "Học sinh", icon: UserRound },
  { href: "/food-items", label: "Danh mục thực phẩm", icon: Salad },
  { href: "/menus", label: "Thực đơn theo ngày", icon: CalendarDays },
  { href: "/parents", label: "Phụ huynh", icon: MessageSquareText },
  { href: "/stats", label: "Thống kê", icon: BarChart3 },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[rgb(248,251,255)] text-slate-900">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded hover:bg-slate-100"
            onClick={() => setOpen(true)}
            aria-label="Open sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-200 to-sky-300 grid place-items-center shadow-sm">
              <LayoutDashboard className="w-4 h-4 text-emerald-900" />
            </div>
            <div className="font-extrabold tracking-tight">Bảng điều khiển</div>
            <div className="text-xs text-slate-500">• Quản trị hệ thống</div>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-semibold">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block">
          <nav className="sticky top-16 bg-white rounded-2xl border border-slate-200 shadow-sm p-2">
            {NAV.map((it) => {
              const active = pathname.startsWith(it.href);
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium",
                    active
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4" />
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Sidebar (mobile drawer) */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold">Menu</div>
                <button
                  className="w-8 h-8 grid place-items-center rounded hover:bg-slate-100"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV.map((it) => {
                  const active = pathname.startsWith(it.href);
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className={[
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium",
                        active
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{it.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="min-h-[70vh]">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
