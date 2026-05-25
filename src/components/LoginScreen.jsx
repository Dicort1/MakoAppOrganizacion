import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import useStore from '../store/useStore';

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

export default function LoginScreen() {
  const [selected, setSelected] = useState(null);
  const [pin, setPin]           = useState('');
  const [error, setError]       = useState('');
  const setCurrentUser          = useStore((s) => s.setCurrentUser);

  const users = useLiveQuery(() => db.users.toArray(), []);

  const handleSelect = (user) => {
    setSelected(user);
    setPin('');
    setError('');
  };

  const handlePinChange = (val) => {
    setPin(val);
    setError('');
    if (val.length === 4) {
      setTimeout(() => {
        if (val === selected.pin) {
          setCurrentUser(selected);
        } else {
          setError('PIN incorrecto');
          setPin('');
        }
      }, 80);
    }
  };

  const roleColors = { dueno: '#7C3AED', encargado: '#1E40AF' };
  const roleLabels = { dueno: 'Dueño', encargado: 'Encargado' };
  const roleIcons  = { dueno: '👑', encargado: '🔑' };

  return (
    <div className="login-screen">
      <div className="login-logo">🚗</div>
      <div className="login-title">Mako Car Wash</div>
      <div className="login-subtitle">Los Cabos, B.C.S.</div>

      <div className="login-card">
        {!selected ? (
          <>
            <div className="login-step-title">¿Quién eres?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {(users ?? []).map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 18px', borderRadius: 14,
                    background: '#F8FAFC', border: `2px solid ${roleColors[u.role] ?? '#CBD5E1'}`,
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: roleColors[u.role] ?? '#94A3B8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {roleIcons[u.role] ?? '👤'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#0F172A' }}>{u.name}</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{roleLabels[u.role] ?? u.role}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 22, color: '#94A3B8' }}>›</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Selected user header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: '#F8FAFC',
              borderRadius: 12, marginBottom: 16,
              border: `2px solid ${roleColors[selected.role] ?? '#CBD5E1'}`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: roleColors[selected.role] ?? '#94A3B8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>
                {roleIcons[selected.role] ?? '👤'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{roleLabels[selected.role] ?? selected.role}</div>
              </div>
              <button
                onClick={() => { setSelected(null); setPin(''); setError(''); }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, color: '#94A3B8', cursor: 'pointer', padding: 4 }}
              >✕</button>
            </div>

            <div className="login-step-title">Ingresa tu PIN</div>

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

      <div style={{ marginTop: 24, color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' }}>
        v2.0 — Sistema de gestión interno
      </div>
    </div>
  );
}
