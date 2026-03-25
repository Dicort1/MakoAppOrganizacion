// ─── Currency ─────────────────────────────────────────────────────────────
export const formatMXN = (amount) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount ?? 0);

// ─── Time / Date ─────────────────────────────────────────────────────────
export const formatTime = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

export const getHourStr = () => String(new Date().getHours()).padStart(2, '0') + ':00';

export const sameHour = (timestamp) => {
  if (!timestamp) return false;
  const now = new Date();
  const t   = new Date(timestamp);
  return t.getFullYear() === now.getFullYear()
    && t.getMonth()      === now.getMonth()
    && t.getDate()       === now.getDate()
    && t.getHours()      === now.getHours();
};

// ─── Employee helpers ─────────────────────────────────────────────────────
export const getInitials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

export const getRoleLabel = (role) => ({
  owner:    'Dueño',
  manager:  'Encargado',
  employee: 'Empleado',
}[role] ?? 'Empleado');

// ─── Stats computation ────────────────────────────────────────────────────
export const computeStats = (cars = []) => {
  const total    = cars.length;
  const paid     = cars.filter((c) => c.paid).length;
  const unpaid   = total - paid;
  const cash     = cars.filter((c) => c.paymentType === 'efectivo');
  const card     = cars.filter((c) => c.paymentType === 'tarjeta');
  const vacuum   = cars.filter((c) => c.hasVacuum).length;
  const revenue  = paid * 120;
  const cashAmt  = cash.length * 120;
  const cardAmt  = card.length * 120;

  return { total, paid, unpaid, revenue, cashAmt, cardAmt, vacuum,
           cashCount: cash.length, cardCount: card.length };
};

export const computeEmployeeStats = (cars = [], employees = []) =>
  employees.map((emp) => {
    const empCars  = cars.filter((c) => c.employeeId === emp.id);
    const total    = empCars.length;
    const vacuum   = empCars.filter((c) => c.hasVacuum).length;
    const vacPct   = total ? Math.round((vacuum / total) * 100) : 0;

    // Speed: cars per hour based on first and last entry today
    let carsPerHour = 0;
    if (total > 1) {
      const times  = empCars.map((c) => c.timestamp).sort();
      const spanMs = times[times.length - 1] - times[0];
      const spanH  = spanMs / 3_600_000;
      carsPerHour  = spanH > 0 ? Math.round(total / spanH) : total;
    } else if (total === 1) {
      carsPerHour = total;
    }

    return { ...emp, total, vacuum, vacPct, carsPerHour };
  });

export const computeCashDiscrepancy = (cars = [], cashControl = null) => {
  if (!cashControl) return null;
  const { openingCash = 0, closingCash } = cashControl;
  if (closingCash == null) return null;

  const cashPayments = cars.filter((c) => c.paymentType === 'efectivo').length * 120;
  const expected     = (openingCash || 0) + cashPayments;
  const actual       = closingCash;
  const diff         = actual - expected;
  return { expected, actual, diff, ok: Math.abs(diff) < 1 };
};

// ─── Feedback ────────────────────────────────────────────────────────────
export const playSuccess = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) { /* silent fail on restricted contexts */ }
};

export const vibrate = (pattern = [80, 40, 80]) => {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) {}
};

// ─── Report text generation ───────────────────────────────────────────────
export const buildReportText = (stats, cashControl, incidents, date) => {
  const disc = cashControl
    ? computeCashDiscrepancy([], cashControl) // already computed elsewhere
    : null;

  return `📊 *REPORTE MAKO CAR WASH*
📅 ${formatDate(date)}

🚗 Autos atendidos: ${stats.total}
✅ Autos pagados:   ${stats.paid}
⏳ Sin pagar:       ${stats.unpaid}

💵 Ingresos totales: ${formatMXN(stats.revenue)}
   • Efectivo: ${formatMXN(stats.cashAmt)} (${stats.cashCount} autos)
   • Tarjeta:  ${formatMXN(stats.cardAmt)} (${stats.cardCount} autos)

🌀 Con aspirado: ${stats.vacuum}

${incidents.length ? `⚠️ Incidentes: ${incidents.length}` : '✅ Sin incidentes'}

${disc ? (disc.ok ? '✅ Caja cuadrada' : `🔴 DESCUADRE: ${formatMXN(Math.abs(disc.diff))} ${disc.diff < 0 ? 'FALTANTE' : 'SOBRANTE'}`) : ''}`.trim();
};

export const shareReport = async (text) => {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Reporte Mako Car Wash', text });
      return true;
    } catch (_) {}
  }
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (_) { return false; }
};
