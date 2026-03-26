// ─── Google Sheets Sync via Apps Script Web App ──────────────────────────────

const URL_KEY = 'mako_sheets_url';

export const getSheetsUrl  = ()    => localStorage.getItem(URL_KEY) || '';
export const setSheetsUrl  = (url) => localStorage.setItem(URL_KEY, url.trim());
export const hasSheetsUrl  = ()    => !!getSheetsUrl();

export const syncToSheets = async (payload) => {
  const url = getSheetsUrl();
  if (!url) return false;
  try {
    await fetch(url, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ data: JSON.stringify(payload) }),
    });
    return true;
  } catch (_) {
    return false;
  }
};

// ─── Payload builders (eventos individuales) ──────────────────────────────────
export const carRegisteredPayload = (car, employeeName) => ({
  type:     'car_registered',
  ticketId: car.ticketId,
  date:     car.date,
  time:     new Date(car.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  employee: employeeName,
  vacuum:   car.hasVacuum ? 'Sí' : 'No',
  amount:   120,
});

export const carPaidPayload = (car, employeeName) => ({
  type:        'car_paid',
  ticketId:    car.ticketId,
  date:        car.date,
  paymentType: car.paymentType === 'efectivo' ? 'Efectivo' : 'Tarjeta',
  employee:    employeeName,
  amount:      120,
  paidAt:      new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
});

export const cashControlPayload = (date, opening, closing, expected, diff) => ({
  type:     'cash_control',
  date,
  opening,
  closing,
  expected,
  diff,
  status:   Math.abs(diff) < 1 ? 'Cuadrada ✅' : diff < 0 ? '🔴 FALTANTE' : '⬆️ SOBRANTE',
});

export const incidentPayload = (type, employeeName) => {
  const labels = { maquina: 'Máquina falló', queja: 'Cliente queja', retraso: 'Retraso', otro: 'Otro' };
  return {
    type:     'incident',
    date:     new Date().toISOString().slice(0, 10),
    time:     new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    incident: labels[type] ?? type,
    employee: employeeName,
  };
};

// ─── REPORTE COMPLETO DEL DÍA ─────────────────────────────────────────────────
// Manda absolutamente todo: resumen, cada auto, cada empleado, caja, incidentes.
export const buildFullReport = (cars, employees, cashControl, incidents, date) => {
  // ── Resumen general ──
  const paid      = cars.filter(c => c.paid);
  const unpaid    = cars.filter(c => !c.paid);
  const cash      = cars.filter(c => c.paymentType === 'efectivo');
  const card      = cars.filter(c => c.paymentType === 'tarjeta');
  const vacuum    = cars.filter(c => c.hasVacuum);
  const revenue   = paid.length * 120;
  const cashAmt   = cash.length * 120;
  const cardAmt   = card.length * 120;

  // ── Caja ──
  const opening  = cashControl?.openingCash  ?? 0;
  const closing  = cashControl?.closingCash  ?? null;
  const expected = opening + cashAmt;
  const diff     = closing != null ? closing - expected : null;
  const cajaStatus = diff == null ? 'Sin cerrar'
    : Math.abs(diff) < 1 ? 'Cuadrada ✅'
    : diff < 0 ? `🔴 FALTANTE $${Math.abs(diff)}`
    : `⬆️ SOBRANTE $${diff}`;

  // ── Por empleado ──
  const empStats = employees
    .filter(e => e.role !== 'owner')
    .map(emp => {
      const ec    = cars.filter(c => c.employeeId === emp.id);
      const evac  = ec.filter(c => c.hasVacuum);
      const times = ec.map(c => c.timestamp).sort();
      const spanH = ec.length > 1 ? (times[times.length-1] - times[0]) / 3_600_000 : 0;
      const speed = spanH > 0 ? Math.round(ec.length / spanH) : ec.length;
      return {
        name:      emp.name,
        total:     ec.length,
        vacuum:    evac.length,
        vacPct:    ec.length ? Math.round(evac.length / ec.length * 100) : 0,
        carsPerHr: speed,
        revenue:   ec.filter(c => c.paid).length * 120,
      };
    });

  // ── Registro de cada auto ──
  const carRows = [...cars]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(car => {
      const emp = employees.find(e => e.id === car.employeeId);
      return {
        ticket:      car.ticketId,
        time:        new Date(car.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        employee:    emp?.name ?? '—',
        vacuum:      car.hasVacuum ? 'Sí' : 'No',
        status:      car.status === 'pagado' ? 'Pagado' : 'Sin pagar',
        paymentType: car.paymentType === 'efectivo' ? 'Efectivo' : car.paymentType === 'tarjeta' ? 'Tarjeta' : '—',
        amount:      car.paid ? 120 : 0,
        paidTime:    car.paidAt ? new Date(car.paidAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—',
      };
    });

  // ── Incidentes ──
  const incRows = incidents.map(inc => {
    const emp    = employees.find(e => e.id === inc.employeeId);
    const labels = { maquina: 'Máquina falló', queja: 'Cliente queja', retraso: 'Retraso', otro: 'Otro' };
    return {
      time:     new Date(inc.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      type:     labels[inc.type] ?? inc.type,
      employee: emp?.name ?? '—',
    };
  });

  return {
    type: 'reporte_completo',
    date,
    resumen: {
      totalAutos:    cars.length,
      autosPagados:  paid.length,
      autosSinPagar: unpaid.length,
      conAspirado:   vacuum.length,
      ingresoTotal:  revenue,
      efectivo:      cashAmt,
      autosEfectivo: cash.length,
      tarjeta:       cardAmt,
      autosTarjeta:  card.length,
      cajaApertura:  opening,
      cajaCierre:    closing ?? 'Sin registrar',
      cajaEsperado:  expected,
      cajaDiff:      diff ?? 'N/A',
      cajaStatus,
      totalIncidentes: incidents.length,
    },
    empleados: empStats,
    autos:     carRows,
    incidentes: incRows,
  };
};

