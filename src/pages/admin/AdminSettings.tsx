import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Globe } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { toast } from "sonner";

export default function AdminSettings() {
  const [appName, setAppName] = useState("رعاية الأمومة - Natal Care Connect");
  const [language, setLanguage] = useState("ar");
  const [isSaving, setIsSaving] = useState(false);

  // جلب الإعدادات من Firebase
  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, "settings", "general");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAppName(docSnap.data().appName || "رعاية الأمومة - Natal Care Connect");
        setLanguage(docSnap.data().language || "ar");
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "general"), {
        appName,
        language
      }, { merge: true });
      toast.success("تم حفظ إعدادات النظام بنجاح");
    } catch (error) {
      toast.error("فشل في حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">إعدادات النظام</h1>
        <p className="text-muted-foreground text-sm mt-1">التحكم في إعدادات التطبيق العامة</p>
      </div>
      
      <Card className="glass-card max-w-lg">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> الإعدادات العامة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>اسم التطبيق</Label>
            <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">اللغة الافتراضية للنظام</span>
            </div>
            <select 
              className="text-sm bg-background border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          <Button className="w-full mt-4" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}