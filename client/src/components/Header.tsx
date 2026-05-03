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
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
        <div className="welcome-msg">
          <h1>{title}</h1>
          <p className="help-text">Logged in as <span style={{ fontWeight: 700, color: '#0d9488' }}>{userName}</span></p>
        </div>
        
        <div style={{ 
          background: 'rgba(13, 148, 136, 0.1)', 
          border: '1px solid rgba(13, 148, 136, 0.2)', 
          padding: '6px 16px', 
          borderRadius: '100px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ width: '8px', height: '8px', background: '#0d9488', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tenantName}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <div style={{ 
          transform: 'scale(0.55)', 
          transformOrigin: 'right center',
          opacity: 0.6,
          marginTop: '-10px'
        }}>
          <BrandLogo size="sm" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{userName}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Staff Account</p>
          </div>
          <button 
            onClick={handleLogout}
            className="button-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
}
