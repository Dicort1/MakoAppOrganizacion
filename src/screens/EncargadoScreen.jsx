import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, addCar, addExtra, getTodayCashControl } from '../db/db';
import useStore from '../store/useStore';
import { formatMXN, formatTime, formatDate, playSuccess, vibrate } from '../utils/helpers';
import { syncToSheets, carRegisteredPayload, buildFullReport, hasSheetsUrl } from '../utils/sheets';

const NAVY   = '#0A2540';
const GREEN  = '#059669';
const BLUE   = '#1255CC';
const ORANGE = '#D97706';
const BG     = '#F5F7FA';

// ─── Modal de registro de auto ────────────────────────────────────────────────
function RegistroModal({ onClose }) {
  const showFlash                 = useStore((s) => s.showFlash);
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
      vibrate([80, 40, 80]);
      showFlash('success', `Registrado — ${paymentType === 'efectivo' ? 'Efectivo' : 'Tarjeta'}${hasVacuum ? ' + Aspirado' : ''}`);
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,37,64,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: '18px 18px 0 0', padding: '0 20px 40px', width: '100%' }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: '#DDE3EA', margin: '12px auto 20px' }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Nuevo Registro</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: NAVY, marginBottom: 4 }}>Lavado Express</div>
        <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>$120 MXN</div>

        <button
          onClick={() => setVacuum((v) => !v)}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 12, marginBottom: 14, cursor: 'pointer',
            background: hasVacuum ? '#EFF6FF' : '#F5F7FA',
            border: `1.5px solid ${hasVacuum ? BLUE : '#DDE3EA'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>Aspirado incluido</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{hasVacuum ? 'Si — cliente lo solicitó' : 'No — solo exterior'}</div>
          </div>
          <div style={{ width: 44, height: 24, borderRadius: 12, flexShrink: 0, background: hasVacuum ? BLUE : '#DDE3EA', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: hasVacuum ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
        </button>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Forma de pago</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { type: 'efectivo', label: 'Efectivo', color: GREEN },
            { type: 'tarjeta',  label: 'Tarjeta',  color: BLUE },
          ].map(({ type, label, color }) => (
            <button key={type} onClick={() => setPayment(type)} style={{ height: 76, borderRadius: 12, cursor: 'pointer', background: paymentType === type ? color : '#F5F7FA', color: paymentType === type ? '#fff' : NAVY, border: `1.5px solid ${paymentType === type ? color : '#DDE3EA'}`, fontWeight: 800, fontSize: 16, transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        <button onClick={handleRegistrar} disabled={saving || !paymentType} style={{ width: '100%', height: 58, borderRadius: 12, border: 'none', cursor: paymentType ? 'pointer' : 'default', background: paymentType && !saving ? NAVY : '#DDE3EA', color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: '0.5px', transition: 'background 0.15s' }}>
          {saving ? 'Registrando...' : 'CONFIRMAR'}
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, padding: 12, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── Modal de venta de trapos ─────────────────────────────────────────────────
function TrapModal({ onClose }) {
  const showFlash      = useStore((s) => s.showFlash);
  const [qty, setQty]  = useState(1);
  const [saving, setSaving] = useState(false);
  const PRECIO = 30;

  const handleVender = async () => {
    setSaving(true);
    try {
      await addExtra('trapo', qty, qty * PRECIO);
      vibrate([80, 40, 80]);
      showFlash('success', `${qty} trapo${qty > 1 ? 's' : ''} vendido${qty > 1 ? 's' : ''} — ${formatMXN(qty * PRECIO)}`);
      onClose();
    } catch {
      showFlash('error', 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,37,64,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '18px 18px 0 0', padding: '0 20px 40px', width: '100%' }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: '#DDE3EA', margin: '12px auto 20px' }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Venta</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: NAVY, marginBottom: 4 }}>Trapos</div>
        <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>${PRECIO} MXN por trapo</div>

        {/* Selector de cantidad */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Cantidad</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, background: '#F5F7FA', borderRadius: 12, border: '1.5px solid #DDE3EA', overflow: 'hidden' }}>
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ flex: 1, height: 68, background: 'none', border: 'none', fontSize: 28, fontWeight: 700, color: qty > 1 ? NAVY : '#BDC5D1', cursor: qty > 1 ? 'pointer' : 'default' }}>−</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: NAVY }}>{qty}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{formatMXN(qty * PRECIO)}</div>
          </div>
          <button onClick={() => setQty((q) => Math.min(20, q + 1))} style={{ flex: 1, height: 68, background: 'none', border: 'none', fontSize: 28, fontWeight: 700, color: NAVY, cursor: 'pointer' }}>+</button>
        </div>

        <button onClick={handleVender} disabled={saving} style={{ width: '100%', height: 58, borderRadius: 12, border: 'none', cursor: 'pointer', background: ORANGE, color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: '0.5px' }}>
          {saving ? 'Registrando...' : `VENDER ${qty} TRAPO${qty > 1 ? 'S' : ''}`}
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, padding: 12, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── Car card ─────────────────────────────────────────────────────────────────
function CarCard({ car }) {
  const isEfectivo = car.paymentType === 'efectivo';
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${isEfectivo ? GREEN : BLUE}`, boxShadow: '0 1px 3px rgba(10,37,64,0.06)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, fontFamily: 'monospace, monospace', letterSpacing: '0.5px' }}>{car.ticketId}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{formatTime(car.timestamp)}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {car.hasVacuum ? <span style={{ fontSize: 11, background: '#EFF6FF', color: BLUE, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>ASP</span> : null}
        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: isEfectivo ? '#ECFDF5' : '#EFF6FF', color: isEfectivo ? GREEN : BLUE }}>
          {isEfectivo ? 'EFECTIVO' : 'TARJETA'}
        </span>
      </div>
    </div>
  );
}

