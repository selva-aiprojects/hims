import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function SettingsPage() {
  const [primaryDark, setPrimaryDark] = useState(localStorage.getItem('theme_primary_dark') || '#0f172a');
  const [primaryAccent, setPrimaryAccent] = useState(localStorage.getItem('theme_primary_accent') || '#3b82f6');
  const [appBg, setAppBg] = useState(localStorage.getItem('theme_app_bg') || '#f8fafc');
  const [textMain, setTextMain] = useState(localStorage.getItem('theme_text_main') || '#1e293b');
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('theme_logo_url') || '');

  const applyTheme = () => {
    localStorage.setItem('theme_primary_dark', primaryDark);
    localStorage.setItem('theme_primary_accent', primaryAccent);
    localStorage.setItem('theme_app_bg', appBg);
    localStorage.setItem('theme_text_main', textMain);
    localStorage.setItem('theme_logo_url', logoUrl);

    document.documentElement.style.setProperty('--primary-dark', primaryDark);
    document.documentElement.style.setProperty('--primary-accent', primaryAccent);
    document.documentElement.style.setProperty('--app-bg', appBg);
    document.documentElement.style.setProperty('--text-main', textMain);
    
    alert("Theme settings saved and applied successfully!");
  };

  const resetTheme = () => {
    setPrimaryDark('#0f172a');
    setPrimaryAccent('#3b82f6');
    setAppBg('#f8fafc');
    setTextMain('#1e293b');
    setLogoUrl('');

    localStorage.removeItem('theme_primary_dark');
    localStorage.removeItem('theme_primary_accent');
    localStorage.removeItem('theme_app_bg');
    localStorage.removeItem('theme_text_main');
    localStorage.removeItem('theme_logo_url');

    document.documentElement.style.setProperty('--primary-dark', '#0f172a');
    document.documentElement.style.setProperty('--primary-accent', '#3b82f6');
    document.documentElement.style.setProperty('--app-bg', '#f8fafc');
    document.documentElement.style.setProperty('--text-main', '#1e293b');
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Theme Settings" />

        <div className="form-card" style={{ maxWidth: '600px' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">Platform Appearance</h2>
              <p className="section-subtitle">Customize the colors and background of the Clinical Management Desk.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="field-label">Custom Hospital Logo URL</label>
              <input 
                type="text" 
                placeholder="https://example.com/logo.png"
                className="input-field" 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)} 
              />
              <p className="help-text">Leave blank to use dynamic initial logo</p>
            </div>

            <div>
              <label className="field-label">Primary Brand / Sidebar Color</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={primaryDark} 
                  onChange={(e) => setPrimaryDark(e.target.value)} 
                  style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }} 
                />
                <input 
                  type="text" 
                  className="input-field" 
                  value={primaryDark} 
                  onChange={(e) => setPrimaryDark(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="field-label">Primary Accent (Buttons & Highlights)</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={primaryAccent} 
                  onChange={(e) => setPrimaryAccent(e.target.value)} 
                  style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }} 
                />
                <input 
                  type="text" 
                  className="input-field" 
                  value={primaryAccent} 
                  onChange={(e) => setPrimaryAccent(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="field-label">App Background Color</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={appBg} 
                  onChange={(e) => setAppBg(e.target.value)} 
                  style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }} 
                />
                <input 
                  type="text" 
                  className="input-field" 
                  value={appBg} 
                  onChange={(e) => setAppBg(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="field-label">Main Text Color</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="color" 
                  value={textMain} 
                  onChange={(e) => setTextMain(e.target.value)} 
                  style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }} 
                />
                <input 
                  type="text" 
                  className="input-field" 
                  value={textMain} 
                  onChange={(e) => setTextMain(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
              <button className="button-primary" onClick={applyTheme} style={{ flex: 1 }}>Save Theme Setup</button>
              <button className="button-secondary" onClick={resetTheme}>Reset to Default</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
