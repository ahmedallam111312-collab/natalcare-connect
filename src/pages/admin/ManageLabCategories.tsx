import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { toast } from "sonner";

export default function ManageLabCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "labCategories"), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddCategory = async () => {
    if (!newCatName) return toast.error("يرجى إدخال اسم الفئة");
    try {
      await addDoc(collection(db, "labCategories"), {
        name: newCatName,
        tests: 0, // يبدأ بعدد 0 تحاليل
        active: true
      });
      toast.success("تم إضافة الفئة بنجاح");
      setIsOpen(false);
      setNewCatName("");
    } catch (error) {
      toast.error("فشل في إضافة الفئة");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الفئة؟")) {
      try {
        await deleteDoc(doc(db, "labCategories", id));
        toast.success("تم الحذف بنجاح");
      } catch (error) {
        toast.error("فشل في الحذف");
      }
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "labCategories", id), { active: !currentStatus });
    } catch (error) {
      toast.error("فشل في التحديث");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">فئات التحاليل</h1>
          <p className="text-muted-foreground text-sm mt-1">{categories.length} فئات مسجلة</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild><Button><Plus className="ml-2 h-4 w-4" /> إضافة فئة</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader><DialogTitle className="font-heading text-right">إضافة فئة تحاليل</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>اسم الفئة</Label><Input placeholder="مثل: تحاليل الدم، الغدة الدرقية..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} /></div>
              <Button className="w-full" onClick={handleAddCategory}>إضافة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="glass-card hover:shadow-md transition-all">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading font-semibold">{cat.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{cat.tests} تحاليل مرتبطة</p>
                </div>
                <Badge variant={cat.active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(cat.id, cat.active)}>
                  {cat.active ? "نشط" : "غير نشط"}
                </Badge>
              </div>
              <div className="flex gap-1 mt-4 border-t border-border/50 pt-3">
                <Button variant="outline" size="sm" className="flex-1"><Edit className="w-3.5 h-3.5 ml-1" /> تعديل</Button>
                <Button variant="ghost" size="sm" className="text-destructive flex-1" onClick={() => handleDelete(cat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && <p className="text-muted-foreground text-sm col-span-full">لا توجد فئات تحاليل مضافة.</p>}
      </div>
    </div>
  );
}