export type Mood = 'radiant' | 'motivated' | 'normal' | 'exhausted'
export type Reason = 'goals' | 'team' | 'fatigue' | 'workload' | 'other'

export type Operator = {
  id: string
  code: string
  name: string
  level: number
  points: number
}

export type Snapshot = {
  operator: Operator
  today: string
  checkedIn: boolean
  transactions: { id: string; points: number; description: string; createdAt: string | null }[]
}

export type CheckInResult = { snapshot: Snapshot; awarded: number }
