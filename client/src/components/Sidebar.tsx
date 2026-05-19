import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import axios from "axios";
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
  ChevronDown,
  ShieldCheck,
  LifeBuoy,
  Box,
  TrendingUp
} from 'lucide-react';
import { API_BASE_URL as API_BASE } from "../config/api";

const Icons: Record<string, any> = {
  Dashboard: LayoutDashboard,
  "OPD Center": Users,
  "OPD Queue": RefreshCw,
  "Consultation Desk": Stethoscope,
  "IPD Admission Hub": Bed,
  "Bed Management": ClipboardList,
  "Diagnostic Center": FlaskConical,
  Laboratory: FlaskConical,
  "Pharmacy Hub": Pill,
  "Central Billing": Receipt,
  "Insurance & TPA": ShieldCheck,
  "Hospital Settings": Settings,
  "Staff & Access": Users,
  "Support & Tickets": LifeBuoy,
  Calendar: Calendar,
  "Clinical Intelligence": TrendingUp,
  "Patient Register": ClipboardList
};

const normalizePath = (label: string, originalPath: string) => {
  const l = label.toLowerCase();
  const overrides: Record<string, string> = {
    "opd center": "/tenant/opd/registration",
    "opd queue": "/tenant/opd/queue",
    "consultation desk": "/tenant/opd/consultation",
    "ipd admission hub": "/tenant/ipd/admission-desk",
    "bed management": "/tenant/ipd/beds",
    "discharge summaries": "/tenant/ipd/discharge",
    "doctor's schedule": "/tenant/appointments/doctor-calendar?tab=Booking+%26+Operations",
    "appointment list": "/tenant/appointments",
    "diagnostic center": "/tenant/lab",
    "laboratory": "/tenant/lab",
    "ai lab assistant": "/tenant/lab/ai",
    "pharmacy hub": "/tenant/pharmacy",
    "pharmacy dashboard": "/tenant/pharmacy/dashboard",
    "stock inventory": "/tenant/pharmacy/inventory",
    "central billing": "/billing",
    "invoicing & billing": "/billing",
    "insurance & tpa": "/tenant/billing/insurance",
    "insurance management": "/tenant/billing/insurance",
    "hospital settings": "/tenant/masters",
    "staff & access": "/tenant/staff",
    "message board": "/tenant/communication",
    "clinical archives": "/tenant/archives",
    "clinical & financial archives": "/tenant/archives",
    "patient register": "/tenant/clinical/patient-register",
    "mail & communications": "/tenant/mail",
    "support & tickets": "/tenant/support",
    "ticketing management system": "/tenant/support/tickets"
  };
  return overrides[l] || originalPath;
};

