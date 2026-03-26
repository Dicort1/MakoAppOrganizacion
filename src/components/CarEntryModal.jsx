import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addCar } from '../db/db';
import useStore from '../store/useStore';
import { getInitials, playSuccess, vibrate } from '../utils/helpers';
import { syncToSheets, carRegisteredPayload } from '../utils/sheets';

export default function CarEntryModal() {
  const currentUser   = useStore((s) => s.currentUser);
  const closeCarEntry = useStore((s) => s.closeCarEntry);
  const showFlash     = useStore((s) => s.showFlash);

  const [selectedEmpId, setSelectedEmpId] = useState(
    currentUser?.role === 'employee' ? currentUser.id : null
  );
  const [hasVacuum,    setHasVacuum]    = useState(false);
  const [paymentType,  setPaymentType]  = useState(null); // 'efectivo' | 'tarjeta'
  const [saving,       setSaving]       = useState(false);

  const employees = useLiveQuery(() =>
    db.employees.where('active').equals(1).toArray(), []);

  const washers = (employees ?? []).filter(
    (e) => e.role === 'employee' || e.role === 'manager'
  );

  const canRegister = selectedEmpId && paymentType;

  const handleRegister = async () => {
    if (!selectedEmpId) { showFlash('error', 'Selecciona un empleado'); return; }
    if (!paymentType)   { showFlash('error', 'Selecciona forma de pago'); return; }
    setSaving(true);
    try {
      const carId = await addCar({ employeeId: selectedEmpId, hasVacuum, paymentType });
      const car   = await db.cars.get(carId);
      const emp   = (employees ?? []).find((e) => e.id === selectedEmpId);
      playSuccess();
      vibrate([100, 50, 100]);
      const payLabel = paymentType === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta';
      showFlash('success', `🚗 Registrado — ${payLabel}${hasVacuum ? ' + Aspirado' : ''}`);
      syncToSheets(carRegisteredPayload(car, emp?.name ?? ''));
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

        {/* ── Vacuum Toggle ─────────────────────────── */}
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

        {/* ── Payment Type ──────────────────────────── */}
        <div className="section-label">💰 ¿Cómo pagó? <span style={{color:'var(--red-600)'}}>*</span></div>
        <div className="row" style={{ gap: 10, marginBottom: 16 }}>
          <button
            className="btn btn-lg"
            onClick={() => setPaymentType('efectivo')}
            style={{
              background: paymentType === 'efectivo'
                ? 'linear-gradient(145deg, #16A34A, #15803D)'
                : 'var(--gray-100)',
              color:      paymentType === 'efectivo' ? '#fff' : 'var(--gray-700)',
              border:     paymentType === 'efectivo' ? 'none' : '2px solid var(--gray-200)',
              boxShadow:  paymentType === 'efectivo' ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
              fontSize: 18, gap: 8,
            }}
          >
            <span style={{ fontSize: 28 }}>💵</span>
            Efectivo
          </button>
          <button
            className="btn btn-lg"
            onClick={() => setPaymentType('tarjeta')}
            style={{
              background: paymentType === 'tarjeta'
                ? 'linear-gradient(145deg, #2563EB, #1D4ED8)'
                : 'var(--gray-100)',
              color:      paymentType === 'tarjeta' ? '#fff' : 'var(--gray-700)',
              border:     paymentType === 'tarjeta' ? 'none' : '2px solid var(--gray-200)',
              boxShadow:  paymentType === 'tarjeta' ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
              fontSize: 18, gap: 8,
            }}
          >
            <span style={{ fontSize: 28 }}>💳</span>
            Tarjeta
          </button>
        </div>

        {/* ── Employee Selector ─────────────────────── */}
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
                  <div className="emp-avatar" style={{ background: emp.color }}>
                    {getInitials(emp.name)}
                  </div>
                  <span className="emp-name">{emp.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            background: 'var(--blue-50)', padding: 12, borderRadius: 12
          }}>
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

        {/* ── Register Button ───────────────────────── */}
        <button
          className="btn btn-success btn-xl"
          onClick={handleRegister}
          disabled={saving || !canRegister}
          style={{ opacity: saving || !canRegister ? 0.5 : 1 }}
        >
          {saving ? '⏳ Registrando...' : canRegister ? '✅ REGISTRAR AUTO' : 'Selecciona pago y empleado'}
        </button>

        <button className="btn btn-ghost mt-8" onClick={closeCarEntry}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
