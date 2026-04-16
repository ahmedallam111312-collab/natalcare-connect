import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Loader2, UserRound } from "lucide-react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, getDoc, doc, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";

export default function PatientChat() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>("الطبيب");
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUniversalDoctor = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        // إذا كان لها طبيب مخصص
        if (userDoc.exists() && userDoc.data().doctorId) {
          const docId = userDoc.data().doctorId;
          setDoctorId(docId);
          const docData = await getDoc(doc(db, "users", docId));
          if (docData.exists()) setDoctorName(docData.data().displayName || "الطبيب");
        } else {
          // إذا لم يكن لها طبيب مخصص، ابحث عن أي طبيب في النظام واربطها به
          const q = query(collection(db, "users"), where("role", "==", "doctor"), limit(1));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const universalDoctor = querySnapshot.docs[0];
            setDoctorId(universalDoctor.id);
            setDoctorName(universalDoctor.data().displayName || "الطبيب الاستشاري");
          }
        }
      } catch (error) {
        console.error("Error fetching doctor:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUniversalDoctor();
  }, [user]);

  useEffect(() => {
    if (!user || !doctorId) return;
    
    const chatId = `${doctorId}_${user.uid}`; 
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [user, doctorId]);

  const handleSendMessage = async () => {
    if (!input.trim() || !user || !doctorId) return;
    const chatId = `${doctorId}_${user.uid}`;
    const msgText = input.trim();
    setInput(""); 
    
    try {
      // 1. إرسال الرسالة
      await addDoc(collection(db, "chats", chatId, "messages"), {
        content: msgText,
        senderId: user.uid,
        senderRole: "patient",
        createdAt: serverTimestamp(),
      });

      // 2. إرسال تنبيه مباشر للطبيب (ليظهر كنقطة حمراء في الإشعارات)
      await addDoc(collection(db, "alerts"), {
        doctorId: doctorId,
        patientId: user.uid,
        patientName: user.displayName,
        type: "chat",
        message: `رسالة جديدة من المريضة: ${msgText.substring(0, 30)}...`,
        severity: "low",
        acknowledged: false,
        createdAt: serverTimestamp(),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      });

    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">تواصل مع الطبيب</h1>
        <p className="text-muted-foreground text-sm mt-1">تحدث مباشرة مع د. {doctorName}</p>
      </div>

      <Card className="glass-card flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3 border-b bg-primary/5">
          <CardTitle className="font-heading text-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <UserRound className="w-5 h-5" />
            </div>
            <div>
              <p>د. {doctorName}</p>
              <p className="text-xs text-muted-foreground font-normal">جاهز للرد على استفساراتك</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4">
          {!doctorId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm space-y-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p>عذراً، لم يتم العثور على طبيب متاح حالياً.</p>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm mt-10">ابدئي المحادثة الآن مع طبيبك..</p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] p-3 text-sm shadow-sm ${
                      msg.senderId === user?.uid 
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                        : "bg-muted text-foreground rounded-2xl rounded-tl-sm border border-border"
                    }`}>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 items-center bg-background rounded-full border border-border p-1 shadow-sm shrink-0">
                <Input 
                  placeholder="اكتب رسالتك للطبيب هنا..." 
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none px-4"
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} 
                  disabled={!doctorId}
                />
                <Button 
                  size="icon" 
                  className="rounded-full shrink-0 w-10 h-10" 
                  onClick={handleSendMessage}
                  disabled={!input.trim() || !doctorId}
                >
                  <Send className="h-4 w-4 rtl:-scale-x-100" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}