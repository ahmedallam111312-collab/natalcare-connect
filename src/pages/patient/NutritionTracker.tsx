import { useState, useEffect } from "react";
import { Utensils, Scale, TrendingUp, Info } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface WeightLog {
  id: string;
  weight: number;
  date: Date;
}

export default function NutritionTracker() {
  const { user } = useAuthStore();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "weightLogs"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        weight: doc.data().weight,
        date: doc.data().date?.toDate() || new Date(),
      }));
      setWeightLogs(data);
    });
    return () => unsub();
  }, [user]);

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newWeight || isNaN(Number(newWeight))) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "users", user.uid, "weightLogs"), {
        weight: Number(newWeight),
        date: serverTimestamp()
      });
      setNewWeight("");
      toast.success("تم تسجيل الوزن بنجاح");
    } catch (err) {
      toast.error("فشل تسجيل الوزن");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "weightLogs", id));
      toast.success("تم الحذف");
    } catch (err) {
      toast.error("فشل الحذف");
    }
  };

  // Format data for chart
  const chartData = weightLogs.map(log => ({
    date: log.date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
    الوزن: log.weight
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-2">
            <Utensils className="w-8 h-8 text-primary" />
            مخطط التغذية والوزن
          </h1>
          <p className="text-muted-foreground mt-1">راقبي زيادة وزنك أثناء الحمل وتعرفي على النصائح الغذائية.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input & Tips Column */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                تسجيل الوزن الحالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddWeight} className="space-y-4">
                <div>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.1" 
                      placeholder="مثال: 65.5" 
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      className="pr-16 h-12 text-lg"
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      كجم
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12" disabled={isSubmitting || !newWeight}>
                  حفظ الوزن
                </Button>
              </form>
            </CardContent>
          </Card>

          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-bold">نصيحة غذائية ذكية</AlertTitle>
            <AlertDescription className="text-muted-foreground mt-2 leading-relaxed text-sm">
              زيادة الوزن الطبيعية خلال الحمل تتراوح بين 11 إلى 16 كجم إذا كان وزنكِ مثالياً قبل الحمل. احرصي على تناول الأطعمة الغنية بالحديد (مثل السبانخ واللحوم الحمراء) وحمض الفوليك. واشربي ما لا يقل عن 8 أكواب من الماء يومياً.
            </AlertDescription>
          </Alert>
          
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">سجل القراءات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {weightLogs.slice().reverse().map(log => (
                  <div key={log.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-sm">
                    <span className="font-bold">{log.weight} كجم</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">{log.date.toLocaleDateString("ar-EG")}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-destructive px-2" onClick={() => handleDelete(log.id)}>حذف</Button>
                    </div>
                  </div>
                ))}
                {weightLogs.length === 0 && <p className="text-center text-muted-foreground text-sm">لا توجد قراءات بعد.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Column */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-full min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                منحنى زيادة الوزن
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              {weightLogs.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `${value}`}
                      domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="الوزن" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2 }} 
                      activeDot={{ r: 6, strokeWidth: 0 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                  <TrendingUp className="w-12 h-12 opacity-20" />
                  <p>أدخلي قراءتين على الأقل لرسم المنحنى البياني.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
