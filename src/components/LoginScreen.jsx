import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import useStore from '../store/useStore';

const NAVY = '#0A2540';
const BLUE = '#1255CC';

function NumPad({ value, onChange }) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 16 }}>
      {keys.map((k, i) => (
        <button
          key={i}
          onClick={() => {
            if (k === '') return;
            if (k === '⌫') { onChange(value.slice(0, -1)); return; }
            if (value.length < 4) onChange(value + String(k));
          }}
          style={{
            height: 60, borderRadius: 10,
            background: k === '' ? 'transparent' : k === '⌫' ? '#FEF2F2' : '#F4F6F9',
            border: k === '' ? 'none' : k === '⌫' ? '1px solid #FECACA' : '1px solid #DDE3EA',
            fontSize: k === '⌫' ? 20 : 22, fontWeight: 600,
            color: k === '⌫' ? '#DC2626' : NAVY,
            cursor: k === '' ? 'default' : 'pointer',
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

  const handleSelect = (user) => { setSelected(user); setPin(''); setError(''); };

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

  const roleLabel = { dueno: 'Dueño', encargado: 'Encargado' };
  const roleColor = { dueno: NAVY, encargado: BLUE };

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '3px', color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>
          Los Cabos, B.C.S.
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, color: NAVY, letterSpacing: '-1px', lineHeight: 1 }}>
          MAKO
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#6B7280', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>
          Car Wash
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 360, boxShadow: '0 4px 24px rgba(10,37,64,0.10)' }}>
        {!selected ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
              Selecciona tu usuario
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(users ?? []).map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 18px', borderRadius: 12,
                    background: '#F5F7FA',
                    border: `1.5px solid #DDE3EA`,
                    borderLeft: `4px solid ${roleColor[u.role] ?? NAVY}`,
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.12s',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 17, color: NAVY }}>{u.name}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{roleLabel[u.role] ?? u.role}</div>
                  </div>
                  <div style={{ fontSize: 20, color: '#BDC5D1' }}>›</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Selected user */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
              padding: '12px 14px', borderRadius: 10,
              background: '#F5F7FA', border: `1.5px solid #DDE3EA`,
              borderLeft: `4px solid ${roleColor[selected.role] ?? NAVY}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: NAVY }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{roleLabel[selected.role] ?? selected.role}</div>
              </div>
              <button
                onClick={() => { setSelected(null); setPin(''); setError(''); }}
                style={{ color: '#BDC5D1', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >✕</button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
              Ingresa tu PIN
            </div>

            {/* PIN dots */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: i < pin.length ? NAVY : 'transparent',
                  border: `2px solid ${i < pin.length ? NAVY : '#BDC5D1'}`,
                  transition: 'all 0.1s',
                }} />
              ))}
            </div>

            <NumPad value={pin} onChange={handlePinChange} />

            {error && (
              <div style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '10px', borderRadius: 8, marginTop: 10 }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 28, color: '#BDC5D1', fontSize: 12, letterSpacing: '0.5px' }}>
        v2.0
      </div>
    </div>
  );
}
