export const ERROR_MESSAGES: Record<string, { ar: string; en: string }> = {
  // Auth Errors
  'auth/wrong-password': { ar: 'كلمة المرور غير صحيحة', en: 'Incorrect password' },
  'auth/invalid-credential': { ar: 'بيانات الدخول غير صحيحة', en: 'Invalid credentials' },
  'auth/user-not-found': { ar: 'لا يوجد حساب بهذا البريد الإلكتروني', en: 'User not found' },
  'auth/email-already-in-use': { ar: 'هذا البريد الإلكتروني مستخدم بالفعل', en: 'Email already in use' },
  'auth/too-many-requests': { ar: 'تم تجاوز عدد المحاولات. يرجى الانتظار ثم المحاولة لاحقاً', en: 'Too many requests. Try again later.' },
  'auth/network-request-failed': { ar: 'خطأ في الاتصال بالإنترنت', en: 'Network connection failed' },
  'auth/popup-closed-by-user': { ar: 'تم إغلاق النافذة المنبثقة', en: 'Popup closed by user' },
  'auth/invalid-email': { ar: 'البريد الإلكتروني غير صالح', en: 'Invalid email' },
  'auth/weak-password': { ar: 'كلمة المرور ضعيفة جداً', en: 'Password is too weak' },
  'auth/requires-recent-login': { ar: 'يرجى تسجيل الدخول مجدداً لإتمام العملية', en: 'Please login again to complete this action' },
  'auth/user-disabled': { ar: 'تم تعطيل هذا الحساب', en: 'User account is disabled' },
  'auth/operation-not-allowed': { ar: 'العملية غير مسموحة', en: 'Operation not allowed' },

  // Firestore Errors
  'permission-denied': { ar: 'ليس لديك صلاحية للوصول إلى هذه البيانات', en: 'Permission denied' },
  'not-found': { ar: 'البيانات غير موجودة', en: 'Data not found' },
  'already-exists': { ar: 'البيانات موجودة بالفعل', en: 'Data already exists' },
  'resource-exhausted': { ar: 'تم تجاوز الحد الأقصى للاستخدام', en: 'Resource quota exhausted' },
  'unavailable': { ar: 'الخدمة غير متاحة حالياً', en: 'Service currently unavailable' },
  'deadline-exceeded': { ar: 'انتهت مهلة الطلب', en: 'Request deadline exceeded' },
  'data-loss': { ar: 'حدث خطأ في البيانات', en: 'Data loss error' },
  'cancelled': { ar: 'تم إلغاء العملية', en: 'Operation cancelled' },
  'unauthenticated': { ar: 'يرجى تسجيل الدخول', en: 'Unauthenticated' },
  'failed-precondition': { ar: 'لم يتم استيفاء شروط العملية', en: 'Failed precondition' },
  'aborted': { ar: 'تم إجهاض العملية', en: 'Operation aborted' },
  'out-of-range': { ar: 'القيمة خارج النطاق المسموح', en: 'Value out of range' },
  'unimplemented': { ar: 'الخدمة غير مدعومة', en: 'Unimplemented' },
  'internal': { ar: 'خطأ داخلي في الخادم', en: 'Internal server error' },

  // Storage Errors
  'storage/unauthorized': { ar: 'ليس لديك صلاحية للوصول للملف', en: 'Unauthorized file access' },
  'storage/canceled': { ar: 'تم إلغاء الرفع', en: 'Upload canceled' },
  'storage/object-not-found': { ar: 'الملف غير موجود', en: 'File not found' },
  'storage/quota-exceeded': { ar: 'تم تجاوز مساحة التخزين', en: 'Storage quota exceeded' },
  'storage/retry-limit-exceeded': { ar: 'تجاوز الحد الأقصى لمحاولات الرفع', en: 'Retry limit exceeded' },
  'storage/unauthenticated': { ar: 'يرجى تسجيل الدخول', en: 'Unauthenticated' },
  'storage/invalid-checksum': { ar: 'الملف تالف', en: 'Invalid checksum' },

  // Network Errors
  'network/offline': { ar: 'أنت غير متصل بالإنترنت', en: 'You are offline' },
  'network/timeout': { ar: 'انتهت مهلة الاتصال', en: 'Connection timeout' },
  'network/cors': { ar: 'خطأ في سياسة الوصول المشترك', en: 'CORS error' },
  'network/failed-fetch': { ar: 'فشل في جلب البيانات', en: 'Failed to fetch data' },

  // AI Errors
  'ai/timeout': { ar: 'الخادم لم يستجب، يرجى المحاولة لاحقاً', en: 'Server timeout. Please try again' },
  'ai/rate-limit': { ar: 'تم تجاوز عدد الطلبات، يرجى الانتظار قليلاً', en: 'Rate limit exceeded. Wait a moment' },
  'ai/server-error': { ar: 'خطأ في خادم الذكاء الاصطناعي', en: 'AI Server Error' },
  'ai/invalid-response': { ar: 'استجابة غير صالحة من الخادم', en: 'Invalid AI response' },
  'ai/unauthorized': { ar: 'خطأ في إعدادات الخدمة', en: 'AI configuration error' },
  'ai/empty-response': { ar: 'لم يتم العثور على استجابة', en: 'Empty AI response' },

  // OCR Errors
  'ocr/init-failed': { ar: 'فشل في تحميل محرك التعرف على النصوص', en: 'Failed to initialize OCR engine' },
  'ocr/low-confidence': { ar: 'جودة النص المستخرج منخفضة، يرجى التحقق يدوياً', en: 'Low confidence OCR result' },
  'ocr/invalid-format': { ar: 'صيغة الصورة غير مدعومة', en: 'Unsupported image format' },
  'ocr/image-too-large': { ar: 'حجم الصورة كبير جداً', en: 'Image too large' },
  'ocr/parse-failed': { ar: 'فشل في استخراج البيانات من النص', en: 'Failed to parse text data' },

  // Geolocation Errors
  'geo/permission-denied': { ar: 'يرجى السماح بالوصول إلى موقعك', en: 'Please allow location access' },
  'geo/position-unavailable': { ar: 'تعذر تحديد موقعك', en: 'Position unavailable' },
  'geo/timeout': { ar: 'انتهت مهلة تحديد الموقع', en: 'Location timeout' },

  // Generic
  'unknown': { ar: 'حدث خطأ غير متوقع', en: 'An unexpected error occurred' },
  'generic/retry': { ar: 'فشلت العملية، يرجى المحاولة مرة أخرى', en: 'Operation failed, please try again' }
};

export function getErrorMessage(code: string, lang: 'ar' | 'en' = 'ar'): string {
  if (ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code][lang];
  }
  // If it's a firebase-like code without explicit mapping, try mapping just the message part if possible
  return ERROR_MESSAGES['unknown'][lang];
}
