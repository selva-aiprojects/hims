import { useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "User";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <header className="dashboard-header">
      <div className="welcome-msg">
        <h1>{title}</h1>
        <p className="help-text">Logged in as <span style={{ fontWeight: 700, color: '#0d9488' }}>{userName}</span></p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ transform: 'scale(0.8)', transformOrigin: 'right center' }}>
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
