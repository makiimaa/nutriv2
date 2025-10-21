import axiosClient from "./axiosClient";

export type PlanFoodItem = {
  name: string;
  foodItemId?: string;
  quantity?: number;
};

export type PlanMeals = {
  breakfast?: { items: PlanFoodItem[] };
  lunch?: { items: PlanFoodItem[] };
  snack?: { items: PlanFoodItem[] };
};

export type PlanPreview = {
  recId: string;
  date: string;
  groupName: string;
  studentCount: number;
  meals: PlanMeals;
};

export type PlanClassResp = {
  previews: PlanPreview[];
  draftIds: string[];
};

export type PlanStudentResp = {
  previews: PlanPreview[];
  draftIds: string[];
};

export type ListDraftsResp = {
  items: any[];
  total: number;
};

const mapEngine = (e: "gemini" | "local") => (e === "local" ? "ollama" : e);

export async function planMenusForClass(params: {
  classId: string;
  startDate: string;
  days: number;
  engine: "gemini" | "local";
}): Promise<PlanClassResp> {
  const engine = mapEngine(params.engine);
  const r = await axiosClient.post(
    "/nutrition/plan-menus",
    { ...params, engine },
    { timeout: 0 }
  );
  return r.data as PlanClassResp;
}

export async function planMenusForStudent(params: {
  studentId: string;
  startDate: string;
  days: number;
  engine: "gemini" | "local";
}): Promise<PlanStudentResp> {
  const engine = mapEngine(params.engine);
  const r = await axiosClient.post(
    "/nutrition/plan-student",
    { ...params, engine },
    { timeout: 0 }
  );
  return r.data as PlanStudentResp;
}

export async function listDrafts(
  classId?: string,
  page = 1,
  pageSize = 10
): Promise<ListDraftsResp> {
  const r = await axiosClient.get("/nutrition/drafts", {
    params: { classId, page, pageSize },
    timeout: 0,
  });
  return r.data as ListDraftsResp;
}

export async function saveMenusFromDrafts(body: {
  recIds: string[];
  classId: string;
  schoolId: string;
}) {
  const r = await axiosClient.post("/menus/save-from-recs", body, {
    timeout: 0,
  });
  return r.data;
}

export async function analyzeGrouping(payload: {
  classId: string;
  groupCount?: number;
  engine?: "gemini" | "ollama";
  teacherHint?: string;
}) {
  const r = await axiosClient.post("/nutrition/groupings/analyze", payload);
  return r.data;
}

export async function saveGrouping(payload: {
  classId: string;
  name?: string;
  engine: "gemini" | "ollama";
  groupCount: number;
  teacherHint?: string;
  groups: {
    key: string;
    name: string;
    description?: string;
    criteriaSummary?: any;
    studentIds: string[];
  }[];
}) {
  const r = await axiosClient.post("/nutrition/groupings/save", payload);
  return r.data;
}

export async function listGroupings(classId: string, page = 1, pageSize = 10) {
  const r = await axiosClient.get("/nutrition/groupings/list", {
    params: { classId, page, pageSize },
  });
  return r.data;
}

export async function getGrouping(id: string) {
  const r = await axiosClient.get(`/nutrition/groupings/${id}`);
  return r.data;
}
