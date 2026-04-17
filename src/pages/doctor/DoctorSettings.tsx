import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import ProfileUploader from "@/components/ProfileUploader"; // <-- تم إضافة الاستيراد

export default function DoctorSettings() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.displayName || "");
  const [specialty, setSpecialty] = useState("أمراض النساء والتوليد");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChanges = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: name,
        specialty: specialty,
      });
      toast.success("تم تحديث الملف الشخصي بنجاح!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("حدث خطأ أثناء تحديث الملف الشخصي.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <h1 className="text-2xl font-heading font-bold">الإعدادات</h1>
      <Card className="glass-card max-w-lg">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> الملف الشخصي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* مكون رفع الصورة الجديد */}
          <ProfileUploader />

          <div className="space-y-2">
            <Label>الاسم الكامل</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>التخصص</Label>
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}