import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr } from '../db/db';
import { computeStats, sameHour } from '../utils/helpers';

export default function LiveCounter() {
  const cars = useLiveQuery(
    () => db.cars.where('date').equals(todayStr()).toArray(),
    []
  );

  if (!cars) return null;

  const stats     = computeStats(cars);
  const carsHour  = cars.filter((c) => sameHour(c.timestamp)).length;
  const pending   = cars.filter((c) => c.status !== 'pagado').length;

  return (
    <>
      {/* Revenue banner */}
      <div className="revenue-banner">
        <div className="revenue-label">Ingresos del día</div>
        <div className="revenue-amount">
          ${stats.revenue.toLocaleString('es-MX')} MXN
        </div>
        <div className="revenue-split">
          <div className="revenue-split-item">
            <div className="revenue-split-val">💵 ${stats.cashAmt.toLocaleString('es-MX')}</div>
            <div className="revenue-split-lbl">Efectivo ({stats.cashCount})</div>
          </div>
          <div className="revenue-split-item">
            <div className="revenue-split-val">💳 ${stats.cardAmt.toLocaleString('es-MX')}</div>
            <div className="revenue-split-lbl">Tarjeta ({stats.cardCount})</div>
          </div>
        </div>
      </div>

      {/* Counters row */}
      <div className="counter-row">
        <div className="counter-card">
          <div className="counter-value">{stats.total}</div>
          <div className="counter-label">Hoy</div>
          <div className="counter-sub">{stats.vacuum} con aspirado</div>
        </div>
        <div className="counter-card">
          <div className="counter-value" style={{ color: 'var(--green-600)' }}>{carsHour}</div>
          <div className="counter-label">Esta hora</div>
          <div className="counter-sub">{carsHour * 15} min/hora</div>
        </div>
      </div>

      {/* Pending alert */}
      {pending > 0 && (
        <div style={{
          background: 'var(--orange-50)',
          border: '2px solid var(--orange-100)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--orange-600)'
        }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          {pending} auto{pending !== 1 ? 's' : ''} sin cobrar
        </div>
      )}
    </>
  );
}
