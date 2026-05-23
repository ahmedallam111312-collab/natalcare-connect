import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Baby, CalendarDays, Heart, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const pregnancyWeeks = [
  { week: 4, size: "بذرة الخشخاش", length: "0.1 سم", weight: "أقل من 1 جرام", desc: "يبدأ الجنين في التكون وتزرع البويضة في جدار الرحم." },
  { week: 8, size: "حبة توت العليق", length: "1.6 سم", weight: "1 جرام", desc: "تبدأ براعم الأطراف بالظهور، والقلب ينبض." },
  { week: 12, size: "حبة ليمون صغيرة", length: "5.4 سم", weight: "14 جرام", desc: "تكتمل معظم أجهزة الجسم الأساسية." },
  { week: 16, size: "حبة أفوكادو", length: "11.6 سم", weight: "100 جرام", desc: "يبدأ الجنين في التجاوب مع الصوت والضوء." },
  { week: 20, size: "ثمرة موز", length: "25.6 سم", weight: "300 جرام", desc: "منتصف رحلة الحمل! قد تبدأين بالشعور بركلات الجنين بشكل واضح." },
  { week: 24, size: "كوز ذرة", length: "30 سم", weight: "600 جرام", desc: "تتطور الرئتان ويبدأ الجنين في التدرب على التنفس." },
  { week: 28, size: "حبة باذنجان", length: "37.6 سم", weight: "1000 جرام", desc: "الجنين الآن قادر على فتح عينيه وإغماضها." },
  { week: 32, size: "حبة قرع صغيرة", length: "42.4 سم", weight: "1700 جرام", desc: "تزداد نسبة الدهون تحت جلد الجنين." },
  { week: 36, size: "حبة بطيخ صغيرة", length: "47.4 سم", weight: "2600 جرام", desc: "ينزل رأس الجنين في الحوض استعداداً للولادة." },
  { week: 40, size: "ثمرة يقطين متوسطة", length: "51.2 سم", weight: "3400 جرام", desc: "اكتمل نمو الجنين وهو مستعد للقائكم!" },
];

export default function PartnerDashboard() {
  const { user } = useAuthStore();
  const [patientData, setPatientData] = useState<any>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [edd, setEdd] = useState<Date | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const partnerDoc = await getDoc(doc(db, "users", user.uid));
        if (!partnerDoc.exists()) return;
        
        const linkedId = partnerDoc.data().linkedPatientId;
        if (!linkedId) return;

        // Fetch Patient Data (LMP)
        const patientDoc = await getDoc(doc(db, "users", linkedId));
        if (patientDoc.exists()) {
          const pData = patientDoc.data();
          setPatientData(pData);

          if (pData.lmp) {
            const lmpDate = new Date(pData.lmp);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lmpDate.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const week = Math.floor(diffDays / 7);
            setCurrentWeek(Math.min(Math.max(week, 1), 42));
            
            const due = new Date(lmpDate);
            due.setDate(due.getDate() + 280);
            setEdd(due);
          }
        }

        // Fetch upcoming appointments
        const now = new Date();
        const q = query(
          collection(db, "users", linkedId, "appointments"),
          where("date", ">=", now),
          orderBy("date", "asc")
        );
        
        const unsub = onSnapshot(q, (snap) => {
          const appts = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate()
          }));
          setAppointments(appts);
        });

        setLoading(false);
        return () => unsub();
      } catch (err) {
        console.error("Error fetching partner data", err);
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-primary">جاري التحميل...</div>;
  }

  const currentWeekData = [...pregnancyWeeks].reverse().find(w => w.week <= currentWeek) || pregnancyWeeks[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-2">
            مرحباً بك يا شريك الرحلة! <Heart className="text-destructive fill-destructive w-6 h-6" />
          </h1>
          <p className="text-muted-foreground mt-1">
            هذه المساحة مخصصة لك لمتابعة تطور طفلك ودعم زوجتك في رحلة الحمل.
          </p>
        </div>
      </div>

      {/* Pregnancy Journey Card */}
      <Card className="glass-card shadow-sm border-transparent overflow-hidden">
        <CardHeader className="bg-primary/5 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Baby className="w-5 h-5 text-primary" />
            تطور الجنين
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 relative">
              <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                <Baby className="w-16 h-16 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-2xl font-bold mb-2">الأسبوع {currentWeek || "--"} من الحمل</h2>
              <p className="text-lg text-muted-foreground mb-4">
                حجم طفلك الآن تقريباً في حجم <strong className="text-foreground">{currentWeekData.size}</strong> 🍋
              </p>
              
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto md:mx-0">
                <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">الطول التقريبي</p>
                  <p className="font-bold text-primary">{currentWeekData.length}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">الوزن التقريبي</p>
                  <p className="font-bold text-primary">{currentWeekData.weight}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Appointments */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              المواعيد القادمة
            </CardTitle>
            <CardDescription>مواعيد زيارة الطبيب الخاصة بزوجتك</CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">لا توجد مواعيد قادمة مجدولة.</p>
            ) : (
              <div className="space-y-4">
                {appointments.slice(0,3).map(app => (
                  <div key={app.id} className="flex items-center p-4 bg-muted/40 rounded-xl border border-border/50">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center flex-shrink-0 font-bold ml-4">
                      {app.date.getDate()}
                    </div>
                    <div>
                      <p className="font-bold">{app.type || "متابعة حمل"}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {app.date.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Tips */}
        <div className="space-y-4">
          <Alert className="bg-accent/10 border-accent/20">
            <Heart className="h-5 w-5 text-accent-foreground" />
            <AlertTitle className="text-accent-foreground font-bold">نصيحة لدعم زوجتك هذا الأسبوع</AlertTitle>
            <AlertDescription className="text-muted-foreground mt-2 leading-relaxed">
              في هذه المرحلة من الحمل، قد تشعر زوجتك بالإرهاق السريع وألم الظهر. يمكنك مساعدتها بعمل مساج لطيف لظهرها، وتحضير وجبة خفيفة ومغذية لها لتشعر باهتمامك.
            </AlertDescription>
          </Alert>
          
          {edd && (
             <Card className="bg-background border border-border shadow-sm">
               <CardContent className="p-6 text-center">
                 <p className="text-muted-foreground text-sm font-bold mb-2 uppercase tracking-wider">موعد الولادة المتوقع</p>
                 <p className="text-3xl font-mono font-bold text-primary">{edd.toLocaleDateString('ar-EG')}</p>
                 <p className="text-xs text-muted-foreground mt-2">استعد للقاء المنتظر!</p>
               </CardContent>
             </Card>
          )}
        </div>

      </div>

    </div>
  );
}
