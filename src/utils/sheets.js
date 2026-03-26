// ─── Google Sheets Sync via Apps Script Web App ──────────────────────────────
// Uses no-cors + urlencoded form data to bypass CORS restrictions on GAS.
// Fire-and-forget: offline failures are silent so the app never blocks.

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
      mode:    'no-cors',                                   // required for GAS
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ data: JSON.stringify(payload) }),
    });
    return true;
  } catch (_) {
    return false;   // offline or bad URL — never crash the app
  }
};

// ─── Payload builders ─────────────────────────────────────────────────────────
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
  status:   Math.abs(diff) < 1 ? 'Cuadrada' : diff < 0 ? 'FALTANTE' : 'SOBRANTE',
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
