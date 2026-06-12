'use client'

import { useState } from 'react'
import { USERS, USER_ACCENT, type UserId } from '@/data/workouts'

interface Props {
  onSelect: (user: UserId) => void
}

export function UserSelect({ onSelect }: Props) {
  const [pressed, setPressed] = useState<UserId | null>(null)

  const handleSelect = (user: UserId) => {
    if (pressed) return
    setPressed(user)
    setTimeout(() => onSelect(user), 320)
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Flash overlay on select */}
      {pressed && (
        <div
          className="fixed inset-0 z-50 animate-flash pointer-events-none"
          style={{ backgroundColor: USER_ACCENT[pressed] }}
        />
      )}

      {/* Top: branding */}
      <div className="flex flex-col items-center justify-center flex-1 pt-16 pb-6 px-6">
        <div className="animate-fadeIn">
          {/* Big logo */}
          <div
            className="font-display font-black text-[88px] leading-none tracking-tight text-center"
            style={{ letterSpacing: '-0.04em' }}
          >
            G<span style={{ color: '#C8FF00' }}>/</span>BUDDY
          </div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-zinc-600 uppercase text-center mt-3">
            programul tău de sală
          </div>
        </div>
      </div>

      {/* Bottom: user cards */}
      <div className="px-4 pb-14">
        <div className="font-mono text-[10px] tracking-[0.25em] text-zinc-700 uppercase text-center mb-5">
          — cine ești? —
        </div>

        <div className="space-y-2.5">
          {USERS.map((user, i) => {
            const accent = USER_ACCENT[user]
            const isActive = pressed === user

            return (
              <button
                key={user}
                onClick={() => handleSelect(user)}
                className="w-full flex items-center overflow-hidden rounded-xl border transition-all duration-200 active:scale-[0.98]"
                style={{
                  borderColor: isActive ? accent : '#222',
                  backgroundColor: isActive ? accent : '#111',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                {/* Index number */}
                <div
                  className="flex items-center justify-center w-14 h-16 font-display font-black text-3xl shrink-0 transition-colors duration-200"
                  style={{ color: isActive ? '#080808' : '#2a2a2a' }}
                >
                  0{i + 1}
                </div>

                {/* Divider */}
                <div
                  className="w-px self-stretch transition-colors duration-200"
                  style={{ backgroundColor: isActive ? `${accent}66` : '#1e1e1e' }}
                />

                {/* Name */}
                <div
                  className="flex-1 px-5 font-display font-black text-[42px] leading-none tracking-tight text-left transition-colors duration-200"
                  style={{ color: isActive ? '#080808' : '#f0f0f0' }}
                >
                  {user}
                </div>

                {/* Arrow */}
                <div
                  className="pr-5 font-mono text-lg transition-colors duration-200"
                  style={{ color: isActive ? '#08080888' : '#333' }}
                >
                  →
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
