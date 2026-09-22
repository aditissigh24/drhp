import { create } from 'zustand';
import * as React from 'react';
export interface Tab {
  id: string;
  title: string;
  renderArtifact: () => React.JSX.Element;
  cachedContent?: React.JSX.Element;
  cachedData?: any; // Store fetched data separately from rendered content
  dataLoaded?: boolean; // Flag to indicate if data has been loaded
  artifact?: any | null;
  currentUrl?: string;
  history?: any[];
  historyIndex?: number;
  isBlank?: boolean;
  locked?: boolean;
}

interface ArtifactStore {
  // Current artifact being displayed
  // currentArtifact: Artifact | null;

  // Tab management
  tabs: Tab[];
  activeTabId: string | null;

  // Panel state
  isCollapsed: boolean;
  tabRef: React.RefObject<HTMLDivElement>;

  // Navigation state
  canGoBack: boolean;
  canGoForward: boolean;

  // Actions
  // setCurrentArtifact: (artifact: Artifact | null) => void;
  // setTabs: (tabs: Tab[]) => void;
  setActiveTabId: (id: string | null) => void;
  setCollapsed: (collapsed: boolean) => void;

  // Tab operations
  addTab: (tab: Tab) => void;
  removeTab: (tabId: string) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;

  // History navigation
  // navigateHistory: (direction: 'back' | 'forward') => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;

  // UI refresh marker to force re-renders
  uiRefreshKey: number;

  // Force tab activation with multiple backup mechanisms
  forceActivateTab: (id: string) => void;

  // Hard reset of the tab system for recovery from stuck states
  resetTabSystem: () => void;
}

