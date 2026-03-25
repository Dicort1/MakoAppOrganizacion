import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr } from '../db/db';
import { computeEmployeeStats, getInitials, formatDate } from '../utils/helpers';

// ─── EmployeeStats — shows today's performance per worker ────────────────────
export default function EmployeeStats({ filterEmployeeId = null }) {
  const cars = useLiveQuery(
    () => db.cars.where('date').equals(todayStr()).toArray(), []
  );

  const employees = useLiveQuery(
    () => db.employees.where('active').equals(1).toArray(), []
  );

  if (!cars || !employees) return null;

  // Filter to just workers (not owner)
  let workers = employees.filter((e) => e.role === 'employee' || e.role === 'manager');
  if (filterEmployeeId) workers = workers.filter((e) => e.id === filterEmployeeId);

  const stats = computeEmployeeStats(cars, workers);

  if (stats.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👷</div>
        <div className="empty-state-title">Sin empleados activos</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card-title" style={{ padding: '0 0 8px' }}>
        Rendimiento hoy — {formatDate(todayStr())}
      </div>

      {stats.map((emp) => (
        <div key={emp.id} className="perf-card">
          {/* Avatar */}
          <div className="emp-avatar" style={{ background: emp.color, width: 48, height: 48, fontSize: 16 }}>
            {getInitials(emp.name)}
          </div>

          {/* Info */}
          <div className="perf-info">
            <div className="perf-name">{emp.name}</div>
            <div className="perf-sub">
              {emp.total === 0
                ? 'Sin autos registrados'
                : `${emp.vacPct}% con aspirado`}
            </div>
          </div>

          {/* Stats */}
          <div className="perf-stats">
            <div>
              <div className="perf-stat-val">{emp.total}</div>
              <div className="perf-stat-lbl">Autos</div>
            </div>
            <div>
              <div className="perf-stat-val">{emp.vacuum}</div>
              <div className="perf-stat-lbl">Aspirado</div>
            </div>
            <div>
              <div className="perf-stat-val">{emp.carsPerHour}</div>
              <div className="perf-stat-lbl">/hora</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
