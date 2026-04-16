import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function NursePatientDirectory() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const filtered = patients.filter((p) => 
    p.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <h1 className="text-2xl font-heading font-bold">دليل المرضى</h1>
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="ابحث عن مريض..." 
          className="pr-10" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 px-3 font-medium">الاسم</th>
                  <th className="py-2 px-3 font-medium">الأسبوع</th>
                  <th className="py-2 px-3 font-medium">الطبيب المتابع</th>
                  <th className="py-2 px-3 font-medium">رقم الهاتف</th>
                  <th className="py-2 px-3 font-medium">مستوى الخطر</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-2.5 px-3 font-medium">{p.displayName || "بدون اسم"}</td>
                    <td className="py-2.5 px-3">{p.week || "-"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{p.doctorName || "غير محدد"}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{p.phone || "-"}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className={
                        p.riskLevel === "low" ? "text-success border-success/30 bg-success/5" :
                        p.riskLevel === "moderate" ? "text-warning border-warning/30 bg-warning/5" :
                        p.riskLevel === "high" ? "text-destructive border-destructive/30 bg-destructive/5" :
                        "text-muted-foreground"
                      }>
                        {p.riskLevel === "high" ? "عالي" : p.riskLevel === "moderate" ? "متوسط" : p.riskLevel === "low" ? "منخفض" : "غير محدد"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted-foreground">لا يوجد مرضى مطابقين للبحث.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}