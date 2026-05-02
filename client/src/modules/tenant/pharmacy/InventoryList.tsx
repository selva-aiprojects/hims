import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "../../../components/Sidebar";
import Header from "../../../components/Header";

const API_BASE = "http://localhost:4000";

export default function InventoryList() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const headers = { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "x-tenant-id": localStorage.getItem("tenant") || ""
    };
    try {
      const res = await axios.get(`${API_BASE}/api/hospital/pharmacy/inventory`, { headers });
      setInventory(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px' }}>
        <Header title="Pharmacy Inventory Management" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Stock Inventory</h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>Complete drug catalog with batch and expiry tracking</p>
          </div>
          <button style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
             + Add New Stock
          </button>
        </div>

        <div style={{ background: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
             <input placeholder="Search medicine..." style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }} />
             <select style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                <option>All Categories</option>
                <option>Tablets</option>
                <option>Syrups</option>
                <option>Injectables</option>
             </select>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Medicine Name</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Available Stock</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Price / Unit</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Expiry Date</th>
                <th style={{ padding: '20px 24px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.drug_name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {item.id.substring(0,8)}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     <span style={{ fontSize: '12px', padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontWeight: 700, color: '#475569' }}>{item.category}</span>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <div style={{ width: '100px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(Number(item.stock_quantity) / 2, 100)}%`, height: '100%', background: Number(item.stock_quantity) < 50 ? '#ef4444' : '#10b981' }}></div>
                       </div>
                       <span style={{ fontWeight: 800, color: Number(item.stock_quantity) < 50 ? '#ef4444' : '#10b981' }}>{item.stock_quantity}</span>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px', fontWeight: 800 }}>₹{Number(item.unit_price).toFixed(2)}</td>
                  <td style={{ padding: '20px 24px', color: '#64748b', fontSize: '13px' }}>{new Date(item.expiry_date).toLocaleDateString()}</td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                     <button style={{ padding: '8px 16px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
