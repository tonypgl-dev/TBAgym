import type { Exercise } from '@/data/workouts'
import { getWorkoutForDate } from '@/data/workouts'
import { supabase } from '@/lib/supabase'

// ─── Local-storage helpers (cache / offline fallback) ─────────────────────────
const LS_HISTORY  = (u: string)           => `gbuddy_history_${u}`
const LS_CHECKED  = (u: string, d: string) => `gbuddy_checked_${u}_${d}`
const LS_CUSTOM   = (u: string, d: string) => `gbuddy_custom_${u}_${d}`
const LS_DELETED  = (u: string, d: string) => `gbuddy_deleted_${u}_${d}`
const LS_LOG      = (u: string, d: string) => `gbuddy_log_${u}_${d}`
const LS_NOTE     = (u: string, d: string) => `gbuddy_note_${u}_${d}`

function lsRead<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}
function lsWrite(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DayRecord { done: number; total: number }

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

export interface DayExercise {
  name: string
  muscle: string
  sets: number
  reps: string
  completed: boolean
}

// ─── History ──────────────────────────────────────────────────────────────────
export function getHistory(userId: string): Record<string, DayRecord> {
  return lsRead(LS_HISTORY(userId), {})
}

export async function saveHistory(userId: string, date: string, done: number, total: number) {
  // Update local cache immediately for instant UI feedback
  const h = getHistory(userId)
  h[date] = { done, total }
  lsWrite(LS_HISTORY(userId), h)

  // Persist to Supabase
  await supabase
    .from('workout_history')
    .upsert({ user_id: userId, date, done, total, updated_at: new Date().toISOString() },
             { onConflict: 'user_id,date' })
}

// Load full history from Supabase and merge into localStorage cache
export async function syncHistory(userId: string): Promise<Record<string, DayRecord>> {
  const { data, error } = await supabase
    .from('workout_history')
    .select('date, done, total')
    .eq('user_id', userId)

  if (error || !data) return getHistory(userId)

  const remote: Record<string, DayRecord> = {}
  for (const row of data) remote[row.date] = { done: row.done, total: row.total }

  // Merge: remote wins
  const merged = { ...getHistory(userId), ...remote }
  lsWrite(LS_HISTORY(userId), merged)
  return merged
}

// ─── Checked exercise IDs ─────────────────────────────────────────────────────
export function getChecked(userId: string, date: string): string[] {
  return lsRead(LS_CHECKED(userId, date), [])
}

export async function saveChecked(userId: string, date: string, ids: string[]) {
  lsWrite(LS_CHECKED(userId, date), ids)

  const existing = await _getDailyState(userId, date)
  await supabase
    .from('daily_state')
    .upsert({
      user_id:          userId,
      date,
      checked_ids:      ids,
      custom_exercises: existing.custom_exercises,
      deleted_ids:      existing.deleted_ids,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
}

// ─── Custom exercises ─────────────────────────────────────────────────────────
export function getCustomExercises(userId: string, date: string): Exercise[] {
  return lsRead(LS_CUSTOM(userId, date), [])
}

export async function saveCustomExercises(userId: string, date: string, exercises: Exercise[]) {
  lsWrite(LS_CUSTOM(userId, date), exercises)

  const existing = await _getDailyState(userId, date)
  await supabase
    .from('daily_state')
    .upsert({
      user_id:          userId,
      date,
      checked_ids:      existing.checked_ids,
      custom_exercises: exercises,
      deleted_ids:      existing.deleted_ids,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
}

// ─── Deleted base exercise IDs ────────────────────────────────────────────────
export function getDeletedIds(userId: string, date: string): string[] {
  return lsRead(LS_DELETED(userId, date), [])
}

export async function saveDeletedIds(userId: string, date: string, ids: string[]) {
  lsWrite(LS_DELETED(userId, date), ids)

  const existing = await _getDailyState(userId, date)
  await supabase
    .from('daily_state')
    .upsert({
      user_id:          userId,
      date,
      checked_ids:      existing.checked_ids,
      custom_exercises: existing.custom_exercises,
      deleted_ids:      ids,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
}

// ─── Workout log ──────────────────────────────────────────────────────────────
export function getWorkoutLog(userId: string, date: string): WorkoutLog | null {
  return lsRead(LS_LOG(userId, date), null)
}

export async function saveWorkoutLog(userId: string, date: string, log: WorkoutLog) {
  lsWrite(LS_LOG(userId, date), log)

  await supabase
    .from('workout_logs')
    .upsert({
      user_id:   userId,
      date,
      title:     log.title,
      exercises: log.exercises,
      saved_at:  log.savedAt,
    }, { onConflict: 'user_id,date' })
}

// ─── Sync all data for a user from Supabase → localStorage ───────────────────
export async function syncUserData(userId: string) {
  await syncHistory(userId)

  // Sync daily states
  const { data: states } = await supabase
    .from('daily_state')
    .select('date, checked_ids, custom_exercises, deleted_ids')
    .eq('user_id', userId)

  if (states) {
    for (const s of states) {
      lsWrite(LS_CHECKED(userId, s.date), s.checked_ids ?? [])
      lsWrite(LS_CUSTOM(userId, s.date), s.custom_exercises ?? [])
      lsWrite(LS_DELETED(userId, s.date), s.deleted_ids ?? [])
    }
  }

  // Sync workout logs
  const { data: logs } = await supabase
    .from('workout_logs')
    .select('date, title, exercises, saved_at')
    .eq('user_id', userId)

  if (logs) {
    for (const l of logs) {
      const log: WorkoutLog = { date: l.date, title: l.title, exercises: l.exercises, savedAt: l.saved_at }
      lsWrite(LS_LOG(userId, l.date), log)
    }
  }

  // Sync day notes
  const { data: notes } = await supabase
    .from('day_notes')
    .select('date, title, note')
    .eq('user_id', userId)

  if (notes) {
    for (const n of notes) {
      lsWrite(LS_NOTE(userId, n.date), { title: n.title, note: n.note })
    }
  }
}

// ─── Internal: fetch daily_state row from Supabase (or fallback to LS) ────────
async function _getDailyState(userId: string, date: string) {
  const { data } = await supabase
    .from('daily_state')
    .select('checked_ids, custom_exercises, deleted_ids')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  return {
    checked_ids:      (data?.checked_ids      ?? getChecked(userId, date))         as string[],
    custom_exercises: (data?.custom_exercises  ?? getCustomExercises(userId, date)) as Exercise[],
    deleted_ids:      (data?.deleted_ids       ?? getDeletedIds(userId, date))      as string[],
  }
}

// ─── Reconstruct exercises with completion status ─────────────────────────────
export function getDayExercises(userId: string, date: string): DayExercise[] {
  const log = getWorkoutLog(userId, date)
  if (log) return log.exercises

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

// ─── Rest-day notes ───────────────────────────────────────────────────────────
export interface DayNote { title: string; note: string }

export function getDayNote(userId: string, date: string): DayNote | null {
  return lsRead(LS_NOTE(userId, date), null)
}

export async function saveDayNote(userId: string, date: string, title: string, note: string) {
  lsWrite(LS_NOTE(userId, date), { title, note })
  await supabase
    .from('day_notes')
    .upsert({ user_id: userId, date, title, note, updated_at: new Date().toISOString() },
             { onConflict: 'user_id,date' })
}

export async function deleteDayNote(userId: string, date: string) {
  localStorage.removeItem(LS_NOTE(userId, date))
  await supabase.from('day_notes').delete().eq('user_id', userId).eq('date', date)
}

// ─── Seed demo data for Tony & Bobo on 2026-06-10 ────────────────────────────
const SEED_KEY = 'gbuddy_seeded_v2'

export async function seedDemoData() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(SEED_KEY)) return

  const date    = '2026-06-10'
  const users   = ['Tony', 'Bobo'] as const
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
    if (getWorkoutLog(user, date)) continue

    const log: WorkoutLog = {
      date, title: 'Partea Superioară – Ziua Grea', exercises: loggedExercises,
      savedAt: `${date}T20:00:00.000Z`,
    }
    await saveHistory(user, date, exercises.length, exercises.length)
    await saveChecked(user, date, exercises.map(e => e.id))
    await saveWorkoutLog(user, date, log)
  }

  localStorage.setItem(SEED_KEY, '1')
}

// ─── Export text for LLM ──────────────────────────────────────────────────────
const RO_DAYS   = ['Duminică','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă']
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
    const d  = new Date(now)
    d.setDate(now.getDate() - i)
    const ds       = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const dayLabel = `${RO_DAYS[d.getDay()]} ${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}`

    const workout   = getWorkoutForDate(ds)
    const exercises = getDayExercises(userId, ds)
    const completed = exercises.filter(e => e.completed)

    if (completed.length === 0 && exercises.length === 0) {
      const note = getDayNote(userId, ds)
      if (note && (note.title || note.note)) {
        lines.push(`${dayLabel} — ${note.title || 'Notă'}`)
        if (note.note) lines.push(`  ${note.note}`)
      } else {
        lines.push(`${dayLabel} — Odihnă`)
      }
      lines.push('')
      continue
    }

    const title = workout?.title ?? (completed.length > 0 ? 'Antrenament' : 'Odihnă')
    lines.push(`${dayLabel} — ${title}`)

    if (exercises.length > 0) {
      exercises.forEach(ex => {
        lines.push(`  ${ex.completed ? '✓' : '✗'} ${ex.name}: ${ex.sets} serii x ${ex.reps}`)
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
