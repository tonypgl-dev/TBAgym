import type { Exercise } from '@/data/workouts'
import { getWorkoutForDate } from '@/data/workouts'

// Key factories
const HISTORY_KEY  = (u: string)           => `gbuddy_history_${u}`
const CHECKED_KEY  = (u: string, d: string) => `gbuddy_checked_${u}_${d}`
const CUSTOM_KEY   = (u: string, d: string) => `gbuddy_custom_${u}_${d}`
const DELETED_KEY  = (u: string, d: string) => `gbuddy_deleted_${u}_${d}`
const LOG_KEY      = (u: string, d: string) => `gbuddy_log_${u}_${d}`

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}

// ─── History (calendar source) ───────────────────────────────────────────────
export interface DayRecord { done: number; total: number }

export function getHistory(userId: string): Record<string, DayRecord> {
  return read(HISTORY_KEY(userId), {})
}

export function saveHistory(userId: string, date: string, done: number, total: number) {
  const h = getHistory(userId)
  h[date] = { done, total }
  localStorage.setItem(HISTORY_KEY(userId), JSON.stringify(h))
}

// ─── Checked exercise IDs ─────────────────────────────────────────────────────
export function getChecked(userId: string, date: string): string[] {
  return read(CHECKED_KEY(userId, date), [])
}

export function saveChecked(userId: string, date: string, ids: string[]) {
  localStorage.setItem(CHECKED_KEY(userId, date), JSON.stringify(ids))
}

// ─── Custom (user-added) exercises ────────────────────────────────────────────
export function getCustomExercises(userId: string, date: string): Exercise[] {
  return read(CUSTOM_KEY(userId, date), [])
}

export function saveCustomExercises(userId: string, date: string, exercises: Exercise[]) {
  localStorage.setItem(CUSTOM_KEY(userId, date), JSON.stringify(exercises))
}

// ─── Deleted base exercise IDs ────────────────────────────────────────────────
export function getDeletedIds(userId: string, date: string): string[] {
  return read(DELETED_KEY(userId, date), [])
}

export function saveDeletedIds(userId: string, date: string, ids: string[]) {
  localStorage.setItem(DELETED_KEY(userId, date), JSON.stringify(ids))
}

// ─── Workout log (saved snapshot when user confirms completion) ───────────────
export interface LoggedExercise {
  name: string
  muscle: string
  sets: number
  reps: string
  completed: boolean
}

export interface WorkoutLog {
  date: string
  title: string
  exercises: LoggedExercise[]
  savedAt: string
}

export function getWorkoutLog(userId: string, date: string): WorkoutLog | null {
  return read(LOG_KEY(userId, date), null)
}

export function saveWorkoutLog(userId: string, date: string, log: WorkoutLog) {
  localStorage.setItem(LOG_KEY(userId, date), JSON.stringify(log))
}

// ─── Reconstruct a day's exercises with completion status ─────────────────────
// Uses saved log if present, otherwise reconstructs from raw localStorage keys.
export interface DayExercise {
  name: string
  muscle: string
  sets: number
  reps: string
  completed: boolean
}

export function getDayExercises(userId: string, date: string): DayExercise[] {
  // Prefer the explicit log (saved when user pressed "Bine ai muncit")
  const log = getWorkoutLog(userId, date)
  if (log) return log.exercises

  // Reconstruct from raw keys
  const base    = getWorkoutForDate(date)?.exercises ?? []
  const deleted = getDeletedIds(userId, date)
  const custom  = getCustomExercises(userId, date)
  const checked = new Set(getChecked(userId, date))
  const list    = [...base.filter(e => !deleted.includes(e.id)), ...custom]

  return list.map(ex => ({
    name:      ex.name,
    muscle:    ex.muscle,
    sets:      ex.sets,
    reps:      ex.reps,
    completed: checked.has(ex.id),
  }))
}

// ─── Seed demo data for Tony & Bobo on 2026-06-10 ────────────────────────────
// Runs once per browser session; idempotent via SEED_KEY flag.
const SEED_KEY = 'gbuddy_seeded_v2'

export function seedDemoData() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(SEED_KEY)) return

  const date  = '2026-06-10'
  const users = ['Tony', 'Bobo'] as const

  const exercises = [
    { id: 'db-press',              name: 'Împins cu gantere din culcat',       muscle: 'Piept',    sets: 3, reps: '6–8'   },
    { id: 'cable-row',             name: 'Ramat la helcometru din șezut',       muscle: 'Spate',    sets: 3, reps: '8–10'  },
    { id: 'lateral-raise',         name: 'Fluturări laterale cu gantere',       muscle: 'Umeri',    sets: 3, reps: '10'    },
    { id: 'bicep-curl',            name: 'Flexii cu gantere',                   muscle: 'Biceps',   sets: 3, reps: '8–10'  },
    { id: 'cable-curl-supination', name: 'Flexii la helcometru cu supinație',   muscle: 'Antebrat', sets: 4, reps: '8–10'  },
    { id: 'tricep-pushdown',       name: 'Extensii la scripete',                muscle: 'Triceps',  sets: 3, reps: '8–10'  },
  ]

  const loggedExercises: LoggedExercise[] = exercises.map(ex => ({ ...ex, completed: true }))

  for (const user of users) {
    // Only seed if user hasn't already recorded their own data for this day
    if (localStorage.getItem(LOG_KEY(user, date))) continue

    saveHistory(user, date, exercises.length, exercises.length)
    saveChecked(user, date, exercises.map(e => e.id))
    saveWorkoutLog(user, date, {
      date,
      title: 'Partea Superioară – Ziua Grea',
      exercises: loggedExercises,
      savedAt: `${date}T20:00:00.000Z`,
    })
  }

  localStorage.setItem(SEED_KEY, '1')
}

// ─── Generate plain-text export for LLM ──────────────────────────────────────
const RO_DAYS = ['Duminică','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă']
const RO_MONTHS = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie',
  'Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']

export function generateExportText(userId: string, days: number, userName: string): string {
  const lines: string[] = []
  const now   = new Date()
  let gymDays = 0

  lines.push(`PROGRAM ${userName.toUpperCase()} — ULTIMELE ${days} ZILE`)
  lines.push('='.repeat(44))
  lines.push('')

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const ds  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const dayLabel = `${RO_DAYS[d.getDay()]} ${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}`

    const workout   = getWorkoutForDate(ds)
    const exercises = getDayExercises(userId, ds)
    const completed = exercises.filter(e => e.completed)

    if (completed.length === 0 && exercises.length === 0) {
      lines.push(`${dayLabel} — Odihnă`)
      lines.push('')
      continue
    }

    const title = workout?.title ?? (completed.length > 0 ? 'Antrenament' : 'Odihnă')
    lines.push(`${dayLabel} — ${title}`)

    if (exercises.length > 0) {
      exercises.forEach(ex => {
        const mark = ex.completed ? '✓' : '✗'
        lines.push(`  ${mark} ${ex.name}: ${ex.sets} serii x ${ex.reps}`)
      })
      if (completed.length > 0) gymDays++
    } else {
      lines.push('  (Odihnă)')
    }
    lines.push('')
  }

  lines.push(`Total: ${gymDays} din ${days} zile de sală`)
  return lines.join('\n')
}
