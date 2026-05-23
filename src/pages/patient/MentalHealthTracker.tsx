import { useState, useEffect } from "react";
import { BrainCircuit, HeartHandshake, ShieldAlert, Sparkles, Send } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

const questions = [
  { id: "q1", text: "لقد كنت قادرة على الضحك ورؤية الجانب المضحك من الأشياء.", options: [ { val: 0, label: "بقدر ما كنت دائماً" }, { val: 1, label: "أقل قليلاً من المعتاد" }, { val: 2, label: "أقل بكثير من المعتاد" }, { val: 3, label: "لا، على الإطلاق" } ] },
  { id: "q2", text: "لقد كنت أتطلع بشغف للأشياء.", options: [ { val: 0, label: "بقدر ما كنت دائماً" }, { val: 1, label: "أقل قليلاً" }, { val: 2, label: "أقل بكثير" }, { val: 3, label: "لا، على الإطلاق" } ] },
  { id: "q3", text: "لقد ألوم نفسي دون داعٍ عندما تسوء الأمور.", options: [ { val: 3, label: "نعم، معظم الوقت" }, { val: 2, label: "نعم، بعض الوقت" }, { val: 1, label: "ليس كثيراً" }, { val: 0, label: "لا، أبداً" } ] },
  { id: "q4", text: "لقد كنت أشعر بالقلق أو القلق دون سبب وجيه.", options: [ { val: 0, label: "لا، على الإطلاق" }, { val: 1, label: "بالكاد" }, { val: 2, label: "نعم، أحياناً" }, { val: 3, label: "نعم، في كثير من الأحيان" } ] },
];

export default function MentalHealthTracker() {
  const { user } = useAuthStore();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "mentalHealth"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        score: doc.data().score,
        date: doc.data().date?.toDate() || new Date(),
        actionTaken: doc.data().actionTaken
      }));
      setHistory(data);
    });
    return () => unsub();
  }, [user]);

  const handleSelect = (qId: string, val: number) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const calculateScore = () => {
    let total = 0;
    questions.forEach(q => {
      if (answers[q.id] !== undefined) {
        total += answers[q.id];
      }
    });
    return total;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (Object.keys(answers).length < questions.length) {
      toast.error("الرجاء الإجابة على جميع الأسئلة.");
      return;
    }

    setIsSubmitting(true);
    const score = calculateScore();
    const needsAlert = score >= 8;

    try {
      await addDoc(collection(db, "users", user.uid, "mentalHealth"), {
        score,
        answers,
        date: serverTimestamp(),
        actionTaken: needsAlert ? "alert_sent" : "none"
      });

      if (needsAlert) {
        // Send alert to doctor
        await addDoc(collection(db, "alerts"), {
          patientId: user.uid,
          patientName: user.displayName || "مريضة",
          type: "mental_health",
          message: `المريضة سجلت تقييم صحة نفسية مرتفع (درجة ${score}). قد تحتاج إلى دعم نفسي أو استشارة.`,
          severity: "high",
          createdAt: serverTimestamp(),
          acknowledged: false,
        });
        toast.error("يبدو أنكِ تمرين بوقت عصيب. لقد أرسلنا تنبيهاً لطبيبك ليطمئن عليكِ.");
      } else {
        toast.success("شكراً لمشاركتك! صحتك النفسية تبدو جيدة.");
      }

      setAnswers({});
      setShowAssessment(false);
    } catch (err) {
      toast.error("فشل إرسال التقييم");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAssessment = () => (
    <Card className="glass-card mt-6">
      <CardHeader>
        <CardTitle className="text-xl">كيف تشعرين اليوم؟</CardTitle>
        <CardDescription>الرجاء الإجابة بناءً على شعورك خلال الـ 7 أيام الماضية، وليس اليوم فقط.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-4">
            <h3 className="font-bold text-foreground">{idx + 1}. {q.text}</h3>
            <RadioGroup 
              value={answers[q.id]?.toString()} 
              onValueChange={(v) => handleSelect(q.id, parseInt(v))}
              className="grid grid-cols-1 md:grid-cols-2 gap-2"
            >
              {q.options.map((opt, i) => (
                <div key={i} className={`flex items-center space-x-2 space-x-reverse border rounded-lg p-3 transition-colors ${answers[q.id] === opt.val ? 'bg-primary/10 border-primary/50' : 'hover:bg-muted/50'}`}>
                  <RadioGroupItem value={opt.val.toString()} id={`${q.id}-${i}`} />
                  <Label htmlFor={`${q.id}-${i}`} className="cursor-pointer w-full">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}

        <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "جاري الإرسال..." : "إرسال التقييم"}
          {!isSubmitting && <Send className="w-4 h-4 mr-2" />}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-2">
            <BrainCircuit className="w-8 h-8 text-primary" />
            الصحة النفسية والمزاج
          </h1>
          <p className="text-muted-foreground mt-1">صحتك النفسية لا تقل أهمية عن صحتك الجسدية. نحن هنا لندعمك.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          {!showAssessment ? (
            <Card className="glass-card bg-gradient-to-br from-primary/10 to-transparent border-primary/20 overflow-hidden relative">
              <div className="absolute -left-10 -bottom-10 opacity-10">
                <HeartHandshake className="w-64 h-64 text-primary" />
              </div>
              <CardContent className="p-8 relative z-10 flex flex-col items-start space-y-4">
                <Sparkles className="w-8 h-8 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">أنتِ لستِ وحدكِ</h2>
                <p className="text-muted-foreground leading-relaxed max-w-lg">
                  من الطبيعي أن تشعري بتقلبات مزاجية، قلق، أو حتى حزن خلال فترة الحمل بسبب التغيرات الهرمونية والضغوطات. هذا الفحص السريع يساعد طبيبك على متابعة حالتك النفسية وتقديم الدعم عند الحاجة.
                </p>
                <Button size="lg" className="mt-4" onClick={() => setShowAssessment(true)}>
                  بدء التقييم النفسي
                </Button>
              </CardContent>
            </Card>
          ) : (
            renderAssessment()
          )}
        </div>

        <div className="space-y-6">
          <Alert className="bg-muted border-border">
            <ShieldAlert className="h-5 w-5 text-foreground" />
            <AlertTitle className="font-bold">السرية التامة</AlertTitle>
            <AlertDescription className="text-muted-foreground mt-2 text-sm">
              إجاباتك تتمتع بالسرية التامة ولا يطلع عليها سوى طبيبك المعالج لضمان تقديم الرعاية المثلى لكِ ولطفلك.
            </AlertDescription>
          </Alert>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">سجل التقييمات السابقة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لم تقومي بأي تقييم بعد.</p>
                ) : (
                  history.map(item => (
                    <div key={item.id} className="flex flex-col p-3 rounded-lg bg-muted/40 border border-border/50 text-sm gap-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-foreground">
                          {item.date.toLocaleDateString("ar-EG")}
                        </span>
                        {item.actionTaken === "alert_sent" && (
                          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">تم إبلاغ الطبيب</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.score < 5 ? "حالة مستقرة" : item.score < 8 ? "تقلبات مزاجية طفيفة" : "تحتاج إلى دعم نفسي"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
