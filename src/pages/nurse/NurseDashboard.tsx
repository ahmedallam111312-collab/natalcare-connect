import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, ScanLine, Activity } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function NurseDashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingScans: 0,
    vitalsRecorded: 0
  });

  useEffect(() => {
    // 1. Total Patients
    const qPatients = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubPatients = onSnapshot(qPatients, (snap) => setStats(s => ({ ...s, totalPatients: snap.size })));

    // 2. Today's Appointments
    const qAppointments = query(collection(db, "appointments"));
    const unsubAppointments = onSnapshot(qAppointments, (snap) => setStats(s => ({ ...s, todayAppointments: snap.size })));

    return () => {
      unsubPatients();
      unsubAppointments();
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">لوحة تحكم الممرضة</h1>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على إدارة المرضى</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المرضى", value: stats.totalPatients, icon: Users, color: "primary" },
          { label: "مواعيد اليوم", value: stats.todayAppointments, icon: CalendarDays, color: "success" },
          { label: "فحوصات معلقة", value: stats.pendingScans, icon: ScanLine, color: "warning" },
          { label: "حيويات مسجلة اليوم", value: stats.vitalsRecorded, icon: Activity, color: "secondary" },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-heading font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}