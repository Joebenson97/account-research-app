'use client'

import { signOut, useSession } from 'next-auth/react'
import { LogOut, Shield, Edit3, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

const roleConfig: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'text-red-600 bg-red-50' },
  editor: { label: 'Editor', icon: Edit3, color: 'text-blue-600 bg-blue-50' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-gray-600 bg-gray-100' },
}

export default function UserNav() {
  const { data: session } = useSession()

  if (!session?.user) return null

  const role = (session.user as { role?: string }).role ?? 'viewer'
  const config = roleConfig[role] ?? roleConfig.viewer
  const RoleIcon = config.icon

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
        <RoleIcon className="h-3 w-3" />
        {config.label}
      </span>
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
