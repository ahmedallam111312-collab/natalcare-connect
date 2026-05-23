import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  where,
  collectionGroup,
  orderBy
} from "firebase/firestore";
import { db } from "@/services/firebase";

export function useDoctorData(doctorId: string | undefined) {
  const [patients, setPatients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) {
      setPatients([]);
      setAlerts([]);
      setAppointments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 1. Fetch ALL Patients in the clinic
    const qPatients = query(
      collection(db, "users"), 
      where("role", "==", "patient")
    );
    const unsubPatients = onSnapshot(qPatients, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(data);
    });

    // 2. Fetch Alerts
    const qAlerts = query(collection(db, "alerts"), orderBy("severity", "desc"));
    const unsubAlerts = onSnapshot(qAlerts, (snap) => {
      setAlerts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Fetch all appointments across patients
    const qAppts = collectionGroup(db, "appointments");
    const unsubAppts = onSnapshot(qAppts, (snap) => {
      setAppointments(snap.docs.map(doc => ({ id: doc.id, userId: doc.ref.parent.parent?.id, ...doc.data() })));
      setIsLoading(false);
    });

    return () => {
      unsubPatients();
      unsubAlerts();
      unsubAppts();
    };
  }, [doctorId]);

  return { patients, alerts, appointments, isLoading };
}
