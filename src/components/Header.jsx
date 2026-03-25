import useStore from '../store/useStore';
import { getInitials, getRoleLabel } from '../utils/helpers';

export default function Header() {
  const currentUser = useStore((s) => s.currentUser);
  const logout      = useStore((s) => s.logout);

  if (!currentUser) return null;

  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-brand-logo">🚗</span>
        <span className="header-brand-name">Mako</span>
      </div>

      <div className="header-user">
        <div className="header-user-info">
          <div className="header-user-name">{currentUser.name}</div>
          <div className="header-user-role">{getRoleLabel(currentUser.role)}</div>
        </div>
        <div
          className="header-avatar"
          style={{ background: currentUser.color }}
        >
          {getInitials(currentUser.name)}
        </div>
        <button className="header-logout" onClick={logout} title="Salir">
          ⇥
        </button>
      </div>
    </header>
  );
}
