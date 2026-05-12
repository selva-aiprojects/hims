import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="dashboard-header" style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '20px' : '0 40px',
      gap: isMobile ? '16px' : '0',
      minHeight: isMobile ? 'auto' : '100px',
      position: 'relative'
    }}>
      {/* Navigation Controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        width: isMobile ? '100%' : 'auto',
        justifyContent: isMobile ? 'space-between' : 'flex-start',
        order: isMobile ? 1 : 0
      }}>
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

        {isMobile && (
          <div style={{ transform: 'scale(0.8)', transformOrigin: 'right center' }}>
            <BrandLogo size="sm" />
          </div>
        )}
      </div>

      {/* Primary Command Center */}
      <div className="welcome-msg" style={{ 
        textAlign: 'center', 
        order: isMobile ? 2 : 0,
        margin: isMobile ? '0' : '0 auto'
      }}>
        <h1 style={{ fontSize: isMobile ? '24px' : '36px' }}>{title}</h1>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '12px', 
          marginTop: '8px',
          flexWrap: 'wrap'
        }}>
          <p className="help-text" style={{ margin: 0 }}>Authorized Session: <span style={{ fontWeight: 800, color: '#10b981' }}>{userName}</span></p>
          <div style={{ width: '1px', height: '14px', background: '#e2e8f0', display: isMobile ? 'none' : 'block' }}></div>
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

      {/* Profile & Identity */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px',
        order: isMobile ? 3 : 0,
        width: isMobile ? '100%' : 'auto',
        justifyContent: isMobile ? 'center' : 'flex-end'
      }}>
        {!isMobile && (
          <div style={{ 
            transform: 'scale(0.55)', 
            transformOrigin: 'right center',
            opacity: 0.5,
            marginBottom: '-4px'
          }}>
            <BrandLogo size="sm" />
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="button-secondary"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            padding: '8px 16px',
            fontSize: '11px',
            fontWeight: 800,
            borderRadius: '12px'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          LOGOUT
        </button>
      </div>
    </header>
  );
}
