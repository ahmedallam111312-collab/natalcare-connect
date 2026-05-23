import { z } from 'zod';

// Shared Validation Schemas
export const emailSchema = z.string()
  .min(1, 'البريد الإلكتروني مطلوب')
  .email('صيغة البريد الإلكتروني غير صحيحة');

export const passwordSchema = z.string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل');

export const nameSchema = z.string()
  .min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل')
  .max(50, 'الاسم طويل جداً');

// Vital Signs Validation
export const vitalsSchema = z.object({
  bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, 'صيغة ضغط الدم يجب أن تكون كمثال: 120/80'),
  weight: z.number().min(30, 'الوزن غير منطقي').max(200, 'الوزن غير منطقي'),
  bloodSugar: z.number().min(40, 'السكر غير منطقي').max(600, 'السكر غير منطقي').optional(),
});

// Helper for Zod formatting
export const formatZodErrors = (error: z.ZodError) => {
  return error.errors.map(err => err.message).join('، ');
};
