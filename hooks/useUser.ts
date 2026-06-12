'use client'

import { useState, useEffect } from 'react'
import type { UserId } from '@/data/workouts'

const KEY = 'gbuddy_user'

export function useUser() {
  const [user, setUser] = useState<UserId | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as UserId | null
    setUser(stored)
    setLoading(false)
  }, [])

  const login = (id: UserId) => {
    localStorage.setItem(KEY, id)
    setUser(id)
  }

  const logout = () => {
    localStorage.removeItem(KEY)
    setUser(null)
  }

  return { user, loading, login, logout }
}
