import { useRef } from 'react';
import { Pill, Plus, Trash2 } from 'lucide-react';

interface PrescriptionTabProps {
  prescriptions: any[];
  setPrescriptions: (prescriptions: any[]) => void;
  medicines: any[];
  medSearch: string;
  setMedSearch: (search: string) => void;
  filteredMeds: any[];
  handleMedSearch: (search: string) => void;
  addMed: (medicine: any) => void;
}

export default function PrescriptionTab({
  prescriptions,
  setPrescriptions,
  medicines,
  medSearch,
  setMedSearch,
  filteredMeds,
  handleMedSearch,
  addMed
}: PrescriptionTabProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleAddCommonMeds = () => {
    const commonNames = ['Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Cetirizine', 'Pantoprazole'];
    const newPrescriptions = [...prescriptions];
    
    commonNames.forEach(name => {
      // Avoid duplicates
      if (newPrescriptions.find(p => p.name.toLowerCase().includes(name.toLowerCase()))) return;
      
      const med = medicines.find(m => (m.name || '').toLowerCase().includes(name.toLowerCase()));
      if (med) {
        newPrescriptions.push({
          medicine_id: med.id,
          name: med.name,
          composition: med.composition,
          dosage: med.dosage_adult || '1 Tab',
          frequency: '1-0-1',
          duration: '5 Days',
          instructions: 'After Food'
        });
      }
    });
    
    setPrescriptions(newPrescriptions);
  };

  const handleClearPrescriptions = () => {
    setPrescriptions([]);
  };

  return (
    <div className="page-card" style={{ padding: '32px', borderRadius: '28px', minHeight: '500px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Pill size={24} color="#3b82f6" /> MEDICAL PRESCRIPTION
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px' }}>
            {prescriptions.length} medications
          </span>
        </h3>
        <button 
          onClick={() => searchInputRef.current?.focus()}
          style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={20} /> Add Medicine
        </button>
      </div>
      
      {/* Enhanced Search Bar */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <input 
          ref={searchInputRef}
          placeholder="🔍 Search medicines by name, brand, or composition..." 
          className="input-field" 
          style={{ paddingLeft: '20px', height: '64px', borderRadius: '16px', fontSize: '16px', border: '2px solid #e2e8f0', transition: 'all 0.3s ease' }}
          value={medSearch}
          onChange={e => handleMedSearch(e.target.value)}
          onFocus={e => e.target.style.borderColor = '#3b82f6'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
        
        {medSearch && (
          <button 
            onClick={() => setMedSearch('')}
            style={{ position: 'absolute', right: '16px', top: '20px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            ✕
          </button>
        )}
        
        {filteredMeds.length > 0 && medSearch && (
          <div style={{ position: 'absolute', top: '72px', left: 0, right: 0, background: 'white', border: '2px solid #3b82f6', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px -10px rgba(59, 130, 246, 0.3)', zIndex: 100, maxHeight: '300px', overflowY: 'auto' }}>
            {filteredMeds.slice(0, 8).map(m => (
              <div 
                key={m.id} 
                onClick={() => { addMed(m); setMedSearch(''); }} 
                style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s ease' }} 
                className="hover-light" 
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} 
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '16px', color: '#0f172a', marginBottom: '4px' }}>{m.name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{m.composition}</div>
                  </div>
                  <div style={{ background: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>+ Add</div>
                </div>
              </div>
            ))}
            {filteredMeds.length > 8 && (
              <div style={{ padding: '16px 24px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                ... and {filteredMeds.length - 8} more results
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prescription List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
        {prescriptions.map((p, i) => (
          <div key={i} style={{ padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '20px', border: '1px solid #e2e8f0', position: 'relative', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontWeight: 900, fontSize: '18px', color: '#0f172a', display: 'block', marginBottom: '4px' }}>{p.name}</span>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{p.composition}</span>
              </div>
              <button 
                onClick={() => setPrescriptions(prescriptions.filter((_, idx) => idx !== i))} 
                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fecaca'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>💊 Dosage</label>
                <input className="input-field" style={{ fontSize: '14px', height: '48px', borderRadius: '12px' }} value={p.dosage} onChange={e => { const n = [...prescriptions]; n[i].dosage = e.target.value; setPrescriptions(n); }} placeholder="e.g., 500mg" />
              </div>
              <div>
                <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>🔄 Frequency</label>
                <select className="select-field" style={{ fontSize: '14px', height: '48px', borderRadius: '12px' }} value={p.frequency} onChange={e => { const n = [...prescriptions]; n[i].frequency = e.target.value; setPrescriptions(n); }}>
                  <option>1-0-1</option>
                  <option>1-1-1</option>
                  <option>1-0-0</option>
                  <option>0-0-1</option>
                  <option>0-1-0</option>
                  <option>SOS</option>
                  <option>STAT</option>
                </select>
              </div>
              <div>
                <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>📅 Duration</label>
                <input className="input-field" style={{ fontSize: '14px', height: '48px', borderRadius: '12px' }} value={p.duration} onChange={e => { const n = [...prescriptions]; n[i].duration = e.target.value; setPrescriptions(n); }} placeholder="e.g., 5 days" />
              </div>
              <div>
                <label className="field-label" style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', display: 'block' }}>⏰ Timing</label>
                <select className="select-field" style={{ fontSize: '14px', height: '48px', borderRadius: '12px' }} value={p.instructions} onChange={e => { const n = [...prescriptions]; n[i].instructions = e.target.value; setPrescriptions(n); }}>
                  <option>After Food</option>
                  <option>Before Food</option>
                  <option>With Food</option>
                  <option>Empty Stomach</option>
                  <option>At Bedtime</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        
        {prescriptions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', border: '3px dashed #e2e8f0', borderRadius: '24px', fontSize: '16px', fontWeight: 600, background: '#f8fafc' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💊</div>
            <div>No medications added yet</div>
            <div style={{ fontSize: '14px', marginTop: '8px', fontWeight: 400 }}>Click "Add Medicine" or search above to start prescribing</div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '24px', padding: '20px', background: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', marginBottom: '12px' }}>QUICK ACTIONS</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleAddCommonMeds}
            style={{ padding: '8px 16px', background: 'white', border: '1px solid #3b82f6', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#3b82f6', cursor: 'pointer' }}
          >
            + Add Common Meds
          </button>
          {prescriptions.length > 0 && (
            <button 
              onClick={handleClearPrescriptions}
              style={{ padding: '8px 16px', background: 'white', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
