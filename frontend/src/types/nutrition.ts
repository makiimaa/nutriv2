export type MacroBand = { target: number; min?: number; max?: number };

export type Recommendation = {
  _id?: string;
  studentId: string;
  generatedDate: string;
  inputData?: {
    age?: number;
    weight?: number;
    height?: number;
    bmi?: number;
    recentIntakeHistory?: string[];
    healthConditions?: string[];
    allergies?: string[];
    activityLevel?: string;
  };
  recommendations?: {
    dailyCaloriesTarget?: number;
    macronutrients?: {
      protein?: MacroBand;
      fat?: MacroBand;
      carbohydrate?: MacroBand;
    };
    micronutrients?: Record<string, MacroBand>;
    suggestedFoods?: Array<{
      foodItemId?: string;
      name?: string;
      reason?: string;
      frequency?: string;
    }>;
    foodsToAvoid?: Array<{
      foodItemId?: string;
      name?: string;
      reason?: string;
    }>;
    mealDistribution?: { breakfast?: number; lunch?: number; snack?: number };
    specialNotes?: string;
    validUntil?: string;
  };
  aiModel?: string;
  confidence?: number;
  appliedToMenu?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
