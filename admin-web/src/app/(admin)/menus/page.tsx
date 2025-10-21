/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import {
  RefreshCcw,
  Plus,
  Eye,
  Edit3,
  Trash2,
  X,
  Save,
  Filter,
} from "lucide-react";

type FoodItem = { _id?: string; name: string; unit?: string };
type School = { _id?: string; name: string };
type ClassEnt = { _id?: string; schoolId: string; name: string };
type MenuMealItem = {
  foodItemId: string;
  quantity: number;
  preparationMethod?: string;
};
type MenuRow = {
  _id?: string;
  schoolId: string;
  classId: string;
  date: string;
  menuType: "regular" | "vegetarian" | "allergy_free";
  targetAgeGroup?: string;
  groupName?: string;
  specialNotes?: string;
  meals?: {
    breakfast?: {
      items: MenuMealItem[];
      totalNutrition?: { calories?: number };
    };
    lunch?: { items: MenuMealItem[]; totalNutrition?: { calories?: number } };
    snack?: { items: MenuMealItem[]; totalNutrition?: { calories?: number } };
  };
  dailyTotalNutrition?: { calories?: number };
};

function kcal(m?: any) {
  return m?.totalNutrition?.calories ?? 0;
}

export default function Page() {
  const qc = useQueryClient();

  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => (await api.get("/schools")).data as School[],
  });
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data as ClassEnt[],
  });
  const { data: foodItems } = useQuery({
    queryKey: ["food-items"],
    queryFn: async () => (await api.get("/food-items")).data as FoodItem[],
  });

  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState<{
    visible: boolean;
    data?: MenuRow | null;
  }>({ visible: false, data: null });

  useEffect(() => {
    if (schools?.[0]?._id) setSelectedSchool(String(schools[0]._id));
  }, [schools]);

  const classMap = useMemo(() => {
    const m = new Map<string, ClassEnt>();
    (classes ?? []).forEach((c) => c._id && m.set(String(c._id), c));
    return m;
  }, [classes]);

  async function loadMenus() {
    if (!selectedSchool) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const qs = params.toString() ? `?${params.toString()}` : "";

      let res: MenuRow[] = [];
      if (selectedClass) {
        res =
          (await api.get(`/menus/for-class/${selectedClass}${qs}`)).data || [];
      } else {
        res =
          (await api.get(`/menus/school/${selectedSchool}${qs}`)).data || [];
      }

      const schoolIdStr = String(selectedSchool || "");
      const classIdStr = String(selectedClass || "");
      let normalized = (res || []).map((m: any) => ({ ...m })) as MenuRow[];

      normalized = normalized.filter((m) => {
        const okS = !schoolIdStr || String(m.schoolId || "") === schoolIdStr;
        const okC = !classIdStr || String(m.classId || "") === classIdStr;
        return okS && okC;
      });
      normalized.sort(
        (a, b) =>
          new Date(String(a.date || 0)).getTime() -
          new Date(String(b.date || 0)).getTime()
      );

      const seen = new Set<string>();
      const uniq = normalized.filter((m) => {
        const key = String(m._id || `${String(m.date)}::${String(m.classId)}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setMenus(uniq);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSelectedClass("");
    if (selectedSchool) loadMenus();
  }, [selectedSchool]);
  useEffect(() => {
    if (selectedSchool) loadMenus();
  }, [selectedClass]);

  async function onDelete(id?: string) {
    if (!id) return;
    if (!confirm("Xoá thực đơn này?")) return;
    await api.delete(`/menus/${id}`);
    await loadMenus();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Thực đơn theo ngày</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMenus}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="text-sm font-semibold">Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-slate-800">
          <Filter className="w-4 h-4" />
          <div className="text-sm font-bold">Bộ lọc</div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Trường">
            <select
              className="w-full border rounded-lg h-10 px-3 bg-white"
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
            >
              {(schools ?? []).map((s) => (
                <option key={s._id} value={String(s._id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Từ ngày">
            <input
              type="date"
              className="w-full border rounded-lg h-10 px-3 bg-white"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </Field>

          <div className="md:pt-6">
            <button
              onClick={loadMenus}
              className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-semibold">Lọc</span>
            </button>
          </div>
        </div>

        <div className="mt-3 grid md:grid-cols-3 gap-3">
          <Field label="Lớp (tuỳ chọn)">
            <select
              className="w-full border rounded-lg h-10 px-3 bg-white"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Tất cả lớp --</option>
              {(classes ?? [])
                .filter((c) => String(c.schoolId) === String(selectedSchool))
                .map((c) => (
                  <option key={c._id} value={String(c._id)}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Đến ngày">
            <input
              type="date"
              className="w-full border rounded-lg h-10 px-3 bg-white"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </Field>

          <div className="md:pt-6">
            <button
              onClick={() => setDetail({ visible: true, data: null })}
              className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Thêm</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[120px_1.6fr_120px_1fr_120px_120px_120px_140px_150px] gap-2 px-3 py-2 bg-indigo-50 border-b text-slate-900">
          <div className="font-bold">Ngày</div>
          <div className="font-bold">Lớp</div>
          <div className="font-bold">Loại</div>
          <div className="font-bold">Nhóm</div>
          <div className="font-bold text-right">Sáng kcal</div>
          <div className="font-bold text-right">Trưa kcal</div>
          <div className="font-bold text-right">Xế kcal</div>
          <div className="font-bold text-right">Tổng ngày</div>
          <div className="font-bold">Hành động</div>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 animate-pulse border-b" />
          ))
        ) : menus.length === 0 ? (
          <div className="text-center text-slate-500 py-6">
            Chưa có thực đơn.
          </div>
        ) : (
          menus.map((item) => {
            const cls = classMap.get(String(item.classId || ""));
            return (
              <div
                key={String(item._id || `${item.date}::${item.classId}`)}
                className="grid grid-cols-[120px_1.6fr_120px_1fr_120px_120px_120px_140px_150px] gap-2 px-3 py-2 border-b items-center"
              >
                <div>{String(item.date || "").slice(0, 10)}</div>
                <div className="truncate">
                  {cls?.name || String(item.classId || "")}
                </div>
                <div>{item.menuType || "regular"}</div>
                <div className="truncate">
                  {item.groupName || item.targetAgeGroup || "-"}
                </div>
                <div className="text-right">{kcal(item.meals?.breakfast)}</div>
                <div className="text-right">{kcal(item.meals?.lunch)}</div>
                <div className="text-right">{kcal(item.meals?.snack)}</div>
                <div className="text-right font-bold">
                  {item.dailyTotalNutrition?.calories ?? 0}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetail({ visible: true, data: item })}
                    className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
                    title="Xem/Sửa"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-semibold">Xem</span>
                  </button>
                  <button
                    onClick={() => setDetail({ visible: true, data: item })}
                    className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
                    title="Sửa"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Sửa</span>
                  </button>
                  <button
                    onClick={() => onDelete(item._id)}
                    className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                    title="Xoá"
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
      {detail.visible && (
        <MenuForm
          onClose={() => setDetail({ visible: false })}
          onSaved={async () => {
            setDetail({ visible: false });
            await loadMenus();
          }}
          foodItems={foodItems ?? []}
          classes={(classes ?? []).filter(
            (c) => String(c.schoolId) === String(selectedSchool)
          )}
          schoolId={selectedSchool}
          initial={detail.data || undefined}
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

/** ===== Modal Form ===== */
function MenuForm({
  onClose,
  onSaved,
  foodItems,
  classes,
  schoolId,
  initial,
}: {
  onClose: () => void;
  onSaved: () => void;
  foodItems: FoodItem[];
  classes: ClassEnt[];
  schoolId: string;
  initial?: MenuRow;
}) {
  const [date, setDate] = useState("");
  const [menuType, setMenuType] = useState<
    "regular" | "vegetarian" | "allergy_free"
  >("regular");
  const [targetAgeGroup, setTargetAgeGroup] = useState("");
  const [groupName, setGroupName] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [classId, setClassId] = useState<string>("");

  const [breakfast, setBreakfast] = useState<MenuMealItem[]>([]);
  const [lunch, setLunch] = useState<MenuMealItem[]>([]);
  const [snack, setSnack] = useState<MenuMealItem[]>([]);

  useEffect(() => {
    if (!initial?._id) {
      setDate("");
      setMenuType("regular");
      setTargetAgeGroup("");
      setGroupName("");
      setSpecialNotes("");
      setClassId(classes[0]?._id ? String(classes[0]._id) : "");
      setBreakfast([]);
      setLunch([]);
      setSnack([]);
      return;
    }
    setDate(String(initial.date || "").slice(0, 10));
    setMenuType((initial.menuType as any) || "regular");
    setTargetAgeGroup(initial.targetAgeGroup || "");
    setGroupName(initial.groupName || "");
    setSpecialNotes(initial.specialNotes || "");
    setClassId(String(initial.classId || ""));
    setBreakfast(initial.meals?.breakfast?.items || []);
    setLunch(initial.meals?.lunch?.items || []);
    setSnack(initial.meals?.snack?.items || []);
  }, [initial]);

  const addRow = (
    setter: React.Dispatch<React.SetStateAction<MenuMealItem[]>>
  ) =>
    setter((v) => [
      ...v,
      { foodItemId: foodItems[0]?._id || "", quantity: 100 },
    ]);

  const updateRow = (
    setter: React.Dispatch<React.SetStateAction<MenuMealItem[]>>,
    idx: number,
    patch: Partial<MenuMealItem>
  ) =>
    setter((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );

  const removeRow = (
    setter: React.Dispatch<React.SetStateAction<MenuMealItem[]>>,
    idx: number
  ) => setter((prev) => prev.filter((_, i) => i !== idx));

  async function submit() {
    if (!schoolId) return alert("Chọn trường");
    if (!classId) return alert("Chọn lớp");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert("Chọn ngày hợp lệ");

    const body = {
      schoolId,
      classId,
      date,
      menuType,
      targetAgeGroup,
      specialNotes,
      groupName,
      meals: {
        breakfast: { items: breakfast },
        lunch: { items: lunch },
        snack: { items: snack },
      },
    };

    if (initial?._id) await api.put(`/menus/${initial._id}`, body);
    else await api.post("/menus", body);

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-bold">
              {initial?._id ? "Xem / Sửa thực đơn" : "Tạo thực đơn"}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            <Field label="Ngày áp dụng">
              <input
                type="date"
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Lớp">
              <select
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c._id} value={String(c._id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Loại">
              <select
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={menuType}
                onChange={(e) => setMenuType(e.target.value as any)}
              >
                <option value="regular">regular</option>
                <option value="vegetarian">vegetarian</option>
                <option value="allergy_free">allergy_free</option>
              </select>
            </Field>

            <Field label="Nhóm tuổi (vd 3-4)">
              <input
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={targetAgeGroup}
                onChange={(e) => setTargetAgeGroup(e.target.value)}
                placeholder="3-4"
              />
            </Field>
            <Field label="Tên nhóm (groupName)">
              <input
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="nhóm A, nhóm dị ứng sữa..."
              />
            </Field>
            <Field label="Ghi chú đặc biệt">
              <input
                className="w-full border rounded-lg h-10 px-3 bg-white"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Ghi chú"
              />
            </Field>
          </div>

          <MealBlock
            title="Bữa sáng"
            rows={breakfast}
            setRows={setBreakfast}
            foodItems={foodItems}
            addRow={() => addRow(setBreakfast)}
            updateRow={(i, p) => updateRow(setBreakfast, i, p)}
            removeRow={(i) => removeRow(setBreakfast, i)}
          />
          <MealBlock
            title="Bữa trưa"
            rows={lunch}
            setRows={setLunch}
            foodItems={foodItems}
            addRow={() => addRow(setLunch)}
            updateRow={(i, p) => updateRow(setLunch, i, p)}
            removeRow={(i) => removeRow(setLunch, i)}
          />
          <MealBlock
            title="Bữa xế"
            rows={snack}
            setRows={setSnack}
            foodItems={foodItems}
            addRow={() => addRow(setSnack)}
            updateRow={(i, p) => updateRow(setSnack, i, p)}
            removeRow={(i) => removeRow(setSnack, i)}
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
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
  );
}

function MealBlock({
  title,
  rows,
  setRows,
  foodItems,
  addRow,
  updateRow,
  removeRow,
}: {
  title: string;
  rows: MenuMealItem[];
  setRows: React.Dispatch<React.SetStateAction<MenuMealItem[]>>;
  foodItems: FoodItem[];
  addRow: () => void;
  updateRow: (i: number, p: Partial<MenuMealItem>) => void;
  removeRow: (i: number) => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="font-bold text-slate-900">{title}</div>
        <button
          onClick={addRow}
          className="px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
        >
          ＋
        </button>
      </div>
      {rows.length === 0 && (
        <div className="text-slate-500 mt-1">Chưa có món</div>
      )}
      <div className="grid gap-3 mt-2">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm"
          >
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Món">
                <select
                  className="w-full border rounded-lg h-10 px-3 bg-white"
                  value={row.foodItemId}
                  onChange={(e) =>
                    updateRow(idx, { foodItemId: e.target.value })
                  }
                >
                  {foodItems.map((fi) => (
                    <option key={fi._id} value={String(fi._id)}>
                      {fi.name}
                      {fi.unit ? ` (${fi.unit})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Khối lượng (đơn vị món)">
                <input
                  className="w-full border rounded-lg h-10 px-3 bg-white"
                  inputMode="numeric"
                  value={String(row.quantity ?? "")}
                  onChange={(e) =>
                    updateRow(idx, {
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="VD: 120"
                />
              </Field>
              <Field label="Cách chế biến">
                <input
                  className="w-full border rounded-lg h-10 px-3 bg-white"
                  value={row.preparationMethod || ""}
                  onChange={(e) =>
                    updateRow(idx, { preparationMethod: e.target.value })
                  }
                  placeholder="Hấp/luộc/xào..."
                />
              </Field>
            </div>

            <div className="mt-2 flex justify-end">
              <button
                onClick={() => removeRow(idx)}
                className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-semibold">Xoá</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
