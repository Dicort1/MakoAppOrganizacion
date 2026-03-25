import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr } from '../db/db';
import { formatTime } from '../utils/helpers';

const LABELS = {
  maquina: { icon: '🔧', label: 'Máquina falló',  bg: 'var(--red-50)',    color: 'var(--red-700)'    },
  queja:   { icon: '😠', label: 'Cliente queja',  bg: 'var(--orange-50)', color: 'var(--orange-600)' },
  retraso: { icon: '⏰', label: 'Retraso',          bg: '#FEFCE8',          color: '#854D0E'           },
  otro:    { icon: '📝', label: 'Otro',             bg: 'var(--gray-50)',   color: 'var(--gray-700)'   },
};

export default function IncidentList() {
  const incidents = useLiveQuery(
    () => db.incidents.where('date').equals(todayStr()).toArray(), []
  );
  const employees = useLiveQuery(() => db.employees.toArray(), []);

  if (!incidents) return null;

  if (incidents.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">✅</div>
        <div className="empty-state-title">Sin incidentes hoy</div>
        <div className="empty-state-sub">Todo funcionando bien</div>
      </div>
    );
  }

  return (
    <div>
      {[...incidents].reverse().map((inc) => {
        const meta = LABELS[inc.type] ?? LABELS.otro;
        const emp  = employees?.find((e) => e.id === inc.employeeId);
        return (
          <div key={inc.id} style={{
            background: meta.bg,
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>{meta.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: meta.color }}>{meta.label}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                {emp?.name ?? 'Desconocido'} · {formatTime(inc.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
