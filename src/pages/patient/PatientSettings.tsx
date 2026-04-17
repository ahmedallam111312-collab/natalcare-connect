import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge"; 
import { Settings, User, Globe } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import ProfileUploader from "@/components/ProfileUploader"; // <-- تم إضافة الاستيراد

export default function PatientSettings() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { displayName: name, phone: phone });
      toast.success("تم تحديث الملف الشخصي بنجاح!");
    } catch (error) {
      toast.error("فشل في تحديث الملف الشخصي.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة ملفك الشخصي وتفضيلاتك</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> الملف الشخصي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* مكون رفع الصورة الجديد */}
            <ProfileUploader />

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input value={user?.email || ""} type="email" disabled className="text-left" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input placeholder="01000000000" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="text-left" dir="ltr" />
              </div>
              <Button className="w-full" onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> التفضيلات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">لغة واجهة المستخدم</span>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">العربية</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}