/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCcw, Plus, Edit3, Trash2, X, Save } from "lucide-react";
import { api } from "@/lib/axios";

type Teacher = {
  _id?: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  role: "teacher" | "admin";
  isActive: boolean;
  schoolId?: string;
};
type School = { _id?: string; name: string };

function cleanCreatePayload(f: Partial<Teacher> & { password?: string }) {
  return {
    employeeId: (f.employeeId ?? "").trim(),
    fullName: (f.fullName ?? "").trim(),
    email: (f.email ?? "").trim().toLowerCase(),
    password: (f as any).password,
    phone: f.phone || undefined,
    address: f.address || undefined,
    role: (f.role ?? "teacher") as "teacher" | "admin",
    isActive: f.isActive !== false,
    schoolId: f.schoolId || undefined,
  };
}
function cleanUpdatePayload(f: Partial<Teacher>) {
  return {
    employeeId: f.employeeId,
    fullName: f.fullName?.trim(),
    email: f.email?.trim()?.toLowerCase(),
    phone: f.phone || undefined,
    address: f.address || undefined,
    role: (f.role ?? "teacher") as "teacher" | "admin",
    isActive: f.isActive !== false,
    schoolId: f.schoolId || undefined,
  };
}

export default function Page() {
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<Partial<Teacher> & { password?: string }>({
    employeeId: "",
    fullName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    role: "teacher",
    isActive: true,
    schoolId: "",
  });

  const {
    data: teachers,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => (await api.get("/teachers")).data as Teacher[],
  });
  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => (await api.get("/schools")).data as School[],
  });

  const schoolMap = useMemo(() => {
    const m = new Map<string, School>();
    (schools ?? []).forEach((s) => s._id && m.set(s._id, s));
    return m;
  }, [schools]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return teachers ?? [];
    return (teachers ?? []).filter((t) => {
      const sName = t.schoolId
        ? (schoolMap.get(t.schoolId)?.name ?? "").toLowerCase()
        : "";
      return [
        t.fullName?.toLowerCase() ?? "",
        t.email?.toLowerCase() ?? "",
        (t.phone ?? "").toLowerCase(),
        (t.address ?? "").toLowerCase(),
        (t.role ?? "").toLowerCase(),
        sName,
      ].some((x) => x.includes(qq));
    });
  }, [q, teachers, schoolMap]);

  const mSave = useMutation({
    mutationFn: async () => {
      if (!form.fullName?.trim()) throw new Error("Nhập họ tên");
      if (!editing) {
        if (!form.employeeId?.trim()) throw new Error("Nhập mã nhân viên");
        if (!form.email?.trim()) throw new Error("Nhập email");
        if (!form.password?.trim()) throw new Error("Nhập mật khẩu");
        const payload = cleanCreatePayload(form);
        return (await api.post("/teachers", payload)).data;
      } else {
        const payload = cleanUpdatePayload(form);
        return (await api.put(`/teachers/${editing._id}`, payload)).data;
      }
    },
    onSuccess: async () => {
      setVisible(false);
      setEditing(null);
      setForm({
        employeeId: "",
        fullName: "",
        email: "",
        password: "",
        phone: "",
        address: "",
        role: "teacher",
        isActive: true,
        schoolId: schools?.[0]?._id ?? "",
      });
      await qc.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message || e?.message || "Lưu thất bại"),
  });

  const mDelete = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/teachers/${id}`)).data,
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["teachers"] }),
    onError: (e: any) => alert(e?.response?.data?.message || "Xoá thất bại"),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      employeeId: "",
      fullName: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      role: "teacher",
      isActive: true,
      schoolId: schools?.[0]?._id ?? "",
    });
    setVisible(true);
  };
  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({
      employeeId: t.employeeId,
      fullName: t.fullName,
      email: t.email,
      password: undefined,
      phone: t.phone,
      address: t.address,
      role: t.role,
      isActive: t.isActive,
      schoolId: t.schoolId || "",
    });
    setVisible(true);
  };
  const submit = async () => {
    await mSave.mutateAsync();
  };
  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm("Xác nhận xoá giáo viên này?")) return;
    await mDelete.mutateAsync(id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Danh sách giáo viên</h2>
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
            <span className="text-sm font-semibold">Thêm giáo viên</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          className="w-full border rounded-lg px-3 h-10 bg-white placeholder:text-slate-400"
          placeholder="Tìm theo tên / email / SĐT / trường / vai trò…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1.8fr_1.2fr_1.6fr_110px_140px_130px] gap-2 px-3 py-2 bg-blue-50 border-b">
          <div className="font-bold">Họ tên</div>
          <div className="font-bold">Email</div>
          <div className="font-bold">Điện thoại</div>
          <div className="font-bold">Trường</div>
          <div className="font-bold">Vai trò</div>
          <div className="font-bold">Trạng thái</div>
          <div className="font-bold">Hành động</div>
        </div>

        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 animate-pulse border-b" />
          ))
        ) : (filtered?.length ?? 0) === 0 ? (
          <div className="text-center text-slate-500 py-6">
            Chưa có giáo viên.
          </div>
        ) : (
          filtered!.map((item) => {
            const schoolName = item.schoolId
              ? schoolMap.get(item.schoolId)?.name ?? "-"
              : "-";
            return (
              <div
                key={item._id ?? item.email}
                className="grid grid-cols-[1.6fr_1.8fr_1.2fr_1.6fr_110px_140px_130px] gap-2 px-3 py-2 border-b items-center"
              >
                <div className="font-semibold truncate">{item.fullName}</div>
                <div className="truncate">{item.email}</div>
                <div className="truncate">{item.phone ?? "-"}</div>
                <div className="truncate">{schoolName}</div>
                <div>
                  <span
                    className={`px-2 py-1 rounded-md text-white ${
                      item.role === "admin" ? "bg-sky-500" : "bg-emerald-500"
                    }`}
                  >
                    {item.role?.toUpperCase() ?? "TEACHER"}
                  </span>
                </div>
                <div>
                  <span
                    className={`px-2 py-1 rounded-md text-white ${
                      item.isActive ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  >
                    {item.isActive ? "Đang hoạt động" : "Ngưng"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Sửa</span>
                  </button>
                  <button
                    onClick={() => remove(item._id)}
                    className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Xoá</span>
                  </button>
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
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl max-h-[85vh] overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold">
                  {editing ? "Sửa giáo viên" : "Thêm giáo viên"}
                </div>
                <button
                  onClick={() => setVisible(false)}
                  className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Mã nhân viên">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    placeholder="VD: GV001"
                    value={form.employeeId ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, employeeId: e.target.value })
                    }
                    disabled={!!editing}
                  />
                </Field>
                <Field label="Họ tên">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    placeholder="VD: Nguyễn Văn A"
                    value={form.fullName ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                  />
                </Field>

                <Field label="Email">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    placeholder="email@domain.com"
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Điện thoại">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    placeholder="09xxxxxxxx"
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </Field>

                {!editing && (
                  <Field label="Mật khẩu (chỉ khi tạo mới)">
                    <input
                      type="password"
                      className="w-full border rounded-lg h-10 px-3 bg-white"
                      placeholder="Mật khẩu ban đầu"
                      value={form.password ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                    />
                  </Field>
                )}
                <Field label="Địa chỉ">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    placeholder="Số nhà, đường…"
                    value={form.address ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </Field>

                <Field label="Trường (tuỳ chọn)">
                  <select
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.schoolId ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, schoolId: e.target.value })
                    }
                  >
                    <option value="">-- Chưa gán --</option>
                    {(schools ?? []).map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Role">
                  <select
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.role ?? "teacher"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role: e.target.value as "teacher" | "admin",
                      })
                    }
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>

                <Field label="Trạng thái">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded-md text-white ${
                        form.isActive ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    >
                      {form.isActive ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() =>
                        setForm({ ...form, isActive: !form.isActive })
                      }
                      className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
                    >
                      <span className="text-sm font-semibold">
                        {form.isActive ? "Khoá" : "Mở"}
                      </span>
                    </button>
                  </div>
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
                  className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Save className="w-4 h-4" />
                  <span className="text-sm font-semibold">Lưu</span>
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
