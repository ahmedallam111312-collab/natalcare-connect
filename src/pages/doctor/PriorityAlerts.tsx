import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";

export default function PriorityAlerts() {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    // جلب التنبيهات الخاصة بهذا الطبيب فقط
    const q = query(collection(db, "alerts"), where("doctorId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // ترتيب التنبيهات ليظهر غير المؤكد أولاً
      fetchedAlerts.sort((a, b) => (a.acknowledged === b.acknowledged ? 0 : a.acknowledged ? 1 : -1));
      setAlerts(fetchedAlerts);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await updateDoc(doc(db, "alerts", alertId), { acknowledged: true });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">التنبيهات العاجلة</h1>
        <p className="text-muted-foreground text-sm mt-1">التنبيهات المرفوعة من الذكاء الاصطناعي والمؤشرات الحيوية التي تتطلب تدخلاً</p>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد تنبيهات عاجلة حالياً. ممتاز!</p>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className={`glass-card transition-all ${!alert.acknowledged ? "border-r-4 border-r-destructive" : "opacity-60"}`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      alert.severity === "high" ? "bg-destructive/10" : "bg-warning/10"
                    }`}>
                      <AlertTriangle className={`w-4 h-4 ${
                        alert.severity === "high" ? "text-destructive" : "text-warning"
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{alert.patientName || "مريض"}</span>
                        <Badge variant={alert.severity === "high" ? "destructive" : "secondary"} className="text-xs">
                          {alert.severity === "high" ? "عاجل" : "متوسط"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {alert.type === "vitals" ? "مؤشرات حيوية" : alert.type === "ai" ? "ذكاء اصطناعي" : alert.type === "adherence" ? "أدوية" : "مواعيد"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time || "مؤخراً"}</p>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <Button variant="outline" size="sm" onClick={() => handleAcknowledge(alert.id)}>
                      <CheckCircle className="w-3.5 h-3.5 ml-1" /> تأكيد
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}