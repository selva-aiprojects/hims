import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import { API_BASE_URL as API_BASE } from "../../config/api";
import { applyTheme as applyThemeUtil } from "../../config/theme";

export default function SettingsPage() {
  const [hospitalName, setHospitalName] = useState(localStorage.getItem('tenantName') || 'Healthezee Hospital');
  const [primaryDark, setPrimaryDark] = useState(localStorage.getItem('theme_primary_dark') || '#0f172a');
  const [primaryAccent, setPrimaryAccent] = useState(localStorage.getItem('theme_primary_accent') || '#3b82f6');
  const [appBg, setAppBg] = useState(localStorage.getItem('theme_app_bg') || '#f8fafc');
  const [textMain, setTextMain] = useState(localStorage.getItem('theme_text_main') || '#1e293b');
  const [fontSize, setFontSize] = useState(localStorage.getItem('theme_font_size') || '14');
  const [logoUrl, setLogoUrl] = useState(localStorage.getItem('theme_logo_url') || '');
  
  // Hero Settings
  const [heroBg, setHeroBg] = useState(localStorage.getItem('theme_hero_bg') || '#ffffff');
  const [heroText, setHeroText] = useState(localStorage.getItem('theme_hero_text') || '#0f172a');

  const applyTheme = async () => {
    const tenantId = localStorage.getItem('tenant');
    if (tenantId) {
       try {
         await axios.put(`${API_BASE}/api/nexus/tenants/${tenantId}/branding`, {
           hospitalName, primaryDark, primaryAccent, appBg, textMain, fontSize, logoUrl, heroBg, heroText
         }, {
           headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
         });
       } catch (err) {
         console.error("Failed to sync branding to server:", err);
       }
    }
    localStorage.setItem('tenantName', hospitalName);
    localStorage.setItem('theme_primary_dark', primaryDark);
    localStorage.setItem('theme_primary_accent', primaryAccent);
    localStorage.setItem('theme_app_bg', appBg);
    localStorage.setItem('theme_text_main', textMain);
    localStorage.setItem('theme_font_size', fontSize);
    localStorage.setItem('theme_logo_url', logoUrl);
    localStorage.setItem('theme_hero_bg', heroBg);
    localStorage.setItem('theme_hero_text', heroText);
    
    // Apply theme globally using utility
    applyThemeUtil();
    
    alert("Branding settings saved! Please refresh the page to see the full effect.");
    window.location.reload(); // Refresh to update name everywhere
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Hospital Branding & UI" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '24px' }}>
          <div className="form-card">
            <h3 style={{ marginBottom: '20px', fontWeight: 800 }}>General Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="field-label">Hospital Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={hospitalName} 
                  onChange={(e) => setHospitalName(e.target.value)} 
                />
              </div>
              <div>
                <label className="field-label">Custom Logo URL</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/logo.png"
                  className="input-field" 
                  value={logoUrl} 
                  onChange={(e) => setLogoUrl(e.target.value)} 
                />
              </div>
              <div>
                <label className="field-label">Base Font Size (px)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="form-card">
            <h3 style={{ marginBottom: '20px', fontWeight: 800 }}>Theme Colors</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ColorPicker label="Sidebar / Primary Dark" value={primaryDark} onChange={setPrimaryDark} />
              <ColorPicker label="Accent / Primary Highlight" value={primaryAccent} onChange={setPrimaryAccent} />
              <ColorPicker label="Application Background" value={appBg} onChange={setAppBg} />
              <ColorPicker label="Main Text Color" value={textMain} onChange={setTextMain} />
            </div>
          </div>

          <div className="form-card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ marginBottom: '20px', fontWeight: 800 }}>Hero & Dashboard Cards Appearance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <ColorPicker label="Hero Background" value={heroBg} onChange={setHeroBg} />
              <ColorPicker label="Hero Text Color" value={heroText} onChange={setHeroText} />
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 40px', display: 'flex', gap: '16px' }}>
          <button className="button-primary" onClick={applyTheme} style={{ padding: '12px 40px' }}>Save & Apply Changes</button>
        </div>
      </main>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label className="field-label" style={{ marginBottom: 0 }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          style={{ width: '40px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} 
        />
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          style={{ width: '80px', fontSize: '12px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }} 
        />
      </div>
    </div>
  );
}
