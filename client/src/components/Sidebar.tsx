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
  Bed: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>,
  Clipboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>,
  Pill: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>,
  Receipt: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5V6.5"/></svg>
};

export default function Sidebar() {
  const tenantName = localStorage.getItem("tenantName") || "Healthezee Hospital";
  const plan = (localStorage.getItem("tenantPlan") || "basic").toLowerCase();
  
  // Dynamic menus loaded from database via login response
  const rawMenus = localStorage.getItem("userMenus");
  const dynamicMenus: any[] = rawMenus ? JSON.parse(rawMenus) : [];

  const orderedItems = (labels: string[]) =>
    dynamicMenus
      .filter(m => labels.includes(m.label))
      .map(normalizeMenu)
      .sort((a, b) => labels.indexOf(a.label) - labels.indexOf(b.label));

  const normalizeMenu = (menu: any) => {
    const pathOverrides: Record<string, string> = {
      "Consultation Desk": "/tenant/opd/consultation",
      "IPD Admission Desk": "/tenant/ipd/admission-desk",
      "Admission Desk": "/tenant/ipd/admission-desk"
    };

    return {
      ...menu,
      path: pathOverrides[menu.label] || menu.path
    };
  };

  const clinicalFlow = [
    "OPD Registration",
    "OPD Queue",
    "Doctor's Queue",
    "Consultation Desk",
    "Appointment List",
    "Admission Desk",
    "IPD Bed Map",
    "IPD Census & Daycare",
    "Discharge Summaries"
  ];

  const serviceFlow = [
    "Laboratory",
    "Laboratory Billing",
    "AI Lab Assistant",
    "Pharmacy",
    "Pharmacy Dashboard",
    "Stock Inventory",
    "Prescription Queue"
  ];

  const billingFlow = [
    "Invoicing & Billing",
    "OPD Billing & Revenue Center",
    "Pharmacy Billing",
    "IPD & Discharge Billing",
    "Hospital Billing",
    "Insurance Management"
  ];

  const managementFlow = [
    "Staff & RBAC",
    "Staff Management",
    "User Management",
    "Hospital Settings (Masters)",
    "Hospital Settings",
    "Branding & UI Settings",
    "Message Board",
    "Mail Management",
    "Help & Support",
    "Ticketing Management System"
  ];

  const groups = [
    { title: "Clinical Workflow", items: orderedItems(clinicalFlow) },
    { title: "Services & Pharmacy", items: orderedItems(serviceFlow) },
    { title: "Billing & Finance", items: orderedItems(billingFlow) },
    { title: "Management", items: orderedItems(managementFlow) }
  ];

  const ungroupped = dynamicMenus
    .filter(m => !groups.some(g => g.items.some(gi => gi.label === m.label)))
    .map(normalizeMenu);

  return (
    <>
      <div className="mobile-overlay" onClick={() => {
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.querySelector('.mobile-overlay')?.classList.remove('active');
      }}></div>
      <div className="sidebar">
        <button className="sidebar-close" onClick={() => {
          document.querySelector('.sidebar')?.classList.remove('mobile-open');
          document.querySelector('.mobile-overlay')?.classList.remove('active');
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div style={{ padding: '0 8px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'linear-gradient(135deg, #0d9488, #0f766e)', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800,
              color: 'white',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
            }}>
              {tenantName.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h2 style={{ 
                fontSize: '15px', 
                fontWeight: 800, 
                color: 'white', 
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {tenantName}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: 900, color: plan === 'enterprise' ? '#f59e0b' : '#64748b', textTransform: 'uppercase' }}>
                  {plan} TIER
                </span>
              </div>
            </div>
          </div>
        </div>

        <nav className="nav-section" style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Main Dashboard / Uncategorized */}
          {ungroupped.map((menu, idx) => {
            const IconComponent = Icons[menu.icon as keyof typeof Icons] || Icons.Dashboard;
            return <SidebarLink key={idx} to={menu.path} icon={<IconComponent />} label={menu.label} />;
          })}

          {/* Categorized Groups */}
          {groups.map((group, gIdx) => (
            group.items.length > 0 && (
              <div key={gIdx} style={{ marginTop: '24px' }}>
                <div style={{ 
                  padding: '0 16px 8px', 
                  fontSize: '10px', 
                  fontWeight: 900, 
                  color: '#4b5563', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em' 
                }}>
                  {group.title}
                </div>
                {group.items.map((menu, mIdx) => {
                  const IconComponent = Icons[menu.icon as keyof typeof Icons] || Icons.Dashboard;
                  return <SidebarLink key={mIdx} to={menu.path} icon={<IconComponent />} label={menu.label} />;
                })}
              </div>
            )
          ))}

          {dynamicMenus.length === 0 && (
            <p style={{ padding: '20px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
              No authorized menus found. Please contact administrator.
            </p>
          )}
        </nav>
      </div>
    </>
  );
}

function SidebarLink({ to, icon, label }: { to: string, icon: any, label: string }) {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      onClick={() => {
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.querySelector('.mobile-overlay')?.classList.remove('active');
      }}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
