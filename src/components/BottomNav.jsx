import useStore from '../store/useStore';

// Tab config per role
const TABS = {
  employee: [
    { id: 'home',      icon: '🚗', label: 'Inicio' },
    { id: 'stats',     icon: '📊', label: 'Mi Rendim.' },
    { id: 'incidents', icon: '⚠️', label: 'Problema' },
  ],
  manager: [
    { id: 'home',      icon: '🚗', label: 'Inicio' },
    { id: 'caja',      icon: '💵', label: 'Caja' },
    { id: 'empleados', icon: '👷', label: 'Empleados' },
    { id: 'reporte',   icon: '📋', label: 'Reporte' },
    { id: 'incidents', icon: '⚠️', label: 'Problemas' },
  ],
  owner: [
    { id: 'home',      icon: '📡', label: 'Dashboard' },
    { id: 'caja',      icon: '💵', label: 'Caja' },
    { id: 'empleados', icon: '👷', label: 'Empleados' },
    { id: 'reporte',   icon: '📋', label: 'Reporte' },
    { id: 'config',    icon: '⚙️', label: 'Config' },
  ],
};

export default function BottomNav() {
  const activeTab   = useStore((s) => s.activeTab);
  const setTab      = useStore((s) => s.setTab);
  const currentUser = useStore((s) => s.currentUser);

  if (!currentUser) return null;

  const tabs = TABS[currentUser.role] ?? TABS.employee;

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setTab(tab.id)}
        >
          <span className="nav-item-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
