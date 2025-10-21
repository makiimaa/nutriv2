/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/axios";
import { RefreshCcw, Plus, Edit3, Trash2, X, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type School = {
  _id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
};

function cleanSchoolPayload(s: School) {
  const { _id, createdAt, updatedAt, __v, ...rest } = s as any;
  return rest;
}
function stripDiacritics(s = "") {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
function getAbbr(name?: string) {
  if (!name) return "";
  const words = stripDiacritics(name).trim().split(/\s+/);
  return words.map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function Page() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState<School>({ name: "" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => (await api.get("/schools")).data as School[],
  });

  const filtered = useMemo(() => {
    if (!q) return data ?? [];
    const qq = q.toLowerCase();
    return (data ?? []).filter(
      (s) =>
        s.name?.toLowerCase().includes(qq) ||
        s.address?.toLowerCase().includes(qq)
    );
  }, [data, q]);

  const mSave = useMutation({
    mutationFn: async (payload: School) => {
      const clean = cleanSchoolPayload(payload);
      if (editing?._id) {
        return (await api.put(`/schools/${editing._id}`, clean)).data;
      }
      return (await api.post("/schools", clean)).data;
    },
    onSuccess: async () => {
      setVisible(false);
      setEditing(null);
      setForm({ name: "" });
      await qc.invalidateQueries({ queryKey: ["schools"] });
    },
  });

  const mDelete = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/schools/${id}`)).data,
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["schools"] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "" });
    setVisible(true);
  };
  const openEdit = (s: School) => {
    setEditing(s);
    setForm({ ...s });
    setVisible(true);
  };
  const submit = async () => {
    if (!form.name?.trim()) return alert("Nhập tên trường");
    try {
      await mSave.mutateAsync(form);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Lưu thất bại");
    }
  };
  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm("Xác nhận xoá trường này?")) return;
    try {
      await mDelete.mutateAsync(id);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Xoá thất bại");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Danh sách trường</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="text-sm font-semibold">Làm mới</span>
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-semibold">Thêm trường</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          className="w-full border rounded-lg px-3 h-10 bg-white placeholder:text-slate-400"
          placeholder="Tìm theo tên/địa chỉ..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl border border-slate-200 bg-slate-50 animate-pulse"
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center text-slate-500">
            Chưa có trường.
          </div>
        ) : (
          filtered.map((item) => {
            const abbr = getAbbr(item.name || "");
            return (
              <div
                key={item._id ?? item.name}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex gap-4">
                  {/* Left avatar */}
                  <div className="shrink-0 grid place-items-center">
                    <div className="p-1 rounded-full bg-emerald-100 border border-emerald-200 shadow-sm">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-200 grid place-items-center border border-emerald-300">
                        <span className="text-2xl md:text-3xl font-black text-emerald-800 tracking-wider">
                          {abbr || "?"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-extrabold text-slate-900 text-lg leading-tight break-words">
                        {item.name || "(Chưa đặt tên)"}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span className="text-sm font-semibold">Sửa</span>
                        </button>
                        <button
                          onClick={() => remove(item._id)}
                          className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                          title="Xoá"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm font-semibold">Xoá</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1 text-slate-600">
                      {item.address && <div>Đ/c: {item.address}</div>}
                      {item.phone && <div>ĐT: {item.phone}</div>}
                      {item.email && <div>Email: {item.email}</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {visible && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setVisible(false)}
          />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold">
                  {editing ? "Sửa trường" : "Thêm trường"}
                </div>
                <button
                  onClick={() => setVisible(false)}
                  className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <Field label="Tên trường">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Mầm non Hoa Sen"
                    className="w-full border rounded-lg px-3 h-10 bg-white"
                  />
                </Field>
                <Field label="Địa chỉ">
                  <input
                    value={form.address ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Số nhà, đường..."
                    className="w-full border rounded-lg px-3 h-10 bg-white"
                  />
                </Field>
                <Field label="Điện thoại">
                  <input
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="0xxx..."
                    className="w-full border rounded-lg px-3 h-10 bg-white"
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="email@domain.com"
                    className="w-full border rounded-lg px-3 h-10 bg-white"
                  />
                </Field>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setVisible(false)}
                  className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm font-semibold">Đóng</span>
                </button>
                <button
                  onClick={submit}
                  disabled={mSave.isPending}
                  className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {mSave.isPending ? "Đang lưu..." : "Lưu"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-slate-800 mb-1">{label}</div>
      {children}
    </label>
  );
}
