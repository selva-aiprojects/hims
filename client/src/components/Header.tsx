import { useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { applyTheme } from "../config/theme";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "User";
  const tenantName = localStorage.getItem("tenantName") || "Healthezee Hospital";

  const handleLogout = () => {
    localStorage.clear();
    applyTheme(); // Reset to platform defaults
    navigate("/");
  };

  return (
    <header className="dashboard-header">
      {/* Navigation Controls - Absolute Left */}
      <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          className="hamburger-menu"
          onClick={() => {
            document.querySelector('.sidebar')?.classList.add('mobile-open');
            document.querySelector('.mobile-overlay')?.classList.add('active');
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="7" x2="20" y2="7"></line>
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="17" x2="20" y2="17"></line>
          </svg>
        </button>
      </div>

      {/* Primary Command Center - Centered */}
      <div className="welcome-msg">
        <h1>{title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
          <p className="help-text" style={{ margin: 0 }}>Authorized Session: <span style={{ fontWeight: 800, color: '#10b981' }}>{userName}</span></p>
          <div style={{ width: '1px', height: '14px', background: '#e2e8f0' }}></div>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{ width: '6px', height: '6px', background: '#0d9488', borderRadius: '50%' }}></div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tenantName}</span>
          </div>
        </div>
      </div>

      {/* Profile & Identity - Absolute Right */}
      <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'right', display: 'none' }}> {/* Hide on desktop to keep it super clean */}
          <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{userName}</p>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Clinical Staff</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <div style={{ 
            transform: 'scale(0.55)', 
            transformOrigin: 'right center',
            opacity: 0.5,
            marginBottom: '-4px'
          }}>
            <BrandLogo size="sm" />
          </div>
          <button 
            onClick={handleLogout}
            className="button-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 800
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
}
