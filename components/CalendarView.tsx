'use client'

import { useState, useMemo } from 'react'
import { getHistory } from '@/lib/storage'
import { USER_ACCENT, type UserId } from '@/data/workouts'

const DAY_LABELS  = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D']
const MONTH_NAMES = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
]

interface Props {
  user: UserId
  onClose: () => void
}

function dateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

// Returns Monday of the week containing `d`
function mondayOf(d: Date) {
  const copy = new Date(d)
  const day = copy.getDay()              // 0=Sun
  copy.setDate(copy.getDate() - ((day + 6) % 7))
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(d: Date, n: number) {
  const copy = new Date(d)
  copy.setDate(d.getDate() + n)
  return copy
}

export function CalendarView({ user, onClose }: Props) {
  const accent  = USER_ACCENT[user]
  const today   = dateStr(new Date())

  const [mode, setMode]  = useState<'week' | 'month'>('week')

  // Week navigation: store the Monday of the displayed week
  const [weekMon, setWeekMon] = useState(() => mondayOf(new Date()))

  // Month navigation
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())

  const history = useMemo(() => getHistory(user), [user])

  // ─── Week helpers ──────────────────────────────────────────────────────────
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekMon, i)),
    [weekMon],
  )

  const prevWeek = () => setWeekMon(m => addDays(m, -7))
  const nextWeek = () => setWeekMon(m => addDays(m, 7))

  // ─── Month helpers ─────────────────────────────────────────────────────────
  const monthDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay  = new Date(viewYear, viewMonth + 1, 0)
    const pad      = (firstDay.getDay() + 6) % 7  // blanks before 1st
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

  // ─── Day cell ──────────────────────────────────────────────────────────────
  const DayCell = ({ date }: { date: Date | null }) => {
    if (!date) return <div />

    const ds      = dateStr(date)
    const record  = history[ds]
    const isToday = ds === today
    const future  = ds > today
    const gymDay  = !!record && record.done > 0
    const allDone = !!record && record.done >= record.total && record.total > 0

    const bgColor = gymDay
      ? allDone ? accent : `${accent}55`
      : 'transparent'

    return (
      <div className="flex flex-col items-center">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: bgColor,
            border: isToday ? `2px solid ${accent}` : '2px solid transparent',
          }}
        >
          <span
            className="font-mono text-xs font-bold leading-none"
            style={{ color: gymDay ? '#080808' : future ? '#2a2a2a' : '#555' }}
          >
            {date.getDate()}
          </span>
        </div>
      </div>
    )
  }

  // ─── Stats helpers ─────────────────────────────────────────────────────────
  const weekGymDays = weekDays.filter(d => {
    const r = history[dateStr(d)]
    return r && r.done > 0
  }).length

  const weekPastDays = weekDays.filter(d => dateStr(d) <= today).length

  const monthGymDays = Object.entries(history).filter(([ds, r]) => {
    return (
      r.done > 0 &&
      ds.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`)
    )
  }).length

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

        <span
          className="font-display font-black text-xl"
          style={{ letterSpacing: '-0.03em' }}
        >
          CALENDAR
        </span>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
          {(['week', 'month'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="font-mono text-[10px] px-2.5 py-1 rounded-md transition-all"
              style={{
                backgroundColor: mode === m ? accent : 'transparent',
                color: mode === m ? '#080808' : '#555',
              }}
            >
              {m === 'week' ? 'SĂP' : 'LUNĂ'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 pb-10">
        {/* ── WEEK MODE ── */}
        {mode === 'week' && (
          <>
            {/* Navigation */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevWeek} className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors text-xl">
                ‹
              </button>
              <span className="font-mono text-[11px] text-zinc-500 tracking-widest uppercase">
                {weekDays[0].toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                {' – '}
                {weekDays[6].toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button onClick={nextWeek} className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors text-xl">
                ›
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map(l => (
                <div key={l} className="flex justify-center">
                  <span className="font-mono text-[10px] text-zinc-700">{l}</span>
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {weekDays.map((d, i) => <DayCell key={i} date={d} />)}
            </div>

            {/* Week stat card */}
            <div
              className="mt-6 p-4 rounded-2xl border"
              style={{ borderColor: `${accent}22`, backgroundColor: `${accent}08` }}
            >
              <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-2">
                Săptămâna aceasta
              </div>
              <div className="font-display font-black text-5xl leading-none" style={{ color: accent }}>
                {weekGymDays}
                <span className="text-2xl text-zinc-700 ml-1">/{weekPastDays}</span>
              </div>
              <div className="font-mono text-xs text-zinc-600 mt-1">zile de sală</div>
            </div>
          </>
        )}

        {/* ── MONTH MODE ── */}
        {mode === 'month' && (
          <>
            {/* Navigation */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors text-xl">
                ‹
              </button>
              <span className="font-mono text-[11px] text-zinc-500 tracking-widest uppercase">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors text-xl">
                ›
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map(l => (
                <div key={l} className="flex justify-center">
                  <span className="font-mono text-[10px] text-zinc-700">{l}</span>
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-2">
              {monthDays.map((d, i) => <DayCell key={i} date={d} />)}
            </div>

            {/* Month stat card */}
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
          </>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-zinc-900 space-y-2.5">
          <div className="font-mono text-[10px] text-zinc-700 uppercase tracking-widest mb-3">Legendă</div>
          {[
            { bg: accent, label: 'Antrenament complet' },
            { bg: `${accent}55`, label: 'Antrenament parțial' },
            { border: accent, label: 'Astăzi' },
          ].map(({ bg, border, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full shrink-0"
                style={{ backgroundColor: bg, border: border ? `2px solid ${border}` : undefined }}
              />
              <span className="font-mono text-xs text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
