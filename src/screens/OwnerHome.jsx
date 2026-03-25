import useStore from '../store/useStore';
import OwnerDashboard from '../components/OwnerDashboard';
import CashControl from '../components/CashControl';
import EmployeeStats from '../components/EmployeeStats';
import DailyReport from '../components/DailyReport';
import IncidentList from '../components/IncidentList';
import ConfigScreen from '../components/ConfigScreen';

// ─── OwnerHome — screen for role: 'owner' ────────────────────────────────────
// Tabs: home (dashboard) | caja | empleados | reporte | config
export default function OwnerHome() {
  const activeTab = useStore((s) => s.activeTab);

  return (
    <>
      {activeTab === 'home'      && <OwnerDashboard />}
      {activeTab === 'caja'      && <CashControl />}
      {activeTab === 'empleados' && <EmployeeStats />}
      {activeTab === 'reporte'   && <DailyReport />}
      {activeTab === 'incidents' && <IncidentList />}
      {activeTab === 'config'    && <ConfigScreen />}
    </>
  );
}
