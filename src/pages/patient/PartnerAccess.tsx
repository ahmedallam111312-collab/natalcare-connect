import { useState, useEffect } from "react";
import { Users, Copy, Check, Smartphone, KeyRound, Share2 } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PartnerAccess() {
  const { user } = useAuthStore();
  const [partnerCode, setPartnerCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCode = async () => {
      if (!user) return;
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid, "partnerAccess", "invite"));
        if (docSnap.exists()) {
          setPartnerCode(docSnap.data().code);
        }
      } catch (err) {
        console.error("Error fetching partner code", err);
      }
    };
    fetchCode();
  }, [user]);

  const generateCode = async () => {
    if (!user) return;
    setIsGenerating(true);
    
    // Generate a random 6-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      await setDoc(doc(db, "users", user.uid, "partnerAccess", "invite"), {
        code,
        createdAt: serverTimestamp(),
        status: "pending"
      });
      setPartnerCode(code);
      toast.success("تم إنشاء كود الدعوة بنجاح");
    } catch (err) {
      toast.error("فشل إنشاء الكود");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!partnerCode) return;
    navigator.clipboard.writeText(partnerCode);
    setCopied(true);
    toast.success("تم نسخ الكود");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    if (!partnerCode) return;
    const text = `مرحباً! لقد قمت بإنشاء حساب على تطبيق عيادة الدكتور محمد شعبان لمتابعة حملي. 
يمكنك تحميل التطبيق واستخدام هذا الكود السري للدخول ومتابعة رحلة طفلنا معي:
الكود: *${partnerCode}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            مشاركة الشريك (الزوج)
          </h1>
          <p className="text-muted-foreground mt-1">اجعلي زوجك جزءاً من رحلة الحمل وشاركيه التطورات أسبوعاً بأسبوع.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              كود الدعوة السري
            </CardTitle>
            <CardDescription>
              قومي بتوليد كود سري وأرسليه لزوجك. سيتمكن من خلاله من الدخول لرؤية تطور الجنين ومواعيد زيارة الطبيب فقط.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-6">
            
            {partnerCode ? (
              <div className="space-y-6 w-full max-w-sm">
                <div className="bg-muted border-2 border-dashed border-primary/30 rounded-xl p-6 flex flex-col items-center justify-center relative">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">الكود الخاص بكِ</span>
                  <div className="text-4xl font-mono font-bold tracking-[0.25em] text-foreground">
                    {partnerCode}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full" onClick={copyToClipboard}>
                    {copied ? <Check className="w-4 h-4 ml-2 text-green-500" /> : <Copy className="w-4 h-4 ml-2" />}
                    نسخ الكود
                  </Button>
                  <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white" onClick={shareViaWhatsApp}>
                    <Share2 className="w-4 h-4 ml-2" />
                    واتساب
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="lg" onClick={generateCode} disabled={isGenerating} className="w-full max-w-xs h-14 text-lg rounded-full">
                {isGenerating ? "جاري التوليد..." : "إنشاء كود جديد"}
              </Button>
            )}

          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="w-5 h-5 text-primary" />
                كيف يستخدم الزوج الكود؟
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 list-decimal list-inside text-muted-foreground leading-relaxed">
                <li>يقوم الزوج بتحميل التطبيق (أو فتح الموقع).</li>
                <li>من شاشة تسجيل الدخول، يختار **"الدخول كشريك / زوج"**.</li>
                <li>يقوم بإدخال الكود المكون من 6 أحرف.</li>
                <li>سيتمكن فوراً من رؤية حجم الجنين الحالي ونصائح حول كيفية دعمكِ في هذه المرحلة.</li>
              </ol>
            </CardContent>
          </Card>

          <Alert>
            <Users className="h-5 w-5 text-foreground" />
            <AlertDescription className="text-muted-foreground text-sm mt-1">
              **ملاحظة الخصوصية:** لا يستطيع الزوج رؤية محادثاتك الخاصة مع الطبيب، أو نتائج تحاليلك الطبية الحساسة، أو متتبع الصحة النفسية الخاص بكِ. حسابه مصمم فقط للمشاركة الإيجابية والدعم.
            </AlertDescription>
          </Alert>
        </div>

      </div>
    </div>
  );
}
