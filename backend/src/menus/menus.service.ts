/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Menu, MenuDocument } from './menu.schema';
import { FoodItem, FoodItemDocument } from '../food-items/food-item.schema';
import { ClassEntity, ClassDocument } from '../classes/class.schema';
import { NutriReco, NutriRecoDocument } from '../nutrition/nutri-reco.schema';

@Injectable()
export class MenusService {
  constructor(
    @InjectModel(Menu.name) private menuModel: Model<MenuDocument>,
    @InjectModel(FoodItem.name) private foodModel: Model<FoodItemDocument>,
    @InjectModel(ClassEntity.name) private classModel: Model<ClassDocument>,
    @InjectModel(NutriReco.name) private recoModel: Model<NutriRecoDocument>,
  ) {}

  async listForClass(classId: string, from?: string, to?: string) {
    const cls = await this.classModel.findById(classId).select('schoolId');
    if (!cls?.schoolId) return [];
    return this.listBySchool(String(cls.schoolId), from, to);
  }

  async create(dto: any, userId: string) {
    const computeMeal = async (meal: any) => {
      const totals: any = {};
      if (!meal?.items?.length) return { items: [], totalNutrition: totals };

      const validRows = (meal.items || []).filter(
        (i: any) =>
          i?.foodItemId && /^[a-f\d]{24}$/i.test(String(i.foodItemId)),
      );
      const ids = validRows.map(
        (i: any) => new Types.ObjectId(String(i.foodItemId)),
      );
      const map = new Map<string, any>();

      (await this.foodModel.find({ _id: { $in: ids } })).forEach((fi) =>
        map.set(fi._id.toString(), fi),
      );

      for (const it of validRows) {
        const fi = map.get(String(it.foodItemId));
        if (!fi) continue;
        const ratio = (Number(it.quantity) || 0) / 100;
        for (const k of Object.keys(fi.nutrition || {})) {
          totals[k] = (totals[k] || 0) + (Number(fi.nutrition[k]) || 0) * ratio;
        }
      }
      Object.keys(totals).forEach(
        (k) => (totals[k] = Math.round(totals[k] * 100) / 100),
      );
      return { ...meal, totalNutrition: totals };
    };

    const meals = {
      breakfast: await computeMeal(dto.meals?.breakfast),
      lunch: await computeMeal(dto.meals?.lunch),
      snack: await computeMeal(dto.meals?.snack),
    };

    const dayTotals: any = {};
    for (const part of [
      meals.breakfast.totalNutrition,
      meals.lunch.totalNutrition,
      meals.snack.totalNutrition,
    ]) {
      for (const k of Object.keys(part || {}))
        dayTotals[k] = (dayTotals[k] || 0) + (part[k] || 0);
    }
    Object.keys(dayTotals).forEach(
      (k) => (dayTotals[k] = Math.round(dayTotals[k] * 100) / 100),
    );

    return new this.menuModel({
      schoolId: new Types.ObjectId(dto.schoolId),
      classId: new Types.ObjectId(dto.classId),
      date: new Date(dto.date),
      menuType: dto.menuType || 'regular',
      targetAgeGroup: dto.targetAgeGroup,
      meals,
      dailyTotalNutrition: dayTotals,
      specialNotes: dto.specialNotes,
      groupName: dto.groupName,
      createdBy: new Types.ObjectId(userId),
    }).save();
  }

  listBySchool(schoolId: string, from?: string, to?: string) {
    const q: any = { schoolId: new Types.ObjectId(schoolId) };
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    return this.menuModel.find(q).sort({ date: -1, _id: -1 });
  }

  getOne(id: string) {
    return this.menuModel.findById(id);
  }

  update(id: string, patch: any) {
    return this.menuModel.findByIdAndUpdate(id, patch, { new: true });
  }

  remove(id: string) {
    return this.menuModel.findByIdAndDelete(id);
  }

