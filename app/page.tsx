'use client'

import { useUser } from '@/hooks/useUser'
import { UserSelect } from '@/components/UserSelect'
import { WorkoutView } from '@/components/WorkoutView'

export default function Home() {
  const { user, loading, login, logout } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-ping" />
      </div>
    )
  }

  if (!user) return <UserSelect onSelect={login} />
  return <WorkoutView user={user} onLogout={logout} />
}
