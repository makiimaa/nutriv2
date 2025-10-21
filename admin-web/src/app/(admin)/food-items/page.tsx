/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { RefreshCcw, Plus, Edit3, Trash2, X, Save } from "lucide-react";

type Nutrition = {
  calories?: number;
  protein?: number;
  fat?: number;
  carbohydrate?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  calcium?: number;
  iron?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
};

type FoodItem = {
  _id?: string;
  name: string;
  category?: string;
  unit?: string;
  pricePerUnit?: number;
  currency?: string;
  nutrition?: Nutrition;
  isVegetarian?: boolean;
  isHalal?: boolean;
  isActive?: boolean;
};

const NUTRITION_KEYS = [
  "calories",
  "protein",
  "fat",
  "carbohydrate",
  "fiber",
  "sugar",
  "sodium",
  "calcium",
  "iron",
  "vitaminA",
  "vitaminC",
  "vitaminD",
] as const;

type NutritionKey = (typeof NUTRITION_KEYS)[number];

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function cleanPayload(fi: FoodItem) {
  return {
    name: fi.name?.trim(),
    category: fi.category?.trim() || undefined,
    unit: fi.unit?.trim() || undefined,
    pricePerUnit: Number(fi.pricePerUnit) || 0,
    currency: fi.currency?.trim() || "VND",
    isVegetarian: !!fi.isVegetarian,
    isHalal: fi.isHalal !== false,
    isActive: fi.isActive !== false,
    nutrition: Object.fromEntries(
      NUTRITION_KEYS.map((k) => [k, toNum((fi.nutrition as any)?.[k])])
    ),
  };
}

