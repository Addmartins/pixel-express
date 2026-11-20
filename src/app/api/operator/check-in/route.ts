import type { NextRequest } from 'next/server'
import { operatorError, operatorJson, readOperatorBody } from '@/lib/operatorHttp'
import { isSameOrigin, readOperatorSession } from '@/lib/operatorSession'
import { recordOperatorCheckIn } from '@/services/operatorService'
import type { Mood, Reason } from '@/types/operator'

const moods: readonly string[] = ['radiant', 'motivated', 'normal', 'exhausted']
const reasons: readonly string[] = ['goals', 'team', 'fatigue', 'workload', 'other']

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return operatorError('Origem inválida.', 403)

  try {
    const id = readOperatorSession(request)
    if (!id) return operatorError('Entre para continuar.', 401)
    const input = await readOperatorBody(request)
    if (!input || typeof input !== 'object' ||
        !('mood' in input) || typeof input.mood !== 'string' || !moods.includes(input.mood) ||
        !('reason' in input) || typeof input.reason !== 'string' || !reasons.includes(input.reason)) {
      return operatorError('Selecione um humor e um motivo válidos.', 400)
    }
    return operatorJson(await recordOperatorCheckIn(id, input.mood as Mood, input.reason as Reason))
  } catch {
    return operatorError('Não foi possível confirmar o check-in. Tente novamente.', 503)
  }
}
