import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, UserRound, Search, Loader2, ArrowRight, AlertCircle, CheckCheck, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDoctorChat, Patient, Message } from "@/hooks/useDoctorChat"; // IMPORTING THE HOOK

const MAX_INPUT_LENGTH = 1000;

function formatTime(ts: Message["createdAt"]): string {
  if (!ts) return "";
  try {
    const d = ts.toDate();
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function getInitials(name?: string): string {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name[0];
}

function PatientSkeleton() {
  return (
    <div className="p-3 flex items-center gap-3 animate-pulse" aria-hidden="true">
      <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-muted rounded-full w-3/5" />
        <div className="h-2 bg-muted rounded-full w-2/5" />
      </div>
    </div>
  );
}

function Avatar({ name, size = "md", className = "" }: { name?: string; size?: "sm" | "md"; className?: string }) {
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${dim} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 select-none ${className}`} aria-hidden="true">
      {getInitials(name)}
    </div>
  );
}

function PatientRow({ patient, isSelected, unreadCount, onClick }: { patient: Patient; isSelected: boolean; unreadCount: number; onClick: () => void }) {
  return (
    <button
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={[
        "w-full text-right p-3 flex items-center gap-3 transition-all duration-150",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        isSelected ? "bg-primary/8 border-r-[3px] border-primary" : "border-r-[3px] border-transparent",
      ].join(" ")}
    >
      <Avatar name={patient.displayName} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate leading-tight">{patient.displayName || "بدون اسم"}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{patient.week ? `الأسبوع ${patient.week}` : "أسبوع غير محدد"}</p>
      </div>
      {unreadCount > 0 && (
        <span className="shrink-0 min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

function MessageBubble({ message, isOwn, patientName, isLastInGroup }: { message: Message; isOwn: boolean; patientName?: string; isLastInGroup: boolean }) {
  const time = formatTime(message.createdAt);
  return (
    <div className={`flex flex-col ${isOwn ? "items-start" : "items-end"} gap-0.5`}>
      <div className={`flex items-end gap-1.5 ${isOwn ? "flex-row" : "flex-row-reverse"}`}>
        {!isOwn && isLastInGroup ? <Avatar name={patientName} size="sm" /> : !isOwn ? <div className="w-8 shrink-0" /> : null}
        <div className={["max-w-[72%] px-4 py-2.5 text-sm leading-relaxed shadow-sm break-words", isOwn ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" : "bg-card text-card-foreground border border-border rounded-2xl rounded-tl-sm"].join(" ")}>
          {message.content}
        </div>
      </div>
      {time && (
        <p className={`text-[10px] text-muted-foreground px-1 ${isOwn ? "pl-2" : "pr-2"}`}>
          {time} {isOwn && <CheckCheck className="inline ml-1 w-3 h-3 text-primary/60" aria-hidden />}
        </p>
      )}
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4 select-none">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function DoctorChat() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { patients, messages, isLoadingPatients, isSending, unreadCounts, sendMessage, clearUnread } = useDoctorChat(user?.uid, selectedPatient?.id);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => { scrollToBottom("smooth"); }, [messages, scrollToBottom]);
  useEffect(() => { if (selectedPatient) setTimeout(() => inputRef.current?.focus(), 50); }, [selectedPatient]);

  const handleSelectPatient = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    clearUnread(patient.id);
    setSendError(null);
    setInput("");
  }, [clearUnread]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedPatient || isSending) return;
    setInput("");
    setSendError(null);
    try {
      await sendMessage(text, selectedPatient.id);
    } catch {
      setSendError("تعذّر إرسال الرسالة. يرجى المحاولة مجدداً.");
      setInput(text);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredPatients = patients.filter((p) => (p.displayName ?? "").toLowerCase().includes(searchQuery.toLowerCase()) || (p.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()));

  const groupedMessages = (() => {
    const items: Array<{ type: "date"; label: string } | { type: "msg"; msg: Message }> = [];
    let lastDate = "";
    for (const msg of messages) {
      if (msg.createdAt) {
        try {
          const d = msg.createdAt.toDate();
          const dateStr = d.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
          if (dateStr !== lastDate) {
            items.push({ type: "date", label: dateStr });
            lastDate = dateStr;
          }
        } catch {}
      }
      items.push({ type: "msg", msg });
    }
    return items;
  })();

  if (isLoadingPatients) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm">جارٍ تحميل بيانات المرضى…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in h-[calc(100vh-100px)] flex flex-col" dir="rtl">
      <header>
        <h1 className="text-2xl font-heading font-bold tracking-tight">المحادثات المباشرة</h1>
        <p className="text-muted-foreground text-sm mt-1">تواصل مع مرضاك للرد على استفساراتهم ومتابعة حالتهم</p>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        <Card className={["glass-card flex flex-col w-full md:w-72 shrink-0 overflow-hidden", selectedPatient ? "hidden md:flex" : "flex"].join(" ")}>
          <CardHeader className="pb-3 border-b space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base font-semibold">المرضى</CardTitle>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">{patients.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input placeholder="ابحث باسم المريضة…" className="pr-9 h-9 text-sm bg-muted/40 border-muted" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && <button className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery("")}><X className="w-3.5 h-3.5" /></button>}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 divide-y divide-border/50">
            {filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2 px-4 text-center">
                <UserRound className="w-10 h-10 opacity-20" />
                <p className="text-sm">{searchQuery ? `لا توجد نتائج لـ "${searchQuery}"` : "لا يوجد مرضى مسجّلون بعد."}</p>
              </div>
            ) : (
              filteredPatients.map((p) => (
                <PatientRow key={p.id} patient={p} isSelected={selectedPatient?.id === p.id} unreadCount={unreadCounts.get(p.id) ?? 0} onClick={() => handleSelectPatient(p)} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className={["glass-card flex-1 flex flex-col min-w-0 overflow-hidden", !selectedPatient ? "hidden md:flex" : "flex"].join(" ")}>
          {!selectedPatient ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4 p-8">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center"><MessageSquare className="w-9 h-9 opacity-30" /></div>
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground/60">لا توجد محادثة نشطة</p>
                <p className="text-sm text-muted-foreground/70">اختر مريضة من القائمة الجانبية لبدء المحادثة</p>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="pb-3 border-b bg-muted/20 shrink-0 flex-row items-center gap-3 space-y-0 px-4 py-3">
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 -mr-1 text-muted-foreground" onClick={() => setSelectedPatient(null)}><ArrowRight className="w-5 h-5" /></Button>
                <Avatar name={selectedPatient.displayName} />
                <div className="flex-1 min-w-0">
                  <CardTitle className="font-heading text-sm font-semibold truncate leading-tight">{selectedPatient.displayName || "بدون اسم"}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{selectedPatient.week ? `الأسبوع ${selectedPatient.week} من الحمل` : "مريضة مسجّلة بالنظام"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs text-muted-foreground hidden sm:block">متصلة</span></div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scroll-smooth">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-2 text-muted-foreground">
                      <MessageSquare className="w-8 h-8 opacity-20" />
                      <p className="text-sm">لا توجد رسائل سابقة — يمكنك بدء المحادثة الآن</p>
                    </div>
                  )}
                  {groupedMessages.map((item, idx) => {
                    if (item.type === "date") return <DateDivider key={`date-${idx}`} label={item.label} />;
                    const { msg } = item;
                    const isOwn = msg.senderId === user?.uid;
                    const nextItem = groupedMessages[idx + 1];
                    const isLastInGroup = !nextItem || nextItem.type === "date" || nextItem.msg.senderId !== msg.senderId;
                    return <MessageBubble key={msg.id} message={msg} isOwn={isOwn} patientName={selectedPatient.displayName} isLastInGroup={isLastInGroup} />;
                  })}
                </div>

                {sendError && (
                  <div className="flex items-center gap-2 mx-4 mb-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /><span className="flex-1">{sendError}</span><button onClick={() => setSendError(null)}><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}

                <div className="px-4 pb-4 pt-2 shrink-0">
                  <div className="flex gap-2 items-center bg-background rounded-full border border-border px-2 py-1.5 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                    <Input ref={inputRef} placeholder="اكتب رسالتك هنا…" className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none px-3 text-sm h-8" value={input} onChange={(e) => { if (e.target.value.length <= MAX_INPUT_LENGTH) setInput(e.target.value); }} onKeyDown={handleKeyDown} disabled={isSending} autoComplete="off" maxLength={MAX_INPUT_LENGTH} />
                    {input.length > MAX_INPUT_LENGTH * 0.8 && <span className={`text-[10px] shrink-0 tabular-nums ${input.length >= MAX_INPUT_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>{MAX_INPUT_LENGTH - input.length}</span>}
                    <Button size="icon" className="rounded-full shrink-0 w-9 h-9" onClick={handleSend} disabled={!input.trim() || isSending}>
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}