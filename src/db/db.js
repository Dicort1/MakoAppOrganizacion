import Dexie from 'dexie';

// ─── Database Definition ────────────────────────────────────────────────────
export const db = new Dexie('MakoCarWashDB');

db.version(1).stores({
  // employees: role = 'owner' | 'manager' | 'employee'
  employees: '++id, pin, role, active',

  // cars: status = 'activo' | 'listo' | 'pagado'
  //       paymentType = 'efectivo' | 'tarjeta' | null
  cars: '++id, ticketId, employeeId, date, timestamp, status, hasVacuum, paid, paymentType, amount',

  // cashControl: one record per date
  cashControl: '++id, date',

  // incidents: type = 'maquina' | 'queja' | 'retraso' | 'otro'
  incidents: '++id, date, timestamp, type, employeeId',
});

// ─── Seed initial employees ───────────────────────────────────────────────────
// Called explicitly from main.jsx BEFORE React renders, so the list is never empty.
export const seedIfEmpty = async () => {
  await db.open();
  const count = await db.employees.count();
  if (count === 0) {
    await db.employees.bulkAdd([
      { name: 'Dueño',     pin: '0000', role: 'owner',    color: '#7C3AED', active: 1 },
      { name: 'Encargado', pin: '1111', role: 'manager',  color: '#1E40AF', active: 1 },
      { name: 'Carlos',    pin: '2222', role: 'employee', color: '#059669', active: 1 },
      { name: 'Miguel',    pin: '3333', role: 'employee', color: '#DC2626', active: 1 },
      { name: 'Roberto',   pin: '4444', role: 'employee', color: '#D97706', active: 1 },
    ]);
  }
};

// ─── Helper: today's date string YYYY-MM-DD ──────────────────────────────────
export const todayStr = () => new Date().toISOString().slice(0, 10);

// ─── Queries ─────────────────────────────────────────────────────────────────
export const getTodayCars = () =>
  db.cars.where('date').equals(todayStr()).toArray();

export const getTodayCashControl = () =>
  db.cashControl.where('date').equals(todayStr()).first();

export const getTodayIncidents = () =>
  db.incidents.where('date').equals(todayStr()).toArray();

export const getAllEmployees = () =>
  db.employees.where('active').equals(1).toArray();

// ─── Mutations ───────────────────────────────────────────────────────────────
export const addCar = async ({ employeeId, hasVacuum }) => {
  const today = todayStr();
  const count = await db.cars.where('date').equals(today).count();
  const seq   = String(count + 1).padStart(4, '0');
  const dateShort = today.replace(/-/g, '').slice(2); // YYMMDD
  const ticketId  = `MK-${dateShort}-${seq}`;

  return db.cars.add({
    ticketId,
    employeeId,
    date:      today,
    timestamp: Date.now(),
    status:    'activo',
    hasVacuum: hasVacuum ? 1 : 0,
    paid:      0,
    paymentType: null,
    amount:    120,
  });
};

export const markCarListo = (id) =>
  db.cars.update(id, { status: 'listo' });

export const markCarPagado = (id, paymentType) =>
  db.cars.update(id, { status: 'pagado', paid: 1, paymentType, paidAt: Date.now() });

export const setCashControl = async ({ openingCash, closingCash }) => {
  const today   = todayStr();
  const existing = await getTodayCashControl();
  if (existing) {
    return db.cashControl.update(existing.id, { openingCash, closingCash });
  }
  return db.cashControl.add({ date: today, openingCash, closingCash });
};

export const addIncident = (employeeId, type, notes = '') =>
  db.incidents.add({
    date:      todayStr(),
    timestamp: Date.now(),
    type,
    employeeId,
    notes,
  });

export const addEmployee = (name, pin, role, color) =>
  db.employees.add({ name, pin, role, color, active: 1 });

export const updateEmployee = (id, changes) =>
  db.employees.update(id, changes);
