import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { collection, onSnapshot, query, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { toast } from "sonner";

export default function ManageDoctors() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      toast.success(`تم تحديث صلاحية المستخدم بنجاح`);
    } catch (error) {
      toast.error("فشل في تحديث الصلاحية");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <h1 className="text-2xl font-heading font-bold">إدارة صلاحيات المستخدمين</h1>
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 font-medium">الاسم</th>
                  <th className="p-4 font-medium">البريد الإلكتروني</th>
                  <th className="p-4 font-medium">الصلاحية الحالية</th>
                  <th className="p-4 font-medium">تغيير الصلاحية إلى</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-4 font-medium">{u.displayName || "بدون اسم"}</td>
                    <td className="p-4 text-muted-foreground text-left" dir="ltr">{u.email}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className="capitalize">
                        {u.role === "doctor" ? "طبيب" : u.role === "nurse" ? "ممرضة" : u.role === "admin" ? "مشرف" : "مريض"}
                      </Badge>
                    </td>
                    <td className="p-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateUserRole(u.id, "doctor")} disabled={u.role === "doctor"}>
                        طبيب
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateUserRole(u.id, "nurse")} disabled={u.role === "nurse"}>
                        ممرضة
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateUserRole(u.id, "patient")} disabled={u.role === "patient"}>
                        مريض
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}