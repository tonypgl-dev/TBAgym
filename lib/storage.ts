import type { Exercise } from '@/data/workouts'

// Key factories
const HISTORY_KEY  = (u: string)           => `gbuddy_history_${u}`
const CHECKED_KEY  = (u: string, d: string) => `gbuddy_checked_${u}_${d}`
const CUSTOM_KEY   = (u: string, d: string) => `gbuddy_custom_${u}_${d}`
const DELETED_KEY  = (u: string, d: string) => `gbuddy_deleted_${u}_${d}`

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
