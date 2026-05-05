import { FlaskConical, CheckCircle2 } from 'lucide-react';

interface LabTabProps {
  diagnostics: any[];
  selectedLabTests: string[];
  setSelectedLabTests: (tests: string[]) => void;
}

export default function LabTab({
  diagnostics,
  selectedLabTests,
  setSelectedLabTests
}: LabTabProps) {
  return (
    <div className="page-card" style={{ padding: '28px', borderRadius: '28px' }}>
      <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 800, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FlaskConical size={20} /> LAB INVESTIGATIONS
      </h3>
      <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {diagnostics.map(test => {
          const isSelected = selectedLabTests.includes(test.id);
          const handleTestToggle = () => {
            setSelectedLabTests(
              isSelected 
                ? selectedLabTests.filter(id => id !== test.id) 
                : [...selectedLabTests, test.id]
            );
          };
          
          return (
            <div 
              key={test.id} 
              onClick={handleTestToggle}
              style={{ 
                padding: '14px', 
                borderRadius: '14px', 
                background: isSelected ? '#3b82f6' : '#f8fafc', 
                color: isSelected ? 'white' : '#1e293b', 
                border: '1px solid #e2e8f0', 
                cursor: 'pointer', 
                fontSize: '13px', 
                fontWeight: 800, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}
            >
              {test.name}
              {isSelected && <CheckCircle2 size={16} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
