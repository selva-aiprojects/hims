import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";

const API_BASE = "http://127.0.0.1:4000";

export default function LoginPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<"nexus" | "tenant">("tenant");
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facility, setFacility] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/api/nexus/tenants/public`).then(res => setFacilities(res.data));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const landingPage = type === "nexus" ? "/nexus/dashboard" : "/tenant/dashboard";
      const { data } = await axios.post(`${API_BASE}/api/auth/login`, {
        email, password, type, facility, landingPage
      });
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("tenant", data.tenantId);
      localStorage.setItem("tenantName", data.tenantName || "Healthezee Hospital");
      localStorage.setItem("landingPage", data.landingPage);
      localStorage.setItem("userType", data.type);
      localStorage.setItem("role", data.role || "");
      localStorage.setItem("userName", data.userName || "User");

      navigate(data.landingPage);
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ 
        width: '1040px', 
        height: '640px',
        display: 'flex', 
        background: 'white', 
        borderRadius: '32px', 
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
      }}>
        {/* LEFT: Hero Section */}
        <div style={{ 
          flex: 1, 
          background: '#0f172a', 
          padding: '60px', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle Background Pattern */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, pointerEvents: 'none' }}>
            <svg width="100%" height="100%"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" /></svg>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ marginBottom: '40px' }}>
               <BrandLogo size="md" light={true} />
            </div>

            <h1 style={{ color: 'white', fontSize: '48px', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px' }}>
              Precision Care <br/>
              <span style={{ color: '#0d9488' }}>Intelligence Platform.</span>
            </h1>
            
            <p style={{ color: '#94a3b8', fontSize: '18px', lineHeight: 1.6, marginBottom: '48px', maxWidth: '400px' }}>
              Empowering healthcare providers with modern EMR solutions and unified hospital orchestration.
            </p>

            <div style={{ display: 'flex', gap: '20px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></div>
                  HIPAA COMPLIANT
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
                  <div style={{ width: '6px', height: '6px', background: '#0d9488', borderRadius: '50%' }}></div>
                  SOC 2 CERTIFIED
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Login Form */}
        <div style={{ width: '480px', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Welcome Back</h2>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Sign in to access your healthcare workspace</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Workspace Type</label>
              <select 
                value={type} 
                onChange={(e: any) => setType(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #f1f5f9', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
              >
                <option value="tenant">Hospital Facility</option>
                <option value="nexus">Nexus Administration</option>
              </select>
            </div>

            {type === "tenant" && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Select Hospital</label>
                <select 
                  required
                  value={facility} 
                  onChange={(e) => setFacility(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #f1f5f9', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
                >
                  <option value="">Choose your facility...</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
              <input 
                required
                type="email" 
                placeholder="name@hospital.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #f1f5f9', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Password</label>
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              <input 
                required
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #f1f5f9', background: '#f8fafc', fontWeight: 600, outline: 'none' }}
              />
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600, textAlign: 'center', padding: '12px', background: '#fef2f2', borderRadius: '10px' }}>{error}</div>}

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '16px', 
                borderRadius: '14px', 
                background: '#0f172a', 
                color: 'white', 
                border: 'none', 
                fontWeight: 800, 
                fontSize: '16px', 
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
            >
              {loading ? "AUTHENTICATING..." : "SIGN IN TO WORKSPACE"}
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
               <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>POWERED BY <span style={{ color: '#0d9488', fontWeight: 900 }}>HEALTHEZEE</span></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
