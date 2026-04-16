import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { sendSymptomChat } from "@/services/aiService";
import type { ChatMessage } from "@/types";
import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const MAX_QUESTIONS = 4; // بعد 4 أسئلة سيتم إرسال التقرير للطبيب

export default function SymptomsTracker() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "مرحباً! أنا مساعدك الطبي. أخبريني، بم تشعرين اليوم؟",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [collectedData, setCollectedData] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // التمرير التلقائي لأسفل
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // =========================
  // 🧠 الأسئلة الاحتياطية (Fallback)
  // =========================
  const fallbackQuestions = [
    "ما شدة الأعراض؟",
    "متى بدأت الأعراض؟",
    "هل هناك أوقات تزيد فيها؟",
    "هل توجد أعراض أخرى مرافقة؟",
  ];

  // =========================
  // 🤖 توجيه الذكاء الاصطناعي (بدون قص النصوص)
  // =========================
  const getValidAIResponse = async (chat: any[]) => {
    const chatCopy = [...chat];
    const lastMsg = chatCopy[chatCopy.length - 1].content;
    
    // حقن الأوامر داخل رسالة المستخدم لكي يلتزم بها الذكاء الاصطناعي
    chatCopy[chatCopy.length - 1].content = `المريضة تقول: "${lastMsg}"
    
    أنت طبيب فرز طوارئ. 
    تعليمات صارمة للرد:
    1. اطرح سؤال تشخيصي واحد فقط (مثال: متى بدأ الألم؟).
    2. لا ترحب، لا تعتذر، ولا تعطِ نصائح.
    3. الرد يجب ألا يتجاوز 10 كلمات باللغة العربية.`;

    try {
      let raw = await sendSymptomChat(chatCopy);
      // تنظيف الرد من النجمات أو علامات التنصيص إن وجدت
      return raw.replace(/[*"]/g, '').trim();
    } catch (e) {
      console.error("AI Error:", e);
      return fallbackQuestions[Math.min(step, fallbackQuestions.length - 1)];
    }
  };

  // =========================
  // 🚨 إنشاء التقرير وإرساله للطبيب
  // =========================
  const isEmergency = (text: string) => {
    return text.includes("نزيف") || text.includes("ألم شديد") || text.includes("إغماء") || text.includes("ماء");
  };

  const generateReport = async (data: string[]) => {
    try {
      const reportPrompt = [
        {
          role: "user",
          content: `لدي مريضة تشتكي من الأعراض التالية بالترتيب: ${data.join("، ")}.
          اكتب ملخصاً طبياً قصيراً جداً (سطر واحد فقط) ليرسل كإشعار للطبيب المعالج.`
        }
      ];
      let response = await sendSymptomChat(reportPrompt);
      return response.replace(/[*"]/g, '').trim();
    } catch {
      return `المريضة تشتكي من: ${data.join("، ")}`;
    }
  };

  const sendReportToDoctor = async (reportText: string, severity: "moderate" | "high" = "moderate") => {
    if (!user) return;
    try {
      let targetDoctorId = (user as any).doctorId || null;

      // إذا لم يكن للمريضة طبيب مخصص، ابحث عن الطبيب العالمي لكي يصله التنبيه
      if (!targetDoctorId) {
        const q = query(collection(db, "users"), where("role", "==", "doctor"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          targetDoctorId = querySnapshot.docs[0].id;
        }
      }

      await addDoc(collection(db, "alerts"), {
        patientId: user.uid,
        patientName: user.displayName || "مريضة",
        doctorId: targetDoctorId, // الآن سيتم ربطه بالطبيب بنجاح!
        type: "ai",
        message: reportText,
        severity: severity,
        acknowledged: false,
        createdAt: serverTimestamp(),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      });
    } catch (e) {
      console.error("Error sending report to Firebase:", e);
    }
  };

  // =========================
  // 📩 المعالجة الرئيسية
  // =========================
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setCollectedData((prev) => [...prev, input.trim()]);
    setInput("");
    setIsLoading(true);

    try {
      // 1. فحص الطوارئ
      if (isEmergency(userMsg.content)) {
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ يرجى التوجه للطوارئ فوراً أو الاتصال بالإسعاف. لقد قمت بتنبيه طبيبك.", timestamp: new Date().toISOString() }]);
        await sendReportToDoctor(`حالة طوارئ محتملة: ${userMsg.content}`, "high");
        setIsLoading(false);
        return;
      }

      // 2. الأسئلة التشخيصية
      if (step < MAX_QUESTIONS) {
        const aiResponse = await getValidAIResponse([...messages, userMsg]);
        setMessages((prev) => [...prev, { role: "assistant", content: aiResponse, timestamp: new Date().toISOString() }]);
        setStep((prev) => prev + 1);
        setIsLoading(false);
        return;
      }

      // 3. إنهاء المحادثة وإرسال التقرير
      const finalReport = await generateReport([...collectedData, userMsg.content]);
      await sendReportToDoctor(finalReport, "moderate");

      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: "شكراً لكِ. لقد قمت بجمع المعلومات وإرسال تقرير بها إلى طبيبك المتابع. ارتاحي الآن وسيتم التواصل معك إذا لزم الأمر.", 
        timestamp: new Date().toISOString() 
      }]);
      
      toast.success("تم إرسال التقرير للطبيب بنجاح");
      
      setStep(0);
      setCollectedData([]);

    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.", timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickSymptoms = ["غثيان", "صداع", "ألم ظهر", "تورم", "نزيف", "تقلصات"];

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">متتبع الأعراض الذكي</h1>
        <p className="text-muted-foreground text-sm mt-1">المساعد الطبي السريع (حد أقصى {MAX_QUESTIONS + 1} أسئلة)</p>
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        {quickSymptoms.map((s) => (
          <Badge
            key={s}
            variant={s === "نزيف" ? "destructive" : "outline"}
            className="cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => setInput(`أعاني من ${s}`)}
          >
            {s}
          </Badge>
        ))}
      </div>

      <Card className="glass-card flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2 border-b shrink-0">
          <CardTitle className="font-heading text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> التشخيص المبدئي
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              خطوة {step} من {MAX_QUESTIONS}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pt-4 min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pl-2 pr-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary" : "bg-secondary"}`}>
                  {msg.role === "user" ? <User className="w-4 h-4 text-primary-foreground" /> : <Bot className="w-4 h-4 text-secondary-foreground" />}
                </div>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : msg.content.includes("طوارئ") 
                      ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm"
                      : "bg-muted text-foreground rounded-tl-sm border border-border"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Bot className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div className="bg-muted p-4 rounded-2xl rounded-tl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 items-center bg-background rounded-full border border-border p-1 shadow-sm shrink-0">
            <Input 
              placeholder="اكتبي إجابتك هنا..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && handleSend()} 
              disabled={isLoading || step > MAX_QUESTIONS} 
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none px-4"
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon" className="rounded-full shrink-0 w-10 h-10">
              <Send className="h-4 w-4 rtl:-scale-x-100" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}