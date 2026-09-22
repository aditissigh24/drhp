import * as React from "react"
import { cn } from "@/lib/utils"

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface WorkspaceTabBarProps {
  tabs: Tab[];
  activeTab: string | null;
  onTabChange: (tabId: string) => void;
}

export const WorkspaceTabBar = React.memo(({ tabs, activeTab, onTabChange }: WorkspaceTabBarProps) => {
  return (
    <div className="flex border-b shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab-id={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium',
            activeTab === tab.id 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500'
          )}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

WorkspaceTabBar.displayName = "WorkspaceTabBar";