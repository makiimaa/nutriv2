/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  School,
  Library,
  Users2,
  UserRound,
  Salad,
  CalendarDays,
  MessageSquareText,
  BarChart3,
} from "lucide-react";

type Action = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ACTIONS: Action[] = [
  { href: "/schools", label: "Quản lý trường", icon: School },
  { href: "/classes", label: "Quản lý lớp", icon: Library },
  { href: "/teachers", label: "Giáo viên", icon: Users2 },
  { href: "/students", label: "Học sinh", icon: UserRound },
  { href: "/food-items", label: "Danh mục thực phẩm", icon: Salad },
  { href: "/menus", label: "Thực đơn theo ngày", icon: CalendarDays },
  { href: "/parents", label: "Phụ huynh", icon: MessageSquareText },
  { href: "/stats", label: "Thống kê", icon: BarChart3 },
];

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Tổng quan</h1>
          <p className="text-slate-500 text-sm">
            Điều phối nhanh các phân hệ quản trị.
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.href}
              onClick={() => router.push(a.href)}
              className="group border border-slate-200 rounded-xl p-4 bg-white hover:bg-emerald-50 transition shadow-sm hover:shadow
                         text-left flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-100 grid place-items-center">
                <Icon className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="font-semibold">{a.label}</div>
            </button>
          );
        })}
      </div>

      {/* Statistics (optional) */}
      {/* <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border p-4">...</div>
      </div> */}
    </div>
  );
}
