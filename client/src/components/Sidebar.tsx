import { NavLink } from "react-router-dom";
import BrandLogo from "./BrandLogo";

const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  OPD: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  Doctor: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4 4 4-4 4-4-4Z"/><path d="M12 14c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2"/><path d="M16 10V6a4 4 0 0 0-8 0v4"/></svg>,
  Lab: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l-2 6H8l-2-6zM8 9v10a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9"/></svg>,
  Pharmacy: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>,
  Billing: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Bed: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
};

export default function Sidebar() {
  const role = localStorage.getItem("role") || "staff";
  const tenantName = localStorage.getItem("tenantName") || "Healthezee Hospital";

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
         <BrandLogo size="sm" light={true} />
         <p style={{ fontSize: '9px', color: '#3b82f6', margin: '2px 0 0 48px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.8 }}>Clinical Management Desk</p>
      </div>

      <nav className="nav-section">
        <p style={{ fontSize: '11px', color: '#475569', fontWeight: 800, padding: '0 12px', marginBottom: '12px', textTransform: 'uppercase' }}>Core Operations</p>
        <SidebarLink to="/tenant/dashboard" icon={<Icons.Dashboard />} label="Dashboard" />
        <SidebarLink to="/tenant/opd/registration" icon={<Icons.OPD />} label="OPD Registration" />
        <SidebarLink to="/tenant/opd/queue" icon={<Icons.Doctor />} label="Doctor's Queue" />
        
        <p style={{ fontSize: '11px', color: '#475569', fontWeight: 800, padding: '0 12px', margin: '24px 0 12px', textTransform: 'uppercase' }}>Diagnostics & Pharmacy</p>
        <SidebarLink to="/tenant/lab" icon={<Icons.Lab />} label="Laboratory" />
        <SidebarLink to="/tenant/pharmacy" icon={<Icons.Pharmacy />} label="Pharmacy Hub" />
        <SidebarLink to="/tenant/ipd/beds" icon={<Icons.Bed />} label="Bed Management" />

        <p style={{ fontSize: '11px', color: '#475569', fontWeight: 800, padding: '0 12px', margin: '24px 0 12px', textTransform: 'uppercase' }}>Financials</p>
        <SidebarLink to="/billing" icon={<Icons.Billing />} label="Invoicing & Billing" />

        {role === 'admin' && (
          <>
            <p style={{ fontSize: '11px', color: '#475569', fontWeight: 800, padding: '0 12px', margin: '24px 0 12px', textTransform: 'uppercase' }}>Administration</p>
            <SidebarLink to="/tenant/masters" icon={<Icons.Settings />} label="Masters Hub" />
            <SidebarLink to="/tenant/staff" icon={<Icons.Doctor />} label="Staff & RBAC" />
          </>
        )}
      </nav>

      <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
         <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Current Facility</p>
         <p style={{ fontSize: '13px', fontWeight: 700, margin: '4px 0 0', color: '#0d9488' }}>{tenantName}</p>
      </div>
    </div>
  );
}

function SidebarLink({ to, icon, label }: { to: string, icon: any, label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      {icon}
      {label}
    </NavLink>
  );
}
