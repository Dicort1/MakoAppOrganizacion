import useStore from '../store/useStore';
import LiveCounter from '../components/LiveCounter';
import CarList from '../components/CarList';
import EmployeeStats from '../components/EmployeeStats';
import IncidentList from '../components/IncidentList';

// ─── EmployeeHome — screen for role: 'employee' ───────────────────────────────
// Tabs: home | stats | incidents
export default function EmployeeHome() {
  const activeTab   = useStore((s) => s.activeTab);
  const openCarEntry = useStore((s) => s.openCarEntry);
  const openIncident = useStore((s) => s.openIncident);
  const currentUser  = useStore((s) => s.currentUser);

  return (
    <>
      {activeTab === 'home' && (
        <>
          {/* BIG action button */}
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

          <CarList />
        </>
      )}

      {activeTab === 'stats' && (
        <>
          <EmployeeStats filterEmployeeId={currentUser?.id} />
        </>
      )}

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
