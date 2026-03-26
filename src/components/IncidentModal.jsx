import { useState } from 'react';
import { addIncident } from '../db/db';
import useStore from '../store/useStore';
import { vibrate } from '../utils/helpers';
import { syncToSheets, incidentPayload } from '../utils/sheets';

const INCIDENT_TYPES = [
  { id: 'maquina',  icon: '🔧', label: 'Máquina falló',   color: 'var(--red-50)',    border: 'var(--red-200)'    },
  { id: 'queja',    icon: '😠', label: 'Cliente queja',   color: 'var(--orange-50)', border: 'var(--orange-200)' },
  { id: 'retraso',  icon: '⏰', label: 'Retraso',          color: 'var(--yellow-50)', border: '#FEF08A'           },
  { id: 'otro',     icon: '📝', label: 'Otro',             color: 'var(--gray-50)',   border: 'var(--gray-200)'   },
];

// Simple yellow CSS var
const yellowCSS = { '--yellow-50': '#FEFCE8' };

export default function IncidentModal() {
  const currentUser   = useStore((s) => s.currentUser);
  const closeIncident = useStore((s) => s.closeIncident);
  const showFlash     = useStore((s) => s.showFlash);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleReport = async (type) => {
    if (saving) return;
    setSaving(true);
    try {
      await addIncident(currentUser.id, type);
      vibrate([200, 100, 200]);
      setSaved(true);
      showFlash('success', '⚠️ Incidente reportado');
      syncToSheets(incidentPayload(type, currentUser.name));   // fire & forget
      setTimeout(() => closeIncident(), 1200);
    } catch (e) {
      showFlash('error', 'Error al reportar');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeIncident()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">Reportar Problema ⚠️</div>
        <div className="modal-subtitle">
          El incidente queda registrado con tu nombre y la hora exacta.
        </div>

        {saved ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 64 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>¡Reportado!</div>
          </div>
        ) : (
          <>
            <div className="incident-grid">
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  className="incident-btn"
                  style={{ background: t.color, borderColor: t.border, ...yellowCSS }}
                  onClick={() => handleReport(t.id)}
                  disabled={saving}
                >
                  <span className="incident-btn-icon">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={closeIncident}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
