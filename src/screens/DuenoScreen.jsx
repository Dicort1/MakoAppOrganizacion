import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, getTodayCashControl, setCashControl, addExtra } from '../db/db';
import useStore from '../store/useStore';
import { formatMXN, formatTime, formatDate } from '../utils/helpers';
import { syncToSheets, buildFullReport, hasSheetsUrl, getSheetsUrl, setSheetsUrl } from '../utils/sheets';

const NAVY   = '#0A2540';
const GREEN  = '#059669';
const BLUE   = '#1255CC';
const ORANGE = '#D97706';
const BG     = '#F5F7FA';

// ─── NumPad modal ─────────────────────────────────────────────────────────────
function NumPadModal({ label, onConfirm, onCancel }) {
  const [val, setVal] = useState('');
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,37,64,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', borderRadius: '18px 18px 0 0', padding: '0 20px 40px', width: '100%' }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: '#DDE3EA', margin: '12px auto 20px' }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
          {label}
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, color: val ? NAVY : '#DDE3EA', textAlign: 'center', marginBottom: 12 }}>
          {val ? formatMXN(parseInt(val, 10)) : '$0'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {keys.map((k, i) => (
            <button
              key={i}
              onClick={() => {
                if (k === '') return;
                if (k === '⌫') { setVal((v) => v.slice(0, -1)); return; }
                if (val.length < 6) setVal((v) => v + String(k));
              }}
              style={{
                height: 58, borderRadius: 10,
                background: k === '' ? 'transparent' : k === '⌫' ? '#FEF2F2' : '#F5F7FA',
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 50, borderRadius: 10, border: '1.5px solid #DDE3EA', background: 'transparent', color: '#6B7280', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(parseInt(val || '0', 10))} style={{ flex: 2, height: 50, borderRadius: 10, border: 'none', background: NAVY, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Car card ─────────────────────────────────────────────────────────────────
function CarCard({ car }) {
  const isEfectivo = car.paymentType === 'efectivo';
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 6,
      display: 'flex', alignItems: 'center', gap: 12,
      borderLeft: `3px solid ${isEfectivo ? GREEN : BLUE}`,
      boxShadow: '0 1px 3px rgba(10,37,64,0.06)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, fontFamily: 'monospace, monospace', letterSpacing: '0.5px' }}>
          {car.ticketId}
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{formatTime(car.timestamp)}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {car.hasVacuum ? (
          <span style={{ fontSize: 11, background: '#EFF6FF', color: BLUE, padding: '2px 8px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.3px' }}>
            ASP
          </span>
        ) : null}
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.3px',
          background: isEfectivo ? '#ECFDF5' : '#EFF6FF',
          color: isEfectivo ? GREEN : BLUE,
        }}>
          {isEfectivo ? 'EFECTIVO' : 'TARJETA'}
        </span>
      </div>
    </div>
  );
}

// ─── DuenoScreen ──────────────────────────────────────────────────────────────
export default function DuenoScreen() {
  const logout    = useStore((s) => s.logout);
  const showFlash = useStore((s) => s.showFlash);
  const [showPad,    setShowPad]    = useState(null);
  const [sending,    setSending]    = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sheetsUrl,  setSheetsUrlLocal] = useState(getSheetsUrl);

  const cars        = useLiveQuery(() => db.cars.where('date').equals(todayStr()).toArray(), []);
  const cashControl = useLiveQuery(() => getTodayCashControl(), []);
  const extras      = useLiveQuery(() => db.extras.where('date').equals(todayStr()).toArray(), []);

  const sorted        = [...(cars ?? [])].sort((a, b) => b.timestamp - a.timestamp);
  const efectivoCars  = sorted.filter((c) => c.paymentType === 'efectivo');
  const tarjetaCars   = sorted.filter((c) => c.paymentType === 'tarjeta');
  const totalEfectivo = efectivoCars.length * 120;
  const totalTarjeta  = tarjetaCars.length * 120;
  const totalRevenue  = totalEfectivo + totalTarjeta;

  const chedrauiCount = (extras ?? []).filter((e) => e.type === 'chedraui').length;
  const traposList    = (extras ?? []).filter((e) => e.type === 'trapo');
  const traposQty     = traposList.reduce((s, e) => s + (e.quantity ?? 1), 0);
  const traposTotal   = traposList.reduce((s, e) => s + (e.amount ?? 0), 0);

  const opening  = cashControl?.openingCash ?? null;
  const closing  = cashControl?.closingCash ?? null;
  const enCaja   = (opening ?? 0) + totalEfectivo;
  const diff     = closing != null ? closing - enCaja : null;
  const cuadrada = diff != null && Math.abs(diff) < 1;

  const handleApertura = async (val) => {
    await setCashControl({ openingCash: val, closingCash: closing });
    showFlash('success', `Apertura registrada: ${formatMXN(val)}`);
    setShowPad(null);
  };

  const handleCierre = async (val) => {
    await setCashControl({ openingCash: opening ?? 0, closingCash: val });
    const d = val - enCaja;
    showFlash('success', Math.abs(d) < 1 ? 'Caja cuadrada' : `Diferencia: ${formatMXN(Math.abs(d))}`);
    setShowPad(null);
  };

  const handleSendSheets = async () => {
    if (!hasSheetsUrl()) { showFlash('error', 'Configura la URL de Google Sheets'); setShowConfig(true); return; }
    setSending(true);
    const payload = buildFullReport(cars ?? [], [], cashControl, [], todayStr());
    const ok      = await syncToSheets(payload);
    setSending(false);
    showFlash(ok ? 'success' : 'error', ok ? 'Reporte subido correctamente' : 'Error al subir el reporte');
  };

  const card = (children, mb = 12) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px', marginBottom: mb, boxShadow: '0 1px 3px rgba(10,37,64,0.06)' }}>
      {children}
    </div>
  );

  const sectionLabel = (text) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
      {text}
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: BG }}>
      {/* Header */}
      <div style={{
        background: NAVY, padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Dueño
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, marginTop: 1, letterSpacing: '-0.3px' }}>
            Mako Car Wash
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{formatDate(todayStr())}</div>
          <button
            onClick={logout}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Salir
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 16px 60px' }}>
        {/* Revenue */}
        {card(
          <>
            {sectionLabel('Ingresos de hoy')}
            <div style={{ fontSize: 42, fontWeight: 900, color: NAVY, letterSpacing: '-1.5px', lineHeight: 1 }}>
              {formatMXN(totalRevenue)}
            </div>
            <div style={{ display: 'flex', marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0F2F5' }}>
              <div style={{ flex: 1, borderRight: '1px solid #F0F2F5', paddingRight: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: GREEN }}>{formatMXN(totalEfectivo)}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: 600 }}>EFECTIVO · {efectivoCars.length} autos</div>
              </div>
              <div style={{ flex: 1, paddingLeft: 12, borderRight: '1px solid #F0F2F5', paddingRight: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: BLUE }}>{formatMXN(totalTarjeta)}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: 600 }}>TARJETA · {tarjetaCars.length} autos</div>
              </div>
              <div style={{ flex: 0.6, paddingLeft: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>{sorted.length}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: 600 }}>TOTAL</div>
              </div>
            </div>
          </>
        )}

        {/* Chedraui + Trapos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(10,37,64,0.06)', borderLeft: `3px solid ${BLUE}` }}>
            {sectionLabel('Chedraui hoy')}
            <div style={{ fontSize: 36, fontWeight: 900, color: NAVY }}>{chedrauiCount}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>autos registrados</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(10,37,64,0.06)', borderLeft: `3px solid ${ORANGE}` }}>
            {sectionLabel('Trapos hoy')}
            <div style={{ fontSize: 36, fontWeight: 900, color: NAVY }}>{traposQty}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>vendidos · {formatMXN(traposTotal)}</div>
          </div>
        </div>

        {/* Car list */}
        {card(
          <>
            {sectionLabel('Autos registrados hoy')}
            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#BDC5D1', fontSize: 13 }}>
                Sin registros aún
              </div>
            ) : sorted.map((car) => <CarCard key={car.id} car={car} />)}
          </>
        )}

        {/* Control de caja */}
        {card(
          <>
            {sectionLabel('Control de caja')}
            {/* Efectivo en caja */}
            <div style={{ background: NAVY, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Efectivo en caja ahora
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginTop: 4, letterSpacing: '-0.5px' }}>
                {formatMXN(enCaja)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                Apertura {formatMXN(opening ?? 0)} + Cobros {formatMXN(totalEfectivo)}
              </div>
            </div>

            {/* Apertura / Cierre */}
            {[
              { key: 'apertura', label: 'Efectivo al abrir', value: opening, pad: 'apertura' },
              { key: 'cierre',   label: 'Efectivo al cerrar', value: closing, pad: 'cierre' },
            ].map(({ key, label, value, pad }) => (
              <button
                key={key}
                onClick={() => setShowPad(pad)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
                  background: '#F5F7FA', border: '1.5px solid #DDE3EA',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: NAVY, marginTop: 2 }}>
                    {value != null ? formatMXN(value) : '— Pendiente'}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#BDC5D1', fontWeight: 600 }}>
                  {value != null ? 'Editar' : 'Registrar'}
                </div>
              </button>
            ))}

            {/* Resultado */}
            {diff !== null && (
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginTop: 4,
                background: cuadrada ? '#ECFDF5' : '#FEF2F2',
                border: `1.5px solid ${cuadrada ? '#6EE7B7' : '#FECACA'}`,
              }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: cuadrada ? GREEN : '#DC2626' }}>
                  {cuadrada ? 'Caja cuadrada' : `${diff < 0 ? 'Faltante' : 'Sobrante'}: ${formatMXN(Math.abs(diff))}`}
                </div>
                {!cuadrada && (
                  <div style={{ fontSize: 12, color: '#F87171', marginTop: 4 }}>
                    Esperado {formatMXN(enCaja)} · Contado {formatMXN(closing)}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Google Sheets */}
        {card(
          <>
            {sectionLabel('Google Sheets')}
            <button
              onClick={handleSendSheets}
              disabled={sending}
              style={{
                width: '100%', height: 50, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: sending ? '#DDE3EA' : NAVY,
                color: sending ? '#9CA3AF' : '#fff',
                fontSize: 14, fontWeight: 800, letterSpacing: '0.5px',
                marginBottom: 10,
              }}
            >
              {sending ? 'Subiendo...' : 'SUBIR REPORTE'}
            </button>

            <button
              onClick={() => setShowConfig((v) => !v)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer', padding: '2px 0', fontWeight: 600 }}
            >
              {showConfig ? 'Ocultar configuración' : '+ Configurar URL'}
            </button>

            {showConfig && (
              <div style={{ marginTop: 10 }}>
                <input
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1.5px solid #DDE3EA', fontSize: 13, marginBottom: 8,
                    outline: 'none', fontFamily: 'inherit', color: NAVY,
                    background: '#F5F7FA',
                  }}
                  placeholder="https://script.google.com/macros/s/..."
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrlLocal(e.target.value)}
                />
                <button
                  onClick={() => { setSheetsUrl(sheetsUrl); showFlash('success', 'URL guardada'); setShowConfig(false); }}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: NAVY, color: '#fff', fontWeight: 700, fontSize: 14 }}
                >
                  Guardar
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showPad === 'apertura' && (
        <NumPadModal label="Efectivo al abrir caja" onConfirm={handleApertura} onCancel={() => setShowPad(null)} />
      )}
      {showPad === 'cierre' && (
        <NumPadModal label="Efectivo al cerrar caja" onConfirm={handleCierre} onCancel={() => setShowPad(null)} />
      )}
    </div>
  );
}
