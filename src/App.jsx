import useStore from './store/useStore';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import CarEntryModal from './components/CarEntryModal';
import PaymentModal from './components/PaymentModal';
import IncidentModal from './components/IncidentModal';
import EmployeeHome from './screens/EmployeeHome';
import ManagerHome from './screens/ManagerHome';
import OwnerHome from './screens/OwnerHome';

// ─── FlashToast ───────────────────────────────────────────────────────────────
function FlashToast() {
  const flash = useStore((s) => s.flash);
  if (!flash) return null;
  return (
    <div className={`flash-toast ${flash.type}`}>
      {flash.message}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const currentUser    = useStore((s) => s.currentUser);
  const showCarEntry   = useStore((s) => s.showCarEntry);
  const showPayment    = useStore((s) => s.showPayment);
  const showIncident   = useStore((s) => s.showIncident);

  // Not logged in → show login
  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        <FlashToast />
      </>
    );
  }

  // Select screen by role
  const Screen = {
    owner:    OwnerHome,
    manager:  ManagerHome,
    employee: EmployeeHome,
  }[currentUser.role] ?? EmployeeHome;

  return (
    <div className="app-layout">
      <Header />

      <main className="screen-content">
        <Screen />
      </main>

      <BottomNav />
      <FlashToast />

      {/* Modals */}
      {showCarEntry && <CarEntryModal />}
      {showPayment  && <PaymentModal />}
      {showIncident && <IncidentModal />}
    </div>
  );
}
