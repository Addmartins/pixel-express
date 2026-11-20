import { NextResponse, type NextRequest } from 'next/server'
import { createAuthSupabase } from '@/lib/supabase'
import { operatorError, operatorJson, readOperatorBody } from '@/lib/operatorHttp'
import { clearOperatorSession, demoEnabled, isSameOrigin, readOperatorSession, writeOperatorSession } from '@/lib/operatorSession'
import { findDemoOperator, findOperatorByAuthId, getOperatorSnapshot } from '@/services/operatorService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const id = readOperatorSession(request)
    if (!id) return operatorError('Entre para continuar.', 401)
    const snapshot = await getOperatorSnapshot(id)
    return snapshot ? operatorJson(snapshot) : operatorError('Entre para continuar.', 401)
  } catch {
    return operatorError('Não foi possível carregar a sessão.', 503)
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return operatorError('Origem inválida.', 403)
  const input = await readOperatorBody(request)
  if (!input || typeof input !== 'object' || !('mode' in input)) {
    return operatorError('Informe o modo de entrada.', 400)
  }

  try {
    if (input.mode === 'demo') {
      if (!demoEnabled()) return operatorError('A demonstração está desativada.', 403)
      const operator = await findDemoOperator()
      if (!operator) return operatorError('Operador de demonstração indisponível.', 404)
      const snapshot = await getOperatorSnapshot(operator.id)
      if (!snapshot) return operatorError('Operador de demonstração indisponível.', 404)
      const response = operatorJson(snapshot)
      writeOperatorSession(response, operator.id, 'demo')
      return response
    }

    if (input.mode !== 'password' || !('email' in input) || !('password' in input) ||
        typeof input.email !== 'string' || typeof input.password !== 'string') {
      return operatorError('Informe um e-mail e uma senha válidos.', 400)
    }
    const email = input.email.trim()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !input.password || input.password.length > 1024) {
      return operatorError('Informe um e-mail e uma senha válidos.', 400)
    }

    const { data, error } = await createAuthSupabase().auth.signInWithPassword({
      email,
      password: input.password,
    })
    if (error && error.status !== 400 && error.status !== 401 && error.status !== 422) {
      return operatorError('O serviço de autenticação está indisponível.', 503)
    }
    if (!data.user || !data.session) return operatorError('E-mail ou senha inválidos.', 401)

    const operator = await findOperatorByAuthId(data.user.id)
    if (!operator) return operatorError('Seu acesso de operador não está configurado.', 403)
    const snapshot = await getOperatorSnapshot(operator.id)
    if (!snapshot) return operatorError('Seu acesso de operador não está configurado.', 403)
    const response = operatorJson(snapshot)
    writeOperatorSession(response, operator.id, 'password', data.session.expires_at)
    return response
  } catch {
    return operatorError('Não foi possível entrar. Confira a configuração ou tente novamente.', 503)
  }
}

export function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return operatorError('Origem inválida.', 403)
  const response = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  clearOperatorSession(response)
  return response
}
