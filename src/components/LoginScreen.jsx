import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import useStore from '../store/useStore';
import { getInitials, getRoleLabel } from '../utils/helpers';

// ─── NumPad for PIN entry ────────────────────────────────────────────────────
function NumPad({ value, onChange }) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];
  return (
    <div className="numpad">
      {keys.map((k, i) => (
        <button
          key={i}
          className={`numpad-key ${k === '' ? 'empty' : ''} ${k === '⌫' ? 'delete' : ''}`}
          onClick={() => {
            if (k === '') return;
            if (k === '⌫') { onChange(value.slice(0, -1)); return; }
            if (value.length < 4) onChange(value + String(k));
          }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

// ─── LoginScreen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [step, setStep]       = useState('select'); // 'select' | 'pin'
  const [selected, setSelected] = useState(null);
  const [pin, setPin]         = useState('');
  const [error, setError]     = useState('');
  const setCurrentUser        = useStore((s) => s.setCurrentUser);

  const employees = useLiveQuery(() =>
    db.employees.where('active').equals(1).toArray(), []);

  const handleSelectEmployee = (emp) => {
    setSelected(emp);
    setPin('');
    setError('');
    setStep('pin');
  };

  const handlePinChange = (val) => {
    setPin(val);
    setError('');
    if (val.length === 4) {
      // auto-submit when 4 digits entered
      setTimeout(() => attemptLogin(val, selected), 60);
    }
  };

  const attemptLogin = (enteredPin, emp) => {
    if (!emp) return;
    if (enteredPin === emp.pin) {
      setCurrentUser(emp);
    } else {
      setError('PIN incorrecto. Intenta de nuevo.');
      setPin('');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-logo">🚗</div>
      <div className="login-title">Mako Car Wash</div>
      <div className="login-subtitle">Los Cabos, B.C.S.</div>

      <div className="login-card">
        {step === 'select' ? (
          <>
            <div className="login-step-title">¿Quién eres?</div>
            <div className="employee-list">
              {(employees ?? []).map((emp) => (
                <button
                  key={emp.id}
                  className="emp-list-item"
                  onClick={() => handleSelectEmployee(emp)}
                >
                  <div
                    className="emp-avatar"
                    style={{ background: emp.color }}
                  >
                    {getInitials(emp.name)}
                  </div>
                  <div className="emp-list-info">
                    <div className="emp-list-name">{emp.name}</div>
                    <div className="emp-list-role">{getRoleLabel(emp.role)}</div>
                  </div>
                  <span style={{ fontSize: 22, color: '#94A3B8' }}>›</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Show selected employee */}
            <div className="login-pin-user">
              <div className="emp-avatar" style={{ background: selected?.color, width: 40, height: 40, fontSize: 14 }}>
                {getInitials(selected?.name)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selected?.name}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>{getRoleLabel(selected?.role)}</div>
              </div>
              <button
                onClick={() => { setStep('select'); setPin(''); setError(''); }}
                style={{ marginLeft: 'auto', fontSize: 22, color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            <div className="login-step-title">Ingresa tu PIN</div>

            {/* PIN dots */}
            <div className="pin-dots">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
              ))}
            </div>

            <NumPad value={pin} onChange={handlePinChange} />

            {error && <div className="login-error">{error}</div>}
          </>
        )}
      </div>

      <div style={{ marginTop: 24, color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' }}>
        v1.0 — Sistema de gestión interno
      </div>
    </div>
  );
}
