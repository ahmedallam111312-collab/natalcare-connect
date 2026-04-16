import { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, CheckCircle, Info, Check, CalendarDays, MessageSquare } from "lucide-react";
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";

export default function NotificationBell() {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // جلب وتصفية الإشعارات بناءً على دور المستخدم
  useEffect(() => {
    if (!user) return;
    const role = (user as any).role || "patient";

    if (role === "patient") {
      // ==========================================
      // 1. إشعارات المريضة (تذكير بالمواعيد والمحادثات فقط)
      // ==========================================
      const apptQ = query(collection(db, "users", user.uid, "appointments"));
      const unsubAppt = onSnapshot(apptQ, (snap) => {
        // الحصول على تاريخ اليوم للمقارنة
        const today = new Date().toISOString().split('T')[0];
        
        // تحويل المواعيد القادمة إلى إشعارات
        const upcomingAppts = snap.docs
          .map(d => ({ id: d.id, ...d.data() as any }))
          .filter(a => a.date >= today) // المواعيد القادمة واليوم فقط
          .map(a => ({
            id: `appt_${a.id}`,
            type: 'appointment',
            message: `تذكير: لديك موعد (${a.type}) مع د. ${a.doctor} يوم ${a.date} الساعة ${a.time}`,
            time: a.time,
            acknowledged: false,
            isDynamic: true // علامة لتمييزها عن إشعارات قاعدة البيانات
          }));

        // إشعار ثابت لتشجيع التواصل مع الطبيب
        const chatNotification = {
          id: 'chat_notice',
          type: 'chat',
          message: 'طبيبك متاح للتواصل، لا تترددي في تفقد المحادثة المباشرة لأي استفسار.',
          time: 'تنبيه مستمر',
          acknowledged: false,
          isDynamic: true
        };

        setAlerts([...upcomingAppts, chatNotification]);
      });

      return () => unsubAppt();

    } else {
      // ==========================================
      // 2. إشعارات الطاقم الطبي (تنبيهات الأعراض وتقارير السونار)
      // ==========================================
      const q = query(collection(db, "alerts"), orderBy("createdAt", "desc"), limit(20));
      const unsubAlerts = onSnapshot(q, (snapshot) => {
        let fetchedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        if (role === "doctor") {
          // الطبيب يرى الإشعارات الموجهة له أو الإشعارات العامة
          fetchedAlerts = fetchedAlerts.filter(a => a.doctorId === user.uid || !a.doctorId);
        }
        
        setAlerts(fetchedAlerts);
      });

      return () => unsubAlerts();
    }
  }, [user]);

  // تحديد الإشعار كمقروء (أو إخفاؤه للمريضة)
  const markAsRead = async (alert: any) => {
    if (alert.isDynamic) {
      // الإشعارات الديناميكية للمريضة لا تحتاج لحفظ في القاعدة، نكتفي بإخفائها مؤقتاً
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
      return;
    }

    try {
      await updateDoc(doc(db, "alerts", alert.id), { acknowledged: true });
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  const markAllAsRead = () => {
    alerts.forEach(a => {
      if (!a.acknowledged) markAsRead(a);
    });
  };

  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* زر الجرس */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative rounded-full hover:bg-primary/10 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow-sm animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* القائمة المنسدلة للإشعارات */}
      {isOpen && (
        <div 
          className="absolute left-0 top-12 w-80 sm:w-96 bg-background border border-border shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2"
          dir="rtl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-heading font-bold text-sm">الإشعارات</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:text-primary/80" onClick={markAllAsRead}>
                <Check className="w-3 h-3 ml-1" /> تحديد الكل كمقروء
              </Button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <Bell className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">لا توجد إشعارات حالياً</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 flex items-start gap-3 transition-colors cursor-pointer hover:bg-muted/30 ${!alert.acknowledged ? 'bg-primary/5' : 'opacity-70'}`}
                    onClick={() => !alert.acknowledged && markAsRead(alert)}
                  >
                    <div className="shrink-0 mt-0.5">
                      {/* أيقونات ديناميكية حسب نوع الإشعار */}
                      {alert.type === 'appointment' ? (
                        <CalendarDays className="w-5 h-5 text-primary" />
                      ) : alert.type === 'chat' ? (
                        <MessageSquare className="w-5 h-5 text-accent" />
                      ) : alert.severity === 'high' ? (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      ) : alert.severity === 'moderate' ? (
                        <AlertTriangle className="w-5 h-5 text-warning" />
                      ) : alert.type === 'ultrasound' ? (
                        <Info className="w-5 h-5 text-primary" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-success" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className={`text-sm font-medium ${!alert.acknowledged ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {/* عرض اسم المريضة للطبيب، أو إخفاؤه إذا كانت المريضة هي من تقرأ الإشعار */}
                          {(user as any).role === "patient" ? "تنبيه لكِ" : (alert.patientName ? `المريضة: ${alert.patientName}` : 'إشعار نظام')}
                        </p>
                        {!alert.acknowledged && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {alert.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                        {alert.time || (alert.createdAt ? new Date(alert.createdAt.toDate()).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' }) : '')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}