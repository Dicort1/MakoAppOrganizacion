import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, markCarPagado } from '../db/db';
import useStore from '../store/useStore';
import { formatTime, getInitials, playSuccess, vibrate } from '../utils/helpers';

export default function PaymentModal() {
  const selectedCarId = useStore((s) => s.selectedCarId);
  const closePayment  = useStore((s) => s.closePayment);
  const showFlash     = useStore((s) => s.showFlash);
  const [saving, setSaving] = useState(false);

  const car = useLiveQuery(
    () => selectedCarId ? db.cars.get(selectedCarId) : null,
    [selectedCarId]
  );

  const employees = useLiveQuery(() => db.employees.toArray(), []);
  const emp = employees?.find((e) => e.id === car?.employeeId);

  if (!car) return null;

  const handlePay = async (paymentType) => {
    setSaving(true);
    try {
      await markCarPagado(selectedCarId, paymentType);
      playSuccess();
      vibrate([80, 40, 80, 40, 80]);
      const label = paymentType === 'efectivo' ? '💵 Pago en efectivo' : '💳 Pago con tarjeta';
      showFlash('success', `${label} — $120 MXN`);
      closePayment();
    } catch (e) {
      showFlash('error', 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closePayment()}>
      <div className="modal-sheet">
        <div className="modal-handle" />

        {/* Ticket info */}
        <div style={{
          background: 'var(--gray-50)', borderRadius: 'var(--radius)',
          padding: '14px', marginBottom: 20,
          border: '1px solid var(--gray-200)'
        }}>
          <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color: 'var(--gray-800)' }}>
            {car.ticketId}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', fontSize: 14, color: '#64748B' }}>
            <span>🕐 {formatTime(car.timestamp)}</span>
            {emp && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: emp.color, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff', fontWeight: 700
                }}>
                  {getInitials(emp.name)}
                </span>
                {emp.name}
              </span>
            )}
            {car.hasVacuum ? <span className="car-badge-vacuum">🌀 Aspirado</span> : null}
          </div>
        </div>

        {/* Amount */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total a cobrar
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1.1 }}>
            $120
          </div>
          <div style={{ fontSize: 16, color: '#64748B' }}>pesos MXN</div>
        </div>

        {/* Payment type buttons */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase',
          letterSpacing: '0.5px', marginBottom: 10 }}>
          ¿Cómo pagó?
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 10 }}>
          <button
            className="btn btn-success btn-xl"
            onClick={() => !saving && handlePay('efectivo')}
            disabled={saving}
            style={{
              background: 'linear-gradient(145deg, #16A34A, #15803D)',
              boxShadow: '0 4px 14px rgba(22,163,74,0.35)'
            }}
          >
            <span style={{ fontSize: 32 }}>💵</span>
            <span>EFECTIVO</span>
          </button>
          <button
            className="btn btn-primary btn-xl"
            onClick={() => !saving && handlePay('tarjeta')}
            disabled={saving}
            style={{
              background: 'linear-gradient(145deg, #2563EB, #1D4ED8)',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
            }}
          >
            <span style={{ fontSize: 32 }}>💳</span>
            <span>TARJETA</span>
          </button>
        </div>

        <button className="btn btn-ghost" onClick={closePayment}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
