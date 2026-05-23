import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";

export interface VitalRecord {
  id: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  bloodSugar: number;
  weight: number;
  createdAt: Timestamp;
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  type: string;
  notes?: string;
  createdAt: Timestamp;
}

export function usePatientData(uid: string | undefined) {
  const [latestVitals, setLatestVitals] = useState<VitalRecord | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<VitalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLatestVitals(null);
      setVitalsHistory([]);
      setAppointments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Vitals Listener (Full History)
    const vitalsQ = query(
      collection(db, "users", uid, "vitals"),
      orderBy("createdAt", "desc")
    );
    const unsubVitals = onSnapshot(vitalsQ, (snap) => {
      if (snap.empty) {
        setLatestVitals(null);
        setVitalsHistory([]);
      } else {
        const historyData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VitalRecord));
        setVitalsHistory(historyData);
        setLatestVitals(historyData[0]); // The most recent one is the first element
      }
    }, (err) => console.error("Vitals error:", err));

    // Appointments Listener
    const apptQ = query(
      collection(db, "users", uid, "appointments"),
      orderBy("date", "asc")
    );
    const unsubAppts = onSnapshot(apptQ, (snap) => {
      setAppointments(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Appointment))
      );
      // Data is loaded after appointments fetch
      setIsLoading(false);
    }, (err) => console.error("Appointments error:", err));

    return () => {
      unsubVitals();
      unsubAppts();
    };
  }, [uid]);

  return { latestVitals, vitalsHistory, appointments, isLoading };
}
