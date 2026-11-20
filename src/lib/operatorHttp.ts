import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'

export function operatorJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function operatorError(error: string, status: number) {
  return operatorJson({ error }, status)
}

export async function readOperatorBody(request: NextRequest): Promise<unknown> {
  const mediaType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (mediaType !== 'application/json' || !request.body) return null
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let content = ''
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 4096) {
        await reader.cancel()
        return null
      }
      content += decoder.decode(value, { stream: true })
    }
    return JSON.parse(content + decoder.decode())
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}
