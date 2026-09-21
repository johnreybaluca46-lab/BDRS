import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserLogin from './pages/auth/user login';
import Home from './pages/user/home';
import About from './pages/user/about';
import Service from './pages/user/service';
import Contact from './pages/user/contact';
import BarangayClearanceForm from './pages/user/barangayclearanceform';
import CertificateOfResidencyForm from './pages/user/certificateofresidencyform';
import CertificateOfIndigencyForm from './pages/user/certificateofindigencyform';
import BusinessClearanceForm from './pages/user/businessclearanceform';
import RegisterResidentForm from './pages/user/registerresidentform';
import RegistrationStatus from './pages/user/RegistrationStatus';
import ScrollToTop from './components/ScrollToTop';
import Login from './pages/auth/login';
import Dashboard from './pages/admin/dashboard';
import DocumentRequest from './pages/admin/document_request';
import ViewDocumentRequest from './pages/admin/view_document_request';
import CompletedRequests from './pages/admin/completed';
import TrashRequests from './pages/admin/trash';
import Profile from './pages/admin/profile';
import SystemSettings from './pages/admin/settings';
import DocumentValidation from './pages/admin/document_validation';
import Reports from './pages/admin/reports';
import Inbox from './pages/admin/inbox';
import AdminPayment from './pages/admin/payment';
import SecurityLogs from './pages/admin/security_logs';
import ProtectedRoute from './components/ProtectedRoute';
import Maintenance from './maintenance/maintenance';
import Residents from './pages/admin/residents';
import ResidentApproval from './pages/admin/resident_approval';
import ViewResident from './pages/admin/view_resident';
import ResidentProtectedRoute from './components/ResidentProtectedRoute';
import UserDashboard from './pages/user/user register/user dashboard';
import RequestDocuments from './pages/user/user register/request documents';
import MyRequests from './pages/user/user register/my request';
import RequestHistory from './pages/user/user register/history';
import UserProfile from './pages/user/user register/profile';
import UserApprovedRequests from './pages/user/user register/approved_requests';
import UserPaymentProcessingRequests from './pages/user/user register/payment_processing_requests';
import UserCompletedRequests from './pages/user/user register/completed_requests';
import UserRejectedRequests from './pages/user/user register/rejected_requests';

import { MaintenanceProvider, useMaintenance } from './context/MaintenanceContext';
import MaintenanceWarning from './maintenance/MaintenanceWarning';

const AdminLoginRoute = () => {
  const { isMaintenanceActive } = useMaintenance();

  const isUnlocked = sessionStorage.getItem('loginUnlocked') === 'true';
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (isMaintenanceActive) {
    return <Maintenance />;
  }

  if (!isUnlocked) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
};

const AdminProtectedRoute = () => {
  return <ProtectedRoute />;
};

const ResidentRouteGuard = () => {
  const { isMaintenanceActive } = useMaintenance();
  if (isMaintenanceActive) {
    return <Maintenance />;
  }
  return <ResidentProtectedRoute />;
};

const PublicRouteGuard = ({ children }) => {
  const { isMaintenanceActive } = useMaintenance();
  if (isMaintenanceActive) {
    return <Maintenance />;
  }
  return children;
};

import React, { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Temporary fix for stuck request
    const fixRequest = async () => {
      try {
        const { doc, updateDoc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./database/firebase');
        const ref = doc(db, 'requests', 'BLN-9114-1783');
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().status === 'Approved') {
          await updateDoc(ref, { status: 'Processing Payment' });
          console.log('Fixed stuck request BLN-9114-1783');
        }
      } catch (e) {
        console.error(e);
      }
    };
    fixRequest();
  }, []);

  return (
    <MaintenanceProvider>
      <Router>
        <MaintenanceWarning />
        <ScrollToTop />
        <div className="app-container">
          <Routes>
            {/* Public User Routes - replaced by Maintenance when active */}
            <Route path="/" element={<PublicRouteGuard><Home /></PublicRouteGuard>} />
            <Route path="/about" element={<PublicRouteGuard><About /></PublicRouteGuard>} />
            <Route path="/services" element={<PublicRouteGuard><Service /></PublicRouteGuard>} />
            <Route path="/contact" element={<PublicRouteGuard><Contact /></PublicRouteGuard>} />

            <Route path="/register" element={<PublicRouteGuard><RegisterResidentForm /></PublicRouteGuard>} />
            <Route path="/status" element={<PublicRouteGuard><RegistrationStatus /></PublicRouteGuard>} />

            {/* User Login - Blocked during maintenance */}
            <Route path="/user-login" element={<PublicRouteGuard><UserLogin /></PublicRouteGuard>} />

          {/* Admin Login - Protected during maintenance unless unlocked via 10 clicks on logo */}
          <Route path="/login" element={<AdminLoginRoute />} />

          {/* Protected Resident Routes */}
          <Route element={<ResidentRouteGuard />}>
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/user-request-documents" element={<RequestDocuments />} />
            <Route path="/user-my-requests" element={<MyRequests />} />
            <Route path="/user-history" element={<RequestHistory />} />
            <Route path="/user-profile" element={<UserProfile />} />
            <Route path="/user-approved-requests" element={<UserApprovedRequests />} />
            <Route path="/user-payment-processing" element={<UserPaymentProcessingRequests />} />
            <Route path="/user-completed-requests" element={<UserCompletedRequests />} />
            <Route path="/user-rejected-requests" element={<UserRejectedRequests />} />
            <Route path="/barangay-clearance" element={<BarangayClearanceForm />} />
            <Route path="/certificate-of-residency" element={<CertificateOfResidencyForm />} />
            <Route path="/certificate-of-indigency" element={<CertificateOfIndigencyForm />} />
            <Route path="/business-clearance" element={<BusinessClearanceForm />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="document-requests" element={<DocumentRequest />} />
            <Route path="document-requests/:id" element={<ViewDocumentRequest />} />
            <Route path="document-validation" element={<DocumentValidation />} />
            <Route path="resident-approval" element={<ResidentApproval />} />
            <Route path="residents" element={<Residents />} />
            <Route path="residents/:id" element={<ViewResident />} />
            <Route path="completed" element={<CompletedRequests />} />
            <Route path="trash" element={<TrashRequests />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="security-logs" element={<SecurityLogs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="payment" element={<AdminPayment />} />
            <Route path="inbox" element={<Inbox />} />
          </Route>

          {/* Catch-all for invalid URLs (404) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
      </Router>
    </MaintenanceProvider>
  );
}

export default App;