// ─── EncargadoScreen ──────────────────────────────────────────────────────────
export default function EncargadoScreen() {
  const logout    = useStore((s) => s.logout);
  const showFlash = useStore((s) => s.showFlash);
  const [showModal,  setShowModal]  = useState(false);
  const [showTraps,  setShowTraps]  = useState(false);
  const [sending,    setSending]    = useState(false);

  const cars        = useLiveQuery(() => db.cars.where('date').equals(todayStr()).toArray(), []);
  const extras      = useLiveQuery(() => db.extras.where('date').equals(todayStr()).toArray(), []);
  const cashControl = useLiveQuery(() => getTodayCashControl(), []);

  const sorted      = [...(cars ?? [])].sort((a, b) => b.timestamp - a.timestamp);
  const efectivo    = sorted.filter((c) => c.paymentType === 'efectivo').length;
  const tarjeta     = sorted.filter((c) => c.paymentType === 'tarjeta').length;

  const chedrauiList = (extras ?? []).filter((e) => e.type === 'chedraui');
  const traposList   = (extras ?? []).filter((e) => e.type === 'trapo');
  const chedrauiCount = chedrauiList.length;
  const traposQty     = traposList.reduce((s, e) => s + (e.quantity ?? 1), 0);
  const traposTotal   = traposList.reduce((s, e) => s + (e.amount ?? 0), 0);

  const handleChedraui = async () => {
    await addExtra('chedraui', 1, 0);
    vibrate([60]);
    showFlash('success', `Chedraui registrado — total: ${chedrauiCount + 1}`);
  };

  const handleSendSheets = async () => {
    if (!hasSheetsUrl()) { showFlash('error', 'Google Sheets no está configurado'); return; }
    setSending(true);
    const payload = buildFullReport(cars ?? [], [], cashControl, [], todayStr());
    const ok      = await syncToSheets(payload);
    setSending(false);
    showFlash(ok ? 'success' : 'error', ok ? 'Reporte subido correctamente' : 'Error al subir el reporte');
  };

  return (
    <div style={{ minHeight: '100dvh', background: BG }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Encargado</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, marginTop: 1, letterSpacing: '-0.3px' }}>Mako Car Wash</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{formatDate(todayStr())}</div>
          <button onClick={logout} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Salir</button>
        </div>
      </div>

      <div style={{ padding: '16px 16px 60px' }}>
        {/* Registro auto */}
        <button onClick={() => setShowModal(true)} style={{ width: '100%', height: 80, borderRadius: 12, border: 'none', cursor: 'pointer', background: GREEN, color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 10, boxShadow: '0 4px 16px rgba(5,150,105,0.25)' }}>
          + REGISTRAR AUTO
        </button>

        {/* Chedraui + Trapos buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {/* Chedraui */}
          <button
            onClick={handleChedraui}
            style={{ borderRadius: 12, border: '1.5px solid #DDE3EA', cursor: 'pointer', background: '#fff', padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(10,37,64,0.06)' }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: NAVY }}>{chedrauiCount}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chedraui</div>
            <div style={{ fontSize: 11, color: BLUE, fontWeight: 700, marginTop: 2, background: '#EFF6FF', padding: '2px 10px', borderRadius: 20 }}>+ REGISTRAR</div>
          </button>

          {/* Trapos */}
          <button
            onClick={() => setShowTraps(true)}
            style={{ borderRadius: 12, border: '1.5px solid #DDE3EA', cursor: 'pointer', background: '#fff', padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(10,37,64,0.06)' }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: NAVY }}>{traposQty}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trapos · {formatMXN(traposTotal)}</div>
            <div style={{ fontSize: 11, color: ORANGE, fontWeight: 700, marginTop: 2, background: '#FEF3C7', padding: '2px 10px', borderRadius: 20 }}>+ VENDER</div>
          </button>
        </div>

        {/* Stats autos */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { value: sorted.length, label: 'Total', color: NAVY },
            { value: efectivo, label: 'Efectivo', color: GREEN },
            { value: tarjeta,  label: 'Tarjeta',  color: BLUE },
          ].map(({ value, label, color }) => (
            <div key={label} style={{ flex: 1, background: '#fff', borderRadius: 10, padding: '10px 8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(10,37,64,0.06)' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Lista de autos */}
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#BDC5D1' }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Sin registros</div>
            <div style={{ fontSize: 13 }}>Registra el primer auto del día</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Registros de hoy</div>
            {sorted.map((car) => <CarCard key={car.id} car={car} />)}

            <button onClick={handleSendSheets} disabled={sending} style={{ width: '100%', height: 50, borderRadius: 10, border: `1.5px solid ${BLUE}`, cursor: 'pointer', background: 'transparent', color: BLUE, fontSize: 14, fontWeight: 700, letterSpacing: '0.5px', marginTop: 14 }}>
              {sending ? 'Subiendo...' : 'SUBIR REPORTE'}
            </button>
          </>
        )}
      </div>

      {showModal && <RegistroModal onClose={() => setShowModal(false)} />}
      {showTraps && <TrapModal    onClose={() => setShowTraps(false)} />}
    </div>
  );
}
