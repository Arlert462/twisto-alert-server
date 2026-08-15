import { readFileSync } from 'fs'

export function parseCsv(path) {
  const text = readFileSync(path, 'utf-8')
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map((line) => {
    const cols = []
    let cur = '', inQuotes = false
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes
      else if (char === ',' && !inQuotes) { cols.push(cur); cur = '' }
      else cur += char
    }
    cols.push(cur)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cols[i] })
    return obj
  })
}
