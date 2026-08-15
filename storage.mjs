import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const KEY = 'twisto:reports'

export async function loadReports() {
  try {
    const data = await redis.get(KEY)
    if (!data) return new Map()
    return new Map(data.map((r) => [r.key, r]))
  } catch (err) {
    console.error('Erreur lecture Upstash, on repart de zéro:', err.message)
    return new Map()
  }
}

let saveTimeout = null
export function saveReports(reportsMap) {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    try {
      await redis.set(KEY, [...reportsMap.values()])
    } catch (err) {
      console.error('Erreur écriture Upstash:', err.message)
    }
  }, 500)
}
