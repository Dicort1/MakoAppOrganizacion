import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, addCar, getTodayCashControl } from '../db/db';
import useStore from '../store/useStore';
import { formatMXN, formatTime, formatDate, playSuccess, vibrate } from '../utils/helpers';
import { syncToSheets, carRegisteredPayload, buildFullReport, hasSheetsUrl } from '../utils/sheets';

// ─── Car registration modal ───────────────────────────────────────────────────
function RegistroModal({ onClose }) {
  const showFlash               = useStore((s) => s.showFlash);
  const [paymentType, setPayment] = useState(null);
  const [hasVacuum, setVacuum]    = useState(false);
  const [saving, setSaving]       = useState(false);

  const handleRegistrar = async () => {
    if (!paymentType) { showFlash('error', 'Selecciona efectivo o tarjeta'); return; }
    setSaving(true);
    try {
      const carId = await addCar({ paymentType, hasVacuum });
      const car   = await db.cars.get(carId);
      playSuccess();
      vibrate([100, 50, 100]);
      showFlash('success', `✅ Registrado — ${paymentType === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}${hasVacuum ? ' + 🌀' : ''}`);
      syncToSheets(carRegisteredPayload(car, 'Encargado'));
      onClose();
    } catch {
      showFlash('error', 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '8px 20px 44px', width: '100%', boxShadow: '0 -4px 24px rgba(0,0,0,0.18)' }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '10px auto 18px' }} />

        <div style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 4 }}>🚗 Nuevo Auto</div>
        <div style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 22 }}>Lavado Express — $120 MXN</div>

        {/* Aspirado toggle */}
        <button
          onClick={() => setVacuum((v) => !v)}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 12, marginBottom: 16, cursor: 'pointer',
            background: hasVacuum ? '#EFF6FF' : '#F8FAFC',
            border: `2px solid ${hasVacuum ? '#3B82F6' : '#E2E8F0'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>🌀 Aspirado incluido</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {hasVacuum ? 'Sí — cliente lo solicitó' : 'No — solo exterior'}
            </div>
          </div>
          <div style={{
            width: 46, height: 26, borderRadius: 13, flexShrink: 0,
            background: hasVacuum ? '#3B82F6' : '#CBD5E1',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3, transition: 'left 0.2s',
              left: hasVacuum ? 23 : 3,
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }} />
          </div>
        </button>

        {/* Payment */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>💰 ¿Cómo pagó?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { type: 'efectivo', icon: '💵', label: 'Efectivo', bg: 'linear-gradient(145deg,#16A34A,#15803D)', shadow: 'rgba(22,163,74,0.35)' },
            { type: 'tarjeta',  icon: '💳', label: 'Tarjeta',  bg: 'linear-gradient(145deg,#2563EB,#1D4ED8)', shadow: 'rgba(37,99,235,0.35)' },
          ].map(({ type, icon, label, bg, shadow }) => (
            <button
              key={type}
              onClick={() => setPayment(type)}
              style={{
                height: 84, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: paymentType === type ? bg : '#F1F5F9',
                color: paymentType === type ? '#fff' : '#334155',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                fontWeight: 800, fontSize: 17,
                boxShadow: paymentType === type ? `0 4px 14px ${shadow}` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 30 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={handleRegistrar}
          disabled={saving || !paymentType}
          style={{
            width: '100%', height: 62, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: paymentType && !saving ? 'linear-gradient(145deg,#16A34A,#15803D)' : '#CBD5E1',
            color: '#fff', fontSize: 19, fontWeight: 800,
            boxShadow: paymentType ? '0 4px 14px rgba(22,163,74,0.3)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {saving ? '⏳ Registrando...' : '✅ REGISTRAR'}
        </button>

        <button
          onClick={onClose}
          style={{ width: '100%', marginTop: 8, padding: 12, background: 'none', border: 'none', color: '#94A3B8', fontSize: 15, cursor: 'pointer' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Car card ─────────────────────────────────────────────────────────────────
function CarCard({ car }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{car.ticketId}</div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>🕐 {formatTime(car.timestamp)}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {car.hasVacuum ? (
          <span style={{ fontSize: 12, background: '#EFF6FF', color: '#1D4ED8', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
            🌀
          </span>
        ) : null}
        <span style={{
          fontSize: 13, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
          background: car.paymentType === 'efectivo' ? '#DCFCE7' : '#DBEAFE',
          color: car.paymentType === 'efectivo' ? '#15803D' : '#1D4ED8',
        }}>
          {car.paymentType === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
        </span>
      </div>
    </div>
  );
}

// ─── EncargadoScreen ──────────────────────────────────────────────────────────
export default function EncargadoScreen() {
  const logout    = useStore((s) => s.logout);
  const showFlash = useStore((s) => s.showFlash);
  const [showModal, setShowModal] = useState(false);
  const [sending,   setSending]   = useState(false);

  const cars        = useLiveQuery(() => db.cars.where('date').equals(todayStr()).toArray(), []);
  const cashControl = useLiveQuery(() => getTodayCashControl(), []);

  const handleSendSheets = async () => {
    if (!hasSheetsUrl()) { showFlash('error', 'El dueño aún no configuró Google Sheets'); return; }
    setSending(true);
    const payload = buildFullReport(cars ?? [], [], cashControl, [], todayStr());
    const ok      = await syncToSheets(payload);
    setSending(false);
    showFlash(ok ? 'success' : 'error', ok ? '📊 Reporte enviado a Google Sheets ✅' : '⚠️ Revisa la conexión');
  };

  const sorted    = [...(cars ?? [])].sort((a, b) => b.timestamp - a.timestamp);
  const efectivo  = sorted.filter((c) => c.paymentType === 'efectivo').length;
  const tarjeta   = sorted.filter((c) => c.paymentType === 'tarjeta').length;
  const total     = sorted.length;

  return (
    <div style={{ minHeight: '100dvh', background: '#F1F5F9' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1E40AF, #1D4ED8)',
        padding: '18px 20px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 19 }}>🔑 Encargado</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 1 }}>
            {formatDate(todayStr())}
          </div>
        </div>
        <button
          onClick={logout}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Salir
        </button>
      </div>

      <div style={{ padding: '16px 16px 80px' }}>
        {/* Big action button */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            width: '100%', height: 90,
            background: 'linear-gradient(145deg, #16A34A, #15803D)',
            border: 'none', borderRadius: 16, color: '#fff',
            fontSize: 22, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(22,163,74,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 32 }}>🚗</span>
          REGISTRAR AUTO
        </button>

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { value: total,    label: 'Autos hoy',  color: '#0F172A' },
            { value: efectivo, label: '💵 Efectivo', color: '#15803D' },
            { value: tarjeta,  label: '💳 Tarjeta',  color: '#1D4ED8' },
          ].map(({ value, label, color }) => (
            <div key={label} style={{
              flex: 1, background: '#fff', borderRadius: 12, padding: '10px 8px',
              textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Car list */}
        {total === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🚗</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#64748B' }}>Sin autos aún</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>Toca el botón para registrar el primero</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Registros de hoy
            </div>
            {sorted.map((car) => <CarCard key={car.id} car={car} />)}
          </>
        )}
      </div>

        {/* Sheets button */}
        {total > 0 && (
          <button
            onClick={handleSendSheets}
            disabled={sending}
            style={{
              width: '100%', height: 54, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: sending ? '#94A3B8' : 'linear-gradient(145deg,#16A34A,#15803D)',
              color: '#fff', fontSize: 16, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 12, boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
            }}
          >
            <span style={{ fontSize: 20 }}>📊</span>
            {sending ? 'Enviando...' : 'ENVIAR REPORTE AL DUEÑO'}
          </button>
        )}
      </div>

      {showModal && <RegistroModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
