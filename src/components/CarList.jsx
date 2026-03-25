import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, markCarListo } from '../db/db';
import useStore from '../store/useStore';
import { formatTime, getInitials } from '../utils/helpers';

// ─── Single Car Card ──────────────────────────────────────────────────────────
function CarCard({ car, employees, onTap }) {
  const emp = employees?.find((e) => e.id === car.employeeId);

  const statusLabel = { activo: 'Lavando', listo: 'Listo', pagado: 'Pagado' }[car.status];
  const badgeClass  = { activo: 'badge-activo', listo: 'badge-listo', pagado: 'badge-pagado' }[car.status];

  return (
    <div
      className={`car-card status-${car.status} ${car.status === 'listo' ? 'car-card-pulse' : ''}`}
      onClick={() => onTap(car)}
    >
      {/* Left icon */}
      <div className="car-card-icon">
        {car.status === 'pagado' ? '✅' : car.status === 'listo' ? '🟠' : '🔵'}
      </div>

      {/* Info */}
      <div className="car-card-info">
        <div className="car-ticket">{car.ticketId}</div>
        <div className="car-meta">
          <span>🕐 {formatTime(car.timestamp)}</span>
          {emp && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: emp.color, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff', fontWeight: 700
                }}
              >
                {getInitials(emp.name)}
              </span>
              {emp.name}
            </span>
          )}
          {car.hasVacuum ? (
            <span className="car-badge-vacuum">🌀 Aspirado</span>
          ) : null}
        </div>
      </div>

      {/* Right status */}
      <div className="car-card-right">
        <span className={`status-badge ${badgeClass}`}>{statusLabel}</span>
        {car.paymentType && (
          <div style={{ marginTop: 4, fontSize: 12, color: '#64748B', textAlign: 'right' }}>
            {car.paymentType === 'efectivo' ? '💵' : '💳'}
          </div>
        )}
        {/* Tap hint for actionable states */}
        {car.status !== 'pagado' && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
            {car.status === 'activo' ? 'Toca › Listo' : 'Toca › Cobrar'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CarList ─────────────────────────────────────────────────────────────────
export default function CarList({ filterStatus, showAll = false, employeeId = null }) {
  const openPayment  = useStore((s) => s.openPayment);
  const showFlash    = useStore((s) => s.showFlash);

  const cars = useLiveQuery(
    () => db.cars.where('date').equals(todayStr()).toArray(),
    []
  );

  const employees = useLiveQuery(() => db.employees.toArray(), []);

  if (!cars) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⏳</div>
        <div className="empty-state-title">Cargando...</div>
      </div>
    );
  }

  // Apply filters
  let filtered = [...cars].sort((a, b) => b.timestamp - a.timestamp);
  if (filterStatus)  filtered = filtered.filter((c) => c.status === filterStatus);
  if (employeeId)    filtered = filtered.filter((c) => c.employeeId === employeeId);
  if (!showAll)      filtered = filtered.slice(0, 30); // show last 30 for performance

  if (filtered.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🚗</div>
        <div className="empty-state-title">Sin autos aún</div>
        <div className="empty-state-sub">Registra el primer auto del día</div>
      </div>
    );
  }

  const handleTap = async (car) => {
    if (car.status === 'activo') {
      // Mark as listo (wash complete)
      await markCarListo(car.id);
      showFlash('success', '✅ Auto marcado como Listo');
    } else if (car.status === 'listo') {
      // Open payment modal
      openPayment(car.id);
    }
    // pagado: no action
  };

  return (
    <div>
      {filtered.map((car) => (
        <CarCard
          key={car.id}
          car={car}
          employees={employees}
          onTap={handleTap}
        />
      ))}
      {!showAll && cars.length > 30 && (
        <div style={{ textAlign: 'center', padding: '10px', fontSize: 13, color: '#64748B' }}>
          Mostrando los últimos 30 registros
        </div>
      )}
    </div>
  );
}
