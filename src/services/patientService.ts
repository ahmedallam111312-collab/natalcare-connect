import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { Appointment } from "@/hooks/usePatientData";

export const patientService = {
  async bookAppointment(uid: string, appointmentData: Omit<Appointment, "id" | "createdAt">) {
    if (!uid) throw new Error("User ID is required");
    return await addDoc(collection(db, "users", uid, "appointments"), {
      ...appointmentData,
      createdAt: serverTimestamp(),
    });
  },

  async submitFMCReport(
    uid: string,
    patientName: string,
    report: {
      date: string;
      kicks: number;
      goalMet: boolean;
      durationSeconds: number;
      status: "normal" | "needs_followup";
      gestationalWeek: number;
    }
  ) {
    if (!uid) throw new Error("User ID is required");

    // 1. Save Report
    await addDoc(collection(db, "users", uid, "fmcReports"), {
      ...report,
      createdAt: serverTimestamp(),
    });

    // 2. Send Alert
    const message = report.goalMet
      ? `سجلت المريضة حركة جنين طبيعية (${report.kicks} ركلات).`
      : `⚠️ تنبيه: حركة الجنين أقل من الطبيعي (${report.kicks} ركلات فقط)!`;

    await addDoc(collection(db, "alerts"), {
      patientId: uid,
      patientName: patientName || "مريضة",
      type: "fmc",
      message,
      severity: report.goalMet ? "low" : "high",
      acknowledged: false,
      createdAt: serverTimestamp(),
    });
  },

  async submitVitals(
    uid: string,
    patientName: string,
    vitals: {
      bloodPressureSystolic?: number;
      bloodPressureDiastolic?: number;
      bloodSugar?: number;
      weight?: number;
    }
  ) {
    if (!uid) throw new Error("User ID is required");

    let status = "normal";
    let alertMessage = "";
    
    const sys = vitals.bloodPressureSystolic;
    const dia = vitals.bloodPressureDiastolic;
    const sug = vitals.bloodSugar;

    if ((sys && sys >= 140) || (dia && dia >= 90)) {
      status = "critical";
      alertMessage = `ارتفاع في ضغط الدم (${sys}/${dia})`;
    } else if (sug && sug >= 140) {
      status = "critical";
      alertMessage = `ارتفاع في مستوى السكر (${sug} mg/dL)`;
    } else if ((sys && sys <= 90) || (dia && dia <= 60)) {
      status = "warning";
      alertMessage = `انخفاض ملحوظ في ضغط الدم (${sys}/${dia})`;
    }

    const payload: any = {
      ...vitals,
      date: new Date().toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      status,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "users", uid, "vitals"), payload);

    if (status !== "normal") {
      await addDoc(collection(db, "alerts"), {
        patientId: uid,
        patientName: patientName || "مريضة",
        type: "vitals",
        message: `تنبيه مؤشرات حيوية: ${alertMessage}`,
        severity: status === "critical" ? "high" : "moderate",
        acknowledged: false,
        createdAt: serverTimestamp(),
      });
      return { status, alertMessage };
    }
    return { status };
  }
};
