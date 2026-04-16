export type UserRole = "patient" | "doctor" | "nurse" | "admin";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
}

export interface VitalRecord {
  id: string;
  patientId: string;
  date: string;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  bloodSugar: number;
  weight: number;
  notes?: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  adherence: number; // 0-100
  reminders: boolean;
}

export interface LabResult {
  id: string;
  patientId: string;
  category: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  date: string;
  status: "normal" | "abnormal" | "critical";
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: string;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
}

export interface SymptomEntry {
  id: string;
  patientId: string;
  timestamp: string;
  symptoms: string[];
  severity: "mild" | "moderate" | "severe";
  aiAnalysis?: string;
  followUpQuestions?: string[];
}

export interface KickCount {
  id: string;
  patientId: string;
  date: string;
  count: number;
  startTime: string;
  endTime?: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  specialties: string[];
  rating: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
