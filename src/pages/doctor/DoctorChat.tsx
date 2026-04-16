import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, UserRound, Search, Loader2 } from "lucide-react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";

export default function DoctorChat() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. جلب قائمة المرضى
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. جلب المحادثة عند اختيار مريضة
  useEffect(() => {
    if (!user || !selectedPatient) return;
    
    // توحيد معرف المحادثة (معرف الطبيب_معرف المريضة) ليكون نفس المعرف المستخدم في صفحة المريضة
    const chatId = `${user.uid}_${selectedPatient.id}`; 
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // التمرير التلقائي لأسفل
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [user, selectedPatient]);

  const handleSendMessage = async () => {
    if (!input.trim() || !user || !selectedPatient) return;
    const chatId = `${user.uid}_${selectedPatient.id}`;
    const msgText = input.trim();
    setInput(""); 
    
    try {
      // إرسال الرسالة إلى نفس المحادثة المشتركة
      await addDoc(collection(db, "chats", chatId, "messages"), {
        content: msgText,
        senderId: user.uid,
        senderRole: "doctor",
        createdAt: serverTimestamp(),
      });

      // إرسال تنبيه للمريضة بوجود رسالة جديدة من الطبيب
      await addDoc(collection(db, "alerts"), {
        patientId: selectedPatient.id,
        doctorId: user.uid,
        type: "chat",
        message: `رسالة جديدة من الطبيب: ${msgText.substring(0, 30)}...`,
        severity: "low",
        acknowledged: false,
        createdAt: serverTimestamp(),
      });

    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="h-[calc(100vh-100px)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">المحادثات المباشرة</h1>
        <p className="text-muted-foreground text-sm mt-1">تواصل مع مرضاك للرد على استفساراتهم ومتابعة حالتهم</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        
        {/* القائمة الجانبية (المرضى) */}
        <Card className={`glass-card flex flex-col w-full md:w-80 shrink-0 ${selectedPatient ? 'hidden md:flex' : 'flex'}`}>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="font-heading text-lg">المرضى ({patients.length})</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث عن مريضة..." 
                className="pr-9 h-9 text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="divide-y">
              {filteredPatients.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">لا يوجد مرضى مطابقين.</p>
              ) : (
                filteredPatients.map(p => (
                  <div 
                    key={p.id} 
                    className={`p-3 md:p-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-muted/50 ${selectedPatient?.id === p.id ? 'bg-primary/10 border-r-4 border-primary' : ''}`}
                    onClick={() => setSelectedPatient(p)}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground shrink-0">
                      <UserRound className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{p.displayName || "بدون اسم"}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.week ? `الأسبوع ${p.week}` : "أسبوع غير محدد"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* نافذة المحادثة */}
        <Card className={`glass-card flex-1 flex flex-col min-w-0 ${!selectedPatient ? 'hidden md:flex' : 'flex'}`}>
          {!selectedPatient ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <MessageSquare className="w-16 h-16 opacity-20" />
              <p>اختر مريضة من القائمة الجانبية لبدء المحادثة.</p>
            </div>
          ) : (
            <>
              {/* رأس المحادثة */}
              <CardHeader className="pb-3 border-b bg-primary/5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden ml-2" onClick={() => setSelectedPatient(null)}>
                    {/* زر العودة للقائمة في الموبايل */}
                    <span className="text-xl">→</span>
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">
                    <UserRound className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-base">{selectedPatient.displayName || "بدون اسم"}</CardTitle>
                    <p className="text-xs text-muted-foreground font-normal">مريضة مسجلة بالنظام</p>
                  </div>
                </div>
              </CardHeader>
              
              {/* منطقة الرسائل */}
              <CardContent className="flex-1 flex flex-col p-4 min-h-0">
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm mt-10">لا توجد رسائل سابقة. يمكنك بدء المحادثة الآن.</p>
                  )}
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] p-3 text-sm shadow-sm ${
                        msg.senderId === user?.uid 
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                          : "bg-muted text-foreground rounded-2xl rounded-tl-sm border border-border"
                      }`}>
                        <p className="leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* حقل الإرسال */}
                <div className="flex gap-2 items-center bg-background rounded-full border border-border p-1 shadow-sm shrink-0">
                  <Input 
                    placeholder="اكتب رسالتك للمريضة هنا..." 
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none px-4"
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} 
                  />
                  <Button 
                    size="icon" 
                    className="rounded-full shrink-0 w-10 h-10" 
                    onClick={handleSendMessage}
                    disabled={!input.trim()}
                  >
                    <Send className="h-4 w-4 rtl:-scale-x-100" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}