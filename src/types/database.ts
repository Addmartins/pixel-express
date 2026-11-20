import type { Mood, Reason } from './operator'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Required extends keyof Row, Relationships extends unknown[] = []> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Row>
  Update: Partial<Row>
  Relationships: Relationships
}

type Employee = {
  id: string
  employee_code: string
  full_name: string
  email: string
  hub_unit: string
  shift: string
  role_title: string
  avatar_skin: string
  level: number
  points_balance: number
  created_at: string | null
  auth_user_id: string | null
}

type Transaction = {
  id: string
  employee_id: string
  amount: number
  transaction_type: 'DAILY_LOGIN' | 'QUIZ_REWARD' | 'GAME_SCORE' | 'METRIC_BONUS' | 'STORE_PURCHASE' | 'EXPIRATION'
  description: string
  created_at: string | null
}

type DailyMood = {
  id: string
  employee_id: string
  hub_unit: string
  mood: 'radiante' | 'motivado' | 'neutro' | 'esgotado'
  primary_reason: string
  notes: string | null
  checkin_date: string
  created_at: string | null
}

type RewardItem = {
  id: string
  name: string
  description: string
  category: 'GULOSEIMA' | 'VOUCHER' | 'BEM_ESTAR' | 'AVATAR'
  price_points: number
  icon_emoji: string
  delivery_estimate: string
  stock_quantity: number
  is_active: boolean
  created_at: string | null
}

type QuizQuestion = {
  id: string
  category: string
  question: string
  options: Json
  correct_option_index: number
  reward_points: number
  explanation: string
  is_active: boolean
}

type EmployeeRelationship<Name extends string> = {
  foreignKeyName: Name
  columns: ['employee_id']
  isOneToOne: false
  referencedRelation: 'employees'
  referencedColumns: ['id']
}

export type Database = {
  public: {
    Tables: {
      employees: Table<Employee, 'employee_code' | 'full_name' | 'email'>
      point_transactions: Table<Transaction, 'employee_id' | 'amount' | 'transaction_type' | 'description',
        [EmployeeRelationship<'point_transactions_employee_id_fkey'>]>
      daily_moods: Table<DailyMood, 'employee_id' | 'hub_unit' | 'mood' | 'primary_reason',
        [EmployeeRelationship<'daily_moods_employee_id_fkey'>]>
      reward_items: Table<RewardItem, 'name' | 'description' | 'category' | 'price_points' | 'icon_emoji'>
      quiz_questions: Table<QuizQuestion, 'question' | 'options' | 'correct_option_index' | 'explanation'>
    }
    Views: Record<never, never>
    Functions: {
      record_operator_check_in: {
        Args: { p_employee_id: string; p_mood: Mood; p_reason: Reason }
        Returns: number
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
