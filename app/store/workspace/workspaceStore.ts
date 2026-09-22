import { create } from 'zustand';
import * as React from 'react';

interface WorkspaceStore {
  activeComponent: React.ComponentType<any> | React.ReactElement | null;
  activeNavigation: { group: string; item: string } | null;
  artifact: any | null;
  activeTab: string | null;
  activeTabLabel: string | null;
  refreshKey: number;
  isLoading: boolean;
  
  setActiveComponent: (component: React.ComponentType<any> | React.ReactElement | null) => void;
  setActiveNavigation: (navigation: { group: string; item: string } | null) => void;
  setActiveTab: (tab: string | null, label: string | null) => void;
  refreshActiveTab: () => void;
  setIsLoading: (isLoading: boolean) => void;
  setArtifact: (artifact: any | null) => void;
  
  setActiveComponentAndNavigation: (
    component: React.ComponentType<any> | React.ReactElement | null,
    navigation: { group: string; item: string } | null
  ) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeComponent: null,
  activeNavigation: null,
  artifact: null,
  activeTab: null,
  activeTabLabel: null,
  refreshKey: 0,
  isLoading: false,

  setActiveComponent: (component) => {
    if (component !== get().activeComponent) {
      set({ activeComponent: component });
    }
  },
  
  setActiveNavigation: (navigation) => {
    if (JSON.stringify(navigation) !== JSON.stringify(get().activeNavigation)) {
      set({ activeNavigation: navigation });
    }
  },
  
  setActiveTab: (tab, label) => set({ activeTab: tab, activeTabLabel: label }),
  refreshActiveTab: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setArtifact: (artifact) => set({ artifact }),
  
  setActiveComponentAndNavigation: (component, navigation) => {
    const currentState = get();
    const componentChanged = component !== currentState.activeComponent;
    const navigationChanged = JSON.stringify(navigation) !== JSON.stringify(currentState.activeNavigation);
    
    if (componentChanged || navigationChanged) {
      set({ activeComponent: component, activeNavigation: navigation });
    }
  }
}));
