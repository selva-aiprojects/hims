import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";
import { API_BASE_URL as API_BASE } from "../../../config/api";


export default function BedManagementPage() {
  const navigate = useNavigate();
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWard, setActiveWard] = useState<any>(null);

  useEffect(() => {
    const fetchMasters = async () => {
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-tenant-id": localStorage.getItem("tenant") || ""
      };
      try {
        const res = await axios.get(`${API_BASE}/api/hospital/masters/wards`, { headers });
        setWards(res.data);
        if (res.data.length > 0) setActiveWard(res.data[0]);
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchMasters();
  }, []);

  const renderBeds = (capacity: number) => {
    const beds = [];
    for (let i = 1; i <= capacity; i++) {
      const isOccupied = i % 4 === 0; 
      beds.push(
        <div 
          key={i} 
          onClick={() => isOccupied && navigate('/billing', { state: { billType: 'IPD', totalAmount: 1200 } })}
          style={{ 
            padding: '20px', 
            borderRadius: '16px', 
            background: isOccupied ? '#fee2e2' : '#f0fdf4',
            border: `2px solid ${isOccupied ? '#fca5a5' : '#86efac'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            cursor: isOccupied ? 'pointer' : 'default',
            transition: 'transform 0.2s'
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isOccupied ? '#ef4444' : '#10b981'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>
          </svg>
          <div style={{ fontSize: '12px', fontWeight: 800, color: isOccupied ? '#ef4444' : '#10b981' }}>BED {i}</div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>{isOccupied ? 'Occupied' : 'Vacant'}</div>
          {isOccupied && <div style={{ fontSize: '9px', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>BILL & DISCHARGE</div>}
        </div>
      );
    }
    return beds;
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="IPD Bed Management & Occupancy" />

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
          <aside>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Hospital Floors / Wards</h3>
              {loading ? (
                <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading wards...</p>
              ) : wards.map((ward, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveWard(ward)}
                  style={{ 
                    padding: '16px', borderRadius: '16px', marginBottom: '12px', cursor: 'pointer',
                    background: activeWard?.id === ward.id ? '#eff6ff' : 'white',
                    border: `1px solid ${activeWard?.id === ward.id ? '#3b82f6' : '#f1f5f9'}`
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{ward.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Capacity: {ward.capacity} Beds</div>
                </div>
              ))}
            </div>
          </aside>

          <section>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 900 }}>{activeWard?.name || 'Select a Ward'}</h2>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#f0fdf4', border: '1px solid #86efac' }}></div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Vacant</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#fee2e2', border: '1px solid #fca5a5' }}></div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Occupied</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '20px' }}>
                {activeWard ? renderBeds(activeWard.capacity) : <p style={{ textAlign: 'center', color: '#94a3b8' }}>Please select a ward from the list.</p>}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
