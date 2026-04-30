"use client";

import axios from "axios";
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:4000";

// SVG Icons
const Icons = {
  Cross: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Facility: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="10" width="20" height="12" rx="2" />
      <path d="m9 10 3-8 3 8" />
      <path d="M6 14h.01" />
      <path d="M10 14h.01" />
      <path d="M14 14h.01" />
      <path d="M18 14h.01" />
      <path d="M6 18h.01" />
      <path d="M10 18h.01" />
      <path d="M14 18h.01" />
      <path d="M18 18h.01" />
    </svg>
  ),
  Mail: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  Lock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Eye: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
  ),
  Alert: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  ),
  Pulse: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
};

export default function Home() {
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [facilityType, setFacilityType] = useState("tenant");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [email, setEmail] = useState("admin@hmis-sys.com");
  const [password, setPassword] = useState("Admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/nexus/tenants/public`, {
          headers: {
             // Mocking auth for fetching tenants list if needed, or if it's public
             'Authorization': 'Bearer mock-token'
          }
        });
        setTenants(res.data);
        if (res.data.length > 0) {
          setSelectedTenant(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch tenants", err);
        // Fallback for demo
        setTenants([{ id: "modern-hospitals", name: "Modern Hospitals Pvt Ltd" }]);
        setSelectedTenant("modern-hospitals");
      }
    };
    fetchTenants();
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        facilityType,
        facility: facilityType === "nexus" ? "nexus" : selectedTenant,
        email,
        password,
      });

      const data = res.data;
      localStorage.setItem("token", data.token);
      localStorage.setItem("tenant", data.tenantId);
      localStorage.setItem("landingPage", data.landingPage);
      localStorage.setItem("userType", data.type);

      window.location.href = data.landingPage;
    } catch (err: any) {
      setError(err.response?.data?.error || "API request failed: 500");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Left Side */}
        <div className="login-left">
          <div>
            <div className="logo-container">
              <div className="logo-box">
                <Icons.Cross />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>healthezee</h3>
            </div>

            <h1 className="hero-title">
              <span>Next-Gen</span>
              <span className="highlight">Hospital</span>
              <span>Management</span>
              <span>System</span>
            </h1>

            <p className="hero-subtitle">
              Empowering healthcare providers with intelligent EMR solutions for
              precision care delivery and operational excellence.
            </p>
          </div>

          <div className="security-badges">
            <div className="badge">
              <div style={{ padding: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>
                <Icons.Pulse />
              </div>
              <span>HIPAA Compliant</span>
            </div>
            <div className="badge">
              <div style={{ padding: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>
                <Icons.Shield />
              </div>
              <span>SOC 2 Certified</span>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="login-right">
          <div className="form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to access your healthcare workspace</p>
          </div>

          <form onSubmit={login}>
            <div className="input-group">
              <label className="input-label">Facility Type</label>
              <div className="input-wrapper">
                <div className="input-icon"><Icons.Facility /></div>
                <select
                  className="form-select"
                  value={facilityType}
                  onChange={(e) => setFacilityType(e.target.value)}
                >
                  <option value="tenant">Tenant Facility</option>
                  <option value="nexus">Nexus Administration</option>
                </select>
              </div>
            </div>

            {facilityType === "tenant" && (
              <div className="input-group">
                <label className="input-label">Select Hospital</label>
                <div className="input-wrapper">
                  <div className="input-icon"><Icons.Facility /></div>
                  <select
                    className="form-select"
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-wrapper">
                <div className="input-icon"><Icons.Mail /></div>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ehs.com"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <div className="input-icon"><Icons.Lock /></div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8'
                  }}
                >
                  <Icons.Eye />
                </button>
              </div>
            </div>

            {error && (
              <div className="error-alert">
                <Icons.Alert />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? "SIGNING IN..." : (
                <>
                  SIGN IN TO WORKSPACE
                  <Icons.ArrowRight />
                </>
              )}
            </button>
          </form>

          <p className="footer-text">
            © 2025 healthezee. Secure healthcare platform.
          </p>
        </div>
      </div>
    </div>
  );
}
