export type School = {
  _id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
};

export type Teacher = {
  _id?: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  role: "admin" | "teacher";
  isActive: boolean;
  schoolId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ClassEntity = {
  _id?: string;
  schoolId: string;
  name: string;
  ageGroup?: string;
  teacherId: string;
  assistantTeacherIds?: string[];
  capacity?: number;
  currentStudents?: number;
  academicYear?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  studentCount?: number;
};

export type Student = {
  _id?: string;

  studentId?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
  classId?: string;
  schoolId?: string;
  schoolProvidedId?: string;
  healthInfo?: {
    allergies?: string[];
    foodRestrictions?: string[];
    medicalHistory?: string;
    specialNeeds?: string;
  };
  parents?: Array<{
    name: string;
    relationship: string;
    phone?: string;
    email?: string;
    isEmergencyContact?: boolean;
  }>;
  faceImages?: Array<{
    imageUrl?: string;
    encodedFace?: string;
    uploadedAt?: string;
  }>;
  enrollmentDate?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;

  name?: string;
  dob?: string;
};

export type FoodItem = {
  _id?: string;
  name: string;
  category: string;
  unit: string;
  nutrition?: {
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
  allergens?: string[];
  isVegetarian?: boolean;
  isHalal?: boolean;
  storageCondition?: string;
  shelfLife?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type MenuMealItem = {
  foodItemId: string;
  quantity: number;
  preparationMethod?: string;
};

export type MenuMeal = {
  items: MenuMealItem[];
  totalNutrition?: Record<string, number>;
};

export type Menu = {
  items: any;
  _id?: string;
  schoolId: string;
  classId: string;
  date: string;
  menuType: "regular" | "vegetarian" | "allergy_free";
  targetAgeGroup?: string;
  groupName?: string;
  meals?: {
    breakfast?: MenuMeal;
    lunch?: MenuMeal;
    snack?: MenuMeal;
  };
  dailyTotalNutrition?: Record<string, number>;
  specialNotes?: string;
  approvedBy?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type IntakeItem = {
  foodItemId: string;
  plannedQuantity?: number;
  actualQuantity?: number;
  consumptionRate?: number;
};

export type MealIntake = {
  menuId?: string;
  actualIntake?: IntakeItem[];
  totalNutritionIntake?: Record<string, number>;
};

export type DailyIntake = {
  _id?: string;
  studentId: string;
  date: string;
  classId: string;
  mealIntakes: {
    breakfast?: MealIntake;
    lunch?: MealIntake;
    snack?: MealIntake;
  };
  dailyTotalIntake?: Record<string, number>;
  notes?: string;
  recordedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HealthStatus = {
  temperature?: number;
  mood?: string;
  appetite?: string;
  sleepQuality?: string;
  bowelMovement?: string;
  skinCondition?: string;
  unusualSymptoms?: string[];
};

export type DailyHealth = {
  _id?: string;
  studentId: string;
  date: string;
  classId: string;
  healthStatus: HealthStatus;
  behaviorNotes?: string;
  activityLevel?: string;
  socialInteraction?: string;
  recordedBy?: string;
  parentNotified?: boolean;
  requiresAttention?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
