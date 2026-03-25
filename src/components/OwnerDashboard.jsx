import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, getTodayCashControl } from '../db/db';
import useStore from '../store/useStore';
import { computeStats, computeCashDiscrepancy, formatMXN, formatDate, sameHour } from '../utils/helpers';

// ─── OwnerDashboard ───────────────────────────────────────────────────────────
// Real-time overview for the business owner (remote visibility)
export default function OwnerDashboard() {
  const [now, setNow] = useState(new Date());

  // Refresh clock every minute for "last update" display
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const cars      = useLiveQuery(() => db.cars.where('date').equals(todayStr()).toArray(), []);
  const employees = useLiveQuery(() => db.employees.where('active').equals(1).toArray(), []);
  const cashCtrl  = useLiveQuery(() => getTodayCashControl(), []);
  const incidents = useLiveQuery(() => db.incidents.where('date').equals(todayStr()).toArray(), []);

  if (!cars || !employees) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📡</div>
        <div className="empty-state-title">Cargando datos...</div>
      </div>
    );
  }

  const stats      = computeStats(cars);
  const carsHour   = cars.filter((c) => sameHour(c.timestamp)).length;
  const disc       = computeCashDiscrepancy(cars, cashCtrl);
  const unpaid     = cars.filter((c) => c.status !== 'pagado').length;

  // Last registered car
  const lastCar    = cars.reduce((a, b) => (!a || b.timestamp > a.timestamp) ? b : a, null);
  const minsSinceLast = lastCar
    ? Math.floor((now - lastCar.timestamp) / 60_000)
    : null;

  // Alerts
  const alerts = [];
  if (disc && !disc.ok)                     alerts.push({ icon: '🔴', msg: `Descuadre de caja: ${formatMXN(Math.abs(disc.diff))}` });
  if (unpaid > 0)                           alerts.push({ icon: '⏳', msg: `${unpaid} auto${unpaid !== 1 ? 's' : ''} sin cobrar` });
  if (minsSinceLast != null && minsSinceLast > 30 && stats.total > 0)
                                            alerts.push({ icon: '⚠️', msg: `Sin registros en ${minsSinceLast} minutos` });
  if ((incidents ?? []).length > 0)         alerts.push({ icon: '🔧', msg: `${incidents.length} incidente${incidents.length !== 1 ? 's' : ''} hoy` });

  // Per-employee breakdown
  const empData = (employees ?? [])
    .filter((e) => e.role === 'employee' || e.role === 'manager')
    .map((emp) => {
      const ec = cars.filter((c) => c.employeeId === emp.id);
      return { ...emp, count: ec.length };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      {/* Live indicator + timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="live-indicator">
          <span className="live-dot" />
          EN VIVO
        </span>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>
          {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {alerts.map((a, i) => (
            <div key={i} className="owner-alert-card">
              <span className="owner-alert-icon">{a.icon}</span>
              <span className="owner-alert-msg">{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main revenue banner */}
      <div className="revenue-banner">
        <div className="revenue-label">💰 Ingresos hoy — {formatDate(todayStr())}</div>
        <div className="revenue-amount">{formatMXN(stats.revenue)}</div>
        <div className="revenue-split">
          <div className="revenue-split-item">
            <div className="revenue-split-val">💵 {formatMXN(stats.cashAmt)}</div>
            <div className="revenue-split-lbl">Efectivo ({stats.cashCount})</div>
          </div>
          <div className="revenue-split-item">
            <div className="revenue-split-val">💳 {formatMXN(stats.cardAmt)}</div>
            <div className="revenue-split-lbl">Tarjeta ({stats.cardCount})</div>
          </div>
        </div>
      </div>

      {/* Counters */}
      <div className="counter-row">
        <div className="counter-card">
          <div className="counter-value">{stats.total}</div>
          <div className="counter-label">Autos Hoy</div>
          <div className="counter-sub">{stats.vacuum} aspirados</div>
        </div>
        <div className="counter-card">
          <div className="counter-value" style={{ color: carsHour > 0 ? 'var(--green-600)' : 'var(--gray-400)' }}>
            {carsHour}
          </div>
          <div className="counter-label">Esta Hora</div>
          <div className="counter-sub">
            {minsSinceLast === 0 ? 'Ahora mismo' :
             minsSinceLast != null ? `Hace ${minsSinceLast} min` : '—'}
          </div>
        </div>
      </div>

      {/* Cash Status */}
      <div className="card">
        <div className="card-title">🔒 Estado de Caja</div>
        {disc !== null ? (
          disc.ok ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green-700)', fontWeight: 700 }}>
              <span style={{ fontSize: 24 }}>✅</span> Caja cuadrada
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red-700)', fontWeight: 700 }}>
              <span style={{ fontSize: 24 }}>🔴</span>
              Descuadre: {formatMXN(Math.abs(disc.diff))} {disc.diff < 0 ? 'FALTANTE' : 'SOBRANTE'}
            </div>
          )
        ) : (
          <div style={{ color: '#94A3B8', fontSize: 14 }}>
            {cashCtrl ? 'Cierre pendiente' : 'Sin datos de caja'}
          </div>
        )}
      </div>

      {/* Employee Activity */}
      <div className="card">
        <div className="card-title">👷 Actividad por Empleado</div>
        {empData.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: 14 }}>Sin empleados</div>
        ) : (
          empData.map((emp) => (
            <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
              paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--gray-100)' }}
            >
              <div className="emp-avatar" style={{ background: emp.color, width: 36, height: 36, fontSize: 12 }}>
                {emp.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{emp.name}</div>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  {emp.count} auto{emp.count !== 1 ? 's' : ''}
                </div>
              </div>
              {/* Mini bar */}
              <div style={{ width: 60, background: 'var(--gray-100)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: emp.color,
                  width: stats.total > 0 ? `${Math.round((emp.count / stats.total) * 100)}%` : '0%',
                  transition: 'width 0.3s'
                }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, minWidth: 28, textAlign: 'right' }}>
                {emp.count}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Incidents */}
      {(incidents ?? []).length > 0 && (
        <div className="card">
          <div className="card-title">⚠️ Incidentes ({incidents.length})</div>
          {incidents.slice(-3).map((inc) => {
            const labels = { maquina: '🔧 Máquina', queja: '😠 Queja', retraso: '⏰ Retraso', otro: '📝 Otro' };
            const emp    = employees?.find((e) => e.id === inc.employeeId);
            return (
              <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between',
                paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--gray-100)', fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{labels[inc.type]}</span>
                <span style={{ color: '#64748B' }}>{emp?.name ?? ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
