import { Zap, ClipboardList, Heart, AlertTriangle, Info } from 'lucide-react';

interface ClinicalHistoryTabProps {
  patient: any;
}

export default function ClinicalHistoryTab({ patient }: ClinicalHistoryTabProps) {
  return (
    <div className="page-card" style={{ padding: '28px', borderRadius: '28px', background: '#0f172a', color: 'white', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
        <ClipboardList size={80} />
      </div>
      <h3 style={{ margin: '0 0 16px', fontSize: '12px', fontWeight: 900, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={16} fill="currentColor" /> CLINICAL PROFILE & HISTORY
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>ALLERGIES</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {patient?.allergies ? (
              patient.allergies.split(',').map((allergy: string, i: number) => (
                <span key={i} style={{ background: '#ef4444', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                  <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                  {allergy.trim()}
                </span>
              ))
            ) : (
              <span style={{ color: '#64748b', fontSize: '13px' }}>No known allergies</span>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>MEDICAL HISTORY</div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.5' }}>
            {patient?.medical_history || 'No significant medical history recorded'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>AI RISK ASSESSMENT</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: '#10b981', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
              <Heart size={12} style={{ marginRight: '4px' }} />
              Low Risk
            </span>
            <span style={{ background: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
              <Info size={12} style={{ marginRight: '4px' }} />
              Monitor Vitals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
