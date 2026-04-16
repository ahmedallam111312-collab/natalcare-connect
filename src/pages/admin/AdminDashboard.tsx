import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/services/firebase";
import { Users, UserCheck, Activity, Baby } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    doctors: 0,
    nurses: 0,
    patients: 0,
  });

  useEffect(() => {
    // جلب جميع المستخدمين لعمل إحصائية حية
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data());
      setStats({
        totalUsers: users.length,
        doctors: users.filter(u => u.role === "doctor").length,
        nurses: users.filter(u => u.role === "nurse").length,
        patients: users.filter(u => u.role === "patient").length,
      });
    });
    return () => unsubscribe();
  }, []);

  const statCards = [
    { title: "إجمالي المستخدمين", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "الأطباء", value: stats.doctors, icon: UserCheck, color: "text-primary" },
    { title: "الممرضات", value: stats.nurses, icon: Activity, color: "text-secondary" },
    { title: "المرضى", value: stats.patients, icon: Baby, color: "text-accent" },
  ];

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <h1 className="text-2xl font-heading font-bold">نظرة عامة (لوحة الإدارة)</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.title} className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.title}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}