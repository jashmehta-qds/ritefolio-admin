'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSidebar } from '@/components/navigations/SidebarContext'

interface MainContentWrapperProps {
  children: React.ReactNode
}

export const MainContentWrapper = ({ children }: MainContentWrapperProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { isCollapsed } = useSidebar()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  return (
    <main
      className={`flex-grow transition-[margin] duration-300 ${
        isAuthenticated ? (isCollapsed ? 'lg:ml-20' : 'lg:ml-64') : ''
      }`}
    >
      {children}
    </main>
  )
}
