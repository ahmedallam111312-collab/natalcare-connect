import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Baby, Mail, Lock, User, Check, X } from "lucide-react";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { toast } from "sonner";
import { motion } from "framer-motion";

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مستخدم بالفعل';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جداً';
    case 'auth/invalid-email':
      return 'البريد الإلكتروني غير صالح';
    case 'auth/network-request-failed':
      return 'خطأ في الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى';
    default:
      return 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً';
  }
}

export const passwordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 1) return { score, label: 'ضعيفة جداً', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'ضعيفة', color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'متوسطة', color: 'bg-yellow-500' };
  if (score === 4) return { score, label: 'قوية', color: 'bg-green-500' };
  return { score, label: 'قوية جداً', color: 'bg-emerald-500' };
};

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const strength = passwordStrength(password);
  
  const reqs = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (password !== confirmPassword) {
      setErrorMsg("كلمات المرور غير متطابقة");
      return;
    }
    
    if (strength.score < 3) {
      setErrorMsg("يرجى اختيار كلمة مرور أقوى");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: name,
        role: "patient",
        createdAt: new Date().toISOString(),
      });

      toast.success("تم إنشاء الحساب بنجاح!");
      navigate("/patient");
    } catch (error: any) {
      setErrorMsg(getAuthErrorMessage(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        // Create patient account
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || name || "مستخدم جديد",
          role: "patient",
          createdAt: new Date().toISOString(),
        });
        toast.success("تم إنشاء الحساب عبر Google بنجاح!");
        navigate("/patient");
      } else {
        // Account exists
        const role = userDoc.data().role || "patient";
        navigate(`/${role}`);
        toast.success("تم تسجيل الدخول. حسابك موجود مسبقاً.");
      }
    } catch (error: any) {
      console.error(error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrorMsg("فشل التسجيل بواسطة Google. حاول مجدداً.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-3xl font-heading font-bold gradient-text">إنشاء حساب</h1>
          <p className="text-muted-foreground text-sm mt-2">انضمي إلى منصة عيادة الدكتور محمد شعبان</p>
        </div>

        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg">تسجيل مريضة جديدة</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="سارة أحمد"
                      className="pr-10"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
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
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pr-10 text-left"
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  {password.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">قوة كلمة المرور:</span>
                        <span className={`font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                      </div>
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div 
                            key={level} 
                            className={`flex-1 rounded-full ${level <= Math.max(1, strength.score) ? strength.color : 'bg-muted'}`}
                          />
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1 text-[10px] mt-2">
                        <div className={`flex items-center gap-1 ${reqs.length ? 'text-success' : 'text-muted-foreground'}`}>
                          {reqs.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} 8 أحرف على الأقل
                        </div>
                        <div className={`flex items-center gap-1 ${reqs.upper ? 'text-success' : 'text-muted-foreground'}`}>
                          {reqs.upper ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} حرف كبير واحد
                        </div>
                        <div className={`flex items-center gap-1 ${reqs.number ? 'text-success' : 'text-muted-foreground'}`}>
                          {reqs.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} رقم واحد
                        </div>
                        <div className={`flex items-center gap-1 ${reqs.special ? 'text-success' : 'text-muted-foreground'}`}>
                          {reqs.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} رمز خاص واحد
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pr-10 text-left"
                      dir="ltr"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 text-center">
                    {errorMsg}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  سيتم تعيين حسابك مبدئياً كمريضة.
                </p>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "جاري الإنشاء..." : "إنشاء الحساب"}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">أو باستخدام</span></div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleGoogleRegister} 
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 mb-4"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                  Google
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <button type="button" onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">
                  تسجيل الدخول
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}