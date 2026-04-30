"use client";

import { useState } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const API_BASE = "http://localhost:4000";

const Icons = {
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
};

export default function Appointments() {
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(false);

  const createAppointment = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/appointments`, {
        patientId,
        doctorId: "doc1",
        time: new Date(),
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "x-tenant-id": localStorage.getItem("tenant"),
        }
      });
      alert("Appointment Created Successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Appointments" />

        <div style={{ maxWidth: '600px' }}>
          <section style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ color: '#3b82f6' }}><Icons.Calendar /></div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Book New Appointment</h3>
            </div>

            <div className="input-group">
              <label className="input-label">Patient ID</label>
              <input
                placeholder="Enter Patient ID (e.g. P-10024)"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '16px' }}
              />
            </div>

            <button 
              onClick={createAppointment} 
              className="submit-btn" 
              disabled={loading}
              style={{ background: '#3b82f6' }}
            >
              {loading ? "Booking..." : <><Icons.Plus /> Book Appointment</>}
            </button>
          </section>

          <div style={{ marginTop: '40px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Upcoming Today</h3>
            <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ padding: '20px', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '15px' }}>Patient #{1000 + i}</p>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>General Checkup • 10:30 AM</p>
                  </div>
                  <span style={{ padding: '4px 12px', background: '#f0f7ff', color: '#3b82f6', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Scheduled</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
