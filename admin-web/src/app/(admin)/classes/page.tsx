/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { RefreshCcw, Plus, Edit3, Trash2, X, Save } from "lucide-react";

type Teacher = {
  _id?: string;
  fullName?: string;
  role?: string;
};

type School = {
  _id?: string;
  name: string;
};

type ClassEntity = {
  _id?: string;
  schoolId: string;
  name: string;
  teacherId: string;
  assistantTeacherIds?: string[];
  ageGroup?: string;
  capacity?: number;
  academicYear?: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
  studentCount?: number;
};

function cleanPayload(c: ClassEntity) {
  return {
    schoolId: c.schoolId,
    name: c.name?.trim(),
    teacherId: c.teacherId,
    assistantTeacherIds: (c.assistantTeacherIds || []).filter(Boolean),
    ageGroup: c.ageGroup?.trim() || undefined,
    capacity: Number(c.capacity ?? 30),
    academicYear: c.academicYear?.trim() || undefined,
    startTime: c.startTime?.trim() || undefined,
    endTime: c.endTime?.trim() || undefined,
    isActive: !!c.isActive,
  };
}

export default function Page() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<ClassEntity | null>(null);
  const [form, setForm] = useState<ClassEntity>({
    schoolId: "",
    name: "",
    teacherId: "",
    assistantTeacherIds: [],
    ageGroup: "",
    capacity: 30,
    academicYear: "",
    isActive: true,
  });

  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => (await api.get("/schools")).data as School[],
  });
  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => (await api.get("/teachers")).data as Teacher[],
  });
  const {
    data: classes,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data as ClassEntity[],
  });

  const teacherMap = useMemo(() => {
    const m = new Map<string, Teacher>();
    (teachers ?? []).forEach((t) => t._id && m.set(t._id, t));
    return m;
  }, [teachers]);

  const schoolMap = useMemo(() => {
    const m = new Map<string, School>();
    (schools ?? []).forEach((s) => s._id && m.set(s._id, s));
    return m;
  }, [schools]);

  const eligibleTeachers = useMemo(
    () => (teachers ?? []).filter((t) => t.role === "teacher"),
    [teachers]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return classes ?? [];
    return (classes ?? []).filter((c) => {
      const sName = schoolMap.get(c.schoolId)?.name?.toLowerCase() || "";
      const tName = teacherMap.get(c.teacherId)?.fullName?.toLowerCase() || "";
      const aNames = (c.assistantTeacherIds || [])
        .map((id) => teacherMap.get(id)?.fullName?.toLowerCase() || "")
        .join(" ");
      return (
        c.name?.toLowerCase().includes(qq) ||
        c.ageGroup?.toLowerCase().includes(qq) ||
        c.academicYear?.toLowerCase().includes(qq) ||
        sName.includes(qq) ||
        tName.includes(qq) ||
        aNames.includes(qq)
      );
    });
  }, [q, classes, schoolMap, teacherMap]);

  const mSave = useMutation({
    mutationFn: async (payload: ClassEntity) => {
      const clean = cleanPayload(payload);
      if (editing?._id) {
        return (await api.put(`/classes/${editing._id}`, clean)).data;
      }
      return (await api.post("/classes", clean)).data;
    },
    onSuccess: async () => {
      setVisible(false);
      setEditing(null);
      setForm({
        schoolId: schools?.[0]?._id || "",
        name: "",
        teacherId: eligibleTeachers?.[0]?._id || "",
        assistantTeacherIds: [],
        ageGroup: "",
        capacity: 30,
        academicYear: "",
        isActive: true,
      });
      await qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  const mDelete = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/classes/${id}`)).data,
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      schoolId: schools?.[0]?._id || "",
      name: "",
      teacherId: eligibleTeachers?.[0]?._id || "",
      assistantTeacherIds: [],
      ageGroup: "",
      capacity: 30,
      academicYear: "",
      startTime: "07:30",
      endTime: "16:30",
      isActive: true,
    });
    setVisible(true);
  };

  const openEdit = (c: ClassEntity) => {
    setEditing(c);
    setForm({
      schoolId: c.schoolId,
      name: c.name,
      teacherId: c.teacherId,
      assistantTeacherIds: [...(c.assistantTeacherIds ?? [])],
      ageGroup: c.ageGroup ?? "",
      capacity: c.capacity ?? 30,
      academicYear: c.academicYear ?? "",
      startTime: c.startTime ?? "07:30",
      endTime: c.endTime ?? "16:30",
      isActive: c.isActive ?? true,
    });
    setVisible(true);
  };

  const submit = async () => {
    if (!form.schoolId) return alert("Chọn trường");
    if (!form.name?.trim()) return alert("Nhập tên lớp");
    if (!form.teacherId) return alert("Chọn GVCN");

    const assistants = (form.assistantTeacherIds || [])
      .filter(Boolean)
      .map(String)
      .filter((id) => id !== form.teacherId);
    if (new Set(assistants).size !== assistants.length) {
      return alert("2 giáo viên phụ trùng nhau");
    }

    try {
      await mSave.mutateAsync({ ...form, assistantTeacherIds: assistants });
    } catch (e: any) {
      alert(e?.response?.data?.message || "Lưu thất bại");
    }
  };

  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm("Xác nhận xoá lớp này?")) return;
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
        <h2 className="text-xl font-bold">Danh sách lớp</h2>
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
            <span className="text-sm font-semibold">Thêm lớp</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          className="w-full border rounded-lg px-3 h-10 bg-white placeholder:text-slate-400"
          placeholder="Tìm theo tên lớp / trường / giáo viên / năm học..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {/* head */}
        <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1.4fr_1.2fr_140px_120px_120px_130px_130px] gap-2 px-3 py-2 bg-emerald-50 border-b">
          <div className="font-bold">Tên lớp</div>
          <div className="font-bold">Trường</div>
          <div className="font-bold">Nhóm tuổi</div>
          <div className="font-bold">GVCN</div>
          <div className="font-bold">GV phụ</div>
          <div className="font-bold text-center">Giờ học</div>
          <div className="font-bold text-center">Sĩ số</div>
          <div className="font-bold">Năm học</div>
          <div className="font-bold">Trạng thái</div>
          <div className="font-bold">Hành động</div>
        </div>

        {/* body */}
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 animate-pulse border-b" />
          ))
        ) : (filtered?.length ?? 0) === 0 ? (
          <div className="text-center text-slate-500 py-6">Chưa có lớp.</div>
        ) : (
          filtered!.map((item) => {
            const t = teacherMap.get(item.teacherId);
            const assistantNames = (item.assistantTeacherIds || [])
              .map((id) => teacherMap.get(id)?.fullName)
              .filter(Boolean) as string[];
            const s = schoolMap.get(item.schoolId);

            return (
              <div
                key={item._id ?? item.name}
                className="grid grid-cols-[1.4fr_1.4fr_1fr_1.4fr_1.2fr_140px_120px_120px_130px_130px] gap-2 px-3 py-2 border-b items-center"
              >
                <div className="font-semibold">
                  {item.name}
                  {item.academicYear ? ` (${item.academicYear})` : ""}
                </div>
                <div className="truncate">{s?.name || item.schoolId}</div>
                <div>{item.ageGroup || "-"}</div>
                <div className="truncate">{t?.fullName || item.teacherId}</div>
                <div className="whitespace-pre-wrap">
                  {assistantNames.length ? assistantNames.join("\n") : "-"}
                </div>
                <div className="text-center">
                  {item.startTime && item.endTime
                    ? `${item.startTime} - ${item.endTime}`
                    : "-"}
                </div>

                <div className="text-center">
                  {item.studentCount ?? 0}/{item.capacity ?? 30}
                </div>
                <div>{item.academicYear || "-"}</div>
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
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl max-h-[85vh] overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold">
                  {editing ? "Sửa lớp" : "Thêm lớp"}
                </div>
                <button
                  onClick={() => setVisible(false)}
                  className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Trường">
                  <select
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.schoolId}
                    onChange={(e) =>
                      setForm({ ...form, schoolId: e.target.value })
                    }
                  >
                    {(schools ?? []).map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tên lớp">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    placeholder="VD: Lớp Chồi A"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>

                <Field label="Nhóm tuổi">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    placeholder="VD: 3-4 tuổi"
                    value={form.ageGroup ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, ageGroup: e.target.value })
                    }
                  />
                </Field>
                <Field label="Năm học">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    placeholder="VD: 2024-2025"
                    value={form.academicYear ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, academicYear: e.target.value })
                    }
                  />
                </Field>

                <Field label="GVCN">
                  <select
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.teacherId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        teacherId: v,
                        assistantTeacherIds: (
                          prev.assistantTeacherIds ?? []
                        ).filter((id) => id && id !== v),
                      }));
                    }}
                  >
                    {(eligibleTeachers ?? []).map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="GV phụ (tuỳ chọn)">
                  <div className="space-y-2">
                    {(form.assistantTeacherIds ?? []).map((val, idx) => {
                      const selectedSet = new Set(
                        (form.assistantTeacherIds ?? []).filter(
                          (_, i) => i !== idx
                        )
                      );
                      const filteredTeachers = (eligibleTeachers ?? []).filter(
                        (t) =>
                          t._id !== form.teacherId &&
                          !selectedSet.has(t._id || "")
                      );
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            className="w-full border rounded-lg h-10 px-3 bg-white"
                            value={val || ""}
                            onChange={(e) => {
                              const arr = [...(form.assistantTeacherIds ?? [])];
                              arr[idx] = e.target.value;
                              setForm({
                                ...form,
                                assistantTeacherIds: arr.filter(
                                  (id) => id && id !== form.teacherId
                                ),
                              });
                            }}
                          >
                            <option value="">-- Chọn --</option>
                            {filteredTeachers.map((t) => (
                              <option key={t._id} value={t._id}>
                                {t.fullName}
                              </option>
                            ))}
                          </select>
                          <button
                            className="px-3 h-10 rounded-lg border hover:bg-slate-50"
                            onClick={() => {
                              const arr = [...(form.assistantTeacherIds ?? [])];
                              arr.splice(idx, 1);
                              setForm({ ...form, assistantTeacherIds: arr });
                            }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}

                    <button
                      onClick={() =>
                        setForm({
                          ...form,
                          assistantTeacherIds: [
                            ...(form.assistantTeacherIds ?? []),
                            "",
                          ],
                        })
                      }
                      className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-semibold">Thêm GV phụ</span>
                    </button>
                  </div>
                </Field>

                <Field label="Sức chứa tối đa">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    inputMode="numeric"
                    value={String(form.capacity ?? 30)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        capacity: Number(e.target.value) || 30,
                      })
                    }
                  />
                </Field>
                <Field label="Giờ bắt đầu">
                  <input
                    type="time"
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.startTime ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                  />
                </Field>
                <Field label="Giờ kết thúc">
                  <input
                    type="time"
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.endTime ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                  />
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
