import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { loadReports, saveReports } from './storage.mjs'
import { checkRateLimit } from './rateLimit.mjs'
import { isValidReportPayload } from './validate.mjs'

const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' },
})

const REPORT_LIFETIME_MS = 20 * 60 * 1000

function buildKey(stopIdx, type, line) {
  return `${stopIdx}|${type}|${line ?? ''}`
}

function getClientIp(socket) {
  return socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || socket.handshake.address
    || 'unknown'
}

async function main() {
  const reports = loadReports instanceof Function ? await loadReports() : new Map()
  console.log(`${reports.size} signalement(s) restauré(s) depuis Upstash.`)

  function getActiveReports() {
    const now = Date.now()
    for (const [key, report] of reports) {
      if (now - report.ts > REPORT_LIFETIME_MS) reports.delete(key)
    }
    return [...reports.values()]
  }

  app.get('/health', (req, res) => {
    res.json({ ok: true, reports: reports.size })
  })

  io.on('connection', (socket) => {
    const ip = getClientIp(socket)
    console.log('Connexion:', socket.id, ip)
    socket.emit('reports:sync', getActiveReports())

    socket.on('report:create', (payload) => {
      if (!isValidReportPayload(payload)) {
        socket.emit('report:error', { reason: 'invalid' })
        return
      }
      const { allowed, reason } = checkRateLimit(ip)
      if (!allowed) {
        socket.emit('report:error', { reason })
        return
      }

      const { stopIdx, type, line } = payload
      const key = buildKey(stopIdx, type, line)
      const existing = reports.get(key)
      const report = existing
        ? { ...existing, ts: Date.now(), confirmations: existing.confirmations + 1 }
        : { key, stopIdx, type, line, ts: Date.now(), confirmations: 1 }
      reports.set(key, report)
      saveReports(reports)
      io.emit('report:updated', report)
    })

    socket.on('report:delete', ({ stopIdx, type, line }) => {
      if (!isValidReportPayload({ stopIdx, type, line })) return
      const { allowed, reason } = checkRateLimit(ip)
      if (!allowed) {
        socket.emit('report:error', { reason })
        return
      }
      const key = buildKey(stopIdx, type, line)
      if (reports.delete(key)) {
        saveReports(reports)
        io.emit('report:removed', key)
      }
    })

    socket.on('disconnect', () => {
      console.log('Déconnexion:', socket.id)
    })
  })

  setInterval(() => {
    const now = Date.now()
    let changed = false
    for (const [key, report] of reports) {
      if (now - report.ts > REPORT_LIFETIME_MS) {
        reports.delete(key)
        io.emit('report:removed', key)
        changed = true
      }
    }
    if (changed) saveReports(reports)
  }, 60 * 1000)

  const PORT = process.env.PORT || 3001
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Twisto Alert sur le port ${PORT}`)
  })
}

main()
