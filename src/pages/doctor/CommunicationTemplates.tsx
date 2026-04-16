import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus, Copy } from "lucide-react";
import { collection, addDoc, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export default function CommunicationTemplates() {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "templates"), where("doctorId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const copyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ القالب إلى الحافظة");
  };

  const handleSaveTemplate = async () => {
    if (!title || !body || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "templates"), {
        doctorId: user.uid,
        title,
        body,
      });
      setTitle("");
      setBody("");
      toast.success("تم حفظ القالب بنجاح");
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ القالب");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">قوالب المراسلة</h1>
          <p className="text-muted-foreground text-sm mt-1">قوالب رسائل جاهزة للتواصل مع المرضى</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id} className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {t.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg mb-3 max-h-32 overflow-y-auto font-sans">
                {t.body}
              </pre>
              <Button variant="outline" size="sm" className="w-full" onClick={() => copyTemplate(t.body)}>
                <Copy className="ml-2 h-3.5 w-3.5" /> نسخ القالب
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">إنشاء قالب جديد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>عنوان القالب</Label>
            <Input placeholder="مثال: تذكير بموعد المتابعة..." value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>محتوى الرسالة</Label>
            <Textarea placeholder="اكتب رسالتك هنا..." rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <Button onClick={handleSaveTemplate} disabled={isSaving || !title || !body}>
            {isSaving ? "جاري الحفظ..." : "حفظ القالب"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}