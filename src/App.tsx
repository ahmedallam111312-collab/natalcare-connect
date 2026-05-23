import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { ProtectedRoute } from "@/pages/auth/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/lib/i18n";
import OfflineBanner from "@/components/OfflineBanner";
import AppLoader from "@/components/AppLoader";
import PageTransition from "@/components/animations/PageTransition";
import { AnimatePresence } from "framer-motion";

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
import ContractionTimer from "@/pages/patient/ContractionTimer";
import BirthPreparation from "@/pages/patient/BirthPreparation";
import DoctorPrescriptions from "@/pages/doctor/DoctorPrescriptions";

const queryClient = new QueryClient();

// Create a wrapper component for routes so we can use useLocation
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
        
        {/* Portals with Guards */}
        <Route path="/patient" element={<ProtectedRoute allowedRoles={["patient"]}><PatientLayout /></ProtectedRoute>}>
          <Route index element={<PageTransition><PatientDashboard /></PageTransition>} />
          <Route path="symptoms" element={<PageTransition><SymptomsTracker /></PageTransition>} />
          <Route path="chat" element={<PageTransition><PatientChat /></PageTransition>} />
          <Route path="vitals" element={<PageTransition><DailyVitals /></PageTransition>} />
          <Route path="labs" element={<PageTransition><LabResults /></PageTransition>} />
          <Route path="medications" element={<PageTransition><Medications /></PageTransition>} />
          <Route path="hospitals" element={<PageTransition><Hospitals /></PageTransition>} />
          <Route path="settings" element={<PageTransition><PatientSettings /></PageTransition>} />
          <Route path="onboarding" element={<PageTransition><PatientOnboarding /></PageTransition>} />
          <Route path="contractions" element={<PageTransition><ContractionTimer /></PageTransition>} />
          <Route path="birth-plan" element={<PageTransition><BirthPreparation /></PageTransition>} />
        </Route>
        
        <Route path="/doctor" element={<ProtectedRoute allowedRoles={["doctor"]}><DoctorLayout /></ProtectedRoute>}>
          <Route index element={<PageTransition><DoctorDashboard /></PageTransition>} />
          <Route path="patients" element={<PageTransition><PatientsList /></PageTransition>} />
          <Route path="alerts" element={<PageTransition><PriorityAlerts /></PageTransition>} />
          <Route path="analytics" element={<PageTransition><DoctorAnalytics /></PageTransition>} />
          <Route path="chat" element={<PageTransition><DoctorChat /></PageTransition>} />
          <Route path="templates" element={<PageTransition><CommunicationTemplates /></PageTransition>} />
          <Route path="settings" element={<PageTransition><DoctorSettings /></PageTransition>} />
          <Route path="prescriptions" element={<PageTransition><DoctorPrescriptions /></PageTransition>} />
        </Route>

        <Route path="/nurse" element={<ProtectedRoute allowedRoles={["nurse"]}><NurseLayout /></ProtectedRoute>}>
          <Route index element={<PageTransition><NurseDashboard /></PageTransition>} />
          <Route path="patients" element={<PageTransition><NursePatientDirectory /></PageTransition>} />
          <Route path="scheduling" element={<PageTransition><NurseScheduling /></PageTransition>} />
          <Route path="ultrasound" element={<PageTransition><UltrasoundOCR /></PageTransition>} />
          <Route path="settings" element={<PageTransition><NurseSettings /></PageTransition>} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<PageTransition><AdminDashboard /></PageTransition>} />
          <Route path="hospitals" element={<PageTransition><ManageHospitals /></PageTransition>} />
          <Route path="doctors" element={<PageTransition><ManageDoctors /></PageTransition>} />
          <Route path="lab-categories" element={<PageTransition><ManageLabCategories /></PageTransition>} />
          <Route path="settings" element={<PageTransition><AdminSettings /></PageTransition>} />
        </Route>
        
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

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
              profileCompleted: userData.profileCompleted || false,
            });
          } else {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, displayName: "New User", role: "patient", profileCompleted: false });
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

  if (isLoading) return <AppLoader />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OfflineBanner />
        <Toaster /><Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;