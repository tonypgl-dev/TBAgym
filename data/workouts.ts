export interface Exercise {
  id: string
  name: string
  muscle: string
  sets: number
  reps: string
  note?: string
}

export interface Workout {
  date: string
  dayLabel: string
  title: string
  type: string
  subtitle: string
  exercises: Exercise[]
}

export const USERS = ['Tony', 'Bobo', 'Andrei'] as const
export type UserId = (typeof USERS)[number]

export const USER_ACCENT: Record<UserId, string> = {
  Tony:   '#C8FF00',
  Bobo:   '#FF4D00',
  Andrei: '#00D4FF',
}

// Workouts by date — same for all users for now.
// To give a user a different workout, extend to: Record<string, Record<UserId | 'all', Workout>>
const workouts: Record<string, Workout> = {
  '2026-06-10': {
    date: '2026-06-10',
    dayLabel: 'Miercuri 10 Iunie',
    title: 'Partea Superioară',
    type: 'Ziua Grea',
    subtitle: 'Forță pură. Mișcări controlate, greutăți mari.',
    exercises: [
      {
        id: 'db-press',
        name: 'Împins cu gantere din culcat',
        muscle: 'Piept',
        sets: 3,
        reps: '6–8',
        note: 'Priză neutră, coate la 45°',
      },
      {
        id: 'cable-row',
        name: 'Ramat la helcometru din șezut',
        muscle: 'Spate',
        sets: 3,
        reps: '8–10',
        note: 'Trage din spate, nu din brațe',
      },
      {
        id: 'lateral-raise',
        name: 'Fluturări laterale cu gantere',
        muscle: 'Umeri',
        sets: 3,
        reps: '10',
        note: 'În planul scapular, până la nivelul umerilor',
      },
      {
        id: 'bicep-curl',
        name: 'Flexii cu gantere',
        muscle: 'Biceps',
        sets: 3,
        reps: '8–10',
      },
      {
        id: 'cable-curl-supination',
        name: 'Flexii la helcometru cu supinație',
        muscle: 'Antebrat',
        sets: 4,
        reps: '8–10',
      },
      {
        id: 'tricep-pushdown',
        name: 'Extensii la scripete',
        muscle: 'Triceps',
        sets: 3,
        reps: '8–10',
      },
    ],
  },
  '2026-06-12': {
    date: '2026-06-12',
    dayLabel: 'Vineri 12 Iunie',
    title: 'Picioare & Trunchi',
    type: 'Ziua Ușoară',
    subtitle: 'Greutăți modeste. Concentrează-te pe execuție lentă.',
    exercises: [
      {
        id: 'rdl',
        name: 'Îndreptări românești cu gantere',
        muscle: 'Femurali · Lombar',
        sets: 3,
        reps: '12–15',
        note: 'RDL',
      },
      {
        id: 'glute-bridge',
        name: 'Podul bazinului',
        muscle: 'Glutei',
        sets: 3,
        reps: '15',
        note: 'Glute Bridge',
      },
      {
        id: 'leg-curl',
        name: 'Flexii pentru femurali',
        muscle: 'Femurali',
        sets: 3,
        reps: '12–15',
        note: 'La aparat',
      },
      {
        id: 'calf-raises',
        name: 'Ridicări pe vârfuri',
        muscle: 'Gambe',
        sets: 3,
        reps: '15–20',
      },
      {
        id: 'decline-crunch',
        name: 'Abdomene la bancă declinată',
        muscle: 'Abdomen',
        sets: 3,
        reps: '12–15',
      },
      {
        id: 'leg-raises',
        name: 'Ridicări de picioare',
        muscle: 'Abdomen',
        sets: 3,
        reps: '12–15',
        note: 'De la sol',
      },
      {
        id: 'plank',
        name: 'Planșă',
        muscle: 'Core',
        sets: 3,
        reps: '30–40 sec',
        note: 'La sol',
      },
    ],
  },
}

export function getWorkoutForDate(date: string): Workout | null {
  return workouts[date] ?? null
}

export function getTodayWorkout(): Workout | null {
  const today = new Date().toISOString().split('T')[0]
  return getWorkoutForDate(today)
}
