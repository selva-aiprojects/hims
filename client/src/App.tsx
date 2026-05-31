import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './modules/auth/LoginPage';
import { applyTheme } from './config/theme';
import DashboardPage from './modules/tenant/dashboard/DashboardPage';
import MastersPage from './modules/tenant/masters/MastersPage';
import OPDRegistrationPage from './modules/tenant/opd/OPDRegistrationPage';
import OPDQueuePage from './modules/tenant/opd/OPDQueuePage';
import OPDConsultationPage from './modules/tenant/opd/OPDConsultationPage';
import PatientRegisterPage from './modules/tenant/opd/PatientRegisterPage';
import TenantAppointmentsPage from './modules/tenant/appointments/AppointmentsPage';
import ClinicalAnalyticsDashboard from './modules/tenant/analytics/ClinicalAnalyticsDashboard';
import HistoricalArchivesPage from './modules/tenant/dashboard/HistoricalArchivesPage';

import DoctorAvailabilityPage from './modules/tenant/appointments/DoctorAvailabilityPage';
import AdvancedDoctorAvailabilityPage from './modules/tenant/appointments/AdvancedDoctorAvailabilityPage';
import DoctorAvailabilitySchedule from './modules/tenant/appointments/DoctorAvailabilitySchedule';
import BookAppointment from './modules/tenant/appointments/BookAppointment';

import IPDBedMap from './modules/tenant/ipd/IPDBedMap';
import IPDAdmissionsList from './modules/tenant/ipd/IPDAdmissionsList';
import IPDPatientView from './modules/tenant/ipd/IPDPatientView';
import AdmissionDeskPage from './modules/tenant/ipd/AdmissionDeskPage';
import LabManagementPage from './modules/tenant/lab/LabManagementPage';
import LabBillingQueue from './modules/tenant/lab/LabBillingQueue';
import AILabAssistant from './modules/tenant/lab/AILabAssistant';
import PharmacyManagementPage from './modules/tenant/pharmacy/PharmacyManagementPage';
import PharmacyDashboard from './modules/tenant/pharmacy/PharmacyDashboard';
import InventoryList from './modules/tenant/pharmacy/InventoryList';
import PrescriptionQueue from './modules/tenant/pharmacy/PrescriptionQueue';
import StaffManagementPage from './modules/tenant/staff/StaffManagementPage';
import RecruitmentHubPage from './modules/tenant/staff/RecruitmentHubPage';
import BillingPage from './modules/billing/BillingPage';
import RoleGuard from './components/RoleGuard';
import AppointmentsPage from './modules/appointments/AppointmentsPage';
import PatientsPage from './modules/patients/PatientsPage';
import NexusDashboardPage from './modules/nexus/NexusDashboardPage';
import TenantsListPage from './modules/nexus/TenantsListPage';
import NexusUsersPage from './modules/nexus/NexusUsersPage';
import NexusActivityPage from './modules/nexus/NexusActivityPage';
import NexusSettingsPage from './modules/nexus/NexusSettingsPage';
import TenantDetailsPage from './modules/nexus/TenantDetailsPage';
import ProvisionTenantPage from './modules/nexus/ProvisionTenantPage';
import SupportTicketsPage from './modules/tenant/support/SupportTicketsPage';
import NexusTicketingPage from './modules/nexus/NexusTicketingPage';
import NexusCommunicationPage from './modules/nexus/NexusCommunicationPage';
import NexusUtilizationPage from './modules/nexus/NexusUtilizationPage';
import InsurancePage from './modules/tenant/billing/InsurancePage';
import DischargeSummariesPage from './modules/tenant/ipd/DischargeSummariesPage';
import MessageBoardPage from './modules/tenant/communication/MessageBoardPage';
import MailManagementPage from './modules/tenant/communication/MailManagementPage';
import { useEffect } from 'react';
import SettingsPage from './modules/tenant/SettingsPage';
import SecureConfigsPage from './modules/tenant/SecureConfigsPage';
import AIChatbot from './components/AIChatbot';

import MobilePreviewPortal from './modules/mobile_preview/MobilePreviewPortal';

function ThemeObserver() {
  const location = useLocation();
  useEffect(() => {
    applyTheme();
  }, [location.pathname]);
  return null;
}

