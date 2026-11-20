import { createAdminSupabase } from '@/lib/supabase'
import type { CheckInResult, Mood, Operator, Reason, Snapshot } from '@/types/operator'

const employeeFields = 'id,employee_code,full_name,level,points_balance'
const demoOperatorCode = 'OP-408'
const dailyDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Recife',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function toOperator(row: {
  id: string
  employee_code: string
  full_name: string
  level: number
  points_balance: number
}): Operator {
  return {
    id: row.id,
    code: row.employee_code,
    name: row.full_name,
    level: row.level,
    points: row.points_balance,
  }
}

function recifeDate() {
  const parts = Object.fromEntries(
    dailyDate.formatToParts(new Date()).map(({ type, value }) => [type, value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export async function findDemoOperator(): Promise<Operator | null> {
  const db = createAdminSupabase()
  const { data, error } = await db
    .from('employees')
    .select(employeeFields)
    .eq('employee_code', demoOperatorCode)
    .is('auth_user_id', null)
    .maybeSingle()

  if (error) throw new Error('Não foi possível consultar a conta de demonstração.')
  return data ? toOperator(data) : null
}

export async function findOperatorByAuthId(id: string): Promise<Operator | null> {
  const db = createAdminSupabase()
  const { data, error } = await db
    .from('employees')
    .select(employeeFields)
    .eq('auth_user_id', id)
    .maybeSingle()

  if (error) throw new Error('Não foi possível consultar a conta do operador.')
  return data ? toOperator(data) : null
}

export async function getOperatorSnapshot(employeeId: string): Promise<Snapshot | null> {
  const db = createAdminSupabase()
  const today = recifeDate()

  const [employee, checkIn, transactions] = await Promise.all([
    db.from('employees').select(employeeFields).eq('id', employeeId).maybeSingle(),
    db.from('daily_moods').select('id').eq('employee_id', employeeId).eq('checkin_date', today).maybeSingle(),
    db.from('point_transactions')
      .select('id,amount,description,created_at')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }),
  ])

  if (employee.error || checkIn.error || transactions.error) {
    throw new Error('Não foi possível carregar os dados do operador.')
  }
  if (!employee.data) return null

  return {
    operator: toOperator(employee.data),
    today,
    checkedIn: checkIn.data !== null,
    transactions: transactions.data.map((transaction) => ({
      id: transaction.id,
      points: transaction.amount,
      description: transaction.description,
      createdAt: transaction.created_at,
    })),
  }
}

export async function recordOperatorCheckIn(
  employeeId: string,
  mood: Mood,
  reason: Reason,
): Promise<CheckInResult> {
  const db = createAdminSupabase()
  const { data: awarded, error } = await db.rpc('record_operator_check_in', {
    p_employee_id: employeeId,
    p_mood: mood,
    p_reason: reason,
  })

  if (error || typeof awarded !== 'number') {
    throw new Error('Não foi possível registrar o check-in.')
  }

  const snapshot = await getOperatorSnapshot(employeeId)
  if (!snapshot) throw new Error('Operador não encontrado.')
  return { snapshot, awarded }
}