export const useArtifactStore = create<ArtifactStore>((set, get) => ({
  // currentArtifact: null,
  tabs: [],
  activeTabId: null,
  // Start with the artifact panel collapsed on initial load
  isCollapsed: true,
  canGoBack: false,
  canGoForward: false,
  tabRef: React.createRef<HTMLDivElement>(),
  uiRefreshKey: 0,
  // setCurrentArtifact: (artifact) => set({ currentArtifact: artifact }),
  // setTabs: (tabs) => set({ tabs }),
  setActiveTabId: (id) => set((state) => {
    console.log("Setting active tab ID:", id, "Previous ID:", state.activeTabId);

    // Only increment the refresh key if the tab ID is actually changing
    // or if it's a deliberate refresh of the same tab
    const isTabChange = state.activeTabId !== id;
    return {
      activeTabId: id,
      // Only increment if it's a different tab (minimal UI updates)
      uiRefreshKey: isTabChange ? state.uiRefreshKey + 1 : state.uiRefreshKey,
      isCollapsed: false // Always ensure the panel is expanded
    };
  }),
  setCollapsed: (collapsed) => {
    console.log('Setting artifact panel collapsed state to:', collapsed);
    set({ isCollapsed: collapsed });
  },

  addTab: (tab) => set(state => {
    console.log('Adding tab to store:', tab.id, tab.title);
    console.log('Current tabs before adding:', state.tabs.map(t => t.id));

    // Check if tab with same ID already exists
    const existingTabIndex = state.tabs.findIndex(t => t.id === tab.id);
    if (existingTabIndex !== -1) {
      console.log('Tab already exists:', tab.id);
      
      // Always update renderArtifact with fresh closure so media/data is current
      const updatedTabs = [...state.tabs];
      updatedTabs[existingTabIndex] = {
        ...updatedTabs[existingTabIndex],
        renderArtifact: tab.renderArtifact,
        cachedContent: undefined, // clear stale cache
      };

      return {
        tabs: updatedTabs,
        activeTabId: tab.id,
        isCollapsed: false,
        uiRefreshKey: state.uiRefreshKey + 1,
      };
    }
    // Otherwise add new tab and always make it active
    console.log('Adding new tab:', tab.id);
    const newTabs = [...state.tabs, tab];
    console.log('New tabs array:', newTabs.map(t => t.id));
    console.log('Setting active tab to:', tab.id);
    return {
      tabs: newTabs,
      activeTabId: tab.id,
      isCollapsed: false,
      uiRefreshKey: state.uiRefreshKey + 1
    };
  }),

  removeTab: (tabId) => set(state => {
    const isRemovingActive = state.activeTabId === tabId;
    const remainingTabs = state.tabs.filter(t => t.id !== tabId);
    const newActiveId = isRemovingActive
      ? remainingTabs[0]?.id || null
      : state.activeTabId;

    console.log(`Removing tab ${tabId}, new active tab will be ${newActiveId || 'null'}`);

    // Clear all transition states after tab removal
    // Use a slightly delayed update to ensure React processes removals correctly
    if (isRemovingActive) {
      setTimeout(() => {
        set(current => ({
          uiRefreshKey: current.uiRefreshKey + 2
        }));
      }, 50);
    }

    return {
      tabs: remainingTabs,
      activeTabId: newActiveId,
      uiRefreshKey: state.uiRefreshKey + 1
    };
  }),

  moveTab: (fromIndex, toIndex) => set(state => {
    const newTabs = [...state.tabs];
    const [tab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, tab);
    return { tabs: newTabs };
  }),

  // navigateHistory: (direction: 'back' | 'forward') => {
  //   const state = get();
  //   const activeTab = state.tabs.find(tab => tab.id === state.activeTabId);

  //   if (!activeTab) return;

  //   const newIndex = direction === 'back'
  //     ? activeTab.historyIndex - 1
  //     : activeTab.historyIndex + 1;

  //   set({
  //     canGoBack: newIndex > 0,
  //     canGoForward: newIndex < activeTab.history.length - 1
  //   });
  // },

  updateTab: (id, updates) => set((state) => ({
    tabs: state.tabs.map(tab =>
      tab.id === id ? { ...tab, ...updates } : tab
    )
  })),

  // Force tab activation with multiple backup mechanisms
  forceActivateTab: (id: string) => {
    // Get current state
    const state = get();

    // Check if the tab exists
    const tabToActivate = state.tabs.find(tab => tab.id === id);
    if (!tabToActivate) {
      console.warn(`Tab with id ${id} does not exist, cannot activate`);
      return;
    }

    // Check for content mismatches that might cause display issues
    if (tabToActivate.cachedContent && tabToActivate.cachedContent.props) {
      const cachedTabId = tabToActivate.cachedContent.props['data-tab-id'];

      // If we detect a content ID mismatch, clear the content to force a re-render
      if (cachedTabId && cachedTabId !== id) {
        console.warn(`Content mismatch in forceActivateTab: Tab ID ${id} has content for ${cachedTabId}. Clearing cache.`);

        // Update the tab to clear its cached content
        const updatedTabs = state.tabs.map(tab =>
          tab.id === id ? { ...tab, cachedContent: undefined } : tab
        );

        // Replace the tabs array with the updated version
        set({ tabs: updatedTabs });
      }
    }

    // Check if this is for the currently active tab
    const isSameTab = state.activeTabId === id;

    // Forcibly update state with a new reference to ensure React detects the change
    set({
      activeTabId: id,
      uiRefreshKey: state.uiRefreshKey + 2, // Increment by 2 for a more significant change
      isCollapsed: false // Always ensure panel is expanded
    });

    // If we're trying to activate the same tab that's already active,
    // use a more aggressive technique to force re-rendering
    if (isSameTab) {
      // Briefly set to null and then back to force a more noticeable state change
      setTimeout(() => {
        set({ activeTabId: null });
        // Then set it back
        setTimeout(() => {
          set({
            activeTabId: id,
            uiRefreshKey: state.uiRefreshKey + 3
          });
        }, 5);
      }, 5);
    } else {
      // Normal case for different tab, just ensure UI updates
      setTimeout(() => {
        set(state => ({
          uiRefreshKey: state.uiRefreshKey + 1
        }));
      }, 10);
    }

    // Focus management - try to find and focus the tab element
    setTimeout(() => {
      try {
        const tabElement = document.querySelector(`[data-tab-id="${id}"]`) as HTMLElement;
        if (tabElement) {
          tabElement.focus();
          // Scroll the tab into view if needed
          tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      } catch (e) {
        console.warn('Could not focus tab element:', e);
      }
    }, 50);
  },

  // Hard reset of the tab system for recovery from stuck states
  resetTabSystem: () => {
    // Get the current state
    const state = get();

    // Save the current tabs but reset active state
    set({
      // Keep the tabs but reset active state
      activeTabId: state.tabs[0]?.id || null,
      uiRefreshKey: state.uiRefreshKey + 10, // Big increment to force refresh
      isCollapsed: false
    });

    // After a short delay, try to activate the first tab again
    setTimeout(() => {
      const currentState = get();
      if (currentState.tabs.length > 0) {
        const firstTabId = currentState.tabs[0].id;
        console.log("Reset tab system: Activating first tab:", firstTabId);

        // Force set the active tab
        set({
          activeTabId: firstTabId,
          uiRefreshKey: currentState.uiRefreshKey + 1
        });

        // Try to focus the tab element
        try {
          const tabElement = document.querySelector(`[data-tab-id="${firstTabId}"]`) as HTMLElement;
          if (tabElement) {
            tabElement.focus();
            tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        } catch (e) {
          console.warn('Could not focus tab element during reset:', e);
        }
      }
    }, 50);
  }
}));