function App() {
  // Apply saved theme on app load
  useEffect(() => {
    applyTheme();
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeObserver />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        
        {/* Mobile Experience Portal */}
        <Route path="/mobile" element={<MobilePreviewPortal />} />

        {/* Tenant Routes */}
        <Route path="/tenant/dashboard" element={<DashboardPage />} />
        <Route path="/tenant/analytics" element={<ClinicalAnalyticsDashboard />} />
        <Route path="/tenant/reports" element={<ClinicalAnalyticsDashboard />} />
        <Route path="/tenant/masters" element={<MastersPage />} />
        <Route path="/tenant/opd/registration" element={<OPDRegistrationPage />} />
        <Route path="/tenant/opd/queue" element={<RoleGuard allowedRoles={['admin', 'doctor', 'receptionist', 'staff']} moduleName="OPD Queue"><OPDQueuePage /></RoleGuard>} />
        <Route path="/tenant/opd/consultation" element={<OPDConsultationPage />} />
        <Route path="/tenant/clinical/patient-register" element={<PatientRegisterPage />} />
        <Route path="/tenant/appointments" element={<TenantAppointmentsPage />} />
        <Route path="/tenant/archives" element={<RoleGuard allowedRoles={['admin', 'doctor', 'staff', 'billing']} moduleName="Clinical & Financial Archives"><HistoricalArchivesPage /></RoleGuard>} />

        <Route path="/tenant/appointments/doctor-calendar" element={<DoctorAvailabilityPage />} />
        <Route path="/tenant/appointments/advanced-calendar" element={<AdvancedDoctorAvailabilityPage />} />
        <Route path="/tenant/appointments/schedule" element={<DoctorAvailabilitySchedule />} />
        <Route path="/tenant/appointments/book" element={<BookAppointment />} />

        <Route path="/tenant/ipd/beds" element={<IPDBedMap />} />
        <Route path="/tenant/ipd/admissions" element={<IPDAdmissionsList />} />
        <Route path="/tenant/ipd/admissions/:id" element={<IPDPatientView />} />
        <Route path="/tenant/ipd/admission-desk" element={<AdmissionDeskPage />} />
        <Route path="/tenant/ipd/discharge" element={<DischargeSummariesPage />} />
        <Route path="/tenant/lab" element={<RoleGuard allowedRoles={['admin', 'lab_assistant', 'doctor', 'lab_tech']} moduleName="Laboratory"><LabManagementPage /></RoleGuard>} />
        <Route path="/tenant/lab/billing" element={<RoleGuard allowedRoles={['admin', 'receptionist', 'staff']} moduleName="Lab Billing"><LabBillingQueue /></RoleGuard>} />
        <Route path="/tenant/lab/ai" element={<RoleGuard allowedRoles={['admin', 'lab_assistant', 'doctor', 'lab_tech']} moduleName="AI Lab Assistant"><AILabAssistant /></RoleGuard>} />
        <Route path="/tenant/pharmacy" element={<RoleGuard allowedRoles={['admin', 'pharmacist', 'doctor']} moduleName="Pharmacy"><PharmacyManagementPage /></RoleGuard>} />
        <Route path="/tenant/pharmacy/dashboard" element={<RoleGuard allowedRoles={['admin', 'pharmacist']} moduleName="Pharmacy Dashboard"><PharmacyDashboard /></RoleGuard>} />
        <Route path="/tenant/pharmacy/inventory" element={<RoleGuard allowedRoles={['admin', 'pharmacist']} moduleName="Stock Inventory"><InventoryList /></RoleGuard>} />
        <Route path="/tenant/pharmacy/queue" element={<RoleGuard allowedRoles={['admin', 'pharmacist']} moduleName="Prescription Queue"><PrescriptionQueue /></RoleGuard>} />
        <Route path="/tenant/staff" element={<StaffManagementPage />} />
        <Route path="/tenant/recruitment" element={<RecruitmentHubPage />} />
        <Route path="/tenant/settings" element={<SettingsPage />} />
        <Route path="/tenant/settings/secure" element={<SecureConfigsPage />} />
        <Route path="/tenant/support" element={<SupportTicketsPage />} />
        <Route path="/tenant/communication" element={<MessageBoardPage />} />
        <Route path="/tenant/mail" element={<MailManagementPage />} />
        <Route path="/tenant/billing/insurance" element={<InsurancePage />} />
        <Route path="/billing" element={<RoleGuard allowedRoles={['admin', 'receptionist', 'staff', 'billing']} moduleName="Billing Desk"><BillingPage /></RoleGuard>} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        
        {/* Nexus Routes */}
        <Route path="/nexus/dashboard" element={<NexusDashboardPage />} />
        <Route path="/nexus/tenants" element={<TenantsListPage />} />
        <Route path="/nexus/tenants/new" element={<ProvisionTenantPage />} />
        <Route path="/nexus/tenants/:id" element={<TenantDetailsPage />} />
        <Route path="/nexus/users" element={<NexusUsersPage />} />
        <Route path="/nexus/activity" element={<NexusActivityPage />} />
        <Route path="/nexus/tickets" element={<NexusTicketingPage />} />
        <Route path="/nexus/communications" element={<NexusCommunicationPage />} />
        <Route path="/nexus/utilization" element={<NexusUtilizationPage />} />
        <Route path="/nexus/settings" element={<NexusSettingsPage />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AIChatbot />
    </Router>
  );
}

export default App;
