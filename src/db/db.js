import Dexie from 'dexie';

export const db = new Dexie('MakoCarWashDB_v4');

db.version(1).stores({
  users:       '++id, pin, role',
  cars:        '++id, ticketId, date, timestamp, paymentType, hasVacuum, amount',
  cashControl: '++id, date',
});

export const seedIfEmpty = async () => {
  await db.open();
  const count = await db.users.count();
  if (count === 0) {
    await db.users.bulkAdd([
      { name: 'Dueño',     pin: '0000', role: 'dueno',     color: '#7C3AED' },
      { name: 'Encargado', pin: '1111', role: 'encargado', color: '#1E40AF' },
    ]);
  }
};

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const addCar = async ({ paymentType, hasVacuum }) => {
  const today     = todayStr();
  const count     = await db.cars.where('date').equals(today).count();
  const seq       = String(count + 1).padStart(4, '0');
  const dateShort = today.replace(/-/g, '').slice(2);
  const ticketId  = `MK-${dateShort}-${seq}`;

  const now = Date.now();
  return db.cars.add({
    ticketId,
    date:      today,
    timestamp: now,
    paymentType,
    hasVacuum: hasVacuum ? 1 : 0,
    amount:    120,
    paid:      1,
    status:    'pagado',
    paidAt:    now,
  });
};

export const getTodayCashControl = () =>
  db.cashControl.where('date').equals(todayStr()).first();

export const setCashControl = async ({ openingCash, closingCash }) => {
  const today    = todayStr();
  const existing = await getTodayCashControl();
  if (existing) {
    return db.cashControl.update(existing.id, { openingCash, closingCash });
  }
  return db.cashControl.add({ date: today, openingCash, closingCash });
};

export const updateUser = (id, changes) =>
  db.users.update(id, changes);
