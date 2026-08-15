const REALTIME_URL = 'https://data.twisto.fr/api/explore/v2.1/catalog/datasets/horaires-tr/exports/json'

function hmsToSeconds(hms) {
  const [h, m, s] = hms.split(':').map(Number)
  return h * 3600 + m * 60 + (s || 0)
}

async function fetchRealtimeRecords() {
  const res = await fetch(REALTIME_URL)
  if (!res.ok) throw new Error(`Twisto API: ${res.status}`)
  return await res.json()
}

function interpolatePosition(shapePoints, fromIdx, toIdx, fraction) {
  if (fromIdx === toIdx) return shapePoints[fromIdx]
  const segment = shapePoints.slice(fromIdx, toIdx + 1)
  if (segment.length < 2) return shapePoints[fromIdx]
  const targetPos = Math.max(0, Math.min(1, fraction)) * (segment.length - 1)
  const i = Math.floor(targetPos)
  const t = targetPos - i
  const a = segment[i]
  const b = segment[Math.min(i + 1, segment.length - 1)]
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export function createVehicleTracker(gtfsIndex, onUpdate) {
  const { tripInfo, shapePoints } = gtfsIndex

  async function tick() {
    let records
    try {
      records = await fetchRealtimeRecords()
    } catch (err) {
      console.error('Erreur récupération temps réel:', err.message)
      return
    }

    const tripActuals = new Map() // trip_id -> [{ seq, shapeIndex, actualSeconds }]

    for (const rec of records) {
      const tripId = rec.numero_course_tripid
      const stopId = rec.numero_arret_stop_id
      const heureReelle = rec.horaire_de_depart_reel
      if (!tripId || !stopId || !heureReelle) continue

      const trip = tripInfo.get(tripId)
      if (!trip) continue
      const stop = trip.stops.find((s) => s.stopId === stopId)
      if (!stop) continue

      if (!tripActuals.has(tripId)) tripActuals.set(tripId, [])
      tripActuals.get(tripId).push({
        seq: stop.seq,
        shapeIndex: stop.shapeIndex,
        actualSeconds: hmsToSeconds(heureReelle),
      })
    }

    const now = new Date()
    const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

    const vehicles = []

    for (const [tripId, actuals] of tripActuals) {
      if (actuals.length < 2) continue
      actuals.sort((a, b) => a.seq - b.seq)

      let before = null
      let after = null
      for (let i = 0; i < actuals.length - 1; i++) {
        if (actuals[i].actualSeconds <= nowSeconds && actuals[i + 1].actualSeconds >= nowSeconds) {
          before = actuals[i]
          after = actuals[i + 1]
          break
        }
      }
      if (!before || !after) continue

      const trip = tripInfo.get(tripId)
      const shape = shapePoints.get(trip.shapeId)
      if (!shape) continue

      const span = after.actualSeconds - before.actualSeconds
      const fraction = span > 0 ? (nowSeconds - before.actualSeconds) / span : 0

      const [lat, lon] = interpolatePosition(shape, before.shapeIndex, after.shapeIndex, fraction)

      vehicles.push({ id: tripId, line: trip.routeName, type: trip.type, lat, lon })
    }

    onUpdate(vehicles)
  }

  return {
    start(intervalMs = 20000) {
      tick()
      return setInterval(tick, intervalMs)
    },
  }
}
