'use client'

import { useState } from 'react'
import type { Exercise } from '@/data/workouts'

interface Props {
  accent: string
  onAdd: (exercise: Exercise) => void
  onClose: () => void
}

export function AddExerciseModal({ accent, onAdd, onClose }: Props) {
  const [name, setName]     = useState('')
  const [muscle, setMuscle] = useState('')
  const [sets, setSets]     = useState('3')
  const [reps, setReps]     = useState('')

  const canSubmit = name.trim() && reps.trim() && Number(sets) > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onAdd({
      id: `custom_${Date.now()}`,
      name: name.trim(),
      muscle: muscle.trim() || '—',
      sets: Number(sets),
      reps: reps.trim(),
    })
  }

  const inputClass = `
    w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3
    font-mono text-sm text-zinc-100 placeholder-zinc-700
    focus:outline-none focus:border-zinc-600 transition-colors
  `

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-zinc-950 border-t border-zinc-800 rounded-t-2xl px-4 pt-5 pb-10">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-zinc-800 mx-auto mb-5" />

        <div className="font-display font-black text-2xl mb-5" style={{ letterSpacing: '-0.03em' }}>
          Exercițiu nou
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 block mb-1">
              Denumire *
            </label>
            <input
              className={inputClass}
              placeholder="ex: Flotări"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 block mb-1">
              Grupă musculară
            </label>
            <input
              className={inputClass}
              placeholder="ex: Pectoral · Triceps"
              value={muscle}
              onChange={e => setMuscle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 block mb-1">
                Serii *
              </label>
              <input
                className={inputClass}
                type="number"
                min="1"
                max="20"
                placeholder="3"
                value={sets}
                onChange={e => setSets(e.target.value)}
              />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 block mb-1">
                Repetări *
              </label>
              <input
                className={inputClass}
                placeholder="12–15"
                value={reps}
                onChange={e => setReps(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-zinc-800 font-mono text-sm text-zinc-500 hover:border-zinc-600 transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-3.5 rounded-xl font-display font-black text-lg transition-all"
            style={{
              backgroundColor: canSubmit ? accent : '#222',
              color: canSubmit ? '#080808' : '#444',
            }}
          >
            Adaugă
          </button>
        </div>
      </div>
    </div>
  )
}
