import { create } from 'zustand';

const useStore = create((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => set({ currentUser: null }),

  flash: null,
  showFlash: (type, message) => {
    set({ flash: { type, message } });
    setTimeout(() => set({ flash: null }), 2500);
  },
}));

export default useStore;
