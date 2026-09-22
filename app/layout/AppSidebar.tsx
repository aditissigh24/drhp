"use client"

import * as React from "react"
import { useRouter, usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent as SidebarContentRoot,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { AlertTriangle, Microscope, ChevronsLeft, ChevronsRight, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Montserrat } from 'next/font/google'
import { UserProfileFooter } from "@/components/custom/UserProfileFooter"
import { useWorkspaceStore } from '@/app/store/workspace/workspaceStore'
import { defaultCompany, companyUrlSlug } from '@/app/data/companies'

const montserrat = Montserrat({ subsets: ['latin'], weight: ['800'] })

export const NAV_GROUP = "Due Diligence"

interface SidebarItem {
  label: string
  icon: LucideIcon
  /** Route this item owns. Also the prefix used to decide the active item. */
  href: string
}

export const sidebarItems: SidebarItem[] = [
  { label: "Watchlist",     icon: AlertTriangle, href: "/watchlist" },
  { label: "Investigation", icon: Microscope,    href: `/investigation/${companyUrlSlug(defaultCompany)}` },
]

/**
 * Upstream drives navigation two ways at once: it pushes a route AND stores an
 * `activeComponent` in the workspace store, then `AppContent` renders whichever
 * it finds. Porting only the routes means the store branch is dead weight that
 * would double-render, so active state here is derived from the pathname —
 * one source of truth, and the browser's back button works for free.
 */
function SidebarContents() {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useSidebar()
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab)

  const isActive = React.useCallback(
    (item: SidebarItem) => {
      const section = item.href.split('/')[1]
      return pathname === item.href || pathname.startsWith(`/${section}`)
    },
    [pathname],
  )

  const handleItemClick = React.useCallback((item: SidebarItem) => {
    if (isActive(item)) return
    // Clear the tab label so the breadcrumb doesn't show the previous
    // section's tab while the new route is still compiling.
    setActiveTab(null, null)
    router.push(item.href)
  }, [isActive, router, setActiveTab])

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="h-14 relative">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={cn(
            "transition-all duration-200",
            "group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:hidden"
          )}>
            <div onClick={() => router.push('/watchlist')} className="cursor-pointer">
              <span className={cn("text-lg text-[#00285B]", montserrat.className)}>modus ai</span>
            </div>
          </div>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 group-data-[collapsible=icon]:left-1/2 group-data-[collapsible=icon]:right-auto group-data-[collapsible=icon]:-translate-x-1/2">
          <SidebarTrigger>
            {state === "collapsed" ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContentRoot>
        <SidebarGroup>
          <SidebarGroupLabel>{NAV_GROUP}</SidebarGroupLabel>
          {sidebarItems.map((item) => (
            <SidebarMenuButton
              key={item.label}
              icon={item.icon}
              tooltip={item.label}
              onClick={() => handleItemClick(item)}
              className={cn(
                isActive(item) && "bg-blue-100/80 text-blue-600 font-medium hover:bg-blue-200/80",
                "transition-colors",
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span>{item.label}</span>
              </div>
            </SidebarMenuButton>
          ))}
        </SidebarGroup>
      </SidebarContentRoot>

      <UserProfileFooter user={{ name: "Demo Reviewer", email: "reviewer@nse.demo" }} />
    </Sidebar>
  )
}

export function AppSidebar() {
  return <SidebarContents />
}
