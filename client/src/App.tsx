import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './modules/auth/LoginPage';
import DashboardPage from './modules/tenant/dashboard/DashboardPage';
import MastersPage from './modules/tenant/masters/MastersPage';
import OPDRegistrationPage from './modules/tenant/opd/OPDRegistrationPage';
import OPDQueuePage from './modules/tenant/opd/OPDQueuePage';
import OPDConsultationPage from './modules/tenant/opd/OPDConsultationPage';
import TenantAppointmentsPage from './modules/tenant/appointments/AppointmentsPage';
import IPDBedMap from './modules/tenant/ipd/IPDBedMap';
import IPDAdmissionsList from './modules/tenant/ipd/IPDAdmissionsList';
import IPDPatientView from './modules/tenant/ipd/IPDPatientView';
import LabManagementPage from './modules/tenant/lab/LabManagementPage';
import PharmacyManagementPage from './modules/tenant/pharmacy/PharmacyManagementPage';
import PharmacyDashboard from './modules/tenant/pharmacy/PharmacyDashboard';
import InventoryList from './modules/tenant/pharmacy/InventoryList';
import PrescriptionQueue from './modules/tenant/pharmacy/PrescriptionQueue';
import StaffManagementPage from './modules/tenant/staff/StaffManagementPage';
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

import { useEffect } from 'react';
import SettingsPage from './modules/tenant/SettingsPage';

function App() {
  // Apply saved theme on app load
  useEffect(() => {
    const primaryDark = localStorage.getItem('theme_primary_dark');
    const primaryAccent = localStorage.getItem('theme_primary_accent');
    const appBg = localStorage.getItem('theme_app_bg');
    const textMain = localStorage.getItem('theme_text_main');

    if (primaryDark) document.documentElement.style.setProperty('--primary-dark', primaryDark);
    if (primaryAccent) document.documentElement.style.setProperty('--primary-accent', primaryAccent);
    if (appBg) document.documentElement.style.setProperty('--app-bg', appBg);
    if (textMain) document.documentElement.style.setProperty('--text-main', textMain);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        
        {/* Tenant Routes */}
        <Route path="/tenant/dashboard" element={<DashboardPage />} />
        <Route path="/tenant/masters" element={<MastersPage />} />
        <Route path="/tenant/opd/registration" element={<OPDRegistrationPage />} />
        <Route path="/tenant/opd/queue" element={<OPDQueuePage />} />
        <Route path="/tenant/opd/consultation" element={<OPDConsultationPage />} />
        <Route path="/tenant/appointments" element={<TenantAppointmentsPage />} />
        <Route path="/tenant/ipd/beds" element={<IPDBedMap />} />
        <Route path="/tenant/ipd/admissions" element={<IPDAdmissionsList />} />
        <Route path="/tenant/ipd/admissions/:id" element={<IPDPatientView />} />
        <Route path="/tenant/lab" element={<RoleGuard allowedRoles={['lab_assistant', 'doctor']} moduleName="Laboratory"><LabManagementPage /></RoleGuard>} />
        <Route path="/tenant/pharmacy" element={<RoleGuard allowedRoles={['pharmacist', 'doctor']} moduleName="Pharmacy"><PharmacyManagementPage /></RoleGuard>} />
        <Route path="/tenant/pharmacy/dashboard" element={<RoleGuard allowedRoles={['pharmacist']} moduleName="Pharmacy Dashboard"><PharmacyDashboard /></RoleGuard>} />
        <Route path="/tenant/pharmacy/inventory" element={<RoleGuard allowedRoles={['pharmacist']} moduleName="Stock Inventory"><InventoryList /></RoleGuard>} />
        <Route path="/tenant/pharmacy/queue" element={<RoleGuard allowedRoles={['pharmacist']} moduleName="Prescription Queue"><PrescriptionQueue /></RoleGuard>} />
        <Route path="/tenant/staff" element={<StaffManagementPage />} />
        <Route path="/tenant/settings" element={<SettingsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        
        {/* Nexus Routes */}
        <Route path="/nexus/dashboard" element={<NexusDashboardPage />} />
        <Route path="/nexus/tenants" element={<TenantsListPage />} />
        <Route path="/nexus/tenants/new" element={<ProvisionTenantPage />} />
        <Route path="/nexus/tenants/:id" element={<TenantDetailsPage />} />
        <Route path="/nexus/users" element={<NexusUsersPage />} />
        <Route path="/nexus/activity" element={<NexusActivityPage />} />
        <Route path="/nexus/settings" element={<NexusSettingsPage />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
