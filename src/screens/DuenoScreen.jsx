import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, getTodayCashControl, setCashControl } from '../db/db';
import useStore from '../store/useStore';
import { formatMXN, formatTime, formatDate } from '../utils/helpers';
import { syncToSheets, buildFullReport, hasSheetsUrl, getSheetsUrl, setSheetsUrl } from '../utils/sheets';

// ─── NumPad modal ─────────────────────────────────────────────────────────────
function NumPadModal({ label, onConfirm, onCancel }) {
  const [val, setVal] = useState('');
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '8px 20px 40px', width: '100%' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#CBD5E1', margin: '10px auto 18px' }} />
        <div style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 16 }}>{label}</div>
        <div style={{
          fontSize: 38, fontWeight: 800, textAlign: 'center', marginBottom: 16,
          color: val ? '#0F172A' : '#CBD5E1',
        }}>
          {val ? formatMXN(parseInt(val, 10)) : '$0'}
        </div>
        <div className="numpad">
          {keys.map((k, i) => (
            <button
              key={i}
              className={`numpad-key ${k === '' ? 'empty' : ''} ${k === '⌫' ? 'delete' : ''}`}
              onClick={() => {
                if (k === '') return;
                if (k === '⌫') { setVal((v) => v.slice(0, -1)); return; }
                if (val.length < 6) setVal((v) => v + String(k));
              }}
            >
              {k}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
          <button className="btn btn-success" style={{ flex: 2 }} onClick={() => onConfirm(parseInt(val || '0', 10))}>
            Confirmar ✓
          </button>
        </div>
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

// ─── DuenoScreen ──────────────────────────────────────────────────────────────
export default function DuenoScreen() {
  const logout    = useStore((s) => s.logout);
  const showFlash = useStore((s) => s.showFlash);
  const [showPad,    setShowPad]    = useState(null); // 'apertura' | 'cierre'
  const [sending,    setSending]    = useState(false);
  const [showSheets, setShowSheets] = useState(false);
  const [sheetsUrl,  setSheetsUrlLocal] = useState(getSheetsUrl);

  const cars        = useLiveQuery(() => db.cars.where('date').equals(todayStr()).toArray(), []);
  const cashControl = useLiveQuery(() => getTodayCashControl(), []);

  const sorted       = [...(cars ?? [])].sort((a, b) => b.timestamp - a.timestamp);
  const efectivoCars = sorted.filter((c) => c.paymentType === 'efectivo');
  const tarjetaCars  = sorted.filter((c) => c.paymentType === 'tarjeta');
  const totalEfectivo = efectivoCars.length * 120;
  const totalTarjeta  = tarjetaCars.length * 120;
  const totalRevenue  = totalEfectivo + totalTarjeta;

  const opening   = cashControl?.openingCash ?? null;
  const closing   = cashControl?.closingCash ?? null;
  const enCaja    = (opening ?? 0) + totalEfectivo;
  const diff      = closing != null ? closing - enCaja : null;
  const cuadrada  = diff != null && Math.abs(diff) < 1;

  const handleApertura = async (val) => {
    await setCashControl({ openingCash: val, closingCash: closing });
    showFlash('success', `✅ Apertura: ${formatMXN(val)}`);
    setShowPad(null);
  };

  const handleCierre = async (val) => {
    await setCashControl({ openingCash: opening ?? 0, closingCash: val });
    const d = val - enCaja;
    showFlash('success', Math.abs(d) < 1 ? '✅ Caja cuadrada' : `⚠️ Diferencia: ${formatMXN(Math.abs(d))}`);
    setShowPad(null);
  };

  const handleSendSheets = async () => {
    if (!hasSheetsUrl()) { showFlash('error', 'Configura la URL de Google Sheets primero'); setShowSheets(true); return; }
    setSending(true);
    const payload = buildFullReport(cars ?? [], [], cashControl, [], todayStr());
    const ok      = await syncToSheets(payload);
    setSending(false);
    showFlash(ok ? 'success' : 'error', ok ? '📊 Reporte enviado a Google Sheets ✅' : '⚠️ Revisa tu conexión');
  };

  const sectionStyle = {
    background: '#fff', borderRadius: 14, padding: '16px 16px', marginBottom: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  };
  const sectionTitle = { fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div style={{ minHeight: '100dvh', background: '#F1F5F9' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #7C3AED, #1D4ED8)',
        padding: '18px 20px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 19 }}>👑 Panel Dueño</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 1 }}>
            Mako Car Wash — {formatDate(todayStr())}
          </div>
        </div>
        <button
          onClick={logout}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Salir
        </button>
      </div>

      <div style={{ padding: '16px 16px 60px' }}>
        {/* Revenue banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1D4ED8, #7C3AED)',
          borderRadius: 16, padding: '20px', marginBottom: 12, color: '#fff',
          boxShadow: '0 6px 20px rgba(37,99,235,0.25)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total cobrado hoy
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, marginTop: 4 }}>
            {formatMXN(totalRevenue)}
          </div>
          <div style={{ display: 'flex', gap: 0, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{formatMXN(totalEfectivo)}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>💵 Efectivo ({efectivoCars.length})</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{formatMXN(totalTarjeta)}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>💳 Tarjeta ({tarjetaCars.length})</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{sorted.length}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>🚗 Autos</div>
            </div>
          </div>
        </div>

        {/* Car list */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Autos de hoy</div>
          {sorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🚗</div>
              <div style={{ fontSize: 14 }}>Sin registros aún</div>
            </div>
          ) : (
            sorted.map((car) => <CarCard key={car.id} car={car} />)
          )}
        </div>

        {/* Control de Caja */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>💵 Control de Caja</div>

          {/* Efectivo en caja ahora */}
          <div style={{
            background: 'linear-gradient(135deg, #1D4ED8, #7C3AED)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 12, color: '#fff',
          }}>
            <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 600, textTransform: 'uppercase' }}>Efectivo en caja ahora</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{formatMXN(enCaja)}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: 13 }}>
              <div>Apertura: <strong>{formatMXN(opening ?? 0)}</strong></div>
              <div>+ Cobros: <strong>{formatMXN(totalEfectivo)}</strong></div>
            </div>
          </div>

          {/* Apertura */}
          <button
            onClick={() => setShowPad('apertura')}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, marginBottom: 8, cursor: 'pointer',
              background: opening != null ? '#F8FAFC' : 'linear-gradient(145deg,#1D4ED8,#1E40AF)',
              color: opening != null ? '#334155' : '#fff',
              border: opening != null ? '2px solid #E2E8F0' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Efectivo al abrir</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
                {opening != null ? formatMXN(opening) : 'Registrar apertura'}
              </div>
            </div>
            <span style={{ fontSize: 22 }}>{opening != null ? '✏️' : '➕'}</span>
          </button>

          {/* Cierre */}
          <button
            onClick={() => setShowPad('cierre')}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
              background: closing != null ? '#F8FAFC' : 'linear-gradient(145deg,#15803D,#16A34A)',
              color: closing != null ? '#334155' : '#fff',
              border: closing != null ? '2px solid #E2E8F0' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Efectivo al cerrar</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
                {closing != null ? formatMXN(closing) : 'Registrar al cierre'}
              </div>
            </div>
            <span style={{ fontSize: 22 }}>{closing != null ? '✏️' : '🔒'}</span>
          </button>

          {/* Resultado */}
          {diff !== null && (
            <div style={{
              marginTop: 12, padding: '12px 14px', borderRadius: 12,
              background: cuadrada ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${cuadrada ? '#BBF7D0' : '#FECACA'}`,
            }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: cuadrada ? '#15803D' : '#B91C1C' }}>
                {cuadrada ? '✅ Caja cuadrada' : `🔴 ${diff < 0 ? 'FALTANTE' : 'SOBRANTE'}: ${formatMXN(Math.abs(diff))}`}
              </div>
              {!cuadrada && (
                <div style={{ fontSize: 13, color: '#DC2626', marginTop: 4 }}>
                  Esperado {formatMXN(enCaja)} · Contado {formatMXN(closing)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Google Sheets */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>📊 Google Sheets</div>

          <button
            onClick={handleSendSheets}
            disabled={sending}
            style={{
              width: '100%', height: 56, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: sending ? '#94A3B8' : 'linear-gradient(145deg,#16A34A,#15803D)',
              color: '#fff', fontSize: 17, fontWeight: 800,
              boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 22 }}>📊</span>
            {sending ? 'Enviando...' : 'ENVIAR REPORTE'}
          </button>

          {/* Sheets URL config */}
          <button
            onClick={() => setShowSheets((v) => !v)}
            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ⚙️ {showSheets ? 'Ocultar configuración' : 'Configurar URL'}
          </button>

          {showSheets && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
                URL de tu Google Apps Script:
              </div>
              <input
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '2px solid #E2E8F0', fontSize: 13, marginBottom: 8,
                  outline: 'none', fontFamily: 'inherit',
                }}
                placeholder="https://script.google.com/macros/s/..."
                value={sheetsUrl}
                onChange={(e) => setSheetsUrlLocal(e.target.value)}
              />
              <button
                onClick={() => { setSheetsUrl(sheetsUrl); showFlash('success', '✅ URL guardada'); setShowSheets(false); }}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(145deg,#1D4ED8,#1E40AF)', color: '#fff', fontWeight: 700, fontSize: 15,
                }}
              >
                Guardar
              </button>
              {getSheetsUrl() && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
                  ✅ URL configurada
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPad === 'apertura' && (
        <NumPadModal label="💵 ¿Cuánto efectivo hay al abrir?" onConfirm={handleApertura} onCancel={() => setShowPad(null)} />
      )}
      {showPad === 'cierre' && (
        <NumPadModal label="🔒 ¿Cuánto efectivo hay al cerrar?" onConfirm={handleCierre} onCancel={() => setShowPad(null)} />
      )}
    </div>
  );
}
