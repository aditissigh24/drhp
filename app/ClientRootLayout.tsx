'use client'

import * as React from "react"
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/layout/AppSidebar"
import { AppTopbar } from "@/app/layout/AppTopbar"
import { AppContent } from "@/app/layout/AppContent"
import { useAuthStore } from './store/authentication/authStore'

/**
 * Session gate, ported from the surveillance UI.
 *
 * The auth flow is the upstream one unchanged: the same store, the same
 * `localStorage.auth` envelope, the same JWT expiry decode, and the same
 * real OTP calls to `NEXT_PUBLIC_API_URL`. Dropped from upstream: the
 * merchant/investigation data prefetch (those stores are not part of this
 * app) and the non-local devtools/context-menu blocker.
 */
export function ClientRootLayout({ children }: { children: React.ReactNode }) {
  const isClient = typeof window !== 'undefined'
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)

  // Restore a persisted session, dropping it if the token has already expired.
  useEffect(() => {
    if (!isClient) return

    const savedAuth = localStorage.getItem('auth')
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth)

        let isExpired = false
        if (authData.accessToken) {
          try {
            const parts = authData.accessToken.split('.')
            if (parts.length === 3) {
              let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
              while (base64.length % 4 !== 0) {
                base64 += '='
              }
              const payload = JSON.parse(atob(base64))
              if (payload.exp && Date.now() >= payload.exp * 1000) {
                isExpired = true
              }
            }
          } catch (e) {
            console.error('Invalid token format:', e)
            isExpired = true
          }
        }

        if (isExpired) {
          localStorage.removeItem('auth')
          useAuthStore.setState({ isAuthenticated: false, accessToken: null, user: null })
        } else if (authData.isAuthenticated && !isAuthenticated) {
          useAuthStore.setState({
            isAuthenticated: true,
            accessToken: authData.accessToken,
            user: authData.user,
          })
          // Wait for the next effect cycle, where isAuthenticated is updated,
          // before clearing the loading flag.
          return
        }
      } catch (error) {
        console.error('Failed to parse auth data:', error)
        localStorage.removeItem('auth')
      }
    }
    setIsLoading(false)
  }, [isClient, isAuthenticated])

  useEffect(() => {
    if (!isClient || isLoading) return

    if (!isAuthenticated) {
      if (pathname !== '/auth') {
        router.push('/auth')
      }
      return
    }

    // Authenticated users who land on /auth are left alone: LoginForm owns the
    // post-login redirect, and pushing here as well causes a refresh flash.
    if (pathname === '/auth') {
      return
    }
  }, [isAuthenticated, pathname, isClient, isLoading, router])

  // Prevent a UI flash while the session is being restored, except on the
  // auth page, which is safe to paint immediately.
  if (isClient && isLoading && pathname !== '/auth') {
    return null
  }

  return (
    <>
      {pathname === '/auth' ? (
        <div className="auth-container">{children}</div>
      ) : (
        isAuthenticated && (
          <SidebarProvider defaultOpen={true} className="h-screen w-full smm-shell">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <AppTopbar />
              <AppContent>{children}</AppContent>
            </div>
          </SidebarProvider>
        )
      )}
    </>
  )
}
