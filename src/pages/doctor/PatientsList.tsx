import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, ClipboardList, Activity, Baby, FileText, AlertTriangle, Loader2, Pill } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

// ==========================================
// مكون تغيير مستوى الخطر تفاعلياً (Interactive Risk Selector)
// ==========================================
function RiskSelector({ patientId, currentRisk }: { patientId: string, currentRisk: string }) {
  const [loading, setLoading] = useState(false);

  const handleRiskChange = async (newRisk: string) => {
    if (newRisk === currentRisk) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", patientId), { riskLevel: newRisk });
      toast.success("تم تحديث مستوى خطر المريضة بنجاح");
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء تحديث مستوى الخطر");
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (r: string) => {
    if (r === "high") return "text-destructive border-destructive/30 bg-destructive/10";
    if (r === "moderate") return "text-warning border-warning/30 bg-warning/10";
    return "text-success border-success/30 bg-success/10";
  };

  const getLabel = (r: string) => {
    if (r === "high") return "عالي";
    if (r === "moderate") return "متوسط";
    return "منخفض";
  };

  return (
    <Select value={currentRisk || "low"} onValueChange={handleRiskChange} disabled={loading}>
      <SelectTrigger className={`h-8 px-3 text-xs w-[100px] font-bold border ${getBadgeClass(currentRisk || "low")}`}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : <SelectValue>{getLabel(currentRisk || "low")}</SelectValue>}
      </SelectTrigger>
      <SelectContent dir="rtl">
        <SelectItem value="low" className="text-success font-bold focus:bg-success/10 cursor-pointer">منخفض</SelectItem>
        <SelectItem value="moderate" className="text-warning font-bold focus:bg-warning/10 cursor-pointer">متوسط</SelectItem>
        <SelectItem value="high" className="text-destructive font-bold focus:bg-destructive/10 cursor-pointer">عالي</SelectItem>
      </SelectContent>
    </Select>
  );
}

// Removed PatientRecordDetails (moved to PatientRecord.tsx)

// ==========================================
// الصفحة الرئيسية للقائمة
// ==========================================
import { useDoctorData } from "@/hooks/useDoctorData";
import { Link } from "react-router-dom";

export default function PatientsList() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const { patients, isLoading } = useDoctorData(user?.uid);

  const filtered = patients.filter((p) =>
    p.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">المرضى</h1>
          <p className="text-muted-foreground text-sm mt-1">عرض جميع المريضات المتابعات بعيادتك ({patients.length})</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث عن مريضة بالاسم..." className="pr-10 h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="glass-card shadow-sm border-transparent bg-white dark:bg-card">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> قائمة المرضى
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
                    <th className="py-4 px-6 font-medium">مستوى الخطر</th>
                    <th className="py-4 px-6 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-muted-foreground">
                        لا يوجد مرضى مطابقين.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="py-4 px-6 font-semibold text-foreground">
                          {p.displayName || "بدون اسم"}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">
                          {p.week ? `الأسبوع ${p.week}` : "-"}
                        </td>
                        <td className="py-4 px-6">
                          <RiskSelector patientId={p.id} currentRisk={p.riskLevel} />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild className="h-8 hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm">
                              <Link to={`/doctor/patient/${p.id}`}>
                                <ClipboardList className="w-4 h-4 ml-2" /> عرض الملف
                              </Link>
                            </Button>
                          </div>
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