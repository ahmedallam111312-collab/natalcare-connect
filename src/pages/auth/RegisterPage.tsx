import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Baby, Mail, Lock, User, Check, X } from "lucide-react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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
              </form>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">
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