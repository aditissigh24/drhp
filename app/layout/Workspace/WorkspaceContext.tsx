"use client"

import { useWorkspaceStore } from "@/app/store/workspace/workspaceStore"

export function useWorkspace() {
  return useWorkspaceStore()
}