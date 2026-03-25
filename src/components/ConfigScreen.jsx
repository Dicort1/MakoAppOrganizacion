import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addEmployee, updateEmployee } from '../db/db';
import useStore from '../store/useStore';
import { getInitials, getRoleLabel } from '../utils/helpers';

const COLORS = ['#7C3AED','#1E40AF','#059669','#DC2626','#D97706','#0891B2','#BE185D','#374151'];

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Empleado' },
  { value: 'manager',  label: 'Encargado' },
];

function AddEmployeeForm({ onDone }) {
  const showFlash = useStore((s) => s.showFlash);
  const [name,  setName]  = useState('');
  const [pin,   setPin]   = useState('');
  const [role,  setRole]  = useState('employee');
  const [color, setColor] = useState(COLORS[2]);

  const handleAdd = async () => {
    if (!name.trim()) { showFlash('error', 'Nombre requerido'); return; }
    if (pin.length !== 4) { showFlash('error', 'PIN debe ser 4 dígitos'); return; }
    // Check duplicate PIN
    const existing = await db.employees.where('pin').equals(pin).first();
    if (existing) { showFlash('error', 'PIN ya en uso'); return; }
    await addEmployee(name.trim(), pin, role, color);
    showFlash('success', '✅ Empleado agregado');
    onDone();
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-title">Nuevo Empleado</div>

      <div className="section-label">Nombre</div>
      <input
        className="input-field"
        style={{ marginBottom: 12, textAlign: 'left' }}
        placeholder="Ej. Luis García"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={30}
      />

      <div className="section-label">PIN (4 dígitos)</div>
      <input
        className="input-field"
        style={{ marginBottom: 12 }}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        placeholder="- - - -"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
      />

      <div className="section-label">Rol</div>
      <div className="row" style={{ marginBottom: 12 }}>
        {ROLE_OPTIONS.map((r) => (
          <button
            key={r.value}
            className={`btn ${role === r.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setRole(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="section-label">Color</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {COLORS.map((c) => (
          <button
            key={c}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: c, border: color === c ? '3px solid #1E293B' : '2px solid transparent',
              cursor: 'pointer', transform: color === c ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.1s'
            }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>

      <div className="row">
        <button className="btn btn-ghost" onClick={onDone}>Cancelar</button>
        <button className="btn btn-success" onClick={handleAdd}>Agregar ✓</button>
      </div>
    </div>
  );
}

export default function ConfigScreen() {
  const showFlash = useStore((s) => s.showFlash);
  const [adding, setAdding] = useState(false);

  const employees = useLiveQuery(
    () => db.employees.where('active').equals(1).toArray(), []
  );

  const handleDeactivate = async (emp) => {
    if (emp.role === 'owner') { showFlash('error', 'No se puede desactivar al dueño'); return; }
    await updateEmployee(emp.id, { active: false });
    showFlash('success', `${emp.name} desactivado`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Empleados activos</div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? '✕ Cancelar' : '+ Agregar'}
        </button>
      </div>

      {adding && <AddEmployeeForm onDone={() => setAdding(false)} />}

      {(employees ?? []).map((emp) => (
        <div key={emp.id} className="config-emp-card">
          <div className="emp-avatar" style={{ background: emp.color }}>
            {getInitials(emp.name)}
          </div>
          <div className="config-emp-info">
            <div className="config-emp-name">{emp.name}</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              {getRoleLabel(emp.role)} · PIN: {'●'.repeat(4)}
            </div>
          </div>
          {emp.role !== 'owner' && (
            <button
              className="btn btn-danger btn-sm"
              style={{ width: 'auto', flexShrink: 0 }}
              onClick={() => handleDeactivate(emp)}
            >
              Quitar
            </button>
          )}
        </div>
      ))}

      <div style={{ height: 20 }} />
    </div>
  );
}
