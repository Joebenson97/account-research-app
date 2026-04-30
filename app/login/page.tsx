import { Suspense } from 'react'
import { Building2 } from 'lucide-react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900">Account Research</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
        </div>

        <Suspense fallback={<div className="text-center text-gray-500">Loading…</div>}>
          <LoginForm />
        </Suspense>

        <div className="mt-4 text-center text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600">Demo accounts (password: admin123)</p>
          <p><strong>Admin</strong> — admin@company.com (full access)</p>
          <p><strong>Editor</strong> — editor@company.com (create &amp; edit)</p>
          <p><strong>Viewer</strong> — viewer@company.com (read-only)</p>
        </div>
      </div>
    </div>
  )
}
