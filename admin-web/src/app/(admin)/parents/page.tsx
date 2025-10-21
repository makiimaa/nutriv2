/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/axios";
import { RefreshCcw, Plus, Trash2, Edit3, X, Save } from "lucide-react";

type Parent = {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  studentIds: string[];
};
type Student = {
  _id?: string;
  fullName?: string;
  name?: string;
  classId?: string;
};
type School = { _id?: string; name: string };
type Clazz = { _id?: string; name: string; schoolId: string };

export default function Page() {
  const [rows, setRows] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Clazz[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [pwd, setPwd] = useState("");

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  async function fetchAll() {
    try {
      setLoading(true);
      const [p, s, sch, clz] = await Promise.all([
        api.get("/parents"),
        api.get("/students"),
        api.get("/schools"),
        api.get("/classes"),
      ]);
      setRows(p.data || []);
      setStudents(s.data || []);
      setSchools(sch.data || []);
      setClasses(clz.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchAll();
  }, []);

  const classMap = useMemo(() => {
    const m = new Map<string, Clazz>();
    classes.forEach((c) => c._id && m.set(c._id, c));
    return m;
  }, [classes]);

  const studentNameMap = useMemo(() => {
    const m = new Map<string, string>();
    students.forEach((s) => {
      if (s._id) m.set(s._id, s.fullName || s.name || s._id);
    });
    return m;
  }, [students]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => {
      const stuNames = (r.studentIds || [])
        .map((id) => studentNameMap.get(id) || "")
        .join(" ");
      return (
        r.name?.toLowerCase().includes(qq) ||
        r.email?.toLowerCase().includes(qq) ||
        (r.phone || "").toLowerCase().includes(qq) ||
        stuNames.toLowerCase().includes(qq)
      );
    });
  }, [q, rows, studentNameMap]);

  const classesBySchool = useMemo(
    () =>
      classes.filter(
        (c) => !selectedSchoolId || c.schoolId === selectedSchoolId
      ),
    [classes, selectedSchoolId]
  );

  const studentsByFilter = useMemo(() => {
    if (selectedClassId)
      return students.filter((s) => s.classId === selectedClassId);
    if (selectedSchoolId) {
      const ids = new Set(
        classes.filter((c) => c.schoolId === selectedSchoolId).map((c) => c._id)
      );
      return students.filter((s) => s.classId && ids.has(s.classId));
    }
    return students;
  }, [students, selectedClassId, selectedSchoolId, classes]);

  function openAdd() {
    const sid = schools[0]?._id || "";
    const firstCls = classes.find((c) => c.schoolId === sid);
    const cid = firstCls?._id || "";
    setSelectedSchoolId(sid);
    setSelectedClassId(cid);
    setEditing({ name: "", email: "", phone: "", studentIds: [] });
    setPwd("");
    setVisible(true);
  }

  function openEdit(p: Parent) {
    let sid = "",
      cid = "";
    const firstStuId = (p.studentIds || [])[0];
    if (firstStuId) {
      const stu = students.find((s) => s._id === firstStuId);
      if (stu?.classId) {
        cid = stu.classId;
        const clz = classMap.get(cid);
        if (clz?.schoolId) sid = clz.schoolId;
      }
    }
    if (!sid) sid = schools[0]?._id || "";
    if (!cid) cid = classes.find((c) => c.schoolId === sid)?._id || "";
    setSelectedSchoolId(sid);
    setSelectedClassId(cid);
    setEditing({
      ...p,
      studentIds: Array.isArray(p.studentIds) ? p.studentIds : [],
    });
    setPwd("");
    setVisible(true);
  }

  async function submit() {
    if (!editing) return;
    const alertWeb = (msg: string) => (window as any).alert?.(msg);
    if (!editing.name?.trim()) return alertWeb("Nhập tên phụ huynh");
    if (!editing.email?.trim()) return alertWeb("Nhập email");

    const kids = Array.from(
      new Set((editing.studentIds || []).filter(Boolean))
    );
    if (kids.length === 0) return alertWeb("Chọn ít nhất một học sinh");

    if (editing._id) {
      const patch: any = {
        name: editing.name.trim(),
        email: editing.email.trim().toLowerCase(),
        phone: editing.phone || undefined,
        studentIds: kids,
      };
      if (pwd) patch.password = pwd;
      await api.put(`/parents/${editing._id}`, patch);
    } else {
      await api.post("/parents", {
        name: editing.name.trim(),
        email: editing.email.trim().toLowerCase(),
        phone: editing.phone || undefined,
        studentIds: kids,
        password: pwd || "123456",
      });
    }
    setVisible(false);
    await fetchAll();
  }

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm("Xác nhận xoá phụ huynh này?")) return;
    await api.delete(`/parents/${id}`);
    await fetchAll();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Quản lý phụ huynh</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="text-sm font-semibold">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 border rounded-lg h-10 px-3 bg-white"
          placeholder="Tìm theo tên / email / SĐT / tên học sinh…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-semibold">Thêm phụ huynh</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1.8fr_1.2fr_1.8fr_130px] gap-2 px-3 py-2 bg-indigo-50 border-b text-slate-900">
          <div className="font-bold">Tên</div>
          <div className="font-bold">Email</div>
          <div className="font-bold">Điện thoại</div>
          <div className="font-bold">Học sinh</div>
          <div className="font-bold">Hành động</div>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 animate-pulse border-b" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-6">
            Chưa có phụ huynh.
          </div>
        ) : (
          filtered.map((item) => {
            const childNames = (item.studentIds || [])
              .map((id) => studentNameMap.get(id))
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={item._id ?? item.email}
                className="grid grid-cols-[1.6fr_1.8fr_1.2fr_1.8fr_130px] gap-2 px-3 py-2 border-b items-center"
              >
                <div className="font-semibold truncate">{item.name}</div>
                <div className="truncate">{item.email}</div>
                <div className="truncate">{item.phone || "-"}</div>
                <div className="whitespace-pre-line truncate">
                  {childNames || "-"}
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

      {/* Modal Add/Edit */}
      {visible && (
        <ModalForm
          onClose={() => setVisible(false)}
          onSaved={submit}
          editing={editing}
          setEditing={setEditing}
          pwd={pwd}
          setPwd={setPwd}
          schools={schools}
          classes={classes}
          studentsByFilter={studentsByFilter}
          selectedSchoolId={selectedSchoolId}
          setSelectedSchoolId={(sid) => {
            setSelectedSchoolId(sid);
            const firstCls = classes.find((c) => c.schoolId === sid);
            const cid = firstCls?._id || "";
            setSelectedClassId(cid);
            setEditing((p) =>
              p ? { ...p, studentIds: (p.studentIds || []).map(() => "") } : p
            );
          }}
          selectedClassId={selectedClassId}
          setSelectedClassId={(cid) => {
            setSelectedClassId(cid);
            setEditing((p) =>
              p ? { ...p, studentIds: (p.studentIds || []).map(() => "") } : p
            );
          }}
        />
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

function ModalForm({
  onClose,
  onSaved,
  editing,
  setEditing,
  pwd,
  setPwd,
  schools,
  classes,
  studentsByFilter,
  selectedSchoolId,
  setSelectedSchoolId,
  selectedClassId,
  setSelectedClassId,
}: {
  onClose: () => void;
  onSaved: () => void;
  editing: Parent | null;
  setEditing: (v: Parent | null) => void;
  pwd: string;
  setPwd: (v: string) => void;
  schools: School[];
  classes: Clazz[];
  studentsByFilter: Student[];
  selectedSchoolId: string;
  setSelectedSchoolId: (v: string) => void;
  selectedClassId: string;
  setSelectedClassId: (v: string) => void;
}) {
  if (!editing) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl max-h-[85vh] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-bold">
              {editing._id ? "Sửa phụ huynh" : "Thêm phụ huynh"}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Trường">
              <select
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
              >
                {schools.length === 0 && (
                  <option value="">(Chưa có trường)</option>
                )}
                {schools.map((s) => (
                  <option key={s._id} value={s._id || ""}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lớp">
              <select
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.filter(
                  (c) => !selectedSchoolId || c.schoolId === selectedSchoolId
                ).length === 0 && <option value="">(Chưa có lớp)</option>}
                {classes
                  .filter(
                    (c) => !selectedSchoolId || c.schoolId === selectedSchoolId
                  )
                  .map((c) => (
                    <option key={c._id} value={c._id || ""}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Tên">
              <input
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                placeholder="VD: Phạm Thị B"
              />
            </Field>
            <Field label="Email">
              <input
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={editing.email}
                onChange={(e) =>
                  setEditing({ ...editing, email: e.target.value })
                }
                placeholder="email@domain.com"
              />
            </Field>

            <Field label="Điện thoại">
              <input
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={editing.phone || ""}
                onChange={(e) =>
                  setEditing({ ...editing, phone: e.target.value })
                }
                placeholder="VD: 09xxxxxxxx"
              />
            </Field>
            <div />
          </div>

          <div className="mt-3">
            <div className="text-sm font-semibold text-slate-800 mb-1">
              Học sinh (có thể chọn nhiều)
            </div>
            <div className="grid gap-2">
              {(editing.studentIds || []).map((val, idx) => {
                const selectedSet = new Set(
                  (editing.studentIds || []).filter((_, i) => i !== idx)
                );
                const list = studentsByFilter.filter(
                  (s) => s._id && !selectedSet.has(s._id)
                );
                return (
                  <div key={`kid-${idx}`} className="flex items-center gap-2">
                    <select
                      className="flex-1 border rounded-lg h-10 px-3 bg-white"
                      value={val || ""}
                      onChange={(e) => {
                        const arr = [...(editing.studentIds || [])];
                        arr[idx] = e.target.value;
                        setEditing({ ...editing, studentIds: arr });
                      }}
                    >
                      <option value="">-- Chọn học sinh --</option>
                      {list.map((s) => (
                        <option key={s._id} value={s._id || ""}>
                          {s.fullName || s.name || s._id}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const arr = [...(editing.studentIds || [])];
                        arr.splice(idx, 1);
                        setEditing({ ...editing, studentIds: arr });
                      }}
                      className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-semibold">Bỏ</span>
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() =>
                  setEditing({
                    ...editing,
                    studentIds: [...(editing.studentIds || []), ""],
                  })
                }
                className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50 w-fit"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-semibold">Thêm con</span>
              </button>
            </div>
          </div>

          <div className="mt-3">
            <Field
              label={`Mật khẩu ${
                editing._id ? "(để trống nếu không đổi)" : ""
              }`}
            >
              <input
                type="password"
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder={
                  editing._id ? "Không đổi thì để trống" : "Mật khẩu ban đầu"
                }
              />
            </Field>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
              <span className="text-sm font-semibold">Đóng</span>
            </button>
            <button
              onClick={onSaved}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm font-semibold">Lưu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
