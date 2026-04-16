import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { ProtectedRoute } from "@/pages/auth/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/lib/i18n";

// Page imports...
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import PatientLayout from "@/layouts/PatientLayout";
import PatientDashboard from "@/pages/patient/PatientDashboard";
import SymptomsTracker from "@/pages/patient/SymptomsTracker";
import DailyVitals from "@/pages/patient/DailyVitals";
import LabResults from "@/pages/patient/LabResults";
import Medications from "@/pages/patient/Medications";
import Hospitals from "@/pages/patient/Hospitals";
import PatientSettings from "@/pages/patient/PatientSettings";
import DoctorLayout from "@/layouts/DoctorLayout";
import DoctorDashboard from "@/pages/doctor/DoctorDashboard";
import PatientsList from "@/pages/doctor/PatientsList";
import PriorityAlerts from "@/pages/doctor/PriorityAlerts";
import DoctorAnalytics from "@/pages/doctor/DoctorAnalytics";
import DoctorChat from "@/pages/doctor/DoctorChat";
import CommunicationTemplates from "@/pages/doctor/CommunicationTemplates";
import DoctorSettings from "@/pages/doctor/DoctorSettings";
import NurseLayout from "@/layouts/NurseLayout";
import NurseDashboard from "@/pages/nurse/NurseDashboard";
import NursePatientDirectory from "@/pages/nurse/NursePatientDirectory";
import NurseScheduling from "@/pages/nurse/NurseScheduling";
import UltrasoundOCR from "@/pages/nurse/UltrasoundOCR";
import NurseSettings from "@/pages/nurse/NurseSettings";
import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageHospitals from "@/pages/admin/ManageHospitals";
import ManageDoctors from "@/pages/admin/ManageDoctors";
import ManageLabCategories from "@/pages/admin/ManageLabCategories";
import AdminSettings from "@/pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";
import PatientChat from "@/pages/patient/PatientChat";
import PatientOnboarding from "@/pages/patient/PatientOnboarding";
const queryClient = new QueryClient();

const App = () => {
  const { setUser, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: userData.displayName || "User",
              role: userData.role || "patient",
            });
          } else {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, displayName: "New User", role: "patient" });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [setUser, setLoading]);

  if (isLoading) return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster /><Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Portals with Guards */}
            <Route path="/patient" element={<ProtectedRoute allowedRoles={["patient"]}><PatientLayout /></ProtectedRoute>}>
              <Route index element={<PatientDashboard />} /><Route path="symptoms" element={<SymptomsTracker />} />
              <Route path="chat" element={<PatientChat />} />
              <Route path="vitals" element={<DailyVitals />} /><Route path="labs" element={<LabResults />} />
              <Route path="medications" element={<Medications />} /><Route path="hospitals" element={<Hospitals />} />
              <Route path="settings" element={<PatientSettings />} />
              <Route path="/patient/onboarding" element={<PatientOnboarding />} />
            </Route>

            <Route path="/doctor" element={<ProtectedRoute allowedRoles={["doctor"]}><DoctorLayout /></ProtectedRoute>}>
              <Route index element={<DoctorDashboard />} /><Route path="patients" element={<PatientsList />} />
              <Route path="alerts" element={<PriorityAlerts />} /><Route path="analytics" element={<DoctorAnalytics />} />
              <Route path="chat" element={<DoctorChat />} /><Route path="templates" element={<CommunicationTemplates />} />
              <Route path="settings" element={<DoctorSettings />} />
            </Route>

            <Route path="/nurse" element={<ProtectedRoute allowedRoles={["nurse"]}><NurseLayout /></ProtectedRoute>}>
              <Route index element={<NurseDashboard />} /><Route path="patients" element={<NursePatientDirectory />} />
              <Route path="scheduling" element={<NurseScheduling />} /><Route path="ultrasound" element={<UltrasoundOCR />} />
              <Route path="settings" element={<NurseSettings />} />
            </Route>

            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} /><Route path="hospitals" element={<ManageHospitals />} />
              <Route path="doctors" element={<ManageDoctors />} /><Route path="lab-categories" element={<ManageLabCategories />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;