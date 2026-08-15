import stopsData from './stops-count.mjs'

const VALID_TYPES = new Set(['tram', 'bus', 'arret'])

export function isValidReportPayload(payload) {
  if (!payload || typeof payload !== 'object') return false
  const { stopIdx, type, line } = payload
  if (!Number.isInteger(stopIdx) || stopIdx < 0 || stopIdx >= stopsData.count) return false
  if (!VALID_TYPES.has(type)) return false
  if (line !== undefined && (typeof line !== 'string' || line.length > 20)) return false
  return true
}
