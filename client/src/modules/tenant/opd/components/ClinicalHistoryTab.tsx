import { Zap, Heart, FlaskConical, Pill } from 'lucide-react';

interface ClinicalHistoryTabProps {
  patient: any;
  pastLabs: any[];
  pastMeds: any[];
}

export default function ClinicalHistoryTab({ patient, pastLabs, pastMeds }: ClinicalHistoryTabProps) {
  const displayValue = (value: any, fallback = '-') => {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value);
  };

  const getMedicationItems = (encounter: any) => {
    if (Array.isArray(encounter?.prescriptions)) return encounter.prescriptions;
    if (Array.isArray(encounter?.prescription_items)) return encounter.prescription_items;
    if (Array.isArray(encounter?.items)) return encounter.items;
    return [];
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
      <div className="page-card" style={{ padding: '24px', borderRadius: '24px', background: '#0f172a', color: 'white', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '11px', fontWeight: 900, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
          <Zap size={14} fill="currentColor" /> Patient Profile
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Allergies</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {patient?.allergies ? (
                patient.allergies.split(',').map((allergy: string, i: number) => (
                  <span key={i} style={{ background: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>
                    {allergy.trim()}
                  </span>
                ))
              ) : (
                <span style={{ color: '#475569', fontSize: '12px' }}>No known allergies</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Medical History</div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', fontSize: '12px', lineHeight: '1.6', color: '#94a3b8' }}>
              {patient?.medical_history || 'No significant history recorded'}
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '16px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Heart size={14} color="#3b82f6" />
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#3b82f6' }}>AI RISK SCORE</span>
             </div>
             <div style={{ fontSize: '24px', fontWeight: 900, color: 'white' }}>Low <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Risk</span></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
         <div className="page-card" style={{ padding: '24px', borderRadius: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FlaskConical size={18} color="#3b82f6" /> Past Laboratory Investigations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {pastLabs.length > 0 ? (
                 pastLabs.slice(0, 5).map((lab, i) => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{lab.test_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(lab.created_at).toLocaleDateString()}</span>
                         <span style={{ fontSize: '11px', fontWeight: 800, color: lab.status === 'Completed' ? '#10b981' : '#f59e0b' }}>{lab.status}</span>
                      </div>
                   </div>
                 ))
               ) : (
                 <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No previous lab records found</div>
               )}
            </div>
         </div>

         <div className="page-card" style={{ padding: '24px', borderRadius: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pill size={18} color="#10b981" /> Past Medication Regimen
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {pastMeds.length > 0 ? (
                 pastMeds.slice(0, 3).map((med, i) => {
                  const medicationItems = getMedicationItems(med);
                  return (
                   <div key={i} style={{ padding: '16px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #dcfce7' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#166534', marginBottom: '4px' }}>Diagnosis: {displayValue(med.diagnosis, 'Not recorded')}</div>
                      <div style={{ fontSize: '12px', color: '#15803d', marginBottom: medicationItems.length ? '12px' : 0 }}>Visited: {new Date(med.created_at).toLocaleDateString()}</div>
                      {medicationItems.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {medicationItems.map((item: any, itemIndex: number) => (
                            <div key={`${i}-${itemIndex}`} style={{ padding: '10px 12px', background: 'white', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#14532d' }}>
                                {displayValue(item.name || item.drug_name || item.medicine_name, 'Medicine')}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                                <span>{displayValue(item.dosage)}</span>
                                <span>{displayValue(item.frequency)}</span>
                                <span>{displayValue(item.duration)} days</span>
                                {item.instructions && <span>{item.instructions}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#65a30d', fontWeight: 600 }}>No medicines recorded for this visit</div>
                      )}
                   </div>
                  );
                 })
               ) : (
                 <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No previous medication records found</div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
