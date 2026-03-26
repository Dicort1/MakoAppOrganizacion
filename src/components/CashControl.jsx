import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, getTodayCashControl, setCashControl } from '../db/db';
import useStore from '../store/useStore';
import { formatMXN, computeCashDiscrepancy, formatDate } from '../utils/helpers';
import { syncToSheets, cashControlPayload } from '../utils/sheets';

// ─── Simple numeric input with numpad ────────────────────────────────────────
function CashInput({ label, value, onChange, onSave }) {
  const [local, setLocal] = useState(value != null ? String(value) : '');
  const [editing, setEditing] = useState(false);

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];

  const handleKey = (k) => {
    if (k === '⌫') { setLocal((v) => v.slice(0, -1)); return; }
    if (k === '') return;
    if (local.length >= 6) return;     // max $999,999
    setLocal((v) => v + String(k));
  };

  const handleSave = () => {
    const num = parseInt(local, 10);
    if (!isNaN(num)) { onChange(num); onSave(num); }
    setEditing(false);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="section-label">{label}</div>
      {!editing ? (
        <button
          className="btn btn-outline btn-lg"
          onClick={() => setEditing(true)}
          style={{ justifyContent: 'space-between', paddingLeft: 20, paddingRight: 20 }}
        >
          <span>{value != null ? formatMXN(value) : 'Toca para ingresar'}</span>
          <span>✏️</span>
        </button>
      ) : (
        <>
          <div className="numpad-display">
            {local ? `$${parseInt(local, 10).toLocaleString('es-MX')}` : '$0'}
          </div>
          <div className="numpad">
            {keys.map((k, i) => (
              <button
                key={i}
                className={`numpad-key ${k === '' ? 'empty' : ''} ${k === '⌫' ? 'delete' : ''}`}
                onClick={() => handleKey(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
            <button className="btn btn-success" onClick={handleSave}>Guardar ✓</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── CashControl ─────────────────────────────────────────────────────────────
export default function CashControl() {
  const showFlash = useStore((s) => s.showFlash);

  const cashControl = useLiveQuery(() => getTodayCashControl(), []);
  const cars = useLiveQuery(
    () => db.cars.where('date').equals(todayStr()).toArray(), []
  );

  const [opening, setOpening] = useState(null);
  const [closing, setClosing] = useState(null);

  // Sync with DB values
  useEffect(() => {
    if (cashControl) {
      setOpening(cashControl.openingCash ?? null);
      setClosing(cashControl.closingCash ?? null);
    }
  }, [cashControl?.id]);

  const save = async (field, val) => {
    try {
      const updates = field === 'opening'
        ? { openingCash: val, closingCash: closing }
        : { openingCash: opening, closingCash: val };
      await setCashControl(updates);
      showFlash('success', '✅ Guardado');
      // Sync to sheets when closing cash is set (end of day)
      if (field === 'closing') {
        const cashIncome = (cars ?? []).filter((c) => c.paymentType === 'efectivo').length * 120;
        const expected   = (opening ?? 0) + cashIncome;
        const diff       = val - expected;
        syncToSheets(cashControlPayload(todayStr(), opening ?? 0, val, expected, diff));
      }
    } catch {
      showFlash('error', 'Error al guardar');
    }
  };

  // Compute stats
  const cashCars   = (cars ?? []).filter((c) => c.paymentType === 'efectivo');
  const cashIncome = cashCars.length * 120;
  const discrepancy = computeCashDiscrepancy(cars ?? [], cashControl);

  return (
    <div>
      <div className="card">
        <div className="card-title">💵 Control de Caja — {formatDate(todayStr())}</div>

        <CashInput
          label="Efectivo al abrir caja"
          value={opening}
          onChange={setOpening}
          onSave={(v) => save('opening', v)}
        />

        <CashInput
          label="Efectivo al cerrar caja"
          value={closing}
          onChange={setClosing}
          onSave={(v) => save('closing', v)}
        />
      </div>

      {/* Summary */}
      <div className="card">
        <div className="card-title">Resumen de efectivo</div>

        <div className="cash-row">
          <div className="cash-row-label">💰 Apertura</div>
          <div className="cash-row-value">{opening != null ? formatMXN(opening) : '—'}</div>
        </div>

        <div className="cash-row">
          <div className="cash-row-label">🚗 Cobros en efectivo ({cashCars.length} autos)</div>
          <div className="cash-row-value">{formatMXN(cashIncome)}</div>
        </div>

        <div className="cash-row" style={{ borderTop: '2px solid var(--gray-200)', marginTop: 4, paddingTop: 16 }}>
          <div className="cash-row-label" style={{ fontWeight: 700 }}>📊 Esperado en caja</div>
          <div className="cash-row-value" style={{ fontSize: 20 }}>
            {formatMXN((opening ?? 0) + cashIncome)}
          </div>
        </div>

        <div className="cash-row">
          <div className="cash-row-label">🔒 Cierre registrado</div>
          <div className="cash-row-value">{closing != null ? formatMXN(closing) : '—'}</div>
        </div>
      </div>

      {/* Discrepancy Result */}
      {discrepancy !== null && (
        discrepancy.ok ? (
          <div className="discrepancy-ok">
            <div className="discrepancy-title" style={{ color: 'var(--green-700)' }}>
              ✅ Caja cuadrada
            </div>
            <div className="discrepancy-sub">Sin diferencias detectadas</div>
          </div>
        ) : (
          <div className="discrepancy-alert">
            <div className="discrepancy-title" style={{ color: 'var(--red-700)' }}>
              🔴 DESCUADRE: {formatMXN(Math.abs(discrepancy.diff))}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4,
              color: discrepancy.diff < 0 ? 'var(--red-700)' : 'var(--orange-600)' }}>
              {discrepancy.diff < 0 ? '⬇️ FALTANTE' : '⬆️ SOBRANTE'}
            </div>
            <div className="discrepancy-sub">
              Esperado: {formatMXN(discrepancy.expected)} · Registrado: {formatMXN(discrepancy.actual)}
            </div>
          </div>
        )
      )}

      {discrepancy === null && closing == null && (
        <div style={{ textAlign: 'center', padding: '16px', fontSize: 14, color: '#94A3B8' }}>
          Ingresa el cierre de caja para ver si hay diferencias
        </div>
      )}
    </div>
  );
}
