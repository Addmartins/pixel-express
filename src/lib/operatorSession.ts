import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { type NextRequest, type NextResponse } from 'next/server'

const cookieName = 'pixel_operator'
const sessionSeconds = 60 * 60
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export const demoEnabled = () => process.env.PIXEL_DEMO_ENABLED === 'true'

function sign(payload: string) {
  const secret = process.env.PIXEL_SESSION_SECRET ?? ''
  if (Buffer.byteLength(secret) < 32) throw new Error('PIXEL_SESSION_SECRET requer 32 bytes.')
  return createHmac('sha256', secret).update(payload).digest()
}

export function readOperatorSession(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value
  if (!token || token.length > 256) return null
  const [id, expires, mode, signature, extra] = token.split('.')
  if (!uuid.test(id) || !signature || extra !== undefined || !/^\d{10}$/.test(expires)) return null
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return null
  if (mode !== 'password' && (mode !== 'demo' || !demoEnabled())) return null

  const expected = sign(`${id}.${expires}.${mode}`)
  const given = Buffer.from(signature, 'base64url')
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null
}

function sessionCookie(response: NextResponse, value: string, maxAge: number) {
  response.cookies.set(cookieName, value, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' && process.env.VERCEL === '1',
    path: '/',
    maxAge,
  })
}

export function writeOperatorSession(
  response: NextResponse,
  id: string,
  mode: 'demo' | 'password',
  authExpiresAt?: number,
) {
  const now = Math.floor(Date.now() / 1000)
  const expires = Math.min(now + sessionSeconds, authExpiresAt ?? Infinity)
  const payload = `${id}.${expires}.${mode}`
  sessionCookie(response, `${payload}.${sign(payload).toString('base64url')}`, expires - now)
}

export function clearOperatorSession(response: NextResponse) {
  sessionCookie(response, '', 0)
}

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false
  if (!origin) return true
  const host = request.headers.get('host')
  return origin === `http://${host}` || origin === `https://${host}`
}