export default function Page() {
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [form, setForm] = useState<FoodItem>({
    name: "",
    category: "protein",
    unit: "g",
    pricePerUnit: 0,
    currency: "VND",
    nutrition: Object.fromEntries(NUTRITION_KEYS.map((k) => [k, 0])) as any,
    isVegetarian: false,
    isHalal: true,
    isActive: true,
  });

  const {
    data: items,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["food-items"],
    queryFn: async () => (await api.get("/food-items")).data as FoodItem[],
  });

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items ?? [];
    return (items ?? []).filter((it) => {
      const name = (it.name || "").toLowerCase();
      const cat = (it.category || "").toLowerCase();
      const unit = (it.unit || "").toLowerCase();
      return name.includes(qq) || cat.includes(qq) || unit.includes(qq);
    });
  }, [q, items]);

  const kcal = (it: FoodItem) => it?.nutrition?.calories ?? 0;

  const mSave = useMutation({
    mutationFn: async (payload: FoodItem) => {
      const body = cleanPayload(payload);
      if (editing?._id) {
        return (await api.put(`/food-items/${editing._id}`, body)).data;
      }
      return (await api.post("/food-items", body)).data;
    },
    onSuccess: async () => {
      setVisible(false);
      setEditing(null);
      setForm({
        name: "",
        category: "protein",
        unit: "g",
        nutrition: Object.fromEntries(NUTRITION_KEYS.map((k) => [k, 0])) as any,
        isVegetarian: false,
        isHalal: true,
        isActive: true,
      });
      await qc.invalidateQueries({ queryKey: ["food-items"] });
    },
  });

  const mDelete = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/food-items/${id}`)).data,
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["food-items"] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      category: "protein",
      unit: "g",
      nutrition: Object.fromEntries(NUTRITION_KEYS.map((k) => [k, 0])) as any,
      isVegetarian: false,
      isHalal: true,
      isActive: true,
    });
    setVisible(true);
  };

  const openEdit = (fi: FoodItem) => {
    setEditing(fi);
    setForm({
      _id: fi._id,
      name: fi.name || "",
      category: fi.category || "protein",
      unit: fi.unit || "g",
      nutrition: {
        ...Object.fromEntries(NUTRITION_KEYS.map((k) => [k, 0])),
        ...(fi.nutrition || {}),
      } as any,
      isVegetarian: !!fi.isVegetarian,
      isHalal: fi.isHalal !== false,
      isActive: fi.isActive !== false,
    });
    setVisible(true);
  };

  const submit = async () => {
    if (!form.name?.trim()) return alert("Nhập tên thực phẩm");
    try {
      await mSave.mutateAsync(form);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Lưu thất bại");
    }
  };

  const remove = async (id?: string) => {
    if (!id) return;
    if (!confirm("Xác nhận xoá thực phẩm này?")) return;
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
        <h2 className="text-xl font-bold">Danh mục thực phẩm</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="text-sm font-semibold">
              {isLoading ? "Đang tải…" : "Làm mới"}
            </span>
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-semibold">Thêm thực phẩm</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          className="w-full border rounded-lg px-3 h-10 bg-white placeholder:text-slate-400"
          placeholder="Tìm theo tên / nhóm / đơn vị..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {/* head */}
        <div className="grid grid-cols-[2fr_1.2fr_90px_150px_150px_120px_130px] gap-2 px-3 py-2 bg-sky-50 border-b">
          <div className="font-bold">Tên</div>
          <div className="font-bold">Nhóm</div>
          <div className="font-bold">Đơn vị</div>
          <div className="font-bold text-right">Năng lượng</div>
          <div className="font-bold text-right">Giá</div>
          <div className="font-bold">Trạng thái</div>
          <div className="font-bold">Hành động</div>
        </div>

        {/* body */}
        {!filtered?.length ? (
          <div className="text-center text-slate-500 py-6">
            Chưa có thực phẩm.
          </div>
        ) : (
          filtered.map((it) => (
            <div
              key={it._id ?? it.name}
              className="grid grid-cols-[2fr_1.2fr_90px_150px_150px_120px_130px] gap-2 px-3 py-2 border-b items-center text-sm"
            >
              <div className="font-semibold truncate">{it.name}</div>
              <div className="truncate">{it.category || "-"}</div>
              <div>{it.unit || "-"}</div>
              <div className="text-right">
                {kcal(it)} kcal / 100{it.unit || "g"}
              </div>
              <div className="text-right">
                {it.pricePerUnit?.toLocaleString("vi-VN")}{" "}
                {it.currency || "VND"}
              </div>
              <div>
                <span
                  className={`px-2 py-1 rounded-md text-white ${
                    it.isActive ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                >
                  {it.isActive ? "Đang hoạt động" : "Ngưng"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(it)}
                  className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border bg-white hover:bg-slate-50"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Sửa</span>
                </button>
                <button
                  onClick={() => remove(it._id)}
                  className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Xoá</span>
                </button>
              </div>
            </div>
          ))
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
            <div className="w-full max-w-[720px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl max-h-[85vh] overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold">
                  {editing ? "Sửa thực phẩm" : "Thêm thực phẩm"}
                </div>
                <button
                  onClick={() => setVisible(false)}
                  className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Tên">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Nhóm">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.category || ""}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </Field>
                <Field label="Đơn vị">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    value={form.unit || ""}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </Field>
                <Field label="Giá / đơn vị (VND)">
                  <input
                    className="w-full border rounded-lg h-10 px-3 bg-white"
                    inputMode="decimal"
                    value={form.pricePerUnit ?? 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pricePerUnit: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-2">
                <Field label="Chay (Vegetarian)">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!form.isVegetarian}
                      onChange={(e) =>
                        setForm({ ...form, isVegetarian: e.target.checked })
                      }
                    />
                    <span>Áp dụng</span>
                  </label>
                </Field>
                <Field label="Halal">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isHalal !== false}
                      onChange={(e) =>
                        setForm({ ...form, isHalal: e.target.checked })
                      }
                    />
                    <span>Áp dụng</span>
                  </label>
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

              <div className="text-center font-bold mt-4">
                Thành phần dinh dưỡng / 100{form.unit || "g"}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                {NUTRITION_KEYS.map((k) => (
                  <Field key={k} label={String(k)}>
                    <input
                      className="w-full border rounded-lg h-10 px-3 bg-white"
                      inputMode="decimal"
                      value={String((form.nutrition as any)?.[k] ?? 0)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nutrition: {
                            ...(form.nutrition || {}),
                            [k]: e.target.value as any,
                          },
                        })
                      }
                    />
                  </Field>
                ))}
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
