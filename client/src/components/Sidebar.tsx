import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  FlaskConical, 
  Pill, 
  Receipt, 
  Settings, 
  Bed, 
  ClipboardList, 
  RefreshCw,
  Calendar,
  Stethoscope,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  LifeBuoy,
  Box
} from 'lucide-react';

const Icons: Record<string, any> = {
  Dashboard: LayoutDashboard,
  OPD: Users,
  Doctor: Stethoscope,
  Lab: FlaskConical,
  Pharmacy: Pill,
  Billing: Receipt,
  Settings: Settings,
  Bed: Bed,
  Clipboard: ClipboardList,
  Calendar: Calendar,
  Help: LifeBuoy
};

const normalizePath = (label: string, originalPath: string) => {
  const l = label.toLowerCase();
  const overrides: Record<string, string> = {
    "consultation desk": "/tenant/opd/consultation",
    "opd queue": "/tenant/opd/queue",
    "doctor's queue": "/tenant/opd/queue",
    "ipd admission desk": "/tenant/ipd/admission-desk",
    "admission desk": "/tenant/ipd/admission-desk",
    "user management": "/tenant/staff/user-management",
    "appointment list": "/tenant/appointments",
    "doctor availability and book appointments": "/tenant/appointments/doctor-calendar",
    "laboratory": "/tenant/lab",
    "laboratory / diagnostics": "/tenant/lab",
    "diagnostics": "/tenant/lab",
    "lab": "/tenant/lab",
    "ai lab assistant": "/tenant/lab/ai",
    "help & support": "/tenant/support",
    "ticketing management system": "/tenant/support/tickets",
    "pharmacy": "/tenant/pharmacy",
    "staff & rbac": "/tenant/staff",
    "staff management": "/tenant/staff",
    "pharmacy dashboard": "/tenant/pharmacy/dashboard",
    "stock inventory": "/tenant/pharmacy/inventory",
    "prescription queue": "/tenant/pharmacy/queue",
    "opd billing & revenue center": "/billing?type=OPD",
    "opd billing & revenue": "/billing?type=OPD",
    "opd billing": "/billing?type=OPD",
    "ipd & discharge billing": "/billing?type=IPD",
    "ipd billing": "/billing?type=IPD",
    "discharge billing": "/billing?type=IPD",
    "pharmacy billing": "/billing?type=PHARMACY",
    "laboratory billing": "/billing?type=LAB",
    "lab billing": "/billing?type=LAB",
    "laboratory / diagnostics billing": "/billing?type=LAB",
    "diagnostics billing": "/billing?type=LAB",
    "laboratory billing center": "/tenant/lab/billing",
    "lab billing queue": "/tenant/lab/billing",
    "invoicing & billing": "/billing?type=OPD"
  };
  return overrides[l] || originalPath;
};

