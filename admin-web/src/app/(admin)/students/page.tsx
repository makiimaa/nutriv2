/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { RefreshCcw, Plus, Edit3, Trash2, X, Save } from "lucide-react";

type Student = {
  _id?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
  schoolId?: string;
  classId?: string;
  isActive?: boolean;
  schoolProvidedId?: string;
};
type ClassEntity = { _id?: string; name: string; schoolId: string };
type School = { _id?: string; name: string };

function ymd(s?: string) {
  if (!s) return "";
  const d = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
}
function cleanPayload(s: Student) {
  return {
    fullName: (s.fullName ?? "").trim(),
    dateOfBirth: (s.dateOfBirth ?? "").trim(),
    gender: (s.gender ?? "male") as "male" | "female",
    schoolId: s.schoolId!,
    classId: s.classId!,
    isActive: s.isActive !== false,
    schoolProvidedId: (s.schoolProvidedId ?? "").trim(),
  };
}

export default function Page() {
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<Student>({
    fullName: "",
    dateOfBirth: "",
    gender: "male",
    schoolId: "",
    classId: "",
    isActive: true,
    schoolProvidedId: "",
  });

  const {
    data: students,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["students"],
    queryFn: async () => (await api.get("/students")).data as Student[],
  });
  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => (await api.get("/schools")).data as School[],
  });
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data as ClassEntity[],
  });

  const classMap = useMemo(() => {
    const m = new Map<string, ClassEntity>();
    (classes ?? []).forEach((c) => c._id && m.set(c._id, c));
    return m;
  }, [classes]);
  const schoolMap = useMemo(() => {
    const m = new Map<string, School>();
    (schools ?? []).forEach((s) => s._id && m.set(s._id, s));
    return m;
  }, [schools]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return students ?? [];
    return (students ?? []).filter((s) => {
      const name = (s.fullName ?? "").toLowerCase();
      const dob = ymd(s.dateOfBirth).toLowerCase();
      const clz = s.classId
        ? (classMap.get(s.classId)?.name ?? s.classId).toLowerCase()
        : "";
      const sch = s.schoolId
        ? (schoolMap.get(s.schoolId)?.name ?? s.schoolId).toLowerCase()
        : "";
      const gender = (s.gender ?? "").toLowerCase();
      const mhs = (s.schoolProvidedId ?? "").toLowerCase();
      return [name, dob, clz, sch, gender, mhs].some((x) => x.includes(qq));
    });
  }, [q, students, classMap, schoolMap]);

  const classOptions = useMemo(() => {
    if (!form.schoolId) return classes ?? [];
    return (classes ?? []).filter((c) => c.schoolId === form.schoolId);
  }, [classes, form.schoolId]);

  const mSave = useMutation({
    mutationFn: async (payload: Student) => {
      const clean = cleanPayload(payload);
      if (!clean.fullName) throw new Error("Nhập họ tên");
      if (!clean.dateOfBirth) throw new Error("Nhập ngày sinh");
      if (!clean.classId) throw new Error("Chọn lớp");
      if (!clean.schoolId) throw new Error("Chọn trường");
      if (!clean.schoolProvidedId) throw new Error("Nhập MHS");
      if (editing?._id)
        return (await api.put(`/students/${editing._id}`, clean)).data;
      return (await api.post("/students", clean)).data;
    },
    onSuccess: async () => {
      setVisible(false);
      setEditing(null);
      setForm({
        fullName: "",
        dateOfBirth: "",
        gender: "male",
        schoolId: schools?.[0]?._id ?? "",
        classId:
          (classes ?? []).find(
            (c) => !schools?.[0]?._id || c.schoolId === schools?.[0]?._id
          )?._id ?? "",
        isActive: true,
        schoolProvidedId: "",
      });
      await qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: any) =>
      alert(e?.response?.data?.message || e?.message || "Lưu thất bại"),
  });

  const mDelete = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/students/${id}`)).data,
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["students"] }),
    onError: (e: any) => alert(e?.response?.data?.message || "Xoá thất bại"),
  });

  const openAdd = () => {
    const firstSchoolId = schools?.[0]?._id ?? "";
    const firstClassInSchool =
      (classes ?? []).find(
        (c) => !firstSchoolId || c.schoolId === firstSchoolId
      )?._id ?? "";
    setEditing(null);
    setForm({
      fullName: "",
      dateOfBirth: "",
      gender: "male",
      schoolId: firstSchoolId,
      classId: firstClassInSchool,
      isActive: true,
      schoolProvidedId: "",
    });
    setVisible(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      fullName: s.fullName ?? "",
      dateOfBirth: ymd(s.dateOfBirth),
      gender: (s.gender as any) ?? "male",
      schoolId: s.schoolId ?? "",
      classId: s.classId ?? "",
      isActive: s.isActive ?? true,
      schoolProvidedId: s.schoolProvidedId ?? "",
    });
    setVisible(true);
  };

  const onChangeSchool = (schoolId: string) => {
    const firstInSchool =
      (classes ?? []).find((c) => c.schoolId === schoolId)?._id ?? "";
    setForm((f) => ({ ...f, schoolId, classId: firstInSchool }));
  };

  const submit = async () => {
    await mSave.mutateAsync(form);
  };
  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm("Xác nhận xoá học sinh này?")) return;
    await mDelete.mutateAsync(id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Danh sách học sinh</h2>
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
            <span className="text-sm font-semibold">Thêm học sinh</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          className="w-full border rounded-lg px-3 h-10 bg-white placeholder:text-slate-400"
          placeholder="Tìm theo tên / ngày sinh / lớp / trường / giới tính…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {/* head */}
        <div className="grid grid-cols-[1.6fr_130px_160px_110px_1.4fr_1.6fr_130px] gap-2 px-3 py-2 bg-emerald-50 border-b">
          <div className="font-bold">Họ tên</div>
          <div className="font-bold">Ngày sinh</div>
          <div className="font-bold">MHS</div>
          <div className="font-bold">Giới tính</div>
          <div className="font-bold">Lớp</div>
          <div className="font-bold">Trường</div>
          <div className="font-bold">Hành động</div>
        </div>

        {/* body */}
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 animate-pulse border-b" />
          ))
        ) : (filtered?.length ?? 0) === 0 ? (
          <div className="text-center text-slate-500 py-6">
            Chưa có học sinh.
          </div>
        ) : (
          filtered!.map((item) => {
            const dob = ymd(item.dateOfBirth) || "-";
            const clz = item.classId
              ? classMap.get(item.classId)?.name ?? item.classId
              : "-";
            const sch = item.schoolId
              ? schoolMap.get(item.schoolId)?.name ?? item.schoolId
              : "-";
            return (
              <div
                key={item._id ?? `${item.fullName}-${dob}`}
                className="grid grid-cols-[1.6fr_130px_160px_110px_1.4fr_1.6fr_130px] gap-2 px-3 py-2 border-b items-center"
              >
                <div className="font-semibold truncate">{item.fullName}</div>
                <div className="truncate">{dob}</div>
                <div className="truncate">{item.schoolProvidedId ?? "-"}</div>
                <div>
                  <span
                    className={`px-2 py-1 rounded-md text-white ${
                      item.gender === "female" ? "bg-pink-400" : "bg-sky-400"
                    }`}
                  >
                    {(item.gender ?? "male").toString().toUpperCase()}
                  </span>
                </div>
                <div className="truncate">{clz}</div>
                <div className="truncate">{sch}</div>
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
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl max-h-[85vh] overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold">
                  {editing ? "Sửa học sinh" : "Thêm học sinh"}
                </div>
                <button
                  onClick={() => setVisible(false)}
                  className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                <Field label="Ngày sinh">
                  <input
                    type="date"
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.dateOfBirth ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, dateOfBirth: e.target.value })
                    }
                  />
                </Field>

                <Field label="Mã học sinh (MHS)">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    placeholder="VD: HS-2025-000123"
                    value={form.schoolProvidedId ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, schoolProvidedId: e.target.value })
                    }
                  />
                </Field>
                <Field label="Giới tính">
                  <select
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.gender ?? "male"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gender: e.target.value as "male" | "female",
                      })
                    }
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </Field>

                <Field label="Trường">
                  <select
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.schoolId ?? ""}
                    onChange={(e) => onChangeSchool(e.target.value)}
                  >
                    {(schools ?? []).map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Lớp">
                  <select
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.classId ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, classId: e.target.value })
                    }
                  >
                    {classOptions.length === 0 && (
                      <option value="">(Chưa có lớp phù hợp)</option>
                    )}
                    {classOptions.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
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
