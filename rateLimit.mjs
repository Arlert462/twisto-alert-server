const COOLDOWN_MS = 8000       // 8s minimum entre 2 actions
const WINDOW_MS = 5 * 60 * 1000 // fenêtre de 5 minutes
const MAX_PER_WINDOW = 15       // max 15 actions sur la fenêtre

const lastAction = new Map()   // ip -> timestamp
const windowCounts = new Map() // ip -> { start, count }

export function checkRateLimit(ip) {
  const now = Date.now()

  const last = lastAction.get(ip)
  if (last && now - last < COOLDOWN_MS) {
    return { allowed: false, reason: 'cooldown' }
  }

  let win = windowCounts.get(ip)
  if (!win || now - win.start > WINDOW_MS) {
    win = { start: now, count: 0 }
  }
  if (win.count >= MAX_PER_WINDOW) {
    return { allowed: false, reason: 'quota' }
  }

  win.count += 1
  windowCounts.set(ip, win)
  lastAction.set(ip, now)
  return { allowed: true }
}
