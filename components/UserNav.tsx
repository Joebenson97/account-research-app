'use client'

import { signOut, useSession } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UserNav() {
  const { data: session } = useSession()

  if (!session?.user) return null

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">
        {session.user.name ?? session.user.email}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="h-4 w-4 mr-1" />
        Sign Out
      </Button>
    </div>
  )
}