export default function Sidebar() {
  const location = useLocation();
  const tenantName = localStorage.getItem("tenantName") || "Healthezee Hospital";
  const plan = (localStorage.getItem("tenantPlan") || "basic").toLowerCase();
  
  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "x-tenant-id": localStorage.getItem("tenant") || ""
  });

  const { groups, ungroupped } = useMemo(() => {
    let dm = JSON.parse(localStorage.getItem("userMenus") || "[]");
    

    
    if (!dm.some((m: any) => m.label.toLowerCase().includes("advanced scheduling console"))) {
      dm.push({ label: "Advanced Scheduling Console", path: "/tenant/appointments/doctor-calendar?tab=Weekly+Schedule", icon: "CalendarDays", sort_order: 9 });
    }
    if (!dm.some((m: any) => m.label.toLowerCase().includes("clinical & financial archives"))) {
      dm.push({ label: "Clinical & Financial Archives", path: "/tenant/archives", icon: "History", sort_order: 10 });
    }
    if (!dm.some((m: any) => m.label.toLowerCase().includes("patient register"))) {
      dm.push({ label: "Patient Register", path: "/tenant/clinical/patient-register", icon: "Patient Register", sort_order: 11 });
    }

    const labelMap: Record<string, string> = {
      "opd registration": "OPD Center",
      "opd registration desk": "OPD Center",
      "opd queue": "OPD Queue",
      "doctor's queue": "OPD Queue",
      "consultation desk": "Consultation Desk",
      "admission desk": "IPD Admission Hub",
      "ipd admission desk": "IPD Admission Hub",
      "ipd bed map": "Bed Management",
      "bed management": "Bed Management",
      "discharge summaries": "Discharge Summaries",
      "advanced scheduling console": "Doctor's Schedule",
      "enterprise scheduling console": "Doctor's Schedule",
      "laboratory": "Laboratory",
      "laboratory / diagnostics": "Laboratory",
      "lab": "Laboratory",
      "ai lab assistant": "AI Lab Assistant",
      "pharmacy dashboard": "Pharmacy Dashboard",
      "stock inventory": "Stock Inventory",
      "prescription queue": "Prescription Queue",
      "ipd census & daycare": "Bed Management",
      "ipd census": "Bed Management",
      "laboratory billing": "Central Billing",
      "pharmacy billing": "Central Billing",
      "opd billing": "Central Billing",
      "consultation billing": "Central Billing",
      "discharge billing": "Central Billing",
      "invoicing & billing": "Central Billing",
      "opd billing & revenue center": "Central Billing",
      "ipd & discharge billing": "Central Billing",
      "insurance & tpa claims": "Insurance & TPA",
      "insurance management": "Insurance & TPA",
      "branding & ui settings": "Hospital Settings",
      "hospital settings (masters)": "Hospital Settings",
      "hospital settings": "Hospital Settings",
      "operational analytics": "Hospital Settings",
      "staff & rbac": "Staff & Access",
      "user management": "Staff & Access",
      "staff management": "Staff & Access",
      "message board": "Message Board",
      "mail management": "Mail & Communications",
      "ticketing management system": "Support & Tickets",
      "help & support": "Support & Tickets",
      "patient register": "Patient Register"
    };

    const uniqueMap = new Map();
    dm.forEach(m => {
      const mappedLabel = labelMap[m.label.toLowerCase()] || m.label;
      const nPath = normalizePath(mappedLabel, m.path);
      if (!uniqueMap.has(nPath)) uniqueMap.set(nPath, { ...m, label: mappedLabel, path: nPath });
    });
    const pm = Array.from(uniqueMap.values());

    if (localStorage.getItem('isAutomation') === 'true') {
      const fallbackMenus = [
        { label: 'Central Billing', path: '/billing', icon: 'Receipt' },
        { label: 'OPD Center', path: '/tenant/opd/registration', icon: 'Users' },
        { label: 'OPD Queue', path: '/tenant/opd/queue', icon: 'RefreshCw' },
        { label: 'Prescription Queue', path: '/tenant/pharmacy/queue', icon: 'Pill' },
        { label: 'Laboratory', path: '/tenant/lab', icon: 'FlaskConical' }
      ];
      
      fallbackMenus.forEach(fm => {
        if (!pm.some((m: any) => m.label.toLowerCase() === fm.label.toLowerCase())) {
          pm.push(fm);
        }
      });
    }

    const clinicalFlow = [
      "Clinical Intelligence Hub",
      "Doctor's Schedule", "Appointment List", 
      "OPD Center", "OPD Queue", "Consultation Desk", 
      "Patient Register",
      "IPD Admission Hub", "Bed Management", "Discharge Summaries",
      "Clinical & Financial Archives"
    ];
    const serviceFlow = [
      "Laboratory", "AI Lab Assistant", 
      "Pharmacy Hub", "Pharmacy Dashboard", "Stock Inventory"
    ];
    const billingFlow = [
      "Central Billing", "Invoicing & Billing", 
      "Insurance & TPA", "Insurance Management"
    ];
    const adminFlow = [
      "Staff & Access", "Hospital Settings", 
      "Message Board", "Mail & Communications", "Support & Tickets"
    ];

    const getItems = (labels: string[]) => pm
      .filter(m => labels.some(l => l.toLowerCase() === m.label.toLowerCase()))
      .sort((a, b) => labels.findIndex(l => l.toLowerCase() === a.label.toLowerCase()) - labels.findIndex(l => l.toLowerCase() === b.label.toLowerCase()));

    const isIpdEnabled = ['professional', 'enterprise'].includes(plan);

    const gs = [
      { id: 'clinical', title: "Clinical Operations", items: getItems(clinicalFlow).filter(i => {
        if (!isIpdEnabled && ["ipd admission hub", "bed management", "discharge summaries"].includes(i.label.toLowerCase())) return false;
        return true;
      }), icon: Stethoscope },
      { id: 'services', title: "Diagnostic Services", items: getItems(serviceFlow), icon: FlaskConical },
      { id: 'billing', title: "Finance & Revenue", items: getItems(billingFlow), icon: Receipt },
      { id: 'admin', title: "System Administration", items: getItems(adminFlow), icon: Settings }
    ];

    const gLabels = new Set();
    gs.forEach(g => g.items.forEach(i => gLabels.add(i.label.toLowerCase())));
    const ug = pm.filter(m => !gLabels.has(m.label.toLowerCase()));

    return { groups: gs, ungroupped: ug };
  }, []);

  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    const activeGroup = groups.find(g => g.items.some(i => i.path === location.pathname));
    if (activeGroup) setOpenGroup(activeGroup.id);
  }, [location.pathname, groups]);

  const toggleGroup = (id: string) => setOpenGroup(prev => (prev === id ? null : id));

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
      
      <div className="sidebar" style={{ width: '280px', background: 'var(--primary-dark, #0f172a)', height: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        <button 
          className="sidebar-close" 
          onClick={() => {
            document.querySelector('.sidebar')?.classList.remove('mobile-open');
            document.querySelector('.mobile-overlay')?.classList.remove('active');
          }}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', zIndex: 1002 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div style={{ padding: '0 8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', marginTop: '40px' }}>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <img 
              src={localStorage.getItem('theme_logo_url') || "/logo.png"} 
              alt={tenantName} 
              style={{ width: '100%', height: 'auto', maxHeight: '80px', objectFit: 'contain', cursor: 'pointer' }} 
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                const parent = img.parentElement;
                if (parent) {
                  parent.innerHTML = `<div style="width:48px;height:48px;background:#0ea5e9;border-radius:12px;margin:16px auto;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:white;">${tenantName.charAt(0)}</div><h2 style="font-size:15px;font-weight:800;color:white;margin-top:12px;">${tenantName}</h2>`;
                }
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
              <span style={{ fontSize: '9px', fontWeight: 900, color: plan === 'enterprise' ? '#f59e0b' : '#38bdf8', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{plan}</span>
              <button onClick={refreshMenus} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><RefreshCw size={12} /></button>
            </div>
          </div>
        </div>

        <nav className="nav-container" style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {ungroupped.map((menu, idx) => (
            <SidebarLink key={idx} to={menu.path} icon={Icons[menu.icon] || LayoutDashboard} label={menu.label} />
          ))}

          {groups.map((group) => group.items.length > 0 && (
            <div key={group.id} style={{ marginBottom: '8px' }}>
              <button 
                onClick={() => toggleGroup(group.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'none', border: 'none', color: openGroup === group.id ? 'white' : '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: 700, borderRadius: '10px' }}
              >
                <group.icon size={18} style={{ opacity: openGroup === group.id ? 1 : 0.5 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{group.title}</span>
                <ChevronDown size={14} style={{ transform: openGroup === group.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
              </button>
              
              <div style={{ maxHeight: openGroup === group.id ? '1000px' : '0', overflow: 'hidden', transition: 'max-height 0.25s ease-out', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.05)', marginLeft: '18px' }}>
                {group.items.map((menu, mIdx) => (
                  <SidebarLink key={mIdx} to={menu.path} icon={Icons[menu.icon] || Box} label={menu.label} isSubItem />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={20} color="#0ea5e9" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>Nexus Secured</div>
              <div style={{ fontSize: '10px', color: '#475569' }}>v2.4.0 Build 102</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .nav-container {
          overflow-x: hidden;
          scrollbar-width: thin;
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
          overflow: hidden;
        }
        .nav-item span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .nav-item:hover { background: rgba(255,255,255,0.03); color: white; }
        .nav-item.active { background: rgba(255, 255, 255, 0.05); color: #38bdf8; }
        .nav-item.active::after {
          content: "";
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 3px;
          background: #38bdf8;
          border-radius: 0 4px 4px 0;
        }
      `}</style>
    </>
  );
}

function SidebarLink({ to, icon: Icon, label, isSubItem }: { to: string, icon: any, label: string, isSubItem?: boolean }) {
  const location = useLocation();
  const isActive = useMemo(() => {
    const [path, query] = to.split('?');
    const matchesPath = location.pathname === path;
    if (!query) return matchesPath && (location.search === "" || location.search === "?");
    const searchParams = new URLSearchParams(location.search);
    const [key, val] = query.split('=');
    return matchesPath && searchParams.get(key) === val;
  }, [location, to]);

  return (
    <NavLink to={to} className={() => `nav-item${isActive ? ' active' : ''}${isSubItem ? ' sub-item' : ''}`}>
      <Icon size={isSubItem ? 15 : 18} />
      <span style={{ flex: 1, lineHeight: '1.4' }}>{label}</span>
    </NavLink>
  );
}
