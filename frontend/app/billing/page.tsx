"use client";

import { useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const API_BASE = "http://localhost:4000";

const Icons = {
  Wallet: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  Check: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
};

export default function Billing() {
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/billing`, {
        patientId: "p1",
        amount: 500,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "x-tenant-id": localStorage.getItem("tenant"),
        }
      });
      alert("Payment Successful");
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Billing & Invoicing" />

        <div style={{ maxWidth: '800px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
             <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                <p style={{ fontSize: '14px', color: '#64748b' }}>Total Collected (Today)</p>
                <p style={{ fontSize: '28px', fontWeight: 700 }}>$1,240.00</p>
             </div>
             <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <p style={{ fontSize: '14px', color: '#64748b' }}>Pending Invoices</p>
                <p style={{ fontSize: '28px', fontWeight: 700 }}>8</p>
             </div>
          </div>

          <section style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>Quick Payment</h3>
            <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '20px', marginBottom: '24px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#64748b' }}>Patient</span>
                  <span style={{ fontWeight: 600 }}>John Doe (P-10024)</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#64748b' }}>Service</span>
                  <span style={{ fontWeight: 600 }}>General Consultation</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 700 }}>Total Amount</span>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '20px' }}>$45.00</span>
               </div>
            </div>

            <button 
              onClick={pay} 
              className="submit-btn" 
              disabled={loading}
              style={{ background: '#10b981' }}
            >
              {loading ? "Processing..." : <><Icons.Wallet /> Process Payment</>}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
