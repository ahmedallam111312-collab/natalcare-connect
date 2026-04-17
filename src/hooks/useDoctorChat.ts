import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";

// ─── Types ─────────────────────────────────────────────────────────────────
export interface Patient {
  id: string;
  displayName?: string;
  week?: number;
  email?: string;
  photoURL?: string;
  role: "patient";
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderRole: "doctor" | "patient";
  createdAt: Timestamp | null;
  status?: "sending" | "sent" | "error";
}

interface UseDoctorChatResult {
  patients: Patient[];
  messages: Message[];
  isLoadingPatients: boolean;
  isSending: boolean;
  unreadCounts: Map<string, number>;
  sendMessage: (text: string, patientId: string) => Promise<void>;
  clearUnread: (patientId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const buildChatId = (doctorId: string, patientId: string) =>
  `${doctorId}_${patientId}`;

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useDoctorChat(
  doctorId: string | undefined,
  selectedPatientId: string | undefined
): UseDoctorChatResult {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(
    new Map()
  );

  const selectedPatientIdRef = useRef(selectedPatientId);
  useEffect(() => {
    selectedPatientIdRef.current = selectedPatientId;
  }, [selectedPatientId]);

  // 1. Subscribe to patient list
  useEffect(() => {
    if (!doctorId) return;
    const q = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPatients(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Patient)));
        setIsLoadingPatients(false);
      },
      (err) => {
        console.error("[useDoctorChat] patients snapshot error:", err);
        setIsLoadingPatients(false);
      }
    );
    return unsubscribe;
  }, [doctorId]);

  // 2. Subscribe to messages
  useEffect(() => {
    if (!doctorId || !selectedPatientId) {
      setMessages([]);
      return;
    }
    const chatId = buildChatId(doctorId, selectedPatientId);
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message)));
        setUnreadCounts((prev) => {
          if (!prev.has(selectedPatientId)) return prev;
          const next = new Map(prev);
          next.delete(selectedPatientId);
          return next;
        });
      },
      (err) => console.error("[useDoctorChat] messages snapshot error:", err)
    );
    return unsubscribe;
  }, [doctorId, selectedPatientId]);

  // 3. Clear unread
  const clearUnread = useCallback((patientId: string) => {
    setUnreadCounts((prev) => {
      const next = new Map(prev);
      next.delete(patientId);
      return next;
    });
  }, []);

  // 4. Send message
  const sendMessage = useCallback(
    async (text: string, patientId: string) => {
      const sanitized = text.trim().slice(0, 2000);
      if (!sanitized || !doctorId) return;

      const chatId = buildChatId(doctorId, patientId);
      setIsSending(true);

      try {
        await addDoc(collection(db, "chats", chatId, "messages"), {
          content: sanitized,
          senderId: doctorId,
          senderRole: "doctor",
          createdAt: serverTimestamp(),
        });

        addDoc(collection(db, "alerts"), {
          patientId,
          doctorId,
          type: "chat",
          message: `رسالة جديدة من الطبيب: ${sanitized.substring(0, 40)}${sanitized.length > 40 ? "…" : ""}`,
          severity: "low",
          acknowledged: false,
          createdAt: serverTimestamp(),
        }).catch((err) => console.warn("[useDoctorChat] alert failed:", err));
      } catch (err) {
        console.error("[useDoctorChat] sendMessage failed:", err);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [doctorId]
  );

  return { patients, messages, isLoadingPatients, isSending, unreadCounts, sendMessage, clearUnread };
}