import useStore from './store/useStore';
import LoginScreen from './components/LoginScreen';
import EncargadoScreen from './screens/EncargadoScreen';
import DuenoScreen from './screens/DuenoScreen';

function FlashToast() {
  const flash = useStore((s) => s.flash);
  if (!flash) return null;
  return <div className={`flash-toast ${flash.type}`}>{flash.message}</div>;
}

export default function App() {
  const currentUser = useStore((s) => s.currentUser);

  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        <FlashToast />
      </>
    );
  }

  const Screen = currentUser.role === 'dueno' ? DuenoScreen : EncargadoScreen;

  return (
    <>
      <Screen />
      <FlashToast />
    </>
  );
}
