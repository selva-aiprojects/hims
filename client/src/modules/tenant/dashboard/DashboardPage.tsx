import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ReactECharts from 'echarts-for-react';
import Sidebar from "../../../components/Sidebar";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { 
  Users, Calendar, FileText, Pill, Activity, TrendingUp, 
  AlertCircle, ChevronRight, HeartPulse, BarChart3, Clock, FlaskConical, Bell, Zap, LogOut, ChevronDown, Bed, FileCheck
} from 'lucide-react';

import DoctorDashboardPage from "./DoctorDashboardPage";

export default function DashboardPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  
  if (role === "doctor") {
    return <DoctorDashboardPage />;
  }

  const plan = (localStorage.getItem("tenantPlan") || "basic").toLowerCase();
  const [userName] = useState(localStorage.getItem("userName") || "Dr. Mrutyunjaya");
  const [stats, setStats] = useState<any>({
    metrics: { patientInflow: 18, activeAdmissions: 38, pendingBills: 3, dailyRevenue: 8450 },
    ipOpRatio: { op_count: 32450, ip_count: 62200 },
    stockAlerts: [
      { name: "HbA1c Kit", stock_quantity: 2 }
    ],
    bedStats: [
      { status: "Occupied", count: 38 },
      { status: "Available", count: 8 },
      { status: "Cleaning", count: 2 },
      { status: "Maintenance", count: 2 }
    ],
    labStats: [
      { status: "Haematology", count: 12 },
      { status: "Biochemistry", count: 8 },
      { status: "Microbiology", count: 6 },
      { status: "Serology", count: 10 }
    ],
    dischargeTrend: [
      { date: "2026-05-14", admitted: 3, discharged: 2 },
      { date: "2026-05-15", admitted: 5, discharged: 4 },
      { date: "2026-05-16", admitted: 4, discharged: 3 },
      { date: "2026-05-17", admitted: 6, discharged: 5 },
      { date: "2026-05-18", admitted: 4, discharged: 2 },
      { date: "2026-05-19", admitted: 7, discharged: 6 },
      { date: "2026-05-20", admitted: 4, discharged: 2 }
    ],
    weeklyFlow: [
      { date: "2026-05-14", count: 12 },
      { date: "2026-05-15", count: 15 },
      { date: "2026-05-16", count: 18 },
      { date: "2026-05-17", count: 14 },
      { date: "2026-05-18", count: 22 },
      { date: "2026-05-19", count: 19 },
      { date: "2026-05-20", count: 18 }
    ],
    predictive: {
      complexityMix: [
        { name: "Routine", value: 65 },
        { name: "Moderate", value: 25 },
        { name: "Severe", value: 10 }
      ],
      predictedAvgTime: 15,
      workloadForecast: []
    }
  });

  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [upgradeModal, setUpgradeModal] = useState<{ isOpen: boolean; tier: string }>({ isOpen: false, tier: "" });
  const [activeApptTab, setActiveApptTab] = useState<'upcoming' | 'inprogress' | 'completed' | 'cancelled'>('upcoming');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const tenant = localStorage.getItem("tenant");
        const res = await axios.get(`${API_BASE}/api/hospital/metrics/stats`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenant }
        });
        if (res.data) {
          setStats((prev: any) => ({
            ...prev,
            metrics: {
              ...prev.metrics,
              patientInflow: res.data.metrics?.patientInflow || prev.metrics.patientInflow,
              activeAdmissions: res.data.metrics?.activeAdmissions || prev.metrics.activeAdmissions,
              pendingBills: res.data.metrics?.pendingBills || prev.metrics.pendingBills,
              dailyRevenue: res.data.metrics?.dailyRevenue || prev.metrics.dailyRevenue,
            },
            stockAlerts: res.data.stockAlerts?.length ? res.data.stockAlerts : prev.stockAlerts,
            bedStats: res.data.bedStats?.length ? res.data.bedStats : prev.bedStats,
            labStats: res.data.labStats?.length ? res.data.labStats : prev.labStats,
            dischargeTrend: res.data.dischargeTrend?.length ? res.data.dischargeTrend : prev.dischargeTrend,
            weeklyFlow: res.data.weeklyFlow?.length ? res.data.weeklyFlow : prev.weeklyFlow,
            predictive: {
              ...prev.predictive,
              complexityMix: res.data.predictive?.complexityMix?.length ? res.data.predictive.complexityMix : prev.predictive.complexityMix,
              predictedAvgTime: res.data.predictive?.predictedAvgTime || prev.predictive.predictedAvgTime,
            }
          }));
        }
      } catch (err: any) {
        console.error("Stats Fetch Error:", err);
      } finally {
        setTimeout(() => setLoading(false), 500); 
      }
    };
    fetchStats();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // --- CHART OPTIONS ---
  const revenueSnapshotOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['60%', '80%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: 4200, name: 'Consultation' },
        { value: 2850, name: 'Pharmacy' },
        { value: 1100, name: 'Lab & Diagnostics' },
        { value: 300, name: 'Others' }
      ],
      color: ['#3b82f6', '#10b981', '#f59e0b', '#7c3aed']
    }]
  };

  const genderOption = {
    series: [{
      type: 'pie',
      radius: ['60%', '85%'],
      label: { show: false },
      data: [
        { value: 60, name: 'Male' },
        { value: 40, name: 'Female' }
      ],
      color: ['#3b82f6', '#ec4899']
    }]
  };

  const labRevenueOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '0%', right: '0%', top: '10%', bottom: '0%' },
    xAxis: { type: 'category', data: ['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'], show: false },
    yAxis: { type: 'value', show: false },
    series: [{
      data: [150, 450, 800, 500, 1100],
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: '#10b981' },
      areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }
    }]
  };

  const bedDoughnutOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['60%', '80%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: 38, name: 'Occupied' },
        { value: 8, name: 'Available' },
        { value: 2, name: 'Cleaning' },
        { value: 2, name: 'Maintenance' }
      ],
      color: ['#3b82f6', '#10b981', '#f59e0b', '#7c3aed']
    }]
  };

  const professionalRevenueOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '0%', right: '0%', top: '10%', bottom: '0%' },
    xAxis: { type: 'category', data: ['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'], show: false },
    yAxis: { type: 'value', show: false },
    series: [{
      data: [20000, 45000, 95000, 70000, 125430],
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 3, color: '#10b981' },
      areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }
    }]
  };

  // Glassmorphic Premium Teaser Card
  const renderTeaser = (title: string, targetTier: 'standard' | 'professional', icon: any) => {
    const Icon = icon;
    return (
      <div className="stat-card font-sans" style={{
        position: 'relative',
        padding: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '220px',
        width: '100%'
      }}>
        <div style={{ filter: 'blur(3px)', opacity: 0.15, userSelect: 'none', flex: 1, pointerEvents: 'none' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
          <div style={{ height: '60px', background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)', borderRadius: '12px', marginBottom: '12px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ height: '10px', width: '80%', background: '#94a3b8', borderRadius: '4px' }} />
            <div style={{ height: '10px', width: '50%', background: '#cbd5e1', borderRadius: '4px' }} />
          </div>
        </div>

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          textAlign: 'center',
          zIndex: 10
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px',
            boxShadow: '0 6px 12px -3px rgba(229, 46, 113, 0.3)'
          }}>
            <Icon size={16} />
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 900, color: '#0f172a' }}>{title}</h4>
          <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#475569', fontWeight: 700, maxWidth: '180px' }}>
            Available in **{targetTier.toUpperCase()}**
          </p>
          <button
            onClick={() => setUpgradeModal({ isOpen: true, tier: targetTier })}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 8px rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Zap size={10} /> UNLOCK
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout" style={{ backgroundColor: '#f8fafc', display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: isMobile ? '16px' : '32px 40px', backgroundColor: '#f8fafc', flex: 1, overflowX: 'hidden' }}>
        
        {/* TOP BRANDING HEADER BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Welcome, {userName}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Authorized Session: {userName}</span>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: 800, 
                color: plan === 'basic' ? '#2563eb' : plan === 'standard' ? '#0d9488' : '#7c3aed', 
                backgroundColor: plan === 'basic' ? '#eff6ff' : plan === 'standard' ? '#ecfdf5' : '#f5f3ff',
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: plan === 'basic' ? '#2563eb' : plan === 'standard' ? '#0d9488' : '#7c3aed' }} />
                Wellness {plan}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
              <Calendar size={16} />
              <span>Today, 12 May 2024</span>
              <ChevronDown size={14} />
            </div>

            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '12px' }}>
              {['basic', 'standard', 'professional'].map((t) => (
                <button 
                  key={t}
                  onClick={() => {
                    localStorage.setItem('tenantPlan', t);
                    window.location.reload();
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    backgroundColor: plan === t ? '#ffffff' : 'transparent',
                    color: plan === t ? '#0f172a' : '#64748b',
                    boxShadow: plan === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

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
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={12} />
              LOGOUT
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BASIC TIER VIEW */}
        {/* ========================================================================= */}
        {plan === 'basic' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: "Today's Appointments", val: "18", trend: "12% vs yesterday", isUp: true, icon: Calendar, color: "#3b82f6", bg: "#eff6ff" },
                { label: "Patients Checked-In", val: "11", trend: "10% vs yesterday", isUp: true, icon: Users, color: "#f59e0b", bg: "#fffbeb" },
                { label: "Pending Bills", val: "3", trend: "25% vs yesterday", isUp: true, icon: FileText, color: "#ef4444", bg: "#fef2f2" },
                { label: "Revenue Today", val: "₹8,450", trend: "18% vs yesterday", isUp: true, icon: TrendingUp, color: "#10b981", bg: "#f0fdf4" },
                { label: "Prescriptions Issued", val: "12", trend: "9% vs yesterday", isUp: true, icon: Stethoscope, color: "#7c3aed", bg: "#f5f3ff" },
                { label: "Avg. Waiting Time", val: "15m", trend: "5m vs yesterday", isUp: true, icon: Clock, color: "#0d9488", bg: "#f0fdf4" }
              ].map((card, idx) => (
                <div key={idx} className="stat-card" style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <card.icon size={18} />
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{card.val}</div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                    {card.label.includes("Time") || card.label.includes("Bills") ? "↓" : "↑"} {card.trend}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
              <div className="page-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Activity size={18} style={{ color: '#3b82f6' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live OPD Queue</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Current Token</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>OPD-006</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Patients Waiting</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>4</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Avg. Wait Time</div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>15m</div>
                    </div>
                  </div>

                  <div style={{ position: 'relative', padding: '10px 0' }}>
                    <div style={{ position: 'absolute', top: '16px', left: '10px', right: '10px', height: '3px', backgroundColor: '#e2e8f0', zIndex: 1 }}></div>
                    <div style={{ position: 'absolute', top: '16px', left: '10px', width: '66%', height: '3px', backgroundColor: '#3b82f6', zIndex: 1 }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                      {[
                        { name: 'Registered', val: '6', active: true },
                        { name: 'In Queue', val: '4', active: true },
                        { name: 'In Consult', val: '1', active: true },
                        { name: 'Completed', val: '11', active: false }
                      ].map((step, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '50%', 
                            backgroundColor: step.active ? '#3b82f6' : '#cbd5e1',
                            border: '2px solid #ffffff',
                            boxShadow: '0 0 0 2px ' + (step.active ? '#3b82f6' : '#cbd5e1'),
                            marginBottom: '6px'
                          }} />
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>{step.name}</span>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: step.active ? '#3b82f6' : '#64748b', marginTop: '2px' }}>{step.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ecfdf5', padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1fae5', color: '#065f46', fontSize: '12px', fontWeight: 700 }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    Next Token: <strong style={{ fontWeight: 900 }}>OPD-007</strong>
                  </div>
                </div>
              </div>

              <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Today's Appointments</h3>
                  <button onClick={() => navigate('/tenant/appointments/doctor-calendar?tab=Operational+Calendar')} style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer' }}>
                    View Calendar
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px', overflowX: 'auto' }}>
                  {[
                    { key: 'upcoming', label: 'Upcoming', count: 7, color: '#059669', bg: '#ecfdf5' },
                    { key: 'inprogress', label: 'In Progress', count: 1, color: '#2563eb', bg: '#eff6ff' },
                    { key: 'completed', label: 'Completed', count: 10, color: '#7c3aed', bg: '#f5f3ff' },
                    { key: 'cancelled', label: 'Cancelled', count: 0, color: '#dc2626', bg: '#fef2f2' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveApptTab(tab.key as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: activeApptTab === tab.key ? tab.color : '#64748b',
                        backgroundColor: activeApptTab === tab.key ? tab.bg : '#f8fafc',
                        border: activeApptTab === tab.key ? `1px solid ${tab.color}30` : '1px solid #e2e8f0',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tab.label} <span style={{ fontSize: '9px', backgroundColor: activeApptTab === tab.key ? '#ffffff' : '#e2e8f0', color: activeApptTab === tab.key ? tab.color : '#64748b', padding: '1px 6px', borderRadius: '10px' }}>{tab.count}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {[
                    { time: '10:00 AM', name: 'Ramesh Kumar', type: 'Follow-up', status: 'Upcoming', tab: 'upcoming', badgeColor: '#10b981', badgeBg: '#ecfdf5' },
                    { time: '10:30 AM', name: 'Priya Sharma', type: 'Consultation', status: 'Upcoming', tab: 'upcoming', badgeColor: '#10b981', badgeBg: '#ecfdf5' },
                    { time: '11:00 AM', name: 'Anita Desai', type: 'Consultation', status: 'In Progress', tab: 'inprogress', badgeColor: '#3b82f6', badgeBg: '#eff6ff' },
                    { time: '11:30 AM', name: 'Vikram Singh', type: 'Follow-up', status: 'Upcoming', tab: 'upcoming', badgeColor: '#10b981', badgeBg: '#ecfdf5' },
                    { time: '12:00 PM', name: 'Neha Patel', type: 'Consultation', status: 'Upcoming', tab: 'upcoming', badgeColor: '#10b981', badgeBg: '#ecfdf5' },
                    { time: '02:00 PM', name: 'Rajesh Mehta', type: 'Follow-up', status: 'Completed', tab: 'completed', badgeColor: '#7c3aed', badgeBg: '#f5f3ff' },
                    { time: '02:30 PM', name: 'Karan Johar', type: 'Consultation', status: 'Completed', tab: 'completed', badgeColor: '#7c3aed', badgeBg: '#f5f3ff' },
                  ]
                    .filter((appt) => appt.tab === activeApptTab)
                    .map((appt, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', width: '60px' }}>{appt.time}</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{appt.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{appt.type}</span>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: appt.badgeColor, backgroundColor: appt.badgeBg, padding: '2px 8px', borderRadius: '6px' }}>{appt.status}</span>
                        </div>
                      </div>
                    ))}
                </div>
                <button onClick={() => navigate('/tenant/appointments')} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 800, color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer', marginTop: '16px', padding: 0 }}>
                  View all appointments →
                </button>
              </div>

              <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Revenue Snapshot</h3>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>Today</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <div style={{ width: '110px', height: '110px', position: 'relative' }}>
                    <ReactECharts option={revenueSnapshotOption} style={{ height: '110px', width: '110px' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Total</span>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>₹8,450</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    {[
                      { name: 'Consultation', val: '₹4,200', pct: '49%', color: '#3b82f6' },
                      { name: 'Pharmacy', val: '₹2,850', pct: '34%', color: '#10b981' },
                      { name: 'Lab & Diagnostics', val: '₹1,100', pct: '13%', color: '#f59e0b' },
                      { name: 'Others', val: '₹300', pct: '4%', color: '#7c3aed' }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color }} />
                          <span style={{ color: '#64748b', fontWeight: 700 }}>{item.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                          <span>{item.val}</span>
                          <span style={{ color: '#94a3b8' }}>{item.pct}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => navigate('/tenant/reports')} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 800, color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer', marginTop: '16px', padding: 0 }}>
                  View full report →
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
              <div className="page-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Patient Insights</h3>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>Today</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>New Patients</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>6</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Returning</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>12</div>
                    </div>
                  </div>

                  <div style={{ width: '90px', height: '90px', position: 'relative', margin: '0 auto' }}>
                    <ReactECharts option={genderOption} style={{ height: '90px', width: '90px' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>18</span>
                      <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 800 }}>TOTAL</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                      <span>Male: 60%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ec4899' }} />
                      <span>Female: 40%</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Top Visited For</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { name: 'Fever', count: 5 },
                      { name: 'Cough', count: 4 },
                      { name: 'Diabetes', count: 3 },
                      { name: 'BP', count: 2 }
                    ].map((tag, idx) => (
                      <span key={idx} style={{ fontSize: '11px', fontWeight: 800, color: '#475569', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                        {tag.name} <span style={{ color: '#94a3b8', marginLeft: '2px' }}>{tag.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="page-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Recent Patients</h3>
                  <button onClick={() => navigate('/tenant/clinical/patient-register')} style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer' }}>
                    View all
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { name: 'Ramesh Kumar', initial: 'R', token: 'OPD-005', time: '10:15 AM', avatarBg: '#eff6ff', avatarColor: '#3b82f6' },
                    { name: 'Priya Sharma', initial: 'P', token: 'OPD-004', time: '09:45 AM', avatarBg: '#f5f3ff', avatarColor: '#7c3aed' },
                    { name: 'Anita Desai', initial: 'A', token: 'OPD-003', time: '09:20 AM', avatarBg: '#fffbeb', avatarColor: '#d97706' },
                    { name: 'Vikram Singh', initial: 'V', token: 'OPD-002', time: '09:00 AM', avatarBg: '#f0fdf4', avatarColor: '#16a34a' },
                    { name: 'Neha Patel', initial: 'N', token: 'OPD-001', time: '08:30 AM', avatarBg: '#fef2f2', avatarColor: '#dc2626' }
                  ].map((pat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: pat.avatarBg, color: pat.avatarColor, display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 800 }}>
                          {pat.initial}
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{pat.name}</div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>{pat.token}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{pat.time}</span>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '4px' }}>Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="page-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Add Appt', icon: Calendar, color: '#10b981', bg: '#ecfdf5', path: '/tenant/appointments/doctor-calendar?tab=Operational+Calendar' },
                    { label: 'Register', icon: Users, color: '#3b82f6', bg: '#eff6ff', path: '/tenant/clinical/patient-register' },
                    { label: 'Create Bill', icon: FileText, color: '#7c3aed', bg: '#f5f3ff', path: '/billing' },
                    { label: 'Prescription', icon: Stethoscope, color: '#f59e0b', bg: '#fffbeb', path: '/tenant/opd/consultation' },
                    { label: 'Add Pay', icon: FileCheck, color: '#0d9488', bg: '#f0fdf4', path: '/billing' },
                    { label: 'Reports', icon: BarChart3, color: '#3b82f6', bg: '#eff6ff', path: '/tenant/reports' }
                  ].map((act, idx) => (
                    <button 
                      key={idx}
                      onClick={() => navigate(act.path)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '12px 6px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: act.bg, color: act.color, display: 'grid', placeItems: 'center' }}>
                        <act.icon size={16} />
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#475569', textAlign: 'center', lineHeight: '1.2' }}>{act.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Unlock Standard & Professional Capabilities</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px' }}>
                {renderTeaser('Pharmacy Inventory & Expiries', 'standard', Pill)}
                {renderTeaser('Laboratory Information Management', 'standard', FlaskConical)}
                {renderTeaser('Live Ward Beds Mapping (IPD)', 'professional', Bed)}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROFESSIONAL TIER VIEW */}
        {/* ========================================================================= */}
        {(plan === 'professional' || plan === 'enterprise') && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(7, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: "Today's Appointments", val: "18", trend: "12% vs yesterday", isUp: true, icon: Calendar, color: "#3b82f6", bg: "#eff6ff" },
                { label: "Patients Checked-In", val: "11", trend: "10% vs yesterday", isUp: true, icon: Users, color: "#f59e0b", bg: "#fffbeb" },
                { label: "Admissions Today", val: "4", trend: "33% vs yesterday", isUp: true, icon: Bed, color: "#10b981", bg: "#f0fdf4" },
                { label: "Discharges Today", val: "2", trend: "25% vs yesterday", isUp: true, icon: Bed, color: "#0d9488", bg: "#f0fdf4" },
                { label: "Bed Occupancy", val: "76%", trend: "4% vs yesterday", isUp: true, icon: FileCheck, color: "#7c3aed", bg: "#f5f3ff" },
                { label: "Today's Revenue", val: "₹1,25,430", trend: "18% vs yesterday", isUp: true, icon: TrendingUp, color: "#10b981", bg: "#f0fdf4" },
                { label: "Pending Bills", val: "7", trend: "12% vs yesterday", isUp: true, icon: FileText, color: "#ef4444", bg: "#fef2f2" }
              ].map((card, idx) => (
                <div key={idx} className="stat-card" style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <card.icon size={18} />
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{card.val}</div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                    {card.label.includes("Time") || card.label.includes("Bills") ? "↓" : "↑"} {card.trend}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
              <div className="page-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hospital Operations Overview</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { label: 'Avg. Length of Stay', val: '3.6 Days', trend: '↓ 0.3', isGood: true },
                    { label: 'Active Patients', val: '38', trend: '↑ 5', isGood: true },
                    { label: 'ICU Occupancy', val: '75%', trend: '↑ 6%', isGood: false },
                    { label: 'Emergency Admissions', val: '2', trend: 'Today', isGood: true },
                    { label: 'Readmissions', val: '1', trend: 'Today', isGood: false },
                    { label: 'OT Utilization', val: '62%', trend: 'Today', isGood: true }
                  ].map((item, idx) => (
                    <div key={idx} style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{item.val}</span>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981' }}>
                          {item.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bed Management Overview</h3>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '110px', height: '110px', position: 'relative' }}>
                    <ReactECharts option={bedDoughnutOption} style={{ height: '110px', width: '110px' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 800 }}>Total Beds</span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>50</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    {[
                      { name: 'Occupied', count: 38, pct: '76%', color: '#3b82f6' },
                      { name: 'Available', count: 8, pct: '16%', color: '#10b981' },
                      { name: 'Cleaning', count: 2, pct: '4%', color: '#f59e0b' },
                      { name: 'Maintenance', count: 2, pct: '4%', color: '#7c3aed' }
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color }} />
                          <span style={{ color: '#64748b', fontWeight: 700 }}>{item.name}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{item.count} ({item.pct})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'General Ward', val: '32/40', pct: 80, color: '#3b82f6' },
                    { label: 'Private Rooms', val: '4/6', pct: 67, color: '#10b981' },
                    { label: 'ICU Beds', val: '3/4', pct: 75, color: '#7c3aed' }
                  ].map((ward, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                        <span>{ward.label}</span>
                        <span>{ward.val} ({ward.pct}%)</span>
                      </div>
                      <div style={{ height: '5px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: ward.color, width: `${ward.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IPD Summary (Today)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
                  {[
                    { label: 'Admissions', val: '4', desc: 'Patients admitted today' },
                    { label: 'Discharges', val: '2', desc: 'Patients discharged today' },
                    { label: 'Active Patients', val: '38', desc: 'Currently in ward' },
                    { label: 'Avg. Length of Stay', val: '3.6 Days', desc: 'Average hospital stay' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{item.label}</span>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>{item.desc}</span>
                      </div>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
              <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Today's Appointments</h3>
                  <button onClick={() => navigate('/tenant/appointments/doctor-calendar?tab=Operational+Calendar')} style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer' }}>
                    View Calendar
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px', overflowX: 'auto' }}>
                  {[
                    { key: 'upcoming', label: 'Upcoming', count: 7, color: '#059669', bg: '#ecfdf5' },
                    { key: 'inprogress', label: 'In Progress', count: 1, color: '#2563eb', bg: '#eff6ff' },
                    { key: 'completed', label: 'Completed', count: 10, color: '#7c3aed', bg: '#f5f3ff' },
                    { key: 'cancelled', label: 'Cancelled', count: 0, color: '#dc2626', bg: '#fef2f2' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveApptTab(tab.key as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: activeApptTab === tab.key ? tab.color : '#64748b',
                        backgroundColor: activeApptTab === tab.key ? tab.bg : '#f8fafc',
                        border: activeApptTab === tab.key ? `1px solid ${tab.color}30` : '1px solid #e2e8f0',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tab.label} <span style={{ fontSize: '9px', backgroundColor: activeApptTab === tab.key ? '#ffffff' : '#e2e8f0', color: activeApptTab === tab.key ? tab.color : '#64748b', padding: '1px 6px', borderRadius: '10px' }}>{tab.count}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {[
                    { time: '10:00 AM', name: 'Ramesh Kumar', type: 'Follow-up', status: 'Upcoming', tab: 'upcoming', badgeColor: '#10b981', badgeBg: '#ecfdf5' },
                    { time: '10:30 AM', name: 'Priya Sharma', type: 'Consultation', status: 'Upcoming', tab: 'upcoming', badgeColor: '#10b981', badgeBg: '#ecfdf5' },
                    { time: '11:00 AM', name: 'Anita Desai', type: 'Consultation', status: 'In Progress', tab: 'inprogress', badgeColor: '#3b82f6', badgeBg: '#eff6ff' },
                    { time: '11:30 AM', name: 'Vikram Singh', type: 'Follow-up', status: 'Upcoming', tab: 'upcoming', badgeColor: '#10b981', badgeBg: '#ecfdf5' },
                    { time: '12:00 PM', name: 'Neha Patel', type: 'Consultation', status: 'Upcoming', tab: 'upcoming', badgeColor: '#10b981', badgeBg: '#ecfdf5' },
                    { time: '02:00 PM', name: 'Rajesh Mehta', type: 'Follow-up', status: 'Completed', tab: 'completed', badgeColor: '#7c3aed', badgeBg: '#f5f3ff' },
                    { time: '02:30 PM', name: 'Karan Johar', type: 'Consultation', status: 'Completed', tab: 'completed', badgeColor: '#7c3aed', badgeBg: '#f5f3ff' },
                  ]
                    .filter((appt) => appt.tab === activeApptTab)
                    .map((appt, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', width: '60px' }}>{appt.time}</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{appt.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{appt.type}</span>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: appt.badgeColor, backgroundColor: appt.badgeBg, padding: '2px 8px', borderRadius: '6px' }}>{appt.status}</span>
                        </div>
                      </div>
                    ))}
                </div>
                <button onClick={() => navigate('/tenant/appointments')} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 800, color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer', marginTop: '16px', padding: 0 }}>
                  View all appointments →
                </button>
              </div>

              <div className="page-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IPD Overview</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Admissions', val: '4', desc: 'Today' },
                    { label: 'Discharges', val: '2', desc: 'Today' },
                    { label: 'Active Patients', val: '38', desc: 'Today' },
                    { label: 'Avg. Length of Stay', val: '3.6 Days', desc: 'Today' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{item.val} <span style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>{item.desc}</span></span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '16px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Patient Distribution</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'General Ward', val: '25', pct: 65, color: '#3b82f6' },
                      { label: 'Private Rooms', val: '8', pct: 21, color: '#10b981' },
                      { label: 'ICU', val: '3', pct: 8, color: '#7c3aed' },
                      { label: 'Day Care', val: '1', pct: 3, color: '#f59e0b' }
                    ].map((dist, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                          <span>{dist.label}</span>
                          <span>{dist.val}</span>
                        </div>
                        <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: dist.color, width: `${dist.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="page-card font-sans" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Revenue Overview (Today)</h3>
                  <button onClick={() => navigate('/tenant/reports')} style={{ border: 'none', background: 'none', color: '#3b82f6', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>View report</button>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>₹1,25,430</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>↑ 18% vs yesterday</div>
                </div>

                <div style={{ height: '80px', width: '100%', marginBottom: '16px' }}>
                  <ReactECharts option={professionalRevenueOption} style={{ height: '80px', width: '100%' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  {[
                    { name: 'OPD', val: '₹32,450', pct: '26%', color: '#3b82f6' },
                    { name: 'IPD', val: '₹62,200', pct: '50%', color: '#10b981' },
                    { name: 'Pharmacy', val: '₹18,630', pct: '15%', color: '#f59e0b' },
                    { name: 'Diagnostics', val: '₹9,150', pct: '7%', color: '#7c3aed' },
                    { name: 'Others', val: '₹3,000', pct: '2%', color: '#ec4899' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color }} />
                        <span style={{ color: '#64748b', fontWeight: 700 }}>{item.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                        <span>{item.val}</span>
                        <span style={{ color: '#94a3b8' }}>{item.pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="page-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: '0 0 24px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reports & Insights</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px' }}>
                {[
                  { title: 'Clinical Reports', desc: 'OPD, IPD, diagnosis and treatment analytics', path: '/tenant/reports', color: '#3b82f6', bg: '#eff6ff', icon: HeartPulse },
                  { title: 'Financial Reports', desc: 'Revenue, payments, outstanding and collections', path: '/billing', color: '#10b981', bg: '#ecfdf5', icon: TrendingUp },
                  { title: 'Operational Reports', desc: 'Bed occupancy, patient flow, capacity and utilization', path: '/tenant/reports', color: '#f59e0b', bg: '#fffbeb', icon: Activity },
                  { title: 'Pharmacy Reports', desc: 'Inventory, sales, expiry and purchase analytics', path: '/tenant/pharmacy', color: '#7c3aed', bg: '#f5f3ff', icon: Pill },
                  { title: 'Diagnostics Reports', desc: 'Test statistics, TAT, productivity and inventory', path: '/tenant/lab', color: '#0d9488', bg: '#f0fdf4', icon: FlaskConical },
                  { title: 'Nursing Reports', desc: 'Nursing activities, tasks and patient care summary', path: '/tenant/reports', color: '#ec4899', bg: '#fdf2f8', icon: FileText }
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '20px', 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '20px',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: card.bg, color: card.color, display: 'grid', placeItems: 'center', marginBottom: '16px' }}>
                          <Icon size={20} />
                        </div>
                        <h4 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{card.title}</h4>
                        <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b', fontWeight: 500, lineHeight: '1.4' }}>{card.desc}</p>
                      </div>
                      <button 
                        onClick={() => navigate(card.path)}
                        style={{ 
                          alignSelf: 'flex-start',
                          border: 'none', 
                          background: 'none', 
                          color: card.color, 
                          fontSize: '12px', 
                          fontWeight: 800, 
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        View report <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* PREMIUM UPGRADE CHECKOUT DIALOG MODAL */}
      {upgradeModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            padding: '32px',
            width: '460px',
            maxWidth: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 10px 20px -6px rgba(124, 58, 237, 0.4)'
            }}>
              <Zap size={26} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
              Upgrade to {upgradeModal.tier.toUpperCase()} Tier
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
              Unlock advanced operations, clinical insights, and integrated surveillance systems.
            </p>
            
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: '28px',
              textAlign: 'left',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                Included Capabilities:
              </div>
              {upgradeModal.tier === 'standard' ? (
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.4' }}>
                  <li>💊 **Pharmacy Dashboard & Inventory**: Real-time stock counts, alerts, prescription queue.</li>
                  <li>🧪 **Integrated Diagnostics & Laboratory**: Dynamic order entry and result tracking.</li>
                  <li>⚙️ **Hospital Settings Masters**: Custom configs for department, room, bed types.</li>
                </ul>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: '1.4' }}>
                  <li>🛏️ **Inpatient (IPD) Bed Map**: Fully visual ward, room, and bed layout manager.</li>
                  <li>📈 **AI Predictive Analytics**: Consultation throughput prediction, clinical workload complexity mix.</li>
                  <li>👥 **Dynamic RBAC & Staff Management**: HIPAA-compliant detailed role permissions.</li>
                  <li>💳 **Insurance Management**: Claim submissions, tracking, and settlement desk.</li>
                </ul>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  localStorage.setItem('tenantPlan', upgradeModal.tier);
                  setUpgradeModal({ isOpen: false, tier: "" });
                  window.location.reload();
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}
              >
                Activate Subscription
              </button>
              <button 
                onClick={() => setUpgradeModal({ isOpen: false, tier: "" })}
                style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
