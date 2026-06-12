'use client'

import { useState, useMemo, useEffect } from 'react'
import { getHistory, syncHistory, getDayExercises, generateExportText } from '@/lib/storage'
import { USER_ACCENT, type UserId } from '@/data/workouts'

const DAY_LABELS  = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D']
const MONTH_NAMES = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
]

// App start date — days before this are greyed out
const START_DATE = '2026-06-10'

interface Props {
  user: UserId
  onClose: () => void
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CalendarView({ user, onClose }: Props) {
  const accent  = USER_ACCENT[user]
  const today   = localDateStr(new Date())

  const [mode, setMode] = useState<'month' | 'export'>('month')

  // Month navigation — default to current month
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())

  // Popup for day detail
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Export
  const [exportDays,    setExportDays]    = useState<7 | 14 | 21>(7)
  const [editableText,  setEditableText]  = useState('')
  const [copied,        setCopied]        = useState(false)

  const [history, setHistory] = useState(() => getHistory(user))

  useEffect(() => {
    syncHistory(user).then(setHistory)
  }, [user])

  // Regenerate editable text when range or mode changes
  useEffect(() => {
    if (mode === 'export') {
      setEditableText(generateExportText(user, exportDays, user))
    }
  }, [mode, exportDays, user])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableText)
    } catch {
      const el = document.createElement('textarea')
      el.value = editableText
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Month grid ────────────────────────────────────────────────────────────
  const monthDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay  = new Date(viewYear, viewMonth + 1, 0)
    const pad      = (firstDay.getDay() + 6) % 7
    const cells: (Date | null)[] = Array(pad).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(new Date(viewYear, viewMonth, d))
    }
    return cells
  }, [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const monthGymDays = Object.entries(history).filter(([ds, r]) =>
    r.done > 0 &&
    ds >= START_DATE &&
    ds.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)
  ).length

  // ─── Day cell ──────────────────────────────────────────────────────────────
  const DayCell = ({ date }: { date: Date | null }) => {
    if (!date) return <div />

    const ds           = localDateStr(date)
    const record       = history[ds]
    const isToday      = ds === today
    const isFuture     = ds > today
    const isBeforeApp  = ds < START_DATE
    const gymDay       = !isBeforeApp && !!record && record.done > 0
    const tappable     = gymDay

    return (
      <div className="flex flex-col items-center">
        <button
          disabled={!tappable}
          onClick={() => tappable && setSelectedDay(ds)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150"
          style={{
            backgroundColor: gymDay ? accent : 'transparent',
            border: isToday ? `2px solid ${accent}` : '2px solid transparent',
            opacity: isBeforeApp || isFuture ? 0.25 : 1,
          }}
        >
          <span
            className="font-mono text-xs font-bold leading-none"
            style={{ color: gymDay ? '#080808' : '#555' }}
          >
            {date.getDate()}
          </span>
        </button>
      </div>
    )
  }

  // ─── Day detail popup ──────────────────────────────────────────────────────
  const DayPopup = () => {
    if (!selectedDay) return null
    const exercises = getDayExercises(user, selectedDay)
    const done      = exercises.filter(e => e.completed)
    const d         = new Date(selectedDay + 'T12:00:00')
    const label     = `${DAY_LABELS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <div
          className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-2xl px-4 pt-4 pb-10"
          style={{ maxHeight: '75vh', overflowY: 'auto' }}
        >
          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-zinc-800 mx-auto mb-4" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{label}</div>
              <div
                className="font-display font-black text-2xl leading-tight"
                style={{ letterSpacing: '-0.03em', color: accent }}
              >
                {done.length}/{exercises.length} complete
              </div>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-300 border border-zinc-800"
            >
              ✕
            </button>
          </div>

          {/* Exercise list */}
          <div className="space-y-2">
            {exercises.length === 0 && (
              <div className="font-mono text-sm text-zinc-600 text-center py-4">Nicio dată salvată pentru această zi.</div>
            )}
            {exercises.map((ex, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 border-b border-zinc-900 last:border-0"
              >
                <span
                  className="font-mono text-xs w-4 text-center shrink-0"
                  style={{ color: ex.completed ? accent : '#444' }}
                >
                  {ex.completed ? '✓' : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-display font-bold text-base leading-tight truncate"
                    style={{ color: ex.completed ? '#f0f0f0' : '#444' }}
                  >
                    {ex.name}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-600">{ex.muscle}</div>
                </div>
                <div
                  className="font-mono text-xs font-bold shrink-0"
                  style={{ color: ex.completed ? accent : '#333' }}
                >
                  {ex.sets}×{ex.reps}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#080808] overflow-y-auto">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 sticky top-0 bg-[#080808] z-10"
        style={{ borderBottomColor: `${accent}22` }}
      >
        <button
          onClick={onClose}
          className="font-mono text-xs text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Înapoi
        </button>

        <span className="font-display font-black text-xl" style={{ letterSpacing: '-0.03em' }}>
          CALENDAR
        </span>

        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
          {([['month', 'LUNĂ'], ['export', 'EXPORT']] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="font-mono text-[10px] px-2.5 py-1 rounded-md transition-all"
              style={{
                backgroundColor: mode === m ? accent : 'transparent',
                color: mode === m ? '#080808' : '#555',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 pb-10">

        {/* ── MONTH MODE ── */}
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

            <div className="grid grid-cols-7 gap-y-2">
              {monthDays.map((d, i) => <DayCell key={i} date={d} />)}
            </div>

            {/* Stat */}
            <div
              className="mt-6 p-4 rounded-2xl border"
              style={{ borderColor: `${accent}22`, backgroundColor: `${accent}08` }}
            >
              <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-2">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>
              <div className="font-display font-black text-5xl leading-none" style={{ color: accent }}>
                {monthGymDays}
              </div>
              <div className="font-mono text-xs text-zinc-600 mt-1">zile de sală</div>
            </div>

            {/* Legend */}
            <div className="mt-5 pt-4 border-t border-zinc-900 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: accent }} />
                <span className="font-mono text-[10px] text-zinc-500">Sală</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: accent }} />
                <span className="font-mono text-[10px] text-zinc-500">Azi</span>
              </div>
              <span className="font-mono text-[10px] text-zinc-700 ml-auto">Apasă o zi colorată</span>
            </div>
          </>
        )}

        {/* ── EXPORT MODE ── */}
        {mode === 'export' && (
          <div className="mt-2">
            <div className="flex gap-2 mb-4">
              {([7, 14, 21] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setExportDays(d)}
                  className="flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all border"
                  style={{
                    backgroundColor: exportDays === d ? accent : 'transparent',
                    color: exportDays === d ? '#080808' : '#555',
                    borderColor: exportDays === d ? accent : '#222',
                  }}
                >
                  {d} zile
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="w-full py-3 rounded-xl font-display font-black text-lg mb-4 transition-all"
              style={{
                backgroundColor: copied ? `${accent}33` : accent,
                color: copied ? accent : '#080808',
                border: copied ? `1px solid ${accent}` : 'none',
              }}
            >
              {copied ? 'COPIAT ✓' : 'COPIAZĂ TEXT'}
            </button>

            <textarea
              value={editableText}
              onChange={e => setEditableText(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 font-mono text-[11px] text-zinc-400 leading-relaxed resize-none outline-none focus:border-zinc-600 transition-colors"
              style={{ minHeight: '55vh' }}
              spellCheck={false}
            />

            <p className="font-mono text-[10px] text-zinc-700 text-center mt-3 leading-relaxed">
              Editează direct, apoi copiază și dă paste unui AI.
            </p>
          </div>
        )}
      </div>

      {/* Day detail popup */}
      <DayPopup />
    </div>
  )
}
