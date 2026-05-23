import { useState, useEffect } from "react";
import { CheckSquare, ListTodo, ClipboardList, Save, ShieldCheck } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

// Default checklists
const DEFAULT_CHECKLISTS = {
  mother: [
    { id: "m1", label: "ملابس واسعة ومريحة", checked: false },
    { id: "m2", label: "ملابس داخلية قطنية", checked: false },
    { id: "m3", label: "فوط صحية لفترة النفاس", checked: false },
    { id: "m4", label: "حمالات صدر مخصصة للرضاعة", checked: false },
    { id: "m5", label: "أدوات العناية الشخصية (فرشاة، معجون، شامبو)", checked: false },
    { id: "m6", label: "ملابس للخروج من المستشفى", checked: false },
    { id: "m7", label: "شاحن الهاتف", checked: false },
  ],
  baby: [
    { id: "b1", label: "ملابس داخلية قطنية للمولود (3-4 قطع)", checked: false },
    { id: "b2", label: "ملابس خارجية (سالوبيت)", checked: false },
    { id: "b3", label: "حفاضات لحديثي الولادة", checked: false },
    { id: "b4", label: "مناديل مبللة (Wipes)", checked: false },
    { id: "b5", label: "بطانية خفيفة أو ثقيلة (حسب الموسم)", checked: false },
    { id: "b6", label: "جوارب وقفازات لحماية الوجه", checked: false },
  ],
  partner: [
    { id: "p1", label: "الهوية الشخصية وبطاقة التأمين", checked: false },
    { id: "p2", label: "ملفات التحاليل والسونار الخاصة بالزوجة", checked: false },
    { id: "p3", label: "وجبات خفيفة (سناكس) وماء", checked: false },
    { id: "p4", label: "كاميرا أو هاتف مشحون لتصوير اللحظات الأولى", checked: false },
    { id: "p5", label: "ملابس مريحة للجلوس في المستشفى", checked: false },
  ],
};

