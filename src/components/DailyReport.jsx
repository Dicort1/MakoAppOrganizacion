import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, getTodayCashControl, getTodayIncidents } from '../db/db';
import useStore from '../store/useStore';
import {
  computeStats, computeCashDiscrepancy, buildReportText,
  shareReport, formatMXN, formatDate, formatDateTime
} from '../utils/helpers';

const INCIDENT_LABELS = {
  maquina: '🔧 Máquina falló',
  queja:   '😠 Cliente queja',
  retraso: '⏰ Retraso',
  otro:    '📝 Otro',
};

export default function DailyReport() {
  const showFlash = useStore((s) => s.showFlash);

  const cars      = useLiveQuery(() => db.cars.where('date').equals(todayStr()).toArray(), []);
  const employees = useLiveQuery(() => db.employees.toArray(), []);
  const cashCtrl  = useLiveQuery(() => getTodayCashControl(), []);
  const incidents = useLiveQuery(() => getTodayIncidents(), []);

  if (!cars || !employees || !incidents) return null;

  const stats = computeStats(cars);
  const disc  = computeCashDiscrepancy(cars, cashCtrl);

  const handleShare = async () => {
    const text   = buildReportText(stats, cashCtrl, incidents, todayStr());
    const result = await shareReport(text);
    if (result === true)    showFlash('success', '✅ Compartido');
    else if (result === 'copied') showFlash('success', '📋 Copiado al portapapeles');
    else                     showFlash('error', 'No se pudo compartir');
  };

  return (
    <div>
      {/* Header */}
      <div className="revenue-banner" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="revenue-label">Reporte del día</div>
            <div className="revenue-amount">{formatMXN(stats.revenue)}</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{formatDate(todayStr())}</div>
          </div>
          <button
            onClick={handleShare}
            style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 'var(--radius)', color: '#fff', padding: '8px 14px',
              fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
          >
            📤 Compartir
          </button>
        </div>
      </div>

      {/* Cars section */}
      <div className="report-section">
        <div className="card-title">🚗 Autos</div>
        <div className="report-row">
          <span className="report-row-label">Total atendidos</span>
          <span className="report-row-value">{stats.total}</span>
        </div>
        <div className="report-row">
          <span className="report-row-label">Pagados</span>
          <span className="report-row-value" style={{ color: 'var(--green-700)' }}>{stats.paid}</span>
        </div>
        {stats.unpaid > 0 && (
          <div className="report-row">
            <span className="report-row-label">Sin cobrar</span>
            <span className="report-row-value" style={{ color: 'var(--orange-600)' }}>{stats.unpaid}</span>
          </div>
        )}
        <div className="report-row">
          <span className="report-row-label">🌀 Con aspirado</span>
          <span className="report-row-value">{stats.vacuum}</span>
        </div>
      </div>

      {/* Revenue section */}
      <div className="report-section">
        <div className="card-title">💰 Ingresos</div>
        <div className="report-row">
          <span className="report-row-label">Total cobrado</span>
          <span className="report-row-value">{formatMXN(stats.revenue)}</span>
        </div>
        <div className="report-row">
          <span className="report-row-label">💵 Efectivo ({stats.cashCount} autos)</span>
          <span className="report-row-value">{formatMXN(stats.cashAmt)}</span>
        </div>
        <div className="report-row">
          <span className="report-row-label">💳 Tarjeta ({stats.cardCount} autos)</span>
          <span className="report-row-value">{formatMXN(stats.cardAmt)}</span>
        </div>
      </div>

      {/* Cash Control section */}
      <div className="report-section">
        <div className="card-title">🔒 Control de Caja</div>
        {cashCtrl ? (
          <>
            <div className="report-row">
              <span className="report-row-label">Apertura</span>
              <span className="report-row-value">{formatMXN(cashCtrl.openingCash)}</span>
            </div>
            <div className="report-row">
              <span className="report-row-label">Cierre</span>
              <span className="report-row-value">
                {cashCtrl.closingCash != null ? formatMXN(cashCtrl.closingCash) : '—'}
              </span>
            </div>
            {disc !== null && (
              <div className={`report-row`}>
                <span className="report-row-label">Diferencia</span>
                <span className="report-row-value" style={{ color: disc.ok ? 'var(--green-700)' : 'var(--red-700)' }}>
                  {disc.ok ? '✅ Cuadrada' : `🔴 ${formatMXN(Math.abs(disc.diff))} ${disc.diff < 0 ? 'FALTANTE' : 'SOBRANTE'}`}
                </span>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: '#94A3B8', fontSize: 14, padding: '8px 0' }}>
            No se registró control de caja
          </div>
        )}
      </div>

      {/* Incidents */}
      <div className="report-section">
        <div className="card-title">⚠️ Incidentes ({incidents.length})</div>
        {incidents.length === 0 ? (
          <div style={{ color: 'var(--green-600)', fontSize: 15, fontWeight: 600, padding: '8px 0' }}>
            ✅ Sin incidentes reportados
          </div>
        ) : (
          incidents.map((inc) => {
            const emp = employees.find((e) => e.id === inc.employeeId);
            return (
              <div key={inc.id} className="report-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span className="report-row-value">{INCIDENT_LABELS[inc.type] ?? '📝 Incidente'}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>{formatDateTime(inc.timestamp)}</span>
                </div>
                {emp && <span style={{ fontSize: 13, color: '#64748B' }}>— {emp.name}</span>}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom padding */}
      <div style={{ height: 20 }} />
    </div>
  );
}
