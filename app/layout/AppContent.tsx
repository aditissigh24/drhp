"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Workspace } from "./Workspace/Workspace"

/**
 * The page canvas.
 *
 * Two shapes, chosen by route:
 *
 *  - Watchlist renders upstream's layout exactly — a grey `p-3` canvas holding
 *    the white rounded Workspace card.
 *  - Investigation renders edge-to-edge with no padding and no card, because
 *    the DRHP reviewer is a full-bleed workbench with its own top bar. Boxing
 *    it in a card would give it two stacked headers and steal vertical space
 *    from the PDF.
 *
 * Upstream also renders an `activeComponent` pulled from the workspace store in
 * preference to `children`. That branch is dropped: navigation here is
 * route-driven only, and keeping both would render the page twice.
 */
export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isEdgeToEdge = pathname.startsWith("/investigation")

  if (isEdgeToEdge) {
    return <div className="flex flex-col flex-1 min-h-0 bg-gray-100">{children}</div>
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-3 bg-gray-100">
      <main className="flex-1 overflow-hidden flex flex-col gap-4">
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 min-w-0">
            <Workspace className="h-full overflow-hidden">{children}</Workspace>
          </div>
        </div>
      </main>
    </div>
  )
}
