import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Baby, Mail, Lock, Eye, EyeOff, Users, ArrowRight } from "lucide-react";
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInAnonymously } from "firebase/auth";
import { doc, getDoc, collectionGroup, query, where, getDocs, setDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    case 'auth/user-not-found':
      return 'لا يوجد حساب بهذا البريد الإلكتروني';
    case 'auth/too-many-requests':
      return 'تم تجاوز عدد المحاولات المسموح. يرجى الانتظار ثم المحاولة لاحقاً';
    case 'auth/network-request-failed':
      return 'خطأ في الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى';
    case 'auth/invalid-email':
      return 'البريد الإلكتروني غير صالح';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب. تواصل مع الإدارة';
    default:
      return 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً';
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Partner Login Mode
  const [isPartnerMode, setIsPartnerMode] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  
  // Brute force protection
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    let timer: any;
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    } else if (lockoutTimer === 0 && failedAttempts >= 5) {
      setFailedAttempts(0); // Reset after cooldown
    }
    return () => clearInterval(timer);
  }, [lockoutTimer, failedAttempts]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    
    setIsLoading(true);
    setErrorMsg("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const role = userDoc.data().role || "patient";
        navigate(`/${role}`);
        toast.success("مرحباً بك مجدداً!");
      }
    } catch (error: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        setLockoutTimer(60);
        setErrorMsg("تم إيقاف المحاولات مؤقتاً بسبب كثرة الأخطاء. يرجى الانتظار 60 ثانية.");
      } else {
        setErrorMsg(getAuthErrorMessage(error.code));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePartnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode || partnerCode.length < 5) {
      setErrorMsg("الرجاء إدخال كود صحيح");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const q = query(collectionGroup(db, 'partnerAccess'), where('code', '==', partnerCode.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMsg("الكود غير صحيح أو منتهي الصلاحية");
        setIsLoading(false);
        return;
      }

      // Found the code! Get patient ID
      const inviteDoc = querySnapshot.docs[0];
      const patientId = inviteDoc.ref.parent.parent?.id;

      if (!patientId) {
        setErrorMsg("حدث خطأ في استخراج بيانات المريضة");
        setIsLoading(false);
        return;
      }

      // Anonymous sign in
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      // Save user role as partner and link to patient
      await setDoc(doc(db, "users", user.uid), {
        role: "partner",
        linkedPatientId: patientId,
        displayName: "شريك (زوج)"
      });

      toast.success("تم الدخول بنجاح كشريك!");
      navigate("/partner");

    } catch (error: any) {
      console.error(error);
      setErrorMsg("حدث خطأ في الاتصال بالخادم. حاول مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg("يرجى إدخال البريد الإلكتروني أولاً لإرسال رابط إعادة التعيين");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
      setErrorMsg("");
    } catch (error: any) {
      setErrorMsg(getAuthErrorMessage(error.code));
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-background p-4" 
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Baby className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold gradient-text">عيادة الدكتور محمد شعبان</h1>
          <p className="text-muted-foreground text-sm mt-2">
            {isPartnerMode ? "الدخول كشريك لمتابعة رحلة الحمل" : "قم بتسجيل الدخول إلى حسابك"}
          </p>
        </div>

        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                {isPartnerMode ? "إدخال كود الدعوة" : "تسجيل الدخول"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {!isPartnerMode ? (
                  <motion.form 
                    key="normal-login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleLogin} 
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          className="pr-10 text-left"
                          dir="ltr"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={lockoutTimer > 0}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="password">كلمة المرور</Label>
                        <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pr-10 pl-10 text-left"
                          dir="ltr"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={lockoutTimer > 0}
                        />
                        <button
                          type="button"
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={lockoutTimer > 0}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {errorMsg && (
                      <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 text-center">
                        {errorMsg}
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full" disabled={isLoading || lockoutTimer > 0}>
                      {lockoutTimer > 0 
                        ? `جاري الإيقاف (${lockoutTimer} ث)` 
                        : isLoading 
                          ? "جاري تسجيل الدخول..." 
                          : "تسجيل الدخول"}
                    </Button>

                    <div className="mt-4 text-center text-sm text-muted-foreground flex flex-col gap-2">
                      <div>
                        ليس لديك حساب؟{" "}
                        <button type="button" onClick={() => navigate("/register")} className="text-primary hover:underline font-medium">
                          إنشاء حساب
                        </button>
                      </div>
                      <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">أو</span></div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setErrorMsg(""); setIsPartnerMode(true); }} 
                        className="text-foreground hover:text-primary transition-colors font-bold border border-border rounded-lg py-2 flex justify-center items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        الدخول كشريك (بكود الدعوة)
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.form 
                    key="partner-login"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handlePartnerLogin} 
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="partnerCode">كود الدعوة</Label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="partnerCode"
                          type="text"
                          placeholder="مثال: ABC123"
                          className="pr-10 text-center font-mono text-lg tracking-[0.2em] uppercase"
                          dir="ltr"
                          value={partnerCode}
                          onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                          required
                          maxLength={6}
                        />
                      </div>
                    </div>
                    
                    {errorMsg && (
                      <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 text-center">
                        {errorMsg}
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full h-12" disabled={isLoading}>
                      {isLoading ? "جاري التحقق..." : "تأكيد الدخول"}
                    </Button>

                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => { setErrorMsg(""); setIsPartnerMode(false); }} 
                      className="w-full mt-2"
                    >
                      <ArrowRight className="w-4 h-4 ml-2" />
                      العودة لتسجيل الدخول المعتاد
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}