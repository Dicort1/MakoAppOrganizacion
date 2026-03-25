import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addCar } from '../db/db';
import useStore from '../store/useStore';
import { getInitials, playSuccess, vibrate } from '../utils/helpers';

export default function CarEntryModal() {
  const currentUser  = useStore((s) => s.currentUser);
  const closeCarEntry = useStore((s) => s.closeCarEntry);
  const showFlash    = useStore((s) => s.showFlash);

  // If employee, auto-select themselves; manager/owner must pick
  const [selectedEmpId, setSelectedEmpId] = useState(
    currentUser?.role === 'employee' ? currentUser.id : null
  );
  const [hasVacuum, setHasVacuum] = useState(false);
  const [saving, setSaving]       = useState(false);

  const employees = useLiveQuery(() =>
    db.employees.where('active').equals(1).toArray(), []);

  // Only show actual washers (not owner in the picker if there are workers)
  const washers = (employees ?? []).filter(
    (e) => e.role === 'employee' || e.role === 'manager'
  );

  const selectedEmp = (employees ?? []).find((e) => e.id === selectedEmpId);

  const handleRegister = async () => {
    if (!selectedEmpId) {
      showFlash('error', 'Selecciona un empleado');
      return;
    }
    setSaving(true);
    try {
      await addCar({ employeeId: selectedEmpId, hasVacuum });
      playSuccess();
      vibrate([100, 50, 100]);
      showFlash('success', hasVacuum ? '🚗 Auto registrado + aspirado' : '🚗 Auto registrado');
      closeCarEntry();
    } catch (e) {
      showFlash('error', 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeCarEntry()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-title">Nuevo Auto 🚗</div>
        <div className="modal-subtitle">Lavado Express — $120 MXN</div>

        {/* ── Vacuum Toggle ─────────────────────────────────── */}
        <div className="section-label">¿Incluye Aspirado?</div>
        <button
          className={`toggle-row ${hasVacuum ? 'active' : ''}`}
          onClick={() => setHasVacuum((v) => !v)}
        >
          <div>
            <div className="toggle-label">🌀 Aspirado incluido</div>
            <div className="toggle-sub">{hasVacuum ? 'Sí — cliente lo solicitó' : 'No — solo exterior'}</div>
          </div>
          <div className="toggle-switch">
            <div className={`toggle-track ${hasVacuum ? 'on' : ''}`} />
            <div className={`toggle-thumb ${hasVacuum ? 'on' : ''}`} />
          </div>
        </button>

        {/* ── Employee Selector ─────────────────────────────── */}
        {currentUser?.role !== 'employee' ? (
          <>
            <div className="section-label">¿Quién lo lava?</div>
            <div className="employee-grid">
              {washers.map((emp) => (
                <button
                  key={emp.id}
                  className={`employee-btn ${selectedEmpId === emp.id ? 'selected' : ''}`}
                  onClick={() => setSelectedEmpId(emp.id)}
                >
                  <div
                    className="emp-avatar"
                    style={{ background: emp.color }}
                  >
                    {getInitials(emp.name)}
                  </div>
                  <span className="emp-name">{emp.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Employee: show their own card */
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            background: 'var(--blue-50)', padding: 12, borderRadius: 12 }}>
            <div className="emp-avatar" style={{ background: currentUser.color }}>
              {getInitials(currentUser.name)}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{currentUser.name}</div>
              <div style={{ fontSize: 13, color: '#64748B' }}>Asignado automáticamente</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 22 }}>✅</span>
          </div>
        )}

        {/* ── Register Button ───────────────────────────────── */}
        <button
          className={`btn btn-success btn-xl ${saving ? '' : ''}`}
          onClick={handleRegister}
          disabled={saving || !selectedEmpId}
          style={{ opacity: saving || !selectedEmpId ? 0.6 : 1 }}
        >
          {saving ? '⏳ Registrando...' : '✅ REGISTRAR AUTO'}
        </button>

        <button className="btn btn-ghost mt-8" onClick={closeCarEntry}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
