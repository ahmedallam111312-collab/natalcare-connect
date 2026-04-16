import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, Plus, TrendingUp } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DailyVitals() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [sugar, setSugar] = useState("");
  const [weight, setWeight] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "vitals"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vitalsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setHistory(vitalsData);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bpSystolic || !bpDiastolic || !sugar || !weight) return;

    try {
      await addDoc(collection(db, "users", user.uid, "vitals"), {
        bloodPressureSystolic: Number(bpSystolic),
        bloodPressureDiastolic: Number(bpDiastolic),
        bloodSugar: Number(sugar),
        weight: Number(weight),
        date: new Date().toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
        createdAt: serverTimestamp(),
      });
      setBpSystolic(""); setBpDiastolic(""); setSugar(""); setWeight("");
    } catch (error) {
      console.error("Error saving vitals:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">المؤشرات الحيوية اليومية</h1>
        <p className="text-muted-foreground text-sm mt-1">سجلي وتتبعي قياساتك الصحية اليومية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> تسجيل مؤشرات اليوم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="systolic">الضغط الانقباضي</Label>
                  <Input id="systolic" type="number" placeholder="120" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diastolic">الضغط الانبساطي</Label>
                  <Input id="diastolic" type="number" placeholder="80" value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sugar">سكر الدم (mg/dL)</Label>
                <Input id="sugar" type="number" placeholder="95" value={sugar} onChange={(e) => setSugar(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">الوزن (كجم)</Label>
                <Input id="weight" type="number" step="0.1" placeholder="68.0" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <Button type="submit" className="w-full"><Activity className="ml-2 h-4 w-4" />حفظ المؤشرات</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> منحنى ضغط الدم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={[...history].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" orientation="right" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", textAlign: "right" }} />
                <Line type="monotone" dataKey="bloodPressureSystolic" stroke="hsl(var(--primary))" strokeWidth={2} name="انقباضي" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="bloodPressureDiastolic" stroke="hsl(var(--secondary))" strokeWidth={2} name="انبساطي" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-heading text-lg">السجلات الأخيرة</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 px-3 font-medium">التاريخ</th>
                  <th className="py-2 px-3 font-medium">ضغط الدم</th>
                  <th className="py-2 px-3 font-medium">السكر</th>
                  <th className="py-2 px-3 font-medium">الوزن</th>
                  <th className="py-2 px-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {history.map((v) => (
                  <tr key={v.id} className="border-b border-border/50">
                    <td className="py-2.5 px-3">{v.date}</td>
                    <td className="py-2.5 px-3" dir="ltr">{v.bloodPressureSystolic}/{v.bloodPressureDiastolic}</td>
                    <td className="py-2.5 px-3">{v.bloodSugar} mg/dL</td>
                    <td className="py-2.5 px-3">{v.weight} كجم</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-success border-success/30 bg-success/5">تم التسجيل</Badge>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">لم يتم تسجيل أي مؤشرات بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}