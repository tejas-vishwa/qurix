import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client/web'

function getValidTursoUrl(): string {
  const candidates = [
    process.env.TURSO_DATABASE_URL,
    process.env.TURSO_URL,
    process.env.DATABASE_URL
  ]
  for (const raw of candidates) {
    if (raw && raw !== 'undefined' && raw.trim() !== '' && !raw.includes('placeholder.turso.io')) {
      return raw.trim()
    }
  }
  return 'file:./dev.db'
}

function getValidTursoToken(): string | undefined {
  const raw = process.env.TURSO_AUTH_TOKEN
  if (raw && raw !== 'undefined' && raw.trim() !== '') {
    return raw.trim()
  }
  return undefined
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export function createDbClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  const tursoUrl = getValidTursoUrl()
  const tursoToken = getValidTursoToken()

  process.env.TURSO_DATABASE_URL = tursoUrl
  process.env.TURSO_AUTH_TOKEN = tursoToken

  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  })
  ;(libsql as any).url = tursoUrl
  ;(libsql as any).authToken = tursoToken

  const adapter = new PrismaLibSQL(libsql as any)
  const instance = new PrismaClient({ adapter } as any)

  globalForPrisma.prisma = instance
  return instance
}

// Proxy wrapper so top-level imports of `prisma` execute createClient lazily only when a request method is invoked
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: keyof PrismaClient) {
    const instance = createDbClient()
    const value = instance[prop]
    if (typeof value === 'function') {
      return value.bind(instance)
    }
    return value
  }
})


