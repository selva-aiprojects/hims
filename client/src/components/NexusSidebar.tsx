import { NavLink, useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";

const Icons = {
  Overview: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  Tenants: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  Admins: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Logs: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Logout: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
};

export default function NexusSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div style={{ 
      width: '280px', 
      background: '#0f172a', 
      minHeight: '100vh', 
      padding: '32px 20px',
      display: 'flex',
      flexDirection: 'column',
      color: 'white'
    }}>
      {/* Branding Section */}
      <div style={{ marginBottom: '48px', padding: '0 12px' }}>
         <BrandLogo size="sm" light={true} />
         <p style={{ fontSize: '10px', color: '#94a3b8', margin: '4px 0 0 52px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Nexus Control</p>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <SidebarLink to="/nexus/dashboard" icon={<Icons.Overview />} label="Overview" />
        <SidebarLink to="/nexus/tenants" icon={<Icons.Tenants />} label="Tenants" />
        <SidebarLink to="/nexus/users" icon={<Icons.Admins />} label="Super Admins" />
        <SidebarLink to="/nexus/activity" icon={<Icons.Logs />} label="System Logs" />
        <SidebarLink to="/nexus/settings" icon={<Icons.Settings />} label="Settings" />
      </nav>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
        <button 
          onClick={handleLogout}
          style={{ 
            width: '100%',
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px', 
            borderRadius: '12px', 
            color: '#ef4444', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: 'none',
            fontSize: '14px', 
            fontWeight: 700, 
            cursor: 'pointer' 
          }}
        >
          <Icons.Logout />
          Logout
        </button>
      </div>
    </div>
  );
}

function SidebarLink({ to, icon, label }: { to: string, icon: any, label: string }) {
  return (
    <NavLink 
      to={to} 
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '12px',
        color: isActive ? 'white' : '#94a3b8',
        background: isActive ? '#8b5cf6' : 'transparent',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 600,
        transition: 'all 0.2s'
      })}
    >
      {icon}
      {label}
    </NavLink>
  );
}
