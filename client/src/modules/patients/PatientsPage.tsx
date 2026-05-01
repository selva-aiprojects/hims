import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function PatientsPage() {
  const patients = [
    { id: "P-10021", name: "Alice Smith", phone: "+1 234 567 890", lastVisit: "2026-04-25" },
    { id: "P-10022", name: "Bob Johnson", phone: "+1 234 567 891", lastVisit: "2026-04-26" },
    { id: "P-10023", name: "Charlie Brown", phone: "+1 234 567 892", lastVisit: "2026-04-27" },
    { id: "P-10024", name: "John Doe", phone: "+1 234 567 893", lastVisit: "2026-04-28" },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header title="Patient Directory" />

        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Registered Patients</h3>
             <button style={{ padding: '10px 20px', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>+ Add Patient</button>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>PATIENT ID</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>NAME</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>CONTACT</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>LAST VISIT</th>
                <th style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>{p.id}</td>
                  <td style={{ padding: '16px 24px' }}>{p.name}</td>
                  <td style={{ padding: '16px 24px', color: '#64748b' }}>{p.phone}</td>
                  <td style={{ padding: '16px 24px' }}>{p.lastVisit}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <button style={{ color: '#3b82f6', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>View Case</button>
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
