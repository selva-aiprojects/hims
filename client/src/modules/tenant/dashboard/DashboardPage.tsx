import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ReactECharts from 'echarts-for-react';
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";
import { 
  Users, Calendar, FileText, Pill, Activity, TrendingUp, 
  AlertCircle, ChevronRight, HeartPulse, PieChart, BarChart3, Clock, ArrowUpRight, FlaskConical, Bell, Zap, Plus
} from 'lucide-react';

import DoctorDashboardPage from "./DoctorDashboardPage";

export default function DashboardPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  
  if (role === "doctor") {
    return <DoctorDashboardPage />;
  }

  const plan = (localStorage.getItem("tenantPlan") || "basic").toLowerCase();

  const [userName] = useState(localStorage.getItem("userName") || "User");
  const [stats, setStats] = useState<any>({
    metrics: { patientInflow: 0, activeAdmissions: 0, pendingBills: 0, dailyRevenue: 0 },
    ipOpRatio: { op_count: 0, ip_count: 0 },
    stockAlerts: [],
    bedStats: [],
    labStats: [],
    dischargeTrend: [],
    weeklyFlow: [],
    predictive: {
      complexityMix: [],
      predictedAvgTime: 0,
      workloadForecast: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [upgradeModal, setUpgradeModal] = useState<{ isOpen: boolean; tier: string }>({ isOpen: false, tier: "" });

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
          setStats(res.data);
          setError(null);
        }
      } catch (err: any) {
        console.error("Stats Fetch Error:", err);
        setError("Failed to fetch live data");
      } finally {
        setTimeout(() => setLoading(false), 500); 
      }
    };
    fetchStats();
  }, []);

  // --- LIVE CHART CONFIGURATIONS ---
  
  // 1. IP vs OP Comparison (Pie)
  const ipOpOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['50%', '70%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: stats.ipOpRatio?.op_count || 0, name: 'Outpatient (OP)' },
        { value: stats.ipOpRatio?.ip_count || 0, name: 'Inpatient (IP)' }
      ],
      color: ['#3b82f6', '#10b981']
    }]
  };

  // 2. Discharge Comparison Trend (Line)
  const dischargeOption = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 10, fontWeight: 700 } },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true, top: '10%' },
    xAxis: { 
      type: 'category', 
      data: (stats.dischargeTrend || []).map((d: any) => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })),
      axisLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 700 }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } },
    series: [
      { name: 'Admitted', data: (stats.dischargeTrend || []).map((d: any) => d.admitted), type: 'line', smooth: true, lineStyle: { width: 3 }, color: '#3b82f6', areaStyle: { color: 'rgba(59, 130, 246, 0.1)' } },
      { name: 'Discharged', data: (stats.dischargeTrend || []).map((d: any) => d.discharged), type: 'line', smooth: true, lineStyle: { width: 3 }, color: '#10b981', areaStyle: { color: 'rgba(16, 185, 129, 0.1)' } }
    ]
  };

  // 3. Lab Performance (Pending vs Completed)
  const labOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: (stats.labStats || []).map((l: any) => l.status), axisLine: { show: false } },
    yAxis: { type: 'value', show: false },
    series: [{
      data: (stats.labStats || []).map((l: any) => l.count),
      type: 'bar', barWidth: '40%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#6366f1' }
    }]
  };

  // 3.5. Patient Flow trend (Used in Basic & Standard)
  const weeklyFlowOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true, top: '10%' },
    xAxis: { 
      type: 'category', 
      data: (stats.weeklyFlow || []).map((d: any) => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })),
      axisLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 700 }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } },
    series: [
      { 
        name: 'Patients Registered', 
        data: (stats.weeklyFlow || []).map((d: any) => d.count), 
        type: 'line', 
        smooth: true, 
        lineStyle: { width: 3 }, 
        color: '#10b981', 
        areaStyle: { color: 'rgba(16, 185, 129, 0.1)' } 
      }
    ]
  };

  // 4. Bed Occupancy
  const bedOccupancy = (stats.bedStats || []).find((b: any) => b.status === 'Occupied')?.count || 0;
  const bedTotal = (stats.bedStats || []).reduce((acc: number, b: any) => acc + b.count, 0) || 1;
  const occupancyPercent = Math.round((bedOccupancy / bedTotal) * 100);

  // 5. Workload Forecast (Predicted vs Actual)
  const workloadOption = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 10, fontWeight: 700, color: '#94a3b8' } },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true, top: '10%' },
    xAxis: { 
      type: 'category', 
      data: (stats.predictive?.workloadForecast || []).map((w: any) => w.time),
      axisLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 700 }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } },
    series: [
      { name: 'Actual Duration', data: (stats.predictive?.workloadForecast || []).map((w: any) => w.actual), type: 'line', smooth: true, lineStyle: { width: 3 }, color: '#3b82f6', areaStyle: { color: 'rgba(59, 130, 246, 0.1)' } },
      { name: 'AI Predicted', data: (stats.predictive?.workloadForecast || []).map((w: any) => w.predicted), type: 'line', smooth: true, lineStyle: { width: 3, type: 'dashed' }, color: '#10b981' }
    ]
  };

  // 6. Complexity Mix (Pie/Doughnut)
  const complexityOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: (stats.predictive?.complexityMix || []).map((c: any) => ({ value: c.value, name: c.name })),
      color: ['#10b981', '#f59e0b', '#ef4444']
    }]
  };

  // Glassmorphic Premium Teaser Card
  const renderTeaser = (title: string, features: string[], targetTier: 'standard' | 'professional', icon: any) => {
    const Icon = icon;
    return (
      <div className="stat-card" style={{
        position: 'relative',
        padding: '24px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '260px'
      }}>
        {/* Blurred background mock visual */}
        <div style={{ filter: 'blur(3px)', opacity: 0.18, userSelect: 'none', flex: 1, pointerEvents: 'none' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h4>
          <div style={{ height: '90px', background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)', borderRadius: '14px', marginBottom: '12px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ height: '12px', width: '80%', background: '#94a3b8', borderRadius: '4px' }} />
            <div style={{ height: '12px', width: '50%', background: '#cbd5e1', borderRadius: '4px' }} />
          </div>
        </div>

        {/* Glassmorphic Lock Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          zIndex: 10
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 8px 16px -4px rgba(229, 46, 113, 0.3)'
          }}>
            <Icon size={20} />
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{title}</h4>
          <p style={{ margin: '0 0 16px', fontSize: '11px', color: '#475569', fontWeight: 600, maxWidth: '200px' }}>
            Available in **{targetTier.toUpperCase()}** Subscription Plan.
          </p>
          <button
            onClick={() => setUpgradeModal({ isOpen: true, tier: targetTier })}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              border: 'none',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'transform 0.1s ease-in-out'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Zap size={12} /> UNLOCK NOW
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout" style={{ backgroundColor: '#f8fafc', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: isMobile ? '16px' : '40px', backgroundColor: '#f8fafc', flex: 1, width: '100%' }}>
        <Header title={`Welcome, ${userName}`} />

        {/* HERO SECTION DESIGN BY TIER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', marginBottom: '48px', marginTop: '8px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '16px', 
            background: plan === 'basic' ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : plan === 'standard' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', 
            display: 'grid', 
            placeItems: 'center', 
            color: plan === 'basic' ? '#2563eb' : plan === 'standard' ? '#059669' : '#7c3aed', 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' 
          }}>
            <HeartPulse size={24} />
          </div>
          <p style={{ margin: 0, color: '#475569', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {plan === 'basic' ? 'Basic Tier — Clinic Inflow Hub' : plan === 'standard' ? 'Standard Tier — Clinical Operations' : 'Clinical Command Overview'}
          </p>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px', fontWeight: 500, maxWidth: '600px' }}>
            {plan === 'basic' 
              ? 'Real-time monitoring of outpatient flow, scheduling bookings, and invoice collections for your clinic.'
              : plan === 'standard'
              ? 'Integrated surveillance of outpatient registrations, diagnostic laboratories, and pharmacy dispensing desks.'
              : 'Enterprise-grade surveillance of patient inflow, IPD/OPD clinical utilization, pharmacy stocks, and AI workload forecasts.'
            }
          </p>
        </div>

        {/* ========================================================================= */}
        {/* BASIC PLAN VIEW */}
        {/* ========================================================================= */}
        {plan === 'basic' && (
          <div>
            {/* KPI ROW: 3 Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
              {[
                { label: 'Patient Inflow (OP)', val: stats.metrics.patientInflow, icon: Users, color: '#3b82f6', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' },
                { label: 'Unpaid Invoices', val: stats.metrics.pendingBills, icon: FileText, color: '#ef4444', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' },
                { label: 'Daily Revenue', val: isMobile ? `₹${(Number(stats.metrics.dailyRevenue)/1000).toFixed(1)}k` : `₹${Number(stats.metrics.dailyRevenue).toLocaleString()}`, icon: TrendingUp, color: '#10b981', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' },
              ].map((m, i) => (
                <div key={i} className="stat-card animate-slide-up" style={{ 
                  padding: '24px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: m.bg, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', position: 'relative', zIndex: 2 }}>
                    <m.icon size={24} />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', position: 'relative', zIndex: 2 }}>{loading ? '...' : m.val}</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px', position: 'relative', zIndex: 2 }}>{m.label}</div>
                  <div style={{ position: 'absolute', top: -10, right: -10, color: m.color, opacity: 0.03, zIndex: 1 }}>
                    <m.icon size={100} />
                  </div>
                </div>
              ))}
            </div>

            {/* MAIN CLINICAL DESK: 2 Column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '32px', marginBottom: '32px' }}>
              <div className="page-card" style={{ padding: '24px' }}>
                <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '24px' }}>Weekly Patient Registration Trend</h3>
                <ReactECharts option={weeklyFlowOption} style={{ height: '240px' }} />
              </div>

              {/* OPD Comm Hub */}
              <div className="page-card" style={{ padding: '24px', backgroundColor: '#0f172a', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}><Zap size={80} /></div>
                 <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 900, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    <Activity size={16} /> LIVE OPD HUB
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                       <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>CURRENT WAITING</div>
                       <div style={{ fontSize: '20px', fontWeight: 900, color: '#3b82f6' }}>{stats.metrics.patientInflow || 0}</div>
                    </div>
                    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                       <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Latest Entry</div>
                       <div style={{ fontSize: '14px', fontWeight: 800 }}>{stats.metrics.lastPatient || 'Ready for Intake'}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '4px' }}>
                       <button onClick={() => navigate('/tenant/opd/registration')} style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <Plus size={16} /> START RAPID INTAKE
                       </button>
                       <button onClick={() => navigate('/tenant/opd/queue')} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>VIEW FULL QUEUE</button>
                    </div>
                 </div>
              </div>
            </div>

            {/* UPGRADE TEASERS SECTION */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Unlock Enterprise Capabilities</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px' }}>
                {renderTeaser('Pharmacy Stock Inventory Alerts', [], 'standard', Pill)}
                {renderTeaser('Laboratory Order Analytics', [], 'standard', FlaskConical)}
                {renderTeaser('Live Ward Beds Mapping (IPD)', [], 'professional', Activity)}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STANDARD PLAN VIEW */}
        {/* ========================================================================= */}
        {plan === 'standard' && (
          <div>
            {/* KPI ROW: 4 Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
              {[
                { label: 'Patient Inflow', val: stats.metrics.patientInflow, icon: Users, color: '#3b82f6', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' },
                { label: 'Unpaid Invoices', val: stats.metrics.pendingBills, icon: FileText, color: '#ef4444', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' },
                { label: 'Daily Revenue', val: isMobile ? `₹${(Number(stats.metrics.dailyRevenue)/1000).toFixed(1)}k` : `₹${Number(stats.metrics.dailyRevenue).toLocaleString()}`, icon: TrendingUp, color: '#10b981', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' },
                { label: 'Pending Lab Tests', val: (stats.labStats || []).find((l: any) => l.status === 'Pending')?.count || 0, icon: FlaskConical, color: '#6366f1', bg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' },
              ].map((m, i) => (
                <div key={i} className="stat-card animate-slide-up" style={{ 
                  padding: '24px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: m.bg, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', position: 'relative', zIndex: 2 }}>
                    <m.icon size={24} />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', position: 'relative', zIndex: 2 }}>{loading ? '...' : m.val}</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px', position: 'relative', zIndex: 2 }}>{m.label}</div>
                  <div style={{ position: 'absolute', top: -10, right: -10, color: m.color, opacity: 0.03, zIndex: 1 }}>
                    <m.icon size={100} />
                  </div>
                </div>
              ))}
            </div>

            {/* INTEGRATED SERVICES: 3 Column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              <div className="page-card" style={{ padding: '24px' }}>
                <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '24px' }}>Weekly Patient Registration Trend</h3>
                <ReactECharts option={weeklyFlowOption} style={{ height: '240px' }} />
              </div>

              {/* Lab performance active */}
              <div className="page-card" style={{ padding: '24px' }}>
                 <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '20px' }}>Lab Orders (7D)</h3>
                 <ReactECharts option={labOption} style={{ height: '150px' }} />
                 <div style={{ marginTop: '12px', fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                    Processing { (stats.labStats || []).reduce((acc: number, l: any) => acc + l.count, 0) } diagnostic requests this week.
                 </div>
              </div>

              {/* Live OPD Comm Hub */}
              <div className="page-card" style={{ padding: '24px', backgroundColor: '#0f172a', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}><Zap size={80} /></div>
                 <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 900, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    <Activity size={16} /> LIVE OPD HUB
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                       <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>CURRENT WAITING</div>
                       <div style={{ fontSize: '20px', fontWeight: 900, color: '#3b82f6' }}>{stats.metrics.patientInflow || 0}</div>
                    </div>
                    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                       <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Latest Entry</div>
                       <div style={{ fontSize: '14px', fontWeight: 800 }}>{stats.metrics.lastPatient || 'Ready for Intake'}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '4px' }}>
                       <button onClick={() => navigate('/tenant/opd/registration')} style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <Plus size={16} /> START RAPID INTAKE
                       </button>
                    </div>
                 </div>
              </div>
            </div>

            {/* Pharmacy stock alerts & locked teasers */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '32px', marginBottom: '32px' }}>
              {/* Active pharmacy stock alerts */}
              <div className="page-card" style={{ padding: '24px' }}>
                 <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={16} style={{ color: '#ef4444' }} /> Pharmacy Stock Alerts
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    { (stats.stockAlerts || []).length > 0 ? (stats.stockAlerts || []).map((item: any, i: number) => (
                       <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#fef2f2', borderRadius: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>{item.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626' }}>{item.stock_quantity} Left</span>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>Inventory Healthy</div>
                    )}
                 </div>
              </div>

              {/* Locked IPD bed map & AI widgets */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
                {renderTeaser('Live Ward Beds Mapping (IPD)', [], 'professional', Activity)}
                {renderTeaser('AI Workload & Predictions', [], 'professional', Zap)}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROFESSIONAL/ENTERPRISE PLAN VIEW (FULL COMMAND CENTER) */}
        {/* ========================================================================= */}
        {(plan === 'professional' || plan === 'enterprise') && (
          <div>
            {/* TOP ROW: REAL-TIME KPIs (5 Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: isMobile ? '16px' : '24px', marginBottom: '32px' }}>
              {[
                { label: 'Patient Inflow', val: stats.metrics.patientInflow, icon: Users, color: '#3b82f6', bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' },
                { label: 'Active IPD', val: stats.metrics.activeAdmissions, icon: Activity, color: '#f59e0b', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' },
                { label: 'Unpaid Invoices', val: stats.metrics.pendingBills, icon: FileText, color: '#ef4444', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' },
                { label: 'Daily Revenue', val: isMobile ? `₹${(Number(stats.metrics.dailyRevenue)/1000).toFixed(1)}k` : `₹${Number(stats.metrics.dailyRevenue).toLocaleString()}`, icon: TrendingUp, color: '#10b981', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' },
                { label: 'Predicted Throughput', val: `${stats.predictive?.predictedAvgTime || 0}m`, icon: Clock, color: '#8b5cf6', bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }
              ].map((m, i) => (
                <div key={i} className="stat-card animate-slide-up" style={{ 
                  padding: isMobile ? '16px' : '24px', 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
                  animationDelay: `${i * 0.1}s`,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: isMobile ? '36px' : '48px', 
                    height: isMobile ? '36px' : '48px', 
                    borderRadius: '14px', 
                    background: m.bg, 
                    color: m.color, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: isMobile ? '12px' : '20px',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <m.icon size={isMobile ? 18 : 24} />
                  </div>
                  <div style={{ fontSize: isMobile ? '20px' : '32px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', position: 'relative', zIndex: 2 }}>{loading ? '...' : m.val}</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px', position: 'relative', zIndex: 2 }}>{m.label}</div>
                  
                  {/* Subtle background decoration */}
                  <div style={{ position: 'absolute', top: -10, right: -10, color: m.color, opacity: 0.03, zIndex: 1 }}>
                    <m.icon size={100} />
                  </div>
                </div>
              ))}
            </div>

            {/* PREDICTIVE ANALYTICS SECTION */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                 <div style={{ padding: '6px', background: '#f5f3ff', color: '#8b5cf6', borderRadius: '8px' }}><Zap size={18} /></div>
                 <h3 style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px' }}>Professional Intelligence Suite</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px' }}>
                 <div className="page-card" style={{ padding: '28px', borderRadius: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                       <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#475569' }}>Operational Accuracy (Last 10 Consultations)</h4>
                       <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', background: '#dcfce7', padding: '4px 10px', borderRadius: '20px' }}>AI SYNCED</div>
                          <div style={{ fontSize: '11px', fontWeight: 800, color: (stats.predictive?.utilization || 0) > 80 ? '#ef4444' : '#3b82f6', background: (stats.predictive?.utilization || 0) > 80 ? '#fef2f2' : '#eff6ff', padding: '4px 10px', borderRadius: '20px' }}>
                            UTILIZATION: {stats.predictive?.utilization || 0}%
                          </div>
                        </div>
                    </div>
                    <ReactECharts option={workloadOption} style={{ height: '240px' }} />
                 </div>
                 <div className="page-card" style={{ padding: '28px', borderRadius: '28px', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 24px', fontSize: '15px', fontWeight: 800, color: '#475569' }}>Clinical Load Complexity</h4>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <ReactECharts option={complexityOption} style={{ height: '180px', width: '100%' }} />
                    </div>
                    <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                       {(stats.predictive?.complexityMix || []).map((c: any, i: number) => (
                          <div key={i} style={{ textAlign: 'center' }}>
                             <div style={{ fontSize: '16px', fontWeight: 900, color: i === 0 ? '#10b981' : i === 1 ? '#f59e0b' : '#ef4444' }}>{c.value}%</div>
                             <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{c.name}</div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>

            {/* MIDDLE ROW: PERFORMANCE COMPARISON */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr', gap: isMobile ? '24px' : '32px', marginBottom: '32px' }}>
              {/* Discharge vs Admission Comparison */}
              <div className="page-card" style={{ padding: '24px' }}>
                <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '24px' }}>Admission vs. Discharge (7D)</h3>
                <ReactECharts option={dischargeOption} style={{ height: isMobile ? '180px' : '240px' }} />
              </div>

              {/* IP vs OP Ratio */}
              <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 className="section-title" style={{ fontSize: '14px', alignSelf: 'flex-start', marginBottom: '24px' }}>IP vs. OP Ratio (30D)</h3>
                <ReactECharts option={ipOpOption} style={{ height: '180px', width: '100%' }} />
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                   <div style={{ fontSize: '18px', fontWeight: 900 }}>{stats.ipOpRatio?.op_count || 0} : {stats.ipOpRatio?.ip_count || 0}</div>
                   <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>TOTAL CLINICAL LOAD</div>
                </div>
              </div>

              {/* Bed Occupancy */}
              <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '24px' }}>Live Bed Census</h3>
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start' }}>
                   {Array.from({ length: isMobile ? Math.min(bedTotal, 40) : bedTotal }).map((_, i) => (
                     <div key={i} style={{ width: isMobile ? '10px' : '12px', height: isMobile ? '10px' : '12px', borderRadius: '3px', backgroundColor: i < bedOccupancy ? '#ef4444' : '#10b981' }}></div>
                   ))}
                </div>
                <div style={{ marginTop: '16px' }}>
                   <div style={{ fontSize: '20px', fontWeight: 900 }}>{occupancyPercent}%</div>
                   <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>BED OCCUPANCY RATE</div>
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: ALERTS & LAB */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? '24px' : '32px' }}>
              {/* Pharmacy Stock Alerts */}
              <div className="page-card" style={{ padding: '24px' }}>
                 <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={16} style={{ color: '#ef4444' }} /> Pharmacy Stock Alerts
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(stats.stockAlerts || []).length > 0 ? (stats.stockAlerts || []).map((item: any, i: number) => (
                       <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#fef2f2', borderRadius: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>{item.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626' }}>{item.stock_quantity} Left</span>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>Inventory Healthy</div>
                    )}
                 </div>
              </div>

              {/* Lab Performance */}
              <div className="page-card" style={{ padding: '24px' }}>
                 <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '20px' }}>Lab Orders (7D)</h3>
                 <ReactECharts option={labOption} style={{ height: '150px' }} />
                 <div style={{ marginTop: '12px', fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                    Processing {(stats.labStats || []).reduce((acc: number, l: any) => acc + l.count, 0)} diagnostic requests this week.
                 </div>
              </div>

              {/* Live OPD Command Center */}
              <div className="page-card" style={{ padding: '24px', backgroundColor: 'var(--hero-bg, #0f172a)', color: 'var(--hero-text, #fff)', position: 'relative', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}><Zap size={80} /></div>
                 <h3 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 900, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    <Activity size={16} /> LIVE OPD HUB
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                       <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>CURRENT WAITING</div>
                       <div style={{ fontSize: '20px', fontWeight: 900, color: '#3b82f6' }}>{stats.metrics.patientInflow || 0}</div>
                    </div>
                    <div style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                       <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Latest Entry</div>
                       <div style={{ fontSize: '14px', fontWeight: 800 }}>{stats.metrics.lastPatient || 'Ready for Intake'}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '4px' }}>
                       <button onClick={() => navigate('/tenant/opd/registration')} style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <Plus size={16} /> START RAPID INTAKE
                       </button>
                       <button onClick={() => navigate('/tenant/opd/queue')} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>VIEW FULL QUEUE</button>
                    </div>
                 </div>
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
