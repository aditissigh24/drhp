import * as React from "react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from 'react';
import { WorkspaceContent } from './WorkspaceContent';
import { WorkspaceTabBar } from './WorkspaceTabBar';
import { useWorkspaceStore } from '@/app/store/workspace/workspaceStore';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface WorkspaceProps {
  children?: React.ReactNode
  className?: string
  tabs?: Tab[]
  initialActiveTabId?: string
}

export function Workspace({ children, className, tabs, initialActiveTabId }: WorkspaceProps) {
  const { setActiveTab, refreshKey } = useWorkspaceStore();
  const [localActiveTab, setLocalActiveTab] = useState<string | null>(
    initialActiveTabId || tabs?.[0]?.id || null
  );

  // Keep local active tab in sync with tabs list
  useEffect(() => {
    if (tabs && tabs.length > 0) {
      const exists = tabs.some(tab => tab.id === localActiveTab);
      if (!exists) {
        setLocalActiveTab(tabs[0].id);
      }
    } else {
      setLocalActiveTab(null);
    }
  }, [tabs, localActiveTab]);

  // Update local active tab when initialActiveTabId changes
  useEffect(() => {
    if (initialActiveTabId && initialActiveTabId !== localActiveTab) {
      setLocalActiveTab(initialActiveTabId);
    }
  }, [initialActiveTabId]);

  // Sync local state with store
  useEffect(() => {
    if (localActiveTab && tabs) {
      const activeTabData = tabs.find(tab => tab.id === localActiveTab);
      setActiveTab(localActiveTab, activeTabData?.label || null);
    }
  }, [localActiveTab, setActiveTab, tabs]);

  const handleTabChange = React.useCallback((tabId: string) => {
    setLocalActiveTab(tabId);
  }, []);

  // Create memoized content with refreshKey dependency
  const activeContent = React.useMemo(() => {
    if (!localActiveTab || !tabs) return null;
    const content = tabs.find(tab => tab.id === localActiveTab)?.content;
    return content ? React.cloneElement(content as React.ReactElement, { key: refreshKey }) : null;
  }, [localActiveTab, tabs, refreshKey]);

  if (!tabs) {
    return (
      <div className={cn("bg-white rounded-lg overflow-hidden flex flex-col h-full", className)}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn("bg-white rounded-lg overflow-hidden flex flex-col h-full", className)}>
      <div className="flex flex-col h-full w-full">
        <WorkspaceTabBar 
          tabs={tabs}
          activeTab={localActiveTab}
          onTabChange={handleTabChange}
        />  
        <WorkspaceContent 
          key={`${localActiveTab}-${refreshKey}`}
          content={activeContent}
        />
      </div>
    </div>
  );
}

// export class WorkspaceErrorBoundary extends React.Component<{children: React.ReactNode}> {
//   state = { hasError: false };
  
//   static getDerivedStateFromError() {
//     return { hasError: true };
//   }
  
//   render() {
//     if (this.state.hasError) {
//       return <div>Something went wrong loading the workspace.</div>;
//     }
//     return this.props.children;
//   }
// }
