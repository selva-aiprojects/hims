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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [userName] = useState(localStorage.getItem("userName") || "User");
  const [stats, setStats] = useState<any>({
    metrics: { patientInflow: 0, activeAdmissions: 0, pendingBills: 0, dailyRevenue: 0 },
    ipOpRatio: { op_count: 0, ip_count: 0 },
    stockAlerts: [],
    bedStats: [],
    labStats: [],
    dischargeTrend: [],
    weeklyFlow: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        { value: stats.ipOpRatio.op_count, name: 'Outpatient (OP)' },
        { value: stats.ipOpRatio.ip_count, name: 'Inpatient (IP)' }
      ],
      color: ['#3b82f6', '#f59e0b']
    }]
  };

  // 2. Discharge Comparison Trend (Line)
  const dischargeOption = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 10, fontWeight: 700 } },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true, top: '10%' },
    xAxis: { 
      type: 'category', 
      data: stats.dischargeTrend.map((d: any) => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })),
      axisLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 700 }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } },
    series: [
      { name: 'Admitted', data: stats.dischargeTrend.map((d: any) => d.admitted), type: 'line', smooth: true, lineStyle: { width: 3 }, color: '#3b82f6' },
      { name: 'Discharged', data: stats.dischargeTrend.map((d: any) => d.discharged), type: 'line', smooth: true, lineStyle: { width: 3 }, color: '#10b981' }
    ]
  };

  // 3. Lab Performance (Pending vs Completed)
  const labOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: stats.labStats.map((l: any) => l.status), axisLine: { show: false } },
    yAxis: { type: 'value', show: false },
    series: [{
      data: stats.labStats.map((l: any) => l.count),
      type: 'bar', barWidth: '40%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#6366f1' }
    }]
  };

  // 4. Bed Occupancy
  const bedOccupancy = stats.bedStats.find((b: any) => b.status === 'Occupied')?.count || 0;
  const bedTotal = stats.bedStats.reduce((acc: number, b: any) => acc + b.count, 0) || 1;
  const occupancyPercent = Math.round((bedOccupancy / bedTotal) * 100);

  return (
    <div className="dashboard-layout" style={{ backgroundColor: '#f8fafc' }}>
      <Sidebar />
      <main className="main-content" style={{ padding: '40px', backgroundColor: '#f8fafc' }}>
        <Header title={`Welcome, ${userName}`} />

        {/* TOP ROW: REAL-TIME KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
          {[
            { label: 'Patient Inflow', val: stats.metrics.patientInflow, icon: Users, color: '#3b82f6' },
            { label: 'Active IPD', val: stats.metrics.activeAdmissions, icon: Activity, color: '#f59e0b' },
            { label: 'Unpaid Invoices', val: stats.metrics.pendingBills, icon: FileText, color: '#ef4444' },
            { label: 'Daily Revenue', val: `₹${Number(stats.metrics.dailyRevenue).toLocaleString()}`, icon: TrendingUp, color: '#10b981' }
          ].map((m, i) => (
            <div key={i} className="stat-card" style={{ padding: '24px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: `${m.color}15`, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <m.icon size={20} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>{loading ? '...' : m.val}</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* MIDDLE ROW: PERFORMANCE COMPARISON */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '32px', marginBottom: '32px' }}>
          {/* Discharge vs Admission Comparison */}
          <div className="page-card" style={{ padding: '24px' }}>
            <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '24px' }}>Admission vs. Discharge (7D)</h3>
            <ReactECharts option={dischargeOption} style={{ height: '240px' }} />
          </div>

          {/* IP vs OP Ratio */}
          <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 className="section-title" style={{ fontSize: '14px', alignSelf: 'flex-start', marginBottom: '24px' }}>IP vs. OP Ratio (30D)</h3>
            <ReactECharts option={ipOpOption} style={{ height: '180px', width: '100%' }} />
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
               <div style={{ fontSize: '18px', fontWeight: 900 }}>{stats.ipOpRatio.op_count} : {stats.ipOpRatio.ip_count}</div>
               <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>TOTAL CLINICAL LOAD</div>
            </div>
          </div>

          {/* Bed Occupancy */}
          <div className="page-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '24px' }}>Live Bed Census</h3>
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start' }}>
               {Array.from({ length: bedTotal }).map((_, i) => (
                 <div key={i} style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: i < bedOccupancy ? '#ef4444' : '#10b981' }}></div>
               ))}
            </div>
            <div style={{ marginTop: '16px' }}>
               <div style={{ fontSize: '20px', fontWeight: 900 }}>{occupancyPercent}%</div>
               <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>BED OCCUPANCY RATE</div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: ALERTS & LAB */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px' }}>
          {/* Pharmacy Stock Alerts */}
          <div className="page-card" style={{ padding: '24px' }}>
             <h3 className="section-title" style={{ fontSize: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} style={{ color: '#ef4444' }} /> Pharmacy Stock Alerts
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.stockAlerts.length > 0 ? stats.stockAlerts.map((item: any, i: number) => (
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
                Processing {stats.labStats.reduce((acc: number, l: any) => acc + l.count, 0)} diagnostic requests this week.
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
      </main>
    </div>
  );
}
