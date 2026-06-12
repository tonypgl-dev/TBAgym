'use client'

import { useState, useEffect, useRef } from 'react'
import { getTodayWorkout, USER_ACCENT, type UserId } from '@/data/workouts'
import type { Exercise } from '@/data/workouts'
import {
  getChecked, saveChecked,
  getCustomExercises, saveCustomExercises,
  getDeletedIds, saveDeletedIds,
  saveHistory,
} from '@/lib/storage'
import { CalendarView } from './CalendarView'
import { AddExerciseModal } from './AddExerciseModal'

interface Props {
  user: UserId
  onLogout: () => void
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  )
}

const today = new Date().toISOString().split('T')[0]

export function WorkoutView({ user, onLogout }: Props) {
  const accent  = USER_ACCENT[user]
  const workout = getTodayWorkout()

  const [exercises,    setExercises]    = useState<Exercise[]>([])
  const [checked,      setChecked]      = useState<Set<string>>(new Set())
  const [justChecked,  setJustChecked]  = useState<string | null>(null)
  const [actionTarget, setActionTarget] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)

  const exercisesRef = useRef(exercises)
  exercisesRef.current = exercises

  // ─── Init from localStorage ────────────────────────────────────────────────
  useEffect(() => {
    const base    = workout?.exercises ?? []
    const deleted = getDeletedIds(user, today)
    const custom  = getCustomExercises(user, today)
    const list    = [...base.filter(e => !deleted.includes(e.id)), ...custom]
    setExercises(list)

    const savedIds = getChecked(user, today)
    setChecked(new Set(savedIds.filter(id => list.some(e => e.id === id))))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Long-press via Pointer Events (works identically on touch + mouse) ───
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClick  = useRef(false)
  const startPos       = useRef({ x: 0, y: 0 })

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    startPos.current = { x: e.clientX, y: e.clientY }
    timerRef.current = setTimeout(() => {
      suppressClick.current = true
      setActionTarget(id)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40)
    }, 500)
  }

  const onPointerUp = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (
      Math.abs(e.clientX - startPos.current.x) > 8 ||
      Math.abs(e.clientY - startPos.current.y) > 8
    ) {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }

  const onPointerCancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const handleClick = (id: string) => {
    if (suppressClick.current) { suppressClick.current = false; return }
    toggle(id)
  }

  // ─── Toggle check ──────────────────────────────────────────────────────────
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
      saveChecked(user, today, Array.from(next))
      saveHistory(user, today, next.size, exercisesRef.current.length)
      return next
    })
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!actionTarget) return

    const deletedIds = getDeletedIds(user, today)
    if (!deletedIds.includes(actionTarget)) {
      saveDeletedIds(user, today, [...deletedIds, actionTarget])
    }
    const custom = getCustomExercises(user, today)
    saveCustomExercises(user, today, custom.filter(e => e.id !== actionTarget))

    const newChecked = new Set(checked)
    newChecked.delete(actionTarget)
    saveChecked(user, today, Array.from(newChecked))
    setChecked(newChecked)

    const newList = exercises.filter(e => e.id !== actionTarget)
    setExercises(newList)
    saveHistory(user, today, newChecked.size, newList.length)
    setActionTarget(null)
  }

  // ─── Add ───────────────────────────────────────────────────────────────────
  const handleAdd = (exercise: Exercise) => {
    const custom  = getCustomExercises(user, today)
    saveCustomExercises(user, today, [...custom, exercise])
    const newList = [...exercises, exercise]
    setExercises(newList)
    saveHistory(user, today, checked.size, newList.length)
    setShowAddModal(false)
  }

  // ─── Derived ───────────────────────────────────────────────────────────────
  const total   = exercises.length
  const done    = checked.size
  const pct     = total > 0 ? (done / total) * 100 : 0
  const allDone = total > 0 && done === total

  if (showCalendar) {
    return <CalendarView user={user} onClose={() => setShowCalendar(false)} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 sticky top-0 bg-[#080808] z-10"
        style={{ borderBottomColor: `${accent}22` }}
      >
        <div className="font-display font-black text-2xl leading-none" style={{ letterSpacing: '-0.04em' }}>
          G<span style={{ color: accent }}>/</span>B
        </div>

        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-lg tracking-wider" style={{ color: accent }}>
            {user.toUpperCase()}
          </span>

          <button
            onClick={() => setShowCalendar(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-zinc-200 transition-colors"
            aria-label="Calendar"
          >
            <CalendarIcon />
          </button>

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
          {/* ── Workout info ── */}
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
            <p className="font-mono text-[11px] text-zinc-500 leading-relaxed">{workout.subtitle}</p>

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

          <div className="h-px mx-4 bg-zinc-900" />

          <div className="px-4 pt-2 pb-1">
            <p className="font-mono text-[9px] text-zinc-800 text-center tracking-widest uppercase">
              Ține apăsat un exercițiu pentru opțiuni
            </p>
          </div>

          {/* ── Exercise list ── */}
          <div className="flex-1 px-4 py-3 space-y-2">
            {exercises.map((ex, i) => {
              const isChecked = checked.has(ex.id)
              const isPop     = justChecked === ex.id

              return (
                <div
                  key={ex.id}
                  className={`flex items-stretch rounded-xl border overflow-hidden transition-all duration-300 select-none ${isPop ? 'animate-checkPop' : ''}`}
                  style={{
                    borderColor: isChecked ? `${accent}33` : '#1e1e1e',
                    backgroundColor: isChecked ? `${accent}08` : '#111',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    WebkitUserSelect: 'none',
                  }}
                  onPointerDown={(e) => onPointerDown(e, ex.id)}
                  onPointerUp={onPointerUp}
                  onPointerMove={onPointerMove}
                  onPointerCancel={onPointerCancel}
                  onPointerLeave={onPointerCancel}
                  onClick={() => handleClick(ex.id)}
                >
                  <div
                    className="flex items-center justify-center w-[52px] shrink-0 font-display font-black text-3xl transition-all duration-300"
                    style={{ color: isChecked ? accent : '#222' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>

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

                  <div
                    className="flex items-center justify-center w-10 font-mono text-sm transition-all duration-300 shrink-0"
                    style={{ color: isChecked ? accent : '#2a2a2a' }}
                  >
                    {isChecked ? '✓' : '○'}
                  </div>
                </div>
              )
            })}

            {/* Add exercise button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-600 text-zinc-700 hover:text-zinc-400 transition-colors mt-1"
            >
              <PlusIcon />
              <span className="font-mono text-xs tracking-widest uppercase">Adaugă exercițiu</span>
            </button>
          </div>

          {allDone && (
            <div
              className="mx-4 mb-10 p-5 rounded-2xl text-center border animate-fadeIn"
              style={{ borderColor: `${accent}44`, backgroundColor: `${accent}0d` }}
            >
              <div className="font-display font-black text-3xl leading-none mb-1" style={{ color: accent }}>
                ANTRENAMENT COMPLET
              </div>
              <div className="font-mono text-xs text-zinc-500 mt-2">Bine ai muncit, {user}. 💪</div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
          <div>
            <div className="font-display font-black text-6xl text-zinc-800 leading-none mb-3">ODIHNĂ</div>
            <div className="font-mono text-xs text-zinc-600 leading-relaxed">
              Nu există antrenament programat azi.<br />Recuperează-te bine.
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-600 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <PlusIcon />
            <span className="font-mono text-xs tracking-widest uppercase">Adaugă exercițiu</span>
          </button>
        </div>
      )}

      {/* ── Action sheet ── */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setActionTarget(null)} />
          <div className="relative bg-zinc-900 border-t border-zinc-800 rounded-t-2xl px-4 pt-4 pb-10">
            <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-4" />
            <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest text-center mb-3 px-4 truncate">
              {exercises.find(e => e.id === actionTarget)?.name}
            </div>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-800 active:bg-zinc-700 transition-colors"
            >
              <span className="text-red-500"><TrashIcon /></span>
              <span className="font-display font-bold text-xl text-red-400">Șterge exercițiu</span>
            </button>
            <button
              onClick={() => { setActionTarget(null); setShowAddModal(true) }}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-800 active:bg-zinc-700 transition-colors mt-1"
            >
              <span style={{ color: accent }}><PlusIcon /></span>
              <span className="font-display font-bold text-xl" style={{ color: accent }}>
                Adaugă exercițiu nou
              </span>
            </button>
            <button
              onClick={() => setActionTarget(null)}
              className="w-full py-3 mt-2 font-mono text-xs text-zinc-600 hover:text-zinc-400 tracking-widest uppercase"
            >
              Anulează
            </button>
          </div>
        </div>
      )}

      {/* ── Add modal ── */}
      {showAddModal && (
        <AddExerciseModal accent={accent} onAdd={handleAdd} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
