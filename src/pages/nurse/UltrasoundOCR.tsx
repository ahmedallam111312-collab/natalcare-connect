import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScanLine, Upload, Loader2, Save, FileText, BrainCircuit } from "lucide-react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import { sendSymptomChat } from "@/services/aiService"; 

export default function UltrasoundOCR() {
  const [loadingState, setLoadingState] = useState<"idle" | "ocr" | "ai">("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  
  const [rawOcrText, setRawOcrText] = useState("");

  const [formData, setFormData] = useState({
    fhr: "", 
    efw: "", 
    afi: "", 
    ga: "",  
    bpd: "", // Biparietal Diameter
    hc: "",  // Head Circumference
    ac: "",  // Abdominal Circumference
    fl: "",  // Femur Length
    flBpd: "", // FL/BPD Ratio
    ci: "", // Cephalic Index
    hcAc: "", // HC/AC Ratio
    flAc: "", // FL/AC Ratio
    notes: ""
  });

  useEffect(() => {
    const fetchPatients = async () => {
      const q = query(collection(db, "users"), where("role", "==", "patient"));
      const querySnapshot = await getDocs(q);
      setPatients(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchPatients();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // تصفير الحقول قبل القراءة الجديدة
    setFormData({ fhr: "", efw: "", afi: "", ga: "", bpd: "", hc: "", ac: "", fl: "", flBpd: "", ci: "", hcAc: "", flAc: "", notes: "" });
    setRawOcrText("");

    try {
      // 1. الاستخراج المحلي (Offline OCR)
      setLoadingState("ocr");
      toast.info("جاري فحص الصورة محلياً...");

      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log(m)
      });

      const extractedText = result.data.text;
      setRawOcrText(extractedText);

      if (!extractedText.trim()) {
        toast.error("لم يتم العثور على نص واضح في الصورة.");
        setLoadingState("idle");
        return;
      }

      // 2. الفهم الذكي والاستخراج (AI Parsing)
      setLoadingState("ai");
      toast.info("جاري تحليل القياسات الطبية بالذكاء الاصطناعي...");

      const aiPrompt = [
        {
          role: "system",
          content: `أنت طبيب خبير في قراءة تقارير الموجات فوق الصوتية (Ultrasound Biometry).
          تم استخراج هذا النص من صورة باستخدام OCR. رتب القيم المطلوبة فقط.
          
          القواعد:
          1. استخرج القيم وضعها مع وحداتها (مثلاً: 14 mm, 28 weeks, 1.2 kg).
          2. إذا لم تجد القيمة، اتركها فارغة "".
          3. الرد يجب أن يكون بصيغة JSON فقط، بالهيكل التالي:
          \`\`\`json
          {
            "fhr": "نبض الجنين (FHR)",
            "efw": "الوزن التقديري (EFW)",
            "afi": "كمية السائل (AFI)",
            "ga": "عمر الجنين (GA)",
            "bpd": "BPD",
            "hc": "HC",
            "ac": "AC",
            "fl": "FL",
            "flBpd": "FL/BPD",
            "ci": "Cephalic index",
            "hcAc": "HC/AC",
            "flAc": "FL/AC",
            "notes": "أي ملاحظات عامة"
          }
          \`\`\``
        },
        {
          role: "user",
          content: `النص المستخرج: \n\n${extractedText}`
        }
      ];

      // @ts-ignore
      const aiResponse = await sendSymptomChat(aiPrompt);
      
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0].replace(/```json/g, "").replace(/```/g, ""));
        setFormData({
          fhr: parsedData.fhr || "",
          efw: parsedData.efw || "",
          afi: parsedData.afi || "",
          ga: parsedData.ga || "",
          bpd: parsedData.bpd || "",
          hc: parsedData.hc || "",
          ac: parsedData.ac || "",
          fl: parsedData.fl || "",
          flBpd: parsedData.flBpd || "",
          ci: parsedData.ci || "",
          hcAc: parsedData.hcAc || "",
          flAc: parsedData.flAc || "",
          notes: parsedData.notes || ""
        });
        toast.success("تم استخراج وتحليل القياسات الحيوية بنجاح!");
      } else {
        throw new Error("لم يتم إرجاع JSON صحيح");
      }

    } catch (error) {
      console.error("Analysis Error:", error);
      toast.error("تم استخراج النص لكن فشل التحليل الذكي. يمكنك إدخال البيانات يدوياً.");
    } finally {
      setLoadingState("idle");
    }
  };

  const handleSaveToPatient = async () => {
    if (!selectedPatient) return toast.error("يرجى اختيار المريضة أولاً");
    if (!formData.ga && !formData.bpd && !formData.fhr && !rawOcrText) return toast.error("يرجى إدخال بيانات التقرير أو استخراجها");

    setIsSaving(true);
    try {
      await addDoc(collection(db, "users", selectedPatient, "labs"), {
        category: "موجات فوق صوتية (سونار)",
        testName: "فحص السونار الروتيني",
        value: "مرفق بالتقرير",
        unit: "",
        referenceRange: "-",
        date: new Date().toLocaleDateString("en-CA"),
        status: "normal",
        details: formData,
        rawOcrText: rawOcrText,
        createdAt: serverTimestamp()
      });

      const patientName = patients.find(p => p.id === selectedPatient)?.displayName;
      await addDoc(collection(db, "alerts"), {
        patientId: selectedPatient,
        patientName: patientName,
        type: "ultrasound",
        message: "تم رفع تقرير موجات فوق صوتية (متضمن القياسات الحيوية) جديد بواسطة التمريض",
        severity: "low",
        acknowledged: false,
        createdAt: serverTimestamp(),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      });

      toast.success("تم حفظ التقرير بجميع القياسات في ملف المريضة بنجاح!");
      
      setFormData({ fhr: "", efw: "", afi: "", ga: "", bpd: "", hc: "", ac: "", fl: "", flBpd: "", ci: "", hcAc: "", flAc: "", notes: "" });
      setRawOcrText("");
      setSelectedPatient("");
    } catch (error) {
      toast.error("فشل في حفظ التقرير");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">تقارير السونار (OCR + AI)</h1>
        <p className="text-muted-foreground text-sm mt-1">الاستخراج الذكي للقياسات الحيوية (Biometry) والنسب (Ratios)</p>
      </div>

      {/* اختيار المريضة */}
      <Card className="glass-card border-primary/20">
        <CardContent className="py-4 flex items-center gap-4">
          <Label className="font-bold shrink-0">اختر المريضة:</Label>
          <select
            className="flex h-10 w-full max-w-sm items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
          >
            <option value="" disabled>-- قائمة المرضى --</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.displayName || "مريضة بدون اسم"}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* قسم الاستخراج (OCR) */}
        <Card className="glass-card flex flex-col">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" /> معالجة الصورة
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 text-center bg-muted/20">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">قم برفع صورة السونار (Ultrasound Print) للتحليل</p>
              <label>
                <Input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={loadingState !== "idle"} />
                <Button variant="outline" asChild disabled={loadingState !== "idle"}>
                  <span className="cursor-pointer min-w-[150px] flex justify-center">
                    {loadingState === "ocr" ? (
                      <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> قراءة الصورة...</>
                    ) : loadingState === "ai" ? (
                      <><BrainCircuit className="ml-2 h-4 w-4 animate-pulse text-primary" /> استخراج القياسات...</>
                    ) : (
                      <><Upload className="ml-2 h-4 w-4" /> رفع الصورة</>
                    )}
                  </span>
                </Button>
              </label>
            </div>

            <div className="flex-1 flex flex-col">
              <Label className="mb-2 text-muted-foreground flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> النص الخام المستخرج من الصورة:</Label>
              <textarea 
                className="flex-1 min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-left shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground"
                dir="ltr"
                readOnly
                value={rawOcrText}
                placeholder="سيظهر النص الإنجليزي العشوائي هنا بعد القراءة..."
              />
            </div>
          </CardContent>
        </Card>

        {/* قسم الإدخال اليدوي والاعتماد */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" /> البيانات المكتشفة بذكاء
              </div>
              <Badge variant="secondary" className="font-normal text-xs">قابلة للتعديل يدوياً</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 h-[500px] overflow-y-auto pr-2">
            
            {/* القياسات العامة */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold border-b pb-1 text-primary">القياسات العامة</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">عمر الجنين (GA)</Label><Input value={formData.ga} onChange={(e) => setFormData({...formData, ga: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">نبض الجنين (FHR)</Label><Input value={formData.fhr} onChange={(e) => setFormData({...formData, fhr: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">الوزن التقديري (EFW)</Label><Input value={formData.efw} onChange={(e) => setFormData({...formData, efw: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">السائل الأمينوسي (AFI)</Label><Input value={formData.afi} onChange={(e) => setFormData({...formData, afi: e.target.value})} className="h-8 text-sm" /></div>
              </div>
            </div>

            {/* القياسات الحيوية */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold border-b pb-1 text-primary">القياسات الحيوية (Biometry)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">قطر الرأس (BPD)</Label><Input value={formData.bpd} onChange={(e) => setFormData({...formData, bpd: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">محيط الرأس (HC)</Label><Input value={formData.hc} onChange={(e) => setFormData({...formData, hc: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">محيط البطن (AC)</Label><Input value={formData.ac} onChange={(e) => setFormData({...formData, ac: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">طول الفخذ (FL)</Label><Input value={formData.fl} onChange={(e) => setFormData({...formData, fl: e.target.value})} className="h-8 text-sm" /></div>
              </div>
            </div>

            {/* النسب والمؤشرات */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold border-b pb-1 text-primary">النسب والمؤشرات (Ratios)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">FL / BPD</Label><Input value={formData.flBpd} onChange={(e) => setFormData({...formData, flBpd: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Cephalic Index</Label><Input value={formData.ci} onChange={(e) => setFormData({...formData, ci: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">HC / AC</Label><Input value={formData.hcAc} onChange={(e) => setFormData({...formData, hcAc: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">FL / AC</Label><Input value={formData.flAc} onChange={(e) => setFormData({...formData, flAc: e.target.value})} className="h-8 text-sm" /></div>
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <Label>ملاحظات إضافية</Label>
              <textarea 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]"
                placeholder="اكتب ملاحظاتك هنا..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <Button className="w-full mt-2 sticky bottom-0 z-10" size="lg" onClick={handleSaveToPatient} disabled={isSaving || loadingState !== "idle"}>
              {isSaving ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Save className="ml-2 h-5 w-5" />}
              {isSaving ? "جاري الحفظ..." : "حفظ التقرير في ملف المريضة"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}