export default function Sidebar() {
  const location = useLocation();
  const tenantName = localStorage.getItem("tenantName") || "Healthezee Hospital";
  const plan = (localStorage.getItem("tenantPlan") || "basic").toLowerCase();
  
  const { groups, ungroupped } = useMemo(() => {
    const raw = localStorage.getItem("userMenus");
    let dm: any[] = raw ? JSON.parse(raw) : [];
    
    if (!dm.some((m: any) => m.label.toLowerCase().includes("doctor availability"))) {
      dm.push({ label: "Doctor Availability and Book Appointments", path: "/tenant/appointments/doctor-calendar", icon: "Calendar", sort_order: 6 });
    }

    const uniqueMap = new Map();
    dm.forEach(m => {
      const nPath = normalizePath(m.label, m.path);
      if (!uniqueMap.has(nPath)) uniqueMap.set(nPath, { ...m, path: nPath });
    });
    const pm = Array.from(uniqueMap.values());

    const clinicalFlow = ["OPD Registration", "OPD Queue", "Doctor's Queue", "Consultation Desk", "Appointment List", "Doctor Availability and Book Appointments", "Admission Desk", "IPD Bed Map", "IPD Census & Daycare", "Discharge Summaries"];
    const serviceFlow = ["Laboratory", "Laboratory / Diagnostics", "Diagnostics", "Lab", "AI Lab Assistant", "Pharmacy", "Pharmacy Dashboard", "Stock Inventory", "Prescription Queue"];
    const billingFlow = ["Invoicing & Billing", "OPD Billing & Revenue Center", "Laboratory Billing", "Laboratory / Diagnostics Billing", "Diagnostics Billing", "Laboratory Billing Center", "Lab Billing Queue", "Pharmacy Billing", "IPD & Discharge Billing", "Hospital Billing", "Insurance Management"];
    const managementFlow = ["Staff & RBAC", "Staff Management", "User Management", "Hospital Settings (Masters)", "Hospital Settings", "Branding & UI Settings", "Message Board", "Mail Management", "Help & Support", "Ticketing Management System"];

    const getItems = (labels: string[]) => pm
      .filter(m => labels.some(l => l.toLowerCase() === m.label.toLowerCase()))
      .sort((a, b) => labels.findIndex(l => l.toLowerCase() === a.label.toLowerCase()) - labels.findIndex(l => l.toLowerCase() === b.label.toLowerCase()));

    const gs = [
      { id: 'clinical', title: "Clinical Workflow", items: getItems(clinicalFlow), icon: Stethoscope },
      { id: 'services', title: "Services & Pharmacy", items: getItems(serviceFlow), icon: FlaskConical },
      { id: 'billing', title: "Billing & Finance", items: getItems(billingFlow), icon: Receipt },
      { id: 'mgmt', title: "Management", items: getItems(managementFlow), icon: Settings }
    ];

    const gLabels = new Set();
    gs.forEach(g => g.items.forEach(i => gLabels.add(i.label.toLowerCase())));
    const ug = pm.filter(m => !gLabels.has(m.label.toLowerCase()));

    return { groups: gs, ungroupped: ug };
  }, []);

  // Accordion State: Only one group open at a time
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Auto-expand group containing active link
  useEffect(() => {
    const activeGroup = groups.find(g => g.items.some(i => i.path === location.pathname));
    if (activeGroup) {
      setOpenGroup(activeGroup.id);
    }
  }, [location.pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroup(prev => (prev === id ? null : id));
  };

  const refreshMenus = () => {
    localStorage.removeItem("userMenus");
    window.location.reload();
  };

  return (
    <>
      <div className="mobile-overlay" onClick={() => {
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.querySelector('.mobile-overlay')?.classList.remove('active');
      }}></div>
      
      <div className="sidebar" style={{ width: '280px', background: 'var(--primary-dark, #0f172a)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <img 
              src={localStorage.getItem('theme_logo_url') || "/logo.png"} 
              alt={tenantName} 
              style={{ width: '100%', height: 'auto', maxHeight: '80px', objectFit: 'contain', cursor: 'pointer', transition: 'transform 0.2s' }} 
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src.includes('logo.png')) {
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div style="width:48px;height:48px;background:var(--primary-accent, #0ea5e9);border-radius:12px;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:white;">${tenantName.charAt(0)}</div><h2 style="font-size:15px;font-weight:800;color:white;margin-top:12px;">${tenantName}</h2>`;
                  }
                } else {
                  img.src = "/logo.png";
                }
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
              <span style={{ fontSize: '9px', fontWeight: 900, color: plan === 'enterprise' ? '#f59e0b' : 'var(--primary-accent, #38bdf8)', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.05em' }}>{plan}</span>
              <button onClick={refreshMenus} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '4px', display: 'flex' }} title="Refresh Dashboard"><RefreshCw size={12} /></button>
            </div>
          </div>
        </div>

        <nav className="nav-container">
          {ungroupped.map((menu, idx) => (
            <SidebarLink key={idx} to={menu.path} icon={Icons[menu.icon] || LayoutDashboard} label={menu.label} />
          ))}

          {groups.map((group) => group.items.length > 0 && (
            <div key={group.id} style={{ marginBottom: '8px' }}>
              <button 
                onClick={() => toggleGroup(group.id)}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '12px 16px', 
                  background: 'none', 
                  border: 'none', 
                  color: openGroup === group.id ? 'white' : '#64748b', 
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  borderRadius: '10px'
                }}
                className={`group-header ${openGroup === group.id ? 'active' : ''}`}
              >
                <group.icon size={18} style={{ opacity: openGroup === group.id ? 1 : 0.5 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{group.title}</span>
                <ChevronDown size={14} style={{ transform: openGroup === group.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
              </button>
              
              <div className={`sub-item-container ${openGroup === group.id ? 'open' : ''}`}>
                {group.items.map((menu, mIdx) => (
                  <SidebarLink key={mIdx} to={menu.path} icon={Icons[menu.icon] || Box} label={menu.label} isSubItem />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={20} color="var(--primary-accent, #0ea5e9)" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>Nexus Secured</div>
              <div style={{ fontSize: '10px', color: '#475569' }}>v2.4.0 Build 102</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .nav-container {
          flex: 1;
          overflow-y: auto;
          padding: 10px 12px;
          scrollbar-gutter: stable;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          margin-bottom: 2px;
          position: relative;
        }
        .nav-item:hover { background: rgba(255,255,255,0.03); color: white; }
        .nav-item.active { 
          background: rgba(255, 255, 255, 0.05); 
          color: var(--primary-accent, #38bdf8); 
          border-radius: 8px; 
        }
        .nav-item.active::after {
          content: "";
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 3px;
          background: var(--primary-accent, #38bdf8);
          border-radius: 0 4px 4px 0;
        }
        .nav-item.active svg {
          color: var(--primary-accent, #38bdf8) !important;
          stroke: var(--primary-accent, #38bdf8) !important;
        }
        .group-header {
          color: #94a3b8;
          transition: all 0.2s;
        }
        .group-header:hover { background: rgba(255,255,255,0.03); color: white; }
        .group-header.active {
          color: white;
        }
        .group-header.active svg {
          color: var(--primary-accent, #38bdf8);
        }
        .sub-item-container {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s ease-out;
          padding-left: 8px;
          border-left: 1px solid rgba(255,255,255,0.05);
          margin-left: 18px;
        }
        .sub-item-container.open {
          max-height: 1000px;
          margin-top: 4px;
        }
        .nav-container::-webkit-scrollbar { width: 4px; }
        .nav-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </>
  );
}

function SidebarLink({ to, icon: Icon, label, isSubItem }: { to: string, icon: any, label: string, isSubItem?: boolean }) {
  const location = useLocation();
  
  // Custom active check that accounts for query parameters
  const isActive = useMemo(() => {
    const [path, query] = to.split('?');
    const matchesPath = location.pathname === path;
    
    if (!query) {
      return matchesPath && (location.search === "" || location.search === "?");
    }
    
    const searchParams = new URLSearchParams(location.search);
    const [key, val] = query.split('=');
    return matchesPath && searchParams.get(key) === val;
  }, [location, to]);

  return (
    <NavLink 
      to={to} 
      className={() => `nav-item${isActive ? ' active' : ''}${isSubItem ? ' sub-item' : ''}`}
    >
      <Icon size={isSubItem ? 15 : 18} style={{ minWidth: isSubItem ? '15px' : '18px' }} />
      <span style={{ flex: 1, lineHeight: '1.4' }}>{label}</span>
    </NavLink>
  );
}
