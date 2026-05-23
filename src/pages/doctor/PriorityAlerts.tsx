import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Loader2, ArrowUpRight } from "lucide-react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { useDoctorData } from "@/hooks/useDoctorData";
import { useNavigate } from "react-router-dom";

export default function PriorityAlerts() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { alerts, isLoading } = useDoctorData(user?.uid);

  // ترتيب التنبيهات: الأحدث وغير المقروء أولاً
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) {
      return a.acknowledged ? 1 : -1;
    }
    return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
  });

  const handleAcknowledge = async (alertId: string) => {
    try {
      await updateDoc(doc(db, "alerts", alertId), { acknowledged: true });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">التنبيهات السريرية</h1>
          <p className="text-muted-foreground text-sm mt-1">الإشعارات المرفوعة من المؤشرات الحيوية وتحليلات الذكاء الاصطناعي</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20 h-8">
            {alerts.filter(a => !a.acknowledged && a.severity === 'high').length} حالات حرجة
          </Badge>
          <Badge variant="outline" className="bg-warning/5 text-warning border-warning/20 h-8">
            {alerts.filter(a => !a.acknowledged && a.severity !== 'high').length} تنبيهات
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl bg-muted/10 border-dashed">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-xl font-heading font-bold text-foreground">كل شيء مستقر</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">لا توجد تنبيهات سريرية تتطلب انتباهك حالياً. يمكنك متابعة عملك بأمان.</p>
          </div>
        ) : (
          sortedAlerts.map((alert) => (
            <Card key={alert.id} className={`glass-card transition-all duration-200 border-transparent bg-white dark:bg-card ${
              !alert.acknowledged 
                ? alert.severity === "high" 
                  ? "shadow-sm border-r-4 border-r-destructive hover:shadow-md hover:border-r-destructive" 
                  : "shadow-sm border-r-4 border-r-warning hover:shadow-md hover:border-r-warning"
                : "opacity-60 grayscale-[30%] hover:opacity-100 hover:grayscale-0"
            }`}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                      alert.severity === "high" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                    }`}>
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-bold text-lg text-foreground truncate">{alert.patientName || "مريضة"}</span>
                        <Badge variant={alert.severity === "high" ? "destructive" : "secondary"} className="text-xs">
                          {alert.severity === "high" ? "عاجل" : "متوسط"}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-muted/50">
                          {alert.type === "vitals" ? "مؤشرات حيوية" : alert.type === "fmc" ? "حركة جنين" : "عام"}
                        </Badge>
                      </div>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs font-medium text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {alert.time || new Date(alert.createdAt?.toDate()).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {alert.acknowledged && <span className="flex items-center gap-1.5 text-success"><CheckCircle className="w-3.5 h-3.5" /> تمت المراجعة</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-3 shrink-0">
                    {!alert.acknowledged && (
                      <Button onClick={() => handleAcknowledge(alert.id)} className="w-full sm:w-32 shadow-sm transition-transform hover:scale-105">
                        <CheckCircle className="w-4 h-4 ml-2" /> تأكيد
                      </Button>
                    )}
                    <Button variant="outline" className="w-full sm:w-32" onClick={() => navigate('/doctor/chat')}>
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                      الذهاب للمريضة
                    </Button>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}