  private async computeMealFromDraft(meal: any) {
    const totals: any = {};
    const rows = meal?.items || [];
    if (rows.length) {
      const validRows = rows.filter(
        (i: any) =>
          i?.foodItemId && /^[a-f\d]{24}$/i.test(String(i.foodItemId)),
      );
      const ids = validRows.map(
        (i: any) => new Types.ObjectId(String(i.foodItemId)),
      );
      const map = new Map<string, any>();
      (await this.foodModel.find({ _id: { $in: ids } })).forEach((fi) =>
        map.set(fi._id.toString(), fi),
      );
      for (const it of validRows) {
        const fi = map.get(String(it.foodItemId));
        if (!fi) continue;
        const ratio = (Number(it.quantity) || 0) / 100;
        for (const k of Object.keys(fi.nutrition || {})) {
          totals[k] = (totals[k] || 0) + (Number(fi.nutrition[k]) || 0) * ratio;
        }
      }
    }
    Object.keys(totals).forEach(
      (k) => (totals[k] = Math.round(totals[k] * 100) / 100),
    );
    return { ...meal, totalNutrition: totals };
  }

  async saveFromDrafts(params: {
    recIds: string[];
    classId: string;
    schoolId: string;
    createdBy: string;
  }) {
    const cls = await this.classModel
      .findById(params.classId)
      .select('name schoolId');
    if (!cls?.schoolId) throw new Error('class/school không hợp lệ');

    const recs = await this.recoModel.find({
      _id: { $in: params.recIds.map((id) => new Types.ObjectId(id)) },
      type: 'menu_draft',
      $or: [{ appliedToMenu: { $exists: false } }, { appliedToMenu: false }],
    });

    if (!recs.length) return { inserted: 0 };

    const docs: any[] = [];
    for (const r of recs) {
      const meals = {
        breakfast: await this.computeMealFromDraft(r.meals?.breakfast || {}),
        lunch: await this.computeMealFromDraft(r.meals?.lunch || {}),
        snack: await this.computeMealFromDraft(r.meals?.snack || {}),
      };
      const dayTotals: any = {};
      [
        meals.breakfast.totalNutrition,
        meals.lunch.totalNutrition,
        meals.snack.totalNutrition,
      ].forEach((part) => {
        for (const k of Object.keys(part || {}))
          dayTotals[k] = (dayTotals[k] || 0) + (part[k] || 0);
      });
      Object.keys(dayTotals).forEach(
        (k) => (dayTotals[k] = Math.round(dayTotals[k] * 100) / 100),
      );

      const groupName = r.studentGroup?.name || 'nhóm';

      const rDate =
        r.date instanceof Date
          ? r.date
          : r.date
            ? new Date(r.date as any)
            : new Date();

      const classIdRaw: any = (r as any).classId ?? params.classId;
      const classIdStr =
        typeof classIdRaw === 'string' ? classIdRaw : String(classIdRaw);
      const classObjId = new Types.ObjectId(classIdStr);

      docs.push({
        schoolId: new Types.ObjectId(params.schoolId),
        classId: classObjId,
        date: rDate,
        menuType: 'regular',
        targetAgeGroup: undefined,
        meals,
        dailyTotalNutrition: dayTotals,
        specialNotes: groupName,
        groupName,
        createdBy: new Types.ObjectId(params.createdBy),
      });
    }

    if (!docs.length) return { inserted: 0 };

    let inserted = 0;
    try {
      const res = await this.menuModel.insertMany(docs, { ordered: false });
      inserted = Array.isArray(res) ? res.length : 0;
    } catch (e: any) {
      if (Array.isArray(e?.insertedDocs)) {
        inserted = e.insertedDocs.length;
      } else {
        const dates = Array.from(
          new Set(docs.map((d) => d.date.toISOString())),
        );
        const cnt = await this.menuModel.countDocuments({
          schoolId: new Types.ObjectId(params.schoolId),
          classId: new Types.ObjectId(params.classId),
          date: { $in: dates.map((s) => new Date(s)) },
        });
        if (cnt > 0) inserted = cnt;
      }
    }

    await this.recoModel.updateMany(
      { _id: { $in: recs.map((r) => r._id) } },
      { $set: { appliedToMenu: true, updatedAt: new Date() } },
    );

    return { inserted };
  }
}
