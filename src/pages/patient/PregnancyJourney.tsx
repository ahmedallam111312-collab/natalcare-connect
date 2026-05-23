import { useState, useEffect } from "react";
import { CalendarHeart, Baby, Info, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/stores/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

// Sample week data
const pregnancyWeeks = [
  { week: 4, size: "بذرة الخشخاش", length: "0.1 سم", weight: "أقل من 1 جرام", desc: "يبدأ الجنين في التكون وتزرع البويضة في جدار الرحم." },
  { week: 8, size: "حبة توت العليق", length: "1.6 سم", weight: "1 جرام", desc: "تبدأ براعم الأطراف بالظهور، والقلب ينبض بمعدل 150-170 نبضة/دقيقة." },
  { week: 12, size: "حبة ليمون صغيرة (Lime)", length: "5.4 سم", weight: "14 جرام", desc: "تكتمل معظم أجهزة الجسم الأساسية ويبدأ الجنين بالحركة العشوائية." },
  { week: 16, size: "حبة أفوكادو", length: "11.6 سم", weight: "100 جرام", desc: "يبدأ الجنين في التجاوب مع الصوت والضوء وتزداد حركته." },
  { week: 20, size: "ثمرة موز", length: "25.6 سم", weight: "300 جرام", desc: "منتصف رحلة الحمل! قد تبدأين بالشعور بركلات الجنين بشكل واضح." },
  { week: 24, size: "كوز ذرة", length: "30 سم", weight: "600 جرام", desc: "تتطور الرئتان ويبدأ الجنين في التدرب على التنفس في السائل الأمينوسي." },
  { week: 28, size: "حبة باذنجان", length: "37.6 سم", weight: "1000 جرام", desc: "الجنين الآن قادر على فتح عينيه وإغماضها." },
  { week: 32, size: "حبة قرع صغيرة", length: "42.4 سم", weight: "1700 جرام", desc: "تزداد نسبة الدهون تحت جلد الجنين ويصبح شكله أقرب لحديثي الولادة." },
  { week: 36, size: "حبة بطيخ صغيرة", length: "47.4 سم", weight: "2600 جرام", desc: "ينزل رأس الجنين في الحوض استعداداً للولادة في الأسابيع القادمة." },
  { week: 40, size: "ثمرة يقطين متوسطة", length: "51.2 سم", weight: "3400 جرام", desc: "اكتمل نمو الجنين وهو مستعد للقائك قريباً جداً!" },
];

export default function PregnancyJourney() {
  const { user } = useAuthStore();
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [edd, setEdd] = useState<Date | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists() && docSnap.data().lmp) {
          const lmpDate = new Date(docSnap.data().lmp);
          
          // Calculate current week
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - lmpDate.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const week = Math.floor(diffDays / 7);
          
          setCurrentWeek(Math.min(Math.max(week, 1), 42)); // Cap between 1 and 42
          
          // Calculate EDD (LMP + 280 days)
          const due = new Date(lmpDate);
          due.setDate(due.getDate() + 280);
          setEdd(due);
        } else {
          // Fallback if no LMP, simulate week 20
          setCurrentWeek(20);
        }
      } catch (err) {
        console.error("Error fetching LMP", err);
      }
    };
    fetchUserData();
  }, [user]);

  // Find the closest week data for visualization
  const currentWeekData = [...pregnancyWeeks].reverse().find(w => w.week <= currentWeek) || pregnancyWeeks[0];
  const progressPercent = Math.min((currentWeek / 40) * 100, 100);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-2">
            <CalendarHeart className="w-8 h-8 text-primary" />
            رحلة الحمل
          </h1>
          <p className="text-muted-foreground mt-1">تتبعي نمو طفلك أسبوعاً بأسبوع واكتشفي التغيرات التي تطرأ عليه.</p>
        </div>
        
        {edd && (
          <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground font-bold">موعد الولادة المتوقع</p>
              <p className="text-sm font-bold text-foreground">{edd.toLocaleDateString('ar-EG')}</p>
            </div>
          </div>
        )}
      </div>

      <Card className="glass-card shadow-sm border-transparent overflow-hidden relative">
        <div className="absolute top-0 right-0 w-full h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
        </div>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 relative">
              <div className="w-40 h-40 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 relative z-10">
                <Baby className="w-20 h-20 text-primary" />
              </div>
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse z-0" />
            </div>
            
            <div className="flex-1 text-center md:text-right">
              <h2 className="text-2xl font-bold mb-2">أنتِ الآن في الأسبوع {currentWeek}</h2>
              <p className="text-lg text-muted-foreground mb-4">
                في هذا الأسبوع، حجم الجنين تقريباً في حجم <strong className="text-foreground">{currentWeekData.size}</strong> 🍋
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

      <Alert className="bg-accent/5 border-accent/20">
        <Info className="h-5 w-5 text-accent" />
        <div className="pr-2">
          <h3 className="font-bold text-accent-foreground mb-1">ماذا يحدث في هذا الأسبوع؟</h3>
          <AlertDescription className="text-muted-foreground leading-relaxed">
            {currentWeekData.desc}
          </AlertDescription>
        </div>
      </Alert>

      <div className="mt-8">
        <h3 className="font-bold text-lg mb-4">خط الزمن لرحلة الحمل (Timeline)</h3>
        <div className="space-y-4">
          {pregnancyWeeks.map((w) => (
            <div key={w.week} className={`p-4 rounded-xl border flex items-start gap-4 transition-all ${currentWeek >= w.week ? 'bg-background border-primary/30 shadow-sm' : 'bg-muted/30 border-transparent opacity-60'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold ${currentWeek >= w.week ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {w.week}
              </div>
              <div>
                <h4 className="font-bold text-foreground">الأسبوع {w.week} - {w.size}</h4>
                <p className="text-sm text-muted-foreground mt-1">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
