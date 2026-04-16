import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FlaskConical, Upload, Loader2, BrainCircuit, CheckCircle, Plus } from "lucide-react";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import { sendSymptomChat } from "@/services/aiService";

const statusBadge = (status: string) => {
  if (status === "normal" || status === "Normal" || status === "طبيعي")
    return <Badge variant="outline" className="text-success border-success/30 bg-success/5">طبيعي</Badge>;
  if (status === "abnormal" || status === "Abnormal" || status === "غير طبيعي")
    return <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5">غير طبيعي</Badge>;
  return <Badge variant="destructive">حرج</Badge>;
};

export default function LabResults() {
  const { user } = useAuthStore();
  const [labs, setLabs] = useState<any[]>([]);
  
  // حالات رفع التحاليل
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loadingState, setLoadingState] = useState<"idle" | "ocr" | "ai" | "saving">("idle");
  const [extractedLabs, setExtractedLabs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "labs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLabs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const categories = labs.length > 0 ? [...new Set(labs.map((l) => l.category))] : [];

  // دالة معالجة ورفع الصورة
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setExtractedLabs([]);

    try {
      // 1. قراءة الصورة
      setLoadingState("ocr");
      toast.info("جاري قراءة الصورة محلياً...");
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text;

      if (!text.trim()) {
        toast.error("لم يتم العثور على نص واضح.");
        setLoadingState("idle");
        return;
      }

      // 2. تحليل الذكاء الاصطناعي
      setLoadingState("ai");
      toast.info("جاري تحليل النتائج بالذكاء الاصطناعي...");

      const aiPrompt = [
        {
          role: "system",
          content: `أنت طبيب مختبر. استخرج نتائج التحاليل من النص التالي.
          أرجع الرد بصيغة JSON فقط عبارة عن مصفوفة تحتوي على الكائنات التالية:
          \`\`\`json
          [
            {
              "testName": "اسم التحليل",
              "value": "النتيجة والأرقام",
              "unit": "الوحدة",
              "referenceRange": "المعدل الطبيعي",
              "status": "normal أو abnormal"
            }
          ]
          \`\`\``
        },
        { role: "user", content: text }
      ];

      const aiResponse = await sendSymptomChat(aiPrompt);
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0].replace(/```json/g, "").replace(/```/g, ""));
        setExtractedLabs(parsedData);
        toast.success("تم تحليل النتائج بنجاح!");
      } else {
        throw new Error("تنسيق غير صالح");
      }
      setLoadingState("idle");

    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تحليل الصورة.");
      setLoadingState("idle");
    }
  };

  // دالة الحفظ
  const saveToProfile = async () => {
    if (!user || extractedLabs.length === 0) return;
    setLoadingState("saving");

    try {
      for (const lab of extractedLabs) {
        await addDoc(collection(db, "users", user.uid, "labs"), {
          category: "تحاليل مخبرية",
          testName: lab.testName,
          value: lab.value,
          unit: lab.unit,
          referenceRange: lab.referenceRange,
          status: lab.status,
          date: new Date().toLocaleDateString("en-CA"),
          createdAt: serverTimestamp()
        });
      }

      // إرسال تنبيه للطبيب
      await addDoc(collection(db, "alerts"), {
        patientId: user.uid,
        patientName: user.displayName,
        type: "lab",
        message: "قامت المريضة برفع نتائج تحاليل جديدة.",
        severity: extractedLabs.some(l => l.status === "abnormal") ? "moderate" : "low",
        acknowledged: false,
        createdAt: serverTimestamp(),
      });

      toast.success("تم حفظ التحاليل وإرسالها للطبيب ✓");
      setExtractedLabs([]);
      setIsUploadOpen(false); // إغلاق النافذة
    } catch (error) {
      toast.error("فشل في حفظ البيانات.");
    } finally {
      setLoadingState("idle");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">النتائج المخبرية</h1>
          <p className="text-muted-foreground text-sm mt-1">عرض ورفع نتائج التحاليل الخاصة بك</p>
        </div>
        
        {/* نافذة الرفع الذكي للتحاليل */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" /> رفع تحليل جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-right border-b pb-2">قراءة التحاليل بالذكاء الاصطناعي</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <label>
                <Input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={loadingState !== "idle"} />
                <Button size="lg" variant="outline" asChild disabled={loadingState !== "idle"} className="cursor-pointer h-32 w-full border-dashed border-2 flex flex-col gap-2 bg-muted/20 hover:bg-muted/50">
                  <span>
                    {loadingState === "ocr" ? <><Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" /> قراءة الصورة محلياً...</> : 
                     loadingState === "ai" ? <><BrainCircuit className="h-8 w-8 animate-pulse text-primary mb-2" /> استخراج النتائج...</> : 
                     <><Upload className="h-8 w-8 text-muted-foreground mb-2" /> اضغطي هنا لاختيار صورة التحليل</>}
                  </span>
                </Button>
              </label>

              {extractedLabs.length > 0 && (
                <div className="space-y-3 animate-in slide-in-from-bottom-4 pt-4 border-t">
                  <h3 className="font-bold text-sm text-primary">النتائج المستخرجة:</h3>
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="py-2 px-3">التحليل</th>
                          <th className="py-2 px-3">النتيجة</th>
                          <th className="py-2 px-3">المعدل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {extractedLabs.map((lab, i) => (
                          <tr key={i} className={lab.status === "abnormal" ? "bg-destructive/5 text-destructive" : ""}>
                            <td className="py-2 px-3 font-medium" dir="ltr">{lab.testName}</td>
                            <td className="py-2 px-3 font-bold" dir="ltr">{lab.value} <span className="text-[10px] font-normal">{lab.unit}</span></td>
                            <td className="py-2 px-3 text-muted-foreground" dir="ltr">{lab.referenceRange}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button className="w-full" onClick={saveToProfile} disabled={loadingState === "saving"}>
                    {loadingState === "saving" ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <CheckCircle className="w-4 h-4 ml-2" />}
                    حفظ في ملفي الطبي
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg">
          لا توجد نتائج تحاليل مسجلة في ملفك.
        </div>
      ) : (
        <Tabs defaultValue={categories[0]}>
          <TabsList className="mb-4 flex flex-wrap h-auto">
            {categories.map((c) => (
              <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-primary" /> تحاليل {cat}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-2 px-3 font-medium">التحليل</th>
                          <th className="py-2 px-3 font-medium">النتيجة</th>
                          <th className="py-2 px-3 font-medium">المعدل الطبيعي</th>
                          <th className="py-2 px-3 font-medium">التاريخ</th>
                          <th className="py-2 px-3 font-medium">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labs.filter((l) => l.category === cat).map((lab) => (
                          <tr key={lab.id} className="border-b border-border/50">
                            <td className="py-2.5 px-3 font-medium">{lab.testName}</td>
                            <td className="py-2.5 px-3" dir="ltr">{lab.value} {lab.unit}</td>
                            <td className="py-2.5 px-3 text-muted-foreground" dir="ltr">{lab.referenceRange}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{new Date(lab.createdAt?.toDate()).toLocaleDateString("ar-EG") || lab.date}</td>
                            <td className="py-2.5 px-3">{statusBadge(lab.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}