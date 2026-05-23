import { useState, useEffect } from "react";
import { Play, Square, AlertTriangle, Clock, Activity, CalendarDays, CheckCircle2 } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Contraction {
  id: string;
  startTime: Date;
  endTime: Date | null;
  duration: number | null; // in seconds
  frequency: number | null; // in seconds (time from start of previous to start of this)
}

export default function ContractionTimer() {
  const { user } = useAuthStore();
  const [contractions, setContractions] = useState<Contraction[]>([]);
  const [activeContraction, setActiveContraction] = useState<Contraction | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Fetch history
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "contractions"), orderBy("startTime", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          startTime: d.startTime?.toDate() || new Date(),
          endTime: d.endTime?.toDate() || null,
          duration: d.duration,
          frequency: d.frequency,
        } as Contraction;
      });
      setContractions(data);
      
      // Check if there is an active contraction
      const active = data.find(c => c.endTime === null);
      if (active) {
        setActiveContraction(active);
      } else {
        setActiveContraction(null);
      }
    });
    return () => unsub();
  }, [user]);

  // Timer for active contraction
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeContraction) {
      interval = setInterval(() => {
        const now = new Date();
        setElapsed(Math.floor((now.getTime() - activeContraction.startTime.getTime()) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeContraction]);

  const handleStart = async () => {
    if (!user) return;
    const now = new Date();
    
    // Calculate frequency if there was a previous contraction
    let frequency = null;
    const finishedContractions = contractions.filter(c => c.endTime !== null);
    if (finishedContractions.length > 0) {
      const lastContraction = finishedContractions[0]; // because it's sorted desc
      frequency = Math.floor((now.getTime() - lastContraction.startTime.getTime()) / 1000);
    }

    try {
      await addDoc(collection(db, "users", user.uid, "contractions"), {
        startTime: now,
        endTime: null,
        duration: null,
        frequency: frequency
      });
    } catch (err) {
      toast.error("حدث خطأ أثناء بدء التسجيل");
    }
  };

  const handleStop = async () => {
    if (!user || !activeContraction) return;
    const now = new Date();
    const duration = Math.floor((now.getTime() - activeContraction.startTime.getTime()) / 1000);

    try {
      await updateDoc(doc(db, "users", user.uid, "contractions", activeContraction.id), {
        endTime: now,
        duration: duration
      });
      
      checkDangerZone(duration);
    } catch (err) {
      toast.error("حدث خطأ أثناء إيقاف التسجيل");
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "contractions", id));
      toast.success("تم الحذف");
    } catch (err) {
      toast.error("فشل الحذف");
    }
  };

  // 5-1-1 Rule checking
  const checkDangerZone = async (lastDuration: number) => {
    if (!user) return;
    const finished = contractions.filter(c => c.endTime !== null);
    if (finished.length < 2) return;

    // We check the last 3 contractions (the current one just finished + previous 2)
    const recent = [ ...finished ].slice(0, 3);
    const avgFreq = recent.reduce((acc, c) => acc + (c.frequency || 0), 0) / recent.length;
    
    // If avg frequency <= 5 mins (300s) and duration >= 45s, trigger alert
    if (avgFreq > 0 && avgFreq <= 360 && lastDuration >= 45) {
      toast.error("تنبيه: انقباضات ولادة نشطة!");
      
      // Send Alert to Doctor
      await addDoc(collection(db, "alerts"), {
        patientId: user.uid,
        patientName: user.displayName || "مريضة",
        type: "contractions",
        message: "حالة طوارئ: المريضة تعاني من انقباضات ولادة نشطة (قاعدة 5-1-1). يجب الاستعداد للولادة.",
        severity: "high",
        createdAt: serverTimestamp(),
        acknowledged: false,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}د ${s}ث`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">متتبع الانقباضات (الطلق)</h1>
          <p className="text-muted-foreground mt-1">تتبعي مدة وتكرار الانقباضات لمعرفة الوقت المناسب للتوجه للمستشفى.</p>
        </div>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <AlertTriangle className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary font-bold">متى تذهبين للمستشفى؟ (قاعدة 5-1-1)</AlertTitle>
        <AlertDescription className="text-muted-foreground mt-2 text-sm leading-relaxed">
          إذا كانت الانقباضات تأتي كل <strong>5 دقائق</strong>، وتستمر لمدة <strong>دقيقة واحدة</strong>، واستمرت على هذا النحو لمدة <strong>ساعة كاملة</strong>.. فهذا يعني أنك في مرحلة الولادة النشطة ويجب التوجه للمستشفى. سيقوم النظام بتنبيه طبيبك تلقائياً إذا لاحظنا هذا النمط.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Timer Card */}
        <Card className="glass-card border-transparent shadow-sm flex flex-col items-center justify-center py-12 text-center relative overflow-hidden">
          {activeContraction && (
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
          )}
          <CardContent className="relative z-10 space-y-8 w-full flex flex-col items-center">
            
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {activeContraction ? "انقباض نشط الآن" : "في انتظار الانقباض التالي"}
              </h2>
              <div className="text-6xl md:text-7xl font-mono font-bold text-foreground tracking-tighter">
                {formatTime(elapsed)}
              </div>
            </div>

            {activeContraction ? (
              <Button 
                onClick={handleStop}
                size="lg" 
                className="w-48 h-16 rounded-full text-lg shadow-lg hover:shadow-xl transition-all bg-destructive hover:bg-destructive/90 animate-in zoom-in"
              >
                <Square className="ml-2 w-5 h-5" fill="currentColor" />
                إيقاف التسجيل
              </Button>
            ) : (
              <Button 
                onClick={handleStart}
                size="lg" 
                className="w-48 h-16 rounded-full text-lg shadow-lg hover:shadow-xl transition-all animate-in zoom-in"
              >
                <Play className="ml-2 w-5 h-5" fill="currentColor" />
                بدء انقباض جديد
              </Button>
            )}
          </CardContent>
        </Card>

        {/* History List */}
        <Card className="glass-card border-transparent shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              سجل الانقباضات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contractions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                لا توجد انقباضات مسجلة بعد.
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {contractions.map((c, i) => (
                  <div key={c.id} className="flex flex-col p-4 rounded-xl bg-muted/30 border border-border/50 gap-2 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-primary" />
                        {c.startTime.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {c.endTime && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
                          حذف
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-1">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">المدة (Duration)</p>
                        <p className="font-mono text-sm font-medium">
                          {c.duration ? formatTime(c.duration) : "مستمر..."}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">الفارق (Frequency)</p>
                        <p className="font-mono text-sm font-medium text-orange-600 dark:text-orange-400">
                          {c.frequency ? formatTime(c.frequency) : "--"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
