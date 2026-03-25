import { create } from 'zustand';

// ─── Global UI Store (Zustand) ───────────────────────────────────────────────
// Handles: auth state, active tab, modal visibility, temporary UI state.
// Persistent data lives in IndexedDB (Dexie). This store is ephemeral.
// ─────────────────────────────────────────────────────────────────────────────

const useStore = create((set, get) => ({
  // ── Auth ────────────────────────────────────────────────────────────────
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user, activeTab: 'home' }),
  logout: () => set({ currentUser: null, activeTab: 'home' }),

  // ── Navigation ──────────────────────────────────────────────────────────
  // tabs per role:
  //   employee: home | stats | incidents
  //   manager:  home | caja | empleados | reporte | incidents
  //   owner:    home | caja | empleados | reporte | incidents | config
  activeTab: 'home',
  setTab: (tab) => set({ activeTab: tab }),

  // ── Modals ──────────────────────────────────────────────────────────────
  showCarEntry:  false,
  showPayment:   false,
  showIncident:  false,
  selectedCarId: null,

  openCarEntry:  () => set({ showCarEntry: true }),
  closeCarEntry: () => set({ showCarEntry: false }),

  openPayment:  (carId) => set({ showPayment: true, selectedCarId: carId }),
  closePayment: () => set({ showPayment: false, selectedCarId: null }),

  openIncident:  () => set({ showIncident: true }),
  closeIncident: () => set({ showIncident: false }),

  // ── Flash message (success/error toasts) ────────────────────────────────
  flash: null,  // { type: 'success' | 'error', message: string }
  showFlash: (type, message) => {
    set({ flash: { type, message } });
    setTimeout(() => set({ flash: null }), 2500);
  },

  // ── Alert banner for owner dashboard ────────────────────────────────────
  alerts: [],
  addAlert: (msg) => set((s) => ({ alerts: [...s.alerts.slice(-4), { id: Date.now(), msg }] })),
  clearAlerts: () => set({ alerts: [] }),
}));

export default useStore;
