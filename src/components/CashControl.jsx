import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, getTodayCashControl, setCashControl } from '../db/db';
import useStore from '../store/useStore';
import { formatMXN, formatDate } from '../utils/helpers';
import { syncToSheets, cashControlPayload } from '../utils/sheets';

// ─── NumPad compacto ──────────────────────────────────────────────────────────
function NumPadModal({ label, onConfirm, onCancel }) {
  const [val, setVal] = useState('');
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];

  const handleKey = (k) => {
    if (k === '⌫') { setVal(v => v.slice(0, -1)); return; }
    if (k === '') return;
    if (val.length >= 6) return;
    setVal(v => v + String(k));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">{label}</div>
        <div className="numpad-display">
          {val ? formatMXN(parseInt(val, 10)) : '$0'}
        </div>
        <div className="numpad">
          {keys.map((k, i) => (
            <button key={i}
              className={`numpad-key ${k === '' ? 'empty' : ''} ${k === '⌫' ? 'delete' : ''}`}
              onClick={() => handleKey(k)}>{k}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-success"
            onClick={() => onConfirm(parseInt(val || '0', 10))}>
            Confirmar ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CashControl ─────────────────────────────────────────────────────────────
export default function CashControl() {
  const showFlash   = useStore(s => s.showFlash);
  const [showPad, setShowPad] = useState(null); // 'opening' | 'closing'

  const cashControl = useLiveQuery(() => getTodayCashControl(), []);
  const cars        = useLiveQuery(
    () => db.cars.where('date').equals(todayStr()).toArray(), []
  );

  // Live calculations — update every time a car is paid
  const cashCars    = (cars ?? []).filter(c => c.paymentType === 'efectivo');
  const cardCars    = (cars ?? []).filter(c => c.paymentType === 'tarjeta');
  const cashIncome  = cashCars.length * 120;
  const cardIncome  = cardCars.length * 120;
  const opening     = cashControl?.openingCash ?? null;
  const closing     = cashControl?.closingCash ?? null;
  const enCajaAhora = (opening ?? 0) + cashIncome;
  const diff        = closing != null ? closing - enCajaAhora : null;
  const cuadrada    = diff != null && Math.abs(diff) < 1;

  const handleOpeningConfirm = async (val) => {
    try {
      await setCashControl({ openingCash: val, closingCash: closing });
      showFlash('success', `✅ Apertura: ${formatMXN(val)}`);
    } catch { showFlash('error', 'Error al guardar'); }
    setShowPad(null);
  };

  const handleClosingConfirm = async (val) => {
    try {
      await setCashControl({ openingCash: opening ?? 0, closingCash: val });
      const d = val - enCajaAhora;
      syncToSheets(cashControlPayload(todayStr(), opening ?? 0, val, enCajaAhora, d));
      showFlash('success', Math.abs(d) < 1 ? '✅ Caja cuadrada' : `⚠️ Diferencia: ${formatMXN(Math.abs(d))}`);
    } catch { showFlash('error', 'Error al guardar'); }
    setShowPad(null);
  };

  return (
    <div>
      {/* ── Dinero en caja AHORA (se actualiza solo) ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1D4ED8, #7C3AED)',
        borderRadius: 'var(--radius-xl)', padding: '22px 20px',
        marginBottom: 12, color: '#fff', boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          💵 Efectivo en caja ahora
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1 }}>
          {formatMXN(enCajaAhora)}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {formatMXN(opening ?? 0)}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>Apertura</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {formatMXN(cashIncome)}
            </div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
              + Cobros ({cashCars.length} autos)
            </div>
          </div>
        </div>
      </div>

      {/* ── Tarjeta (info, no va a caja física) ── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue-700)' }}>
              💳 Cobros con tarjeta
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {cardCars.length} autos — va a terminal, no a caja
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue-700)' }}>
            {formatMXN(cardIncome)}
          </div>
        </div>
      </div>

      {/* ── Acciones del día ── */}
      <div className="card-title" style={{ marginBottom: 8 }}>
        {formatDate(todayStr())}
      </div>

      {/* Apertura */}
      <button
        className="btn btn-lg"
        onClick={() => setShowPad('opening')}
        style={{
          background: opening != null ? 'var(--gray-100)' : 'linear-gradient(145deg,#1D4ED8,#1E40AF)',
          color: opening != null ? 'var(--gray-700)' : '#fff',
          border: opening != null ? '2px solid var(--gray-200)' : 'none',
          justifyContent: 'space-between', paddingLeft: 20, paddingRight: 20,
          marginBottom: 10,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Efectivo al abrir caja</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
            {opening != null ? formatMXN(opening) : 'Toca para registrar'}
          </div>
        </div>
        <span style={{ fontSize: 24 }}>{opening != null ? '✏️' : '➕'}</span>
      </button>

      {/* Cierre */}
      <button
        className="btn btn-lg"
        onClick={() => setShowPad('closing')}
        style={{
          background: closing != null ? 'var(--gray-100)' : 'linear-gradient(145deg,#15803D,#16A34A)',
          color: closing != null ? 'var(--gray-700)' : '#fff',
          border: closing != null ? '2px solid var(--gray-200)' : 'none',
          justifyContent: 'space-between', paddingLeft: 20, paddingRight: 20,
          marginBottom: 12,
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Efectivo al cerrar caja</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
            {closing != null ? formatMXN(closing) : 'Registrar al terminar el día'}
          </div>
        </div>
        <span style={{ fontSize: 24 }}>{closing != null ? '✏️' : '🔒'}</span>
      </button>

      {/* ── Resultado del cierre ── */}
      {diff !== null && (
        cuadrada ? (
          <div className="discrepancy-ok">
            <div className="discrepancy-title" style={{ color: 'var(--green-700)', fontSize: 22 }}>
              ✅ Caja cuadrada
            </div>
            <div className="discrepancy-sub">Sin diferencias — todo en orden</div>
          </div>
        ) : (
          <div className="discrepancy-alert">
            <div className="discrepancy-title" style={{ color: 'var(--red-700)', fontSize: 22 }}>
              🔴 {diff < 0 ? 'FALTANTE' : 'SOBRANTE'}: {formatMXN(Math.abs(diff))}
            </div>
            <div style={{ fontSize: 14, color: 'var(--red-700)', marginTop: 6, fontWeight: 600 }}>
              Esperado: {formatMXN(enCajaAhora)} · Contado: {formatMXN(closing)}
            </div>
            <div className="discrepancy-sub" style={{ marginTop: 4 }}>
              Diferencia de {formatMXN(Math.abs(diff))}
            </div>
          </div>
        )
      )}

      {/* NumPad modal */}
      {showPad === 'opening' && (
        <NumPadModal
          label="💵 ¿Cuánto efectivo hay al abrir?"
          onConfirm={handleOpeningConfirm}
          onCancel={() => setShowPad(null)}
        />
      )}
      {showPad === 'closing' && (
        <NumPadModal
          label="🔒 ¿Cuánto efectivo hay al cerrar?"
          onConfirm={handleClosingConfirm}
          onCancel={() => setShowPad(null)}
        />
      )}
    </div>
  );
}
