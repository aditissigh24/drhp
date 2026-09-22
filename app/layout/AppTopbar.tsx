"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ChevronRight, RefreshCw } from "lucide-react"
import { BubbleTag } from "@/components/custom/BubbleTag"
import { useWorkspaceStore } from "@/app/store/workspace/workspaceStore"
import { NAV_GROUP } from "./AppSidebar"
import { companyBySlug } from "@/app/data/companies"

/**
 * Breadcrumb: Group › Item › <trailing>, trailing in blue.
 *
 * Upstream reads the trailing segment from the workspace store's `activeTabLabel`
 * only. Here Investigation has no Workspace tab bar to populate it (it renders
 * edge-to-edge), so the trailing segment falls back to the document title for
 * the company in the URL — which is what was asked for: the top bar carries the
 * DRHP title.
 */
export function AppTopbar() {
  const pathname = usePathname()
  const activeTab = useWorkspaceStore((s) => s.activeTab)
  const activeTabLabel = useWorkspaceStore((s) => s.activeTabLabel)
  const refreshActiveTab = useWorkspaceStore((s) => s.refreshActiveTab)

  const { item, trailing } = React.useMemo(() => {
    if (pathname.startsWith("/investigation")) {
      const slug = pathname.split("/")[2] ?? ""
      const company = companyBySlug(slug)
      return {
        item: "Investigation",
        trailing: company
          ? `${company.legalName} — ${company.docType} · ${company.section}`
          : "Investigation",
      }
    }
    if (pathname.startsWith("/watchlist")) {
      return { item: "Watchlist", trailing: activeTabLabel }
    }
    return { item: null as string | null, trailing: null as string | null }
  }, [pathname, activeTabLabel])

  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (activeTab) refreshActiveTab()
  }

  return (
    <header className="border-b bg-white h-14 flex items-center px-6 justify-between relative z-40 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        {item && (
          <h1 className="flex items-center text-sm font-medium min-w-0">
            <span className="text-muted-foreground shrink-0">{NAV_GROUP}</span>
            <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground shrink-0">{item}</span>
            {trailing && (
              <>
                <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-blue-600 truncate">{trailing}</span>
                {activeTab && (
                  <div onClick={handleRefresh} className="ml-3 cursor-pointer shrink-0">
                    <BubbleTag
                      text="Refresh"
                      color="blueTextWhiteBg"
                      hasInsideIcon={true}
                      icon={<RefreshCw className="h-3.5 w-3.5" />}
                      onHover={true}
                      withBorder={true}
                    />
                  </div>
                )}
              </>
            )}
          </h1>
        )}
      </div>
    </header>
  )
}
