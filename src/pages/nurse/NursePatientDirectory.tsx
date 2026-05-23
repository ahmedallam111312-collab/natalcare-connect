import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2 } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function NursePatientDirectory() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = patients.filter((p) => 
    p.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    p.phone?.includes(search) ||
    p.doctorName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">دليل المرضى</h1>
        <p className="text-muted-foreground text-sm mt-1">عرض والبحث في جميع سجلات المرضى بالعيادة</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="ابحث بالاسم، رقم الهاتف أو الطبيب المتابع..." 
            className="pr-10 h-11" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <Card className="glass-card shadow-sm border-transparent bg-white dark:bg-card">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> قائمة سجلات المرضى ({patients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b text-muted-foreground bg-muted/20">
                    <th className="py-4 px-6 font-medium">الاسم</th>
                    <th className="py-4 px-6 font-medium">أسبوع الحمل</th>
                    <th className="py-4 px-6 font-medium">الطبيب المتابع</th>
                    <th className="py-4 px-6 font-medium">رقم الهاتف</th>
                    <th className="py-4 px-6 font-medium">مستوى الخطر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        لا توجد سجلات مطابقة للبحث.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="py-4 px-6 font-bold text-foreground">{p.displayName || "بدون اسم"}</td>
                        <td className="py-4 px-6 text-muted-foreground">{p.week ? `الأسبوع ${p.week}` : "-"}</td>
                        <td className="py-4 px-6 text-foreground font-medium">{p.doctorName || "غير محدد"}</td>
                        <td className="py-4 px-6 text-muted-foreground" dir="ltr">{p.phone || "-"}</td>
                        <td className="py-4 px-6">
                          <Badge variant="outline" className={
                            p.riskLevel === "low" ? "text-success border-success/30 bg-success/5" :
                            p.riskLevel === "moderate" ? "text-warning border-warning/30 bg-warning/5" :
                            p.riskLevel === "high" ? "text-destructive border-destructive/30 bg-destructive/5" :
                            "text-muted-foreground bg-muted/10"
                          }>
                            {p.riskLevel === "high" ? "عالي" : p.riskLevel === "moderate" ? "متوسط" : p.riskLevel === "low" ? "منخفض" : "غير محدد"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}