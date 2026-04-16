import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { toast } from "sonner";

export default function ManageHospitals() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newHospital, setNewHospital] = useState({ name: "", address: "", phone: "" });

  // جلب المستشفيات من Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "hospitals"), (snapshot) => {
      setHospitals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddHospital = async () => {
    if (!newHospital.name || !newHospital.address) return toast.error("يرجى ملء البيانات المطلوبة");
    try {
      await addDoc(collection(db, "hospitals"), {
        ...newHospital,
        active: true,
        createdAt: new Date().toISOString()
      });
      toast.success("تم إضافة المستشفى بنجاح");
      setIsOpen(false);
      setNewHospital({ name: "", address: "", phone: "" });
    } catch (error) {
      toast.error("فشل في إضافة المستشفى");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المستشفى؟")) {
      try {
        await deleteDoc(doc(db, "hospitals", id));
        toast.success("تم الحذف بنجاح");
      } catch (error) {
        toast.error("فشل في الحذف");
      }
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "hospitals", id), { active: !currentStatus });
      toast.success("تم تحديث الحالة");
    } catch (error) {
      toast.error("فشل في التحديث");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">إدارة المستشفيات</h1>
          <p className="text-muted-foreground text-sm mt-1">{hospitals.length} مستشفيات مسجلة</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" /> إضافة مستشفى</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader><DialogTitle className="font-heading text-right">إضافة مستشفى جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>الاسم</Label><Input placeholder="اسم المستشفى..." value={newHospital.name} onChange={(e) => setNewHospital({...newHospital, name: e.target.value})} /></div>
              <div className="space-y-2"><Label>العنوان</Label><Input placeholder="العنوان كاملاً..." value={newHospital.address} onChange={(e) => setNewHospital({...newHospital, address: e.target.value})} /></div>
              <div className="space-y-2"><Label>رقم الهاتف</Label><Input placeholder="01000000000" className="text-left" dir="ltr" value={newHospital.phone} onChange={(e) => setNewHospital({...newHospital, phone: e.target.value})} /></div>
              <Button className="w-full" onClick={handleAddHospital}>إضافة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 px-3 font-medium">الاسم</th>
                  <th className="py-2 px-3 font-medium">العنوان</th>
                  <th className="py-2 px-3 font-medium">الهاتف</th>
                  <th className="py-2 px-3 font-medium">الحالة</th>
                  <th className="py-2 px-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((h) => (
                  <tr key={h.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-medium">{h.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{h.address}</td>
                    <td className="py-2.5 px-3 text-muted-foreground" dir="ltr">{h.phone}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={h.active ? "default" : "secondary"} className="cursor-pointer" onClick={() => toggleActive(h.id, h.active)}>
                        {h.active ? "نشط" : "غير نشط"}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm"><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(h.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {hospitals.length === 0 && <tr><td colSpan={5} className="text-center py-4">لا توجد مستشفيات مضافة.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}