export default function BirthPreparation() {
  const { user } = useAuthStore();
  const [checklists, setChecklists] = useState(DEFAULT_CHECKLISTS);
  
  const [birthPlan, setBirthPlan] = useState({
    deliveryMethod: "natural",
    painManagement: "epidural",
    cordClamping: "delayed",
    feeding: "breast",
    companions: "",
    specialRequests: ""
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid, "birthPlan", "data");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.checklists) setChecklists(data.checklists);
          if (data.birthPlan) setBirthPlan(data.birthPlan);
        }
      } catch (err) {
        console.error("Error fetching birth plan data", err);
      }
    };
    fetchData();
  }, [user]);

  const handleCheck = (category: keyof typeof DEFAULT_CHECKLISTS, id: string) => {
    setChecklists(prev => ({
      ...prev,
      [category]: prev[category].map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid, "birthPlan", "data"), {
        checklists,
        birthPlan,
        updatedAt: new Date()
      });
      toast.success("تم الحفظ بنجاح!");
    } catch (err) {
      toast.error("فشل حفظ البيانات");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = (category: keyof typeof DEFAULT_CHECKLISTS) => {
    const total = checklists[category].length;
    const checked = checklists[category].filter(i => i.checked).length;
    return Math.round((checked / total) * 100);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">تجهيزات الولادة</h1>
          <p className="text-muted-foreground mt-1">رتبي حقيبة المستشفى الخاصة بكِ وسجلي تفضيلاتك لعملية الولادة.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
          <Save className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="bag" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2">
          <TabsTrigger value="bag" className="gap-2">
            <ListTodo className="w-4 h-4" />
            حقيبة المستشفى
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            خطة الولادة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bag" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Mother's Bag */}
            <Card className="glass-card">
              <CardHeader className="bg-primary/5 rounded-t-xl pb-4 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">حقيبة الأم</CardTitle>
                  <span className="text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded-full">
                    {calculateProgress("mother")}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {checklists.mother.map(item => (
                  <div key={item.id} className="flex items-start space-x-3 space-x-reverse">
                    <Checkbox 
                      id={item.id} 
                      checked={item.checked}
                      onCheckedChange={() => handleCheck("mother", item.id)}
                    />
                    <label 
                      htmlFor={item.id}
                      className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none transition-colors ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Baby's Bag */}
            <Card className="glass-card">
              <CardHeader className="bg-accent/10 rounded-t-xl pb-4 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-accent-foreground">حقيبة المولود</CardTitle>
                  <span className="text-xs font-bold bg-accent/20 text-accent-foreground px-2 py-1 rounded-full">
                    {calculateProgress("baby")}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {checklists.baby.map(item => (
                  <div key={item.id} className="flex items-start space-x-3 space-x-reverse">
                    <Checkbox 
                      id={item.id} 
                      checked={item.checked}
                      onCheckedChange={() => handleCheck("baby", item.id)}
                    />
                    <label 
                      htmlFor={item.id}
                      className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none transition-colors ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Partner's Bag */}
            <Card className="glass-card">
              <CardHeader className="bg-muted rounded-t-xl pb-4 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">حقيبة المرافق</CardTitle>
                  <span className="text-xs font-bold bg-background text-foreground px-2 py-1 rounded-full shadow-sm">
                    {calculateProgress("partner")}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {checklists.partner.map(item => (
                  <div key={item.id} className="flex items-start space-x-3 space-x-reverse">
                    <Checkbox 
                      id={item.id} 
                      checked={item.checked}
                      onCheckedChange={() => handleCheck("partner", item.id)}
                    />
                    <label 
                      htmlFor={item.id}
                      className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none transition-colors ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plan" className="mt-6">
          <Card className="glass-card max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                تفضيلات الولادة
              </CardTitle>
              <CardDescription>
                تساعد هذه الخطة طبيبك والمستشفى على معرفة رغباتك وتفضيلاتك (ملاحظة: تخضع الخطة دائماً لتقييم الطبيب حسب سلامتك وسلامة الجنين).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              <div className="space-y-4">
                <Label className="text-base font-bold text-primary">طريقة الولادة المفضلة</Label>
                <RadioGroup 
                  value={birthPlan.deliveryMethod} 
                  onValueChange={(val) => setBirthPlan({...birthPlan, deliveryMethod: val})}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="natural" id="dm1" />
                    <Label htmlFor="dm1" className="cursor-pointer">ولادة طبيعية</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="vbac" id="dm2" />
                    <Label htmlFor="dm2" className="cursor-pointer">طبيعية بعد قيصرية سابقة (VBAC)</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="csection" id="dm3" />
                    <Label htmlFor="dm3" className="cursor-pointer">ولادة قيصرية (مجدولة)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold text-primary">إدارة الألم</Label>
                <RadioGroup 
                  value={birthPlan.painManagement} 
                  onValueChange={(val) => setBirthPlan({...birthPlan, painManagement: val})}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="epidural" id="pm1" />
                    <Label htmlFor="pm1" className="cursor-pointer">إبرة الظهر (Epidural)</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="natural" id="pm2" />
                    <Label htmlFor="pm2" className="cursor-pointer">طبيعية بدون مسكنات (تقنيات التنفس)</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="gas" id="pm3" />
                    <Label htmlFor="pm3" className="cursor-pointer">غاز الضحك (Entonox)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold text-primary">قطع الحبل السري</Label>
                <RadioGroup 
                  value={birthPlan.cordClamping} 
                  onValueChange={(val) => setBirthPlan({...birthPlan, cordClamping: val})}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="delayed" id="cc1" />
                    <Label htmlFor="cc1" className="cursor-pointer">تأخير القطع (حتى يتوقف النبض - ينصح به)</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="immediate" id="cc2" />
                    <Label htmlFor="cc2" className="cursor-pointer">قطع فوري</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold text-primary">المرافقون (من ترغبين بتواجده معكِ في الغرفة؟)</Label>
                <Textarea 
                  placeholder="مثال: زوجي فقط، أو والدتي..." 
                  value={birthPlan.companions}
                  onChange={(e) => setBirthPlan({...birthPlan, companions: e.target.value})}
                  className="resize-none"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-bold text-primary">ملاحظات وطلبات خاصة إضافية</Label>
                <Textarea 
                  placeholder="أي طلبات خاصة ترغبين بإضافتها لخطة الولادة..." 
                  value={birthPlan.specialRequests}
                  onChange={(e) => setBirthPlan({...birthPlan, specialRequests: e.target.value})}
                  className="resize-none min-h-[100px]"
                />
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
