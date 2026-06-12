'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  getHistory, syncHistory,
  getDayExercises, generateExportText,
  getCustomExercises, saveCustomExercises,
  getDayNote, saveDayNote, deleteDayNote,
  getDayType, saveDayType,
  type DayType,
} from '@/lib/storage'
import { getWorkoutForDate, USER_ACCENT, type UserId } from '@/data/workouts'
import type { Exercise } from '@/data/workouts'
import { AddExerciseModal } from './AddExerciseModal'

const DAY_LABELS  = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D']
const FULL_DAYS   = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']
const MONTH_NAMES = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
]

const START_DATE = '2026-06-10'

interface Props { user: UserId; onClose: () => void }

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayLabel(ds: string) {
  const d = new Date(ds + 'T12:00:00')
  return `${FULL_DAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

type PopupState =
  | { type: 'gym';  date: string }
  | { type: 'plan'; date: string }
  | { type: 'note'; date: string }
  | null

export function CalendarView({ user, onClose }: Props) {
  const accent = USER_ACCENT[user]
  const today  = localDateStr(new Date())

  const [mode,      setMode]      = useState<'month' | 'export'>('month')
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())

  // History (gym days)
  const [history, setHistory] = useState(() => getHistory(user))

  // Planned future days and noted rest days — scanned from localStorage
  const [plannedDates, setPlannedDates] = useState<Set<string>>(new Set())
  const [notedDates,   setNotedDates]   = useState<Set<string>>(new Set())

  // Popup
  const [popup, setPopup] = useState<PopupState>(null)

  // Plan-day state
  const [plannedExs,    setPlannedExs]    = useState<Exercise[]>([])
  const [showAddForPlan, setShowAddForPlan] = useState(false)
  const [dayType,       setDayType]       = useState<DayType>('hard')

  // Rest-note state
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText,  setNoteText]  = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  // Export
  const [exportDays,   setExportDays]   = useState<7 | 14 | 21>(7)
  const [editableText, setEditableText] = useState('')
  const [copied,       setCopied]       = useState(false)

  // ─── Sync from Supabase on mount ─────────────────────────────────────────
  useEffect(() => {
    syncHistory(user).then(h => {
      setHistory(h)
      refreshIndicators()
    })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function refreshIndicators() {
    const planned = new Set<string>()
    const noted   = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(`gbuddy_custom_${user}_`)) {
        const date = k.replace(`gbuddy_custom_${user}_`, '')
        const exs  = getCustomExercises(user, date)
        if (exs.length > 0) planned.add(date)
      }
      if (k?.startsWith(`gbuddy_note_${user}_`)) {
        const date = k.replace(`gbuddy_note_${user}_`, '')
        noted.add(date)
      }
    }
    setPlannedDates(planned)
    setNotedDates(noted)
  }

  // Auto-detect opposite day type from last known gym day before targetDate
  function detectDayType(targetDate: string): DayType {
    const sortedPastGymDays = Object.keys(history)
      .filter(d => d < targetDate && (history[d]?.done ?? 0) > 0)
      .sort()
      .reverse()
    for (const d of sortedPastGymDays) {
      const t = getDayType(user, d)
      if (t) return t === 'easy' ? 'hard' : 'easy'
    }
    return 'hard'
  }

  // ─── Load popup-specific state when popup opens ───────────────────────────
  useEffect(() => {
    if (!popup) return
    if (popup.type === 'plan') {
      setPlannedExs(getCustomExercises(user, popup.date))
      setShowAddForPlan(false)
      const existing = getDayType(user, popup.date)
      setDayType(existing ?? detectDayType(popup.date))
    }
    if (popup.type === 'note') {
      const existing = getDayNote(user, popup.date)
      setNoteTitle(existing?.title ?? '')
      setNoteText(existing?.note ?? '')
      setNoteSaved(false)
    }
  }, [popup, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Export text
  useEffect(() => {
    if (mode === 'export') setEditableText(generateExportText(user, exportDays, user))
  }, [mode, exportDays, user])

  // ─── Month grid ───────────────────────────────────────────────────────────
  const monthDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const last  = new Date(viewYear, viewMonth + 1, 0)
    const pad   = (first.getDay() + 6) % 7
    const cells: (Date | null)[] = Array(pad).fill(null)
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(viewYear, viewMonth, d))
    return cells
  }, [viewYear, viewMonth])

  const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1)
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y + 1)) : setViewMonth(m => m + 1)

  const monthGymDays = Object.entries(history).filter(([ds, r]) =>
    r.done > 0 && ds >= START_DATE &&
    ds.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)
  ).length

  // ─── Plan day handlers ────────────────────────────────────────────────────
  const handleDayTypeChange = async (type: DayType) => {
    setDayType(type)
    if (popup?.type === 'plan') await saveDayType(user, popup.date, type)
  }

  const handleAddPlanned = async (ex: Exercise) => {
    if (!popup || popup.type !== 'plan') return
    const next = [...plannedExs, ex]
    setPlannedExs(next)
    await saveCustomExercises(user, popup.date, next)
    setPlannedDates(prev => new Set([...Array.from(prev), popup.date]))
    setShowAddForPlan(false)
  }

  const handleRemovePlanned = async (id: string) => {
    if (!popup || popup.type !== 'plan') return
    const next = plannedExs.filter(e => e.id !== id)
    setPlannedExs(next)
    await saveCustomExercises(user, popup.date, next)
    if (next.length === 0) {
      setPlannedDates(prev => { const s = new Set(Array.from(prev)); s.delete(popup.date); return s })
    }
  }

  // ─── Note handlers ────────────────────────────────────────────────────────
  const handleSaveNote = async () => {
    if (!popup || popup.type !== 'note') return
    const t = noteTitle.trim()
    const n = noteText.trim()
    if (t || n) {
      await saveDayNote(user, popup.date, t, n)
      setNotedDates(prev => new Set([...Array.from(prev), popup.date]))
    } else {
      await deleteDayNote(user, popup.date)
      setNotedDates(prev => { const s = new Set(Array.from(prev)); s.delete(popup.date); return s })
    }
    setNoteSaved(true)
    setTimeout(() => setPopup(null), 600)
  }

  // ─── Copy export ─────────────────────────────────────────────────────────
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(editableText) }
    catch {
      const el = document.createElement('textarea')
      el.value = editableText
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  // ─── DayCell ──────────────────────────────────────────────────────────────
  const DayCell = ({ date }: { date: Date | null }) => {
    if (!date) return <div />
    const ds          = localDateStr(date)
    const record      = history[ds]
    const isToday     = ds === today
    const isFuture    = ds > today
    const isBeforeApp = ds < START_DATE
    const isGymDay    = !isBeforeApp && !!record && record.done > 0 && !isFuture
    const isPlanned   = isFuture && !isBeforeApp && plannedDates.has(ds)
    const isNoted     = !isFuture && !isGymDay && notedDates.has(ds) && !isBeforeApp
    const tappable    = !isBeforeApp

    let bg     = 'transparent'
    let border = '2px solid transparent'
    let color  = '#555'

    if (isGymDay)  { bg = accent; color = '#080808' }
    if (isPlanned) { bg = `${accent}30`; border = `2px dashed ${accent}88`; color = accent }
    if (isToday)   { border = `2px solid ${accent}` }

    return (
      <div className="flex flex-col items-center gap-0.5">
        <button
          disabled={!tappable}
          onClick={() => {
            if (!tappable) return
            if (isGymDay) setPopup({ type: 'gym', date: ds })
            else if (isFuture) setPopup({ type: 'plan', date: ds })
            else setPopup({ type: 'note', date: ds })
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150"
          style={{ backgroundColor: bg, border, opacity: isBeforeApp ? 0.2 : 1 }}
        >
          <span className="font-mono text-xs font-bold leading-none" style={{ color }}>
            {date.getDate()}
          </span>
        </button>
        {/* Dot indicators */}
        {isNoted && (
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${accent}88` }} />
        )}
        {!isNoted && <div className="w-1 h-1" />}
      </div>
    )
  }

  // ─── Gym day popup ────────────────────────────────────────────────────────
  const GymPopup = () => {
    if (!popup || popup.type !== 'gym') return null
    const exs  = getDayExercises(user, popup.date)
    const done = exs.filter(e => e.completed)
    return (
      <BottomSheet onClose={() => setPopup(null)}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{dayLabel(popup.date)}</div>
        <div className="font-display font-black text-2xl leading-tight mb-4" style={{ color: accent }}>
          {done.length}/{exs.length} complete
        </div>
        <div className="space-y-0">
          {exs.map((ex, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-zinc-900 last:border-0">
              <span className="font-mono text-xs w-4 text-center shrink-0" style={{ color: ex.completed ? accent : '#444' }}>
                {ex.completed ? '✓' : '○'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-base leading-tight truncate"
                  style={{ color: ex.completed ? '#f0f0f0' : '#444' }}>
                  {ex.name}
                </div>
                <div className="font-mono text-[10px] text-zinc-600">{ex.muscle}</div>
              </div>
              <div className="font-mono text-xs font-bold shrink-0" style={{ color: ex.completed ? accent : '#333' }}>
                {ex.sets}×{ex.reps}
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>
    )
  }

  // ─── Plan day popup ───────────────────────────────────────────────────────
  const PlanPopup = () => {
    if (!popup || popup.type !== 'plan') return null
    const baseWorkout = getWorkoutForDate(popup.date)
    return (
      <BottomSheet onClose={() => setPopup(null)}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{dayLabel(popup.date)}</div>
        <div className="font-display font-black text-2xl leading-tight mb-4" style={{ color: accent }}>
          PLANIFICĂ ZIUA
        </div>

        {/* Day type toggle */}
        <div className="mb-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Tipul zilei</div>
          <div className="flex gap-2">
            {([
              { val: 'hard' as DayType, label: '⚡ ZIUA GREA',   desc: 'Greutăți mari, volum mic' },
              { val: 'easy' as DayType, label: '🌿 ZIUA UȘOARĂ', desc: 'Greutăți mici, execuție lentă' },
            ]).map(({ val, label, desc }) => (
              <button
                key={val}
                onClick={() => handleDayTypeChange(val)}
                className="flex-1 py-3 px-2 rounded-xl border transition-all duration-200 text-left"
                style={{
                  backgroundColor: dayType === val ? `${accent}18` : 'transparent',
                  borderColor:     dayType === val ? accent : '#333',
                }}
              >
                <div className="font-mono text-xs font-bold mb-0.5"
                  style={{ color: dayType === val ? accent : '#555' }}>
                  {label}
                </div>
                <div className="font-mono text-[9px] text-zinc-700 leading-tight">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="font-mono text-[10px] text-zinc-600 mb-3">
          Exercițiile adăugate vor apărea automat în ziua respectivă.
        </div>

        {/* Base workout reference */}
        {baseWorkout && (
          <div className="mb-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 mb-2">
              Antrenament programat — {baseWorkout.title}
            </div>
            {baseWorkout.exercises.map(ex => (
              <div key={ex.id} className="flex justify-between py-1 border-b border-zinc-800 last:border-0">
                <span className="font-display text-sm text-zinc-500">{ex.name}</span>
                <span className="font-mono text-xs text-zinc-700">{ex.sets}×{ex.reps}</span>
              </div>
            ))}
          </div>
        )}

        {/* Planned custom exercises */}
        {plannedExs.length > 0 && (
          <div className="mb-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 mb-2">
              Exerciții adăugate de tine
            </div>
            <div className="space-y-2">
              {plannedExs.map((ex) => (
                <div key={ex.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-base leading-tight" style={{ color: accent }}>
                      {ex.name}
                    </div>
                    <div className="font-mono text-[10px] text-zinc-600">
                      {ex.muscle} · {ex.sets}×{ex.reps}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePlanned(ex.id)}
                    className="text-zinc-700 hover:text-red-400 transition-colors p-1"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowAddForPlan(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 transition-colors mt-1"
          style={{ color: accent }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          </svg>
          <span className="font-mono text-xs tracking-widest uppercase">
            {plannedExs.length === 0 && !baseWorkout ? 'Adaugă exercițiu' : 'Adaugă exercițiu suplimentar'}
          </span>
        </button>

        {showAddForPlan && (
          <AddExerciseModal accent={accent} onAdd={handleAddPlanned} onClose={() => setShowAddForPlan(false)} />
        )}
      </BottomSheet>
    )
  }

  // ─── Rest note popup ──────────────────────────────────────────────────────
  const NotePopup = () => {
    if (!popup || popup.type !== 'note') return null
    const inputClass = `w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3
      font-mono text-sm text-zinc-100 placeholder-zinc-700
      focus:outline-none focus:border-zinc-600 transition-colors`
    return (
      <BottomSheet onClose={() => setPopup(null)}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{dayLabel(popup.date)}</div>
        <div className="font-display font-black text-2xl leading-tight mb-1" style={{ color: accent }}>
          NOTĂ
        </div>
        <div className="font-mono text-[10px] text-zinc-600 mb-5">
          Ce ai făcut în această zi? Va apărea în Export.
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 block mb-1">
              Titlu
            </label>
            <input
              className={inputClass}
              placeholder="ex: Alergat 5km"
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 block mb-1">
              Detalii
            </label>
            <textarea
              className={`${inputClass} resize-none leading-relaxed`}
              placeholder="Orice detalii vrei să ții minte..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <button
          onClick={handleSaveNote}
          className="w-full py-3.5 rounded-xl font-display font-black text-lg transition-all"
          style={{
            backgroundColor: noteSaved ? `${accent}33` : accent,
            color: noteSaved ? accent : '#080808',
            border: noteSaved ? `1px solid ${accent}` : 'none',
          }}
        >
          {noteSaved ? 'SALVAT ✓' : 'SALVEAZĂ'}
        </button>
      </BottomSheet>
    )
  }

  // ─── Shared bottom sheet wrapper ──────────────────────────────────────────
  function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <div className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-2xl px-4 pt-4 pb-10"
          style={{ maxHeight: '85vh', overflowY: 'auto' }}>
          <div className="w-10 h-1 rounded-full bg-zinc-800 mx-auto mb-4" />
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">{children}</div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-300 border border-zinc-800 shrink-0 ml-3 mt-1">
              ✕
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#080808] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 sticky top-0 bg-[#080808] z-10"
        style={{ borderBottomColor: `${accent}22` }}>
        <button onClick={onClose}
          className="font-mono text-xs text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Înapoi
        </button>
        <span className="font-display font-black text-xl" style={{ letterSpacing: '-0.03em' }}>CALENDAR</span>
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
          {([['month', 'LUNĂ'], ['export', 'EXPORT']] as const).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              className="font-mono text-[10px] px-2.5 py-1 rounded-md transition-all"
              style={{ backgroundColor: mode === m ? accent : 'transparent', color: mode === m ? '#080808' : '#555' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 pb-10">

        {/* ── MONTH VIEW ── */}
        {mode === 'month' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors text-xl">‹</button>
              <span className="font-mono text-[11px] text-zinc-500 tracking-widest uppercase">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors text-xl">›</button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map(l => (
                <div key={l} className="flex justify-center">
                  <span className="font-mono text-[10px] text-zinc-700">{l}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {monthDays.map((d, i) => <DayCell key={i} date={d} />)}
            </div>

            {/* Stat card */}
            <div className="mt-6 p-4 rounded-2xl border"
              style={{ borderColor: `${accent}22`, backgroundColor: `${accent}08` }}>
              <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-2">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>
              <div className="font-display font-black text-5xl leading-none" style={{ color: accent }}>
                {monthGymDays}
              </div>
              <div className="font-mono text-xs text-zinc-600 mt-1">zile de sală</div>
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-zinc-900 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: accent }} />
                Sală
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-dashed" style={{ borderColor: `${accent}88`, backgroundColor: `${accent}30` }} />
                Planificat
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: accent }} />
                Azi
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 relative flex items-end justify-center pb-0.5">
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${accent}88` }} />
                </div>
                Notă
              </div>
            </div>

            <p className="font-mono text-[10px] text-zinc-700 text-center mt-4">
              Apasă orice zi pentru detalii · Zilele viitoare pot fi planificate
            </p>
          </>
        )}

        {/* ── EXPORT VIEW ── */}
        {mode === 'export' && (
          <div className="mt-2">
            <div className="flex gap-2 mb-4">
              {([7, 14, 21] as const).map(d => (
                <button key={d} onClick={() => setExportDays(d)}
                  className="flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all border"
                  style={{
                    backgroundColor: exportDays === d ? accent : 'transparent',
                    color: exportDays === d ? '#080808' : '#555',
                    borderColor: exportDays === d ? accent : '#222',
                  }}>
                  {d} zile
                </button>
              ))}
            </div>
            <button onClick={handleCopy}
              className="w-full py-3 rounded-xl font-display font-black text-lg mb-4 transition-all"
              style={{
                backgroundColor: copied ? `${accent}33` : accent,
                color: copied ? accent : '#080808',
                border: copied ? `1px solid ${accent}` : 'none',
              }}>
              {copied ? 'COPIAT ✓' : 'COPIAZĂ TEXT'}
            </button>
            <textarea
              value={editableText}
              onChange={e => setEditableText(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-[11px] text-zinc-400 leading-relaxed resize-none outline-none focus:border-zinc-600 transition-colors"
              style={{ minHeight: '55vh' }}
              spellCheck={false}
            />
            <p className="font-mono text-[10px] text-zinc-700 text-center mt-3">
              Editează direct, apoi copiază și dă paste unui AI.
            </p>
          </div>
        )}
      </div>

      {/* Popups */}
      <GymPopup />
      <PlanPopup />
      <NotePopup />
    </div>
  )
}
