import { StateCreator } from 'zustand';
import { UISlice, RootStore } from '../types';

export const createUISlice: StateCreator<RootStore, [], [], UISlice> = (set) => ({
  theme: 'dark',
  activeTab: 'command-center',
  searchTerm: '',
  isCommandPaletteOpen: false,
  isMobileSidebarOpen: false,

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  setMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
  toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen }))
});
