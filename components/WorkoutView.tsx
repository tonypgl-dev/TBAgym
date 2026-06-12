'use client'

import { useState } from 'react'
import { getTodayWorkout, USER_ACCENT, type UserId } from '@/data/workouts'

interface Props {
  user: UserId
  onLogout: () => void
}

export function WorkoutView({ user, onLogout }: Props) {
  const workout = getTodayWorkout()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [justChecked, setJustChecked] = useState<string | null>(null)
  const accent = USER_ACCENT[user]

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        setJustChecked(id)
        setTimeout(() => setJustChecked(null), 300)
      }
      return next
    })
  }

  const total = workout?.exercises.length ?? 0
  const done = checked.size
  const pct = total > 0 ? (done / total) * 100 : 0
  const allDone = total > 0 && done === total

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-zinc-900"
        style={{ borderBottomColor: `${accent}22` }}
      >
        <div
          className="font-display font-black text-2xl tracking-tight leading-none"
          style={{ letterSpacing: '-0.04em' }}
        >
          G<span style={{ color: accent }}>/</span>B
        </div>
        <div className="flex items-center gap-3">
          <span
            className="font-display font-bold text-lg tracking-wider"
            style={{ color: accent }}
          >
            {user.toUpperCase()}
          </span>
          <button
            onClick={onLogout}
            className="font-mono text-[10px] tracking-widest uppercase text-zinc-700 hover:text-zinc-400 border border-zinc-800 hover:border-zinc-600 px-2.5 py-1 rounded-md transition-colors"
          >
            logout
          </button>
        </div>
      </header>

      {workout ? (
        <>
          {/* Workout hero */}
          <div className="px-4 pt-5 pb-4">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-600 mb-1">
              {workout.dayLabel}
            </div>
            <h1 className="font-display font-black text-[40px] leading-none mb-2" style={{ letterSpacing: '-0.03em' }}>
              {workout.title}
            </h1>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full border"
                style={{ color: accent, borderColor: `${accent}44`, backgroundColor: `${accent}11` }}
              >
                {workout.type}
              </span>
            </div>
            <p className="font-mono text-[11px] text-zinc-500 leading-relaxed">
              {workout.subtitle}
            </p>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-mono text-[10px] text-zinc-600 tracking-widest uppercase">
                  {done}/{total} completate
                </span>
                <span className="font-mono text-[10px]" style={{ color: pct > 0 ? accent : '#444' }}>
                  {Math.round(pct)}%
                </span>
              </div>
              <div className="h-[3px] bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: accent }}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px mx-4 bg-zinc-900" />

          {/* Exercise list */}
          <div className="flex-1 px-4 py-4 space-y-2 pb-8">
            {workout.exercises.map((ex, i) => {
              const isChecked = checked.has(ex.id)
              const isPop = justChecked === ex.id

              return (
                <button
                  key={ex.id}
                  onClick={() => toggle(ex.id)}
                  className={`w-full text-left flex items-stretch rounded-xl border overflow-hidden transition-all duration-300 ${
                    isPop ? 'animate-checkPop' : ''
                  }`}
                  style={{
                    borderColor: isChecked ? `${accent}33` : '#1e1e1e',
                    backgroundColor: isChecked ? `${accent}08` : '#111',
                  }}
                >
                  {/* Big ghost number */}
                  <div
                    className="flex items-center justify-center w-[52px] shrink-0 font-display font-black text-3xl transition-all duration-300 select-none"
                    style={{ color: isChecked ? accent : '#222' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>

                  {/* Content */}
                  <div className="flex-1 py-3 pr-3 min-w-0">
                    <div
                      className="font-display font-bold text-[22px] leading-tight transition-all duration-300"
                      style={{
                        color: isChecked ? '#444' : '#f0f0f0',
                        textDecoration: isChecked ? 'line-through' : 'none',
                      }}
                    >
                      {ex.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="font-mono text-[10px] text-zinc-600">{ex.muscle}</span>
                      {ex.note && (
                        <>
                          <span className="text-zinc-800 text-[10px]">·</span>
                          <span className="font-mono text-[10px] text-zinc-700 italic">{ex.note}</span>
                        </>
                      )}
                    </div>
                    <div
                      className="font-mono text-xs font-bold mt-1.5 transition-colors duration-300"
                      style={{ color: isChecked ? '#333' : accent }}
                    >
                      {ex.sets} × {ex.reps}
                    </div>
                  </div>

                  {/* Tick */}
                  <div
                    className="flex items-center justify-center w-10 font-mono text-sm transition-all duration-300 shrink-0"
                    style={{ color: isChecked ? accent : '#2a2a2a' }}
                  >
                    {isChecked ? '✓' : '○'}
                  </div>
                </button>
              )
            })}
          </div>

          {/* All done celebration */}
          {allDone && (
            <div
              className="mx-4 mb-10 p-5 rounded-2xl text-center border animate-fadeIn"
              style={{ borderColor: `${accent}44`, backgroundColor: `${accent}0d` }}
            >
              <div
                className="font-display font-black text-3xl leading-none mb-1"
                style={{ color: accent }}
              >
                ANTRENAMENT COMPLET
              </div>
              <div className="font-mono text-xs text-zinc-500 mt-2">
                Bine ai muncit, {user}. 💪
              </div>
            </div>
          )}
        </>
      ) : (
        /* No workout today */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="font-display font-black text-6xl text-zinc-800 leading-none mb-3">
            ODIHNĂ
          </div>
          <div className="font-mono text-xs text-zinc-600 leading-relaxed">
            Nu există antrenament programat pentru azi.<br />
            Recuperează-te bine.
          </div>
        </div>
      )}
    </div>
  )
}
