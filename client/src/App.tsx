import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './modules/auth/LoginPage';
import DashboardPage from './modules/tenant/dashboard/DashboardPage';
import MastersPage from './modules/tenant/masters/MastersPage';
import OPDRegistrationPage from './modules/tenant/opd/OPDRegistrationPage';
import OPDQueuePage from './modules/tenant/opd/OPDQueuePage';
import OPDConsultationPage from './modules/tenant/opd/OPDConsultationPage';
import TenantAppointmentsPage from './modules/tenant/appointments/AppointmentsPage';
import BedManagementPage from './modules/tenant/ipd/BedManagementPage';
import LabManagementPage from './modules/tenant/lab/LabManagementPage';
import PharmacyManagementPage from './modules/tenant/pharmacy/PharmacyManagementPage';
import StaffManagementPage from './modules/tenant/staff/StaffManagementPage';
import BillingPage from './modules/billing/BillingPage';
import AppointmentsPage from './modules/appointments/AppointmentsPage';
import PatientsPage from './modules/patients/PatientsPage';
import NexusDashboardPage from './modules/nexus/NexusDashboardPage';
import TenantsListPage from './modules/nexus/TenantsListPage';
import NexusUsersPage from './modules/nexus/NexusUsersPage';
import NexusActivityPage from './modules/nexus/NexusActivityPage';
import NexusSettingsPage from './modules/nexus/NexusSettingsPage';
import TenantDetailsPage from './modules/nexus/TenantDetailsPage';
import ProvisionTenantPage from './modules/nexus/ProvisionTenantPage';

function App() {
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
        <Route path="/tenant/ipd/beds" element={<BedManagementPage />} />
        <Route path="/tenant/lab" element={<LabManagementPage />} />
        <Route path="/tenant/pharmacy" element={<PharmacyManagementPage />} />
        <Route path="/tenant/staff" element={<StaffManagementPage />} />
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
