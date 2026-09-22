"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarFooter } from "@/components/ui/sidebar"
import { LogOut, Settings, User } from "lucide-react"
import { useAuthStore } from '@/app/store/authentication/authStore';
import { useRouter } from 'next/navigation';

interface UserProfileFooterProps {
  user: {
    name: string
    email: string
    avatarUrl?: string
  }
}

export function UserProfileFooter({ user }: UserProfileFooterProps) {
  const { logout, user: authUser } = useAuthStore();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    // NSE port: the ActiveContext picker is not part of this app, so there are
    // no contexts to clear here. Upstream calls clearContexts() first.
    logout();
    router.push('/auth');
  };

  const initials = authUser?.email
    ? authUser.email[0].toUpperCase()
    : 'U'

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <SidebarFooter className="border-t relative" ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-2 cursor-pointer hover:bg-accent rounded-md transition-colors w-full"
      >
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage src={user.avatarUrl} alt={authUser?.username} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
          <span className="text-sm font-medium leading-none truncate">
            {authUser?.username}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {authUser?.email}
          </span>
        </div>
      </div>

      {/* Custom Dropdown Content */}
      {isOpen && (
        <div className="absolute bottom-full left-2 right-2 mb-2 w-64 bg-popover text-popover-foreground border border-border rounded-md shadow-lg p-1 z-50 flex flex-col gap-1 animate-in fade-in duration-100">
          {/* Header */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar className="w-6 h-6">
              <AvatarImage src={user?.avatarUrl} alt={authUser?.username} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium leading-none truncate">
                {authUser?.username}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {authUser?.email}
              </span>
            </div>
          </div>

          <div className="h-px bg-border my-1" />

          {/* Menu Items */}
          {/* <div
            onClick={() => setIsOpen(false)}
            className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
          >
            <User className="w-4 h-4 mr-2" />
            View Profile
          </div>
          <div
            onClick={() => setIsOpen(false)}
            className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </div> */}

          {/* <div className="h-px bg-border my-1" /> */}

          <div
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
            className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-red-50 text-red-600 hover:text-red-700 cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </div>
        </div>
      )}
    </SidebarFooter>
  )
}