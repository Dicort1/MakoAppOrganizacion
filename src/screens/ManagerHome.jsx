import useStore from '../store/useStore';
import LiveCounter from '../components/LiveCounter';
import CarList from '../components/CarList';
import CashControl from '../components/CashControl';
import EmployeeStats from '../components/EmployeeStats';
import DailyReport from '../components/DailyReport';
import IncidentList from '../components/IncidentList';

// ─── ManagerHome — screen for role: 'manager' ────────────────────────────────
// Tabs: home | caja | empleados | reporte | incidents
export default function ManagerHome() {
  const activeTab    = useStore((s) => s.activeTab);
  const openCarEntry = useStore((s) => s.openCarEntry);
  const openIncident = useStore((s) => s.openIncident);

  return (
    <>
      {activeTab === 'home' && (
        <>
          <button className="btn-nuevo-auto" onClick={openCarEntry}>
            <span className="btn-icon">🚗</span>
            NUEVO AUTO
          </button>

          <LiveCounter />

          <div className="section-divider">
            <div className="section-divider-line" />
            <span className="section-divider-title">Autos de hoy</span>
            <div className="section-divider-line" />
          </div>

          <CarList showAll />
        </>
      )}

      {activeTab === 'caja' && <CashControl />}

      {activeTab === 'empleados' && <EmployeeStats />}

      {activeTab === 'reporte' && <DailyReport />}

      {activeTab === 'incidents' && (
        <>
          <button
            className="btn btn-warning btn-xl"
            style={{ marginBottom: 16 }}
            onClick={openIncident}
          >
            ⚠️ Reportar Problema
          </button>
          <IncidentList />
        </>
      )}
    </>
  );
}
