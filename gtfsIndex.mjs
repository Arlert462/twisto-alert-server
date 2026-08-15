import { parseCsv } from './csv.mjs'

function distSq(lat1, lon1, lat2, lon2) {
  const dLat = lat1 - lat2
  const dLon = lon1 - lon2
  return dLat * dLat + dLon * dLon
}

export function buildGtfsIndex() {
  console.log('Construction de l\u2019index GTFS...')

  const routes = parseCsv('gtfs_data/routes.txt')
  const trips = parseCsv('gtfs_data/trips.txt')
  const stopTimes = parseCsv('gtfs_data/stop_times.txt')
  const stops = parseCsv('gtfs_data/stops.txt')
  const shapes = parseCsv('gtfs_data/shapes.txt')

  const routeById = new Map()
  for (const r of routes) {
    routeById.set(r.route_id, { name: r.route_short_name, type: r.route_type === '0' ? 'tram' : 'bus' })
  }

  const stopById = new Map()
  for (const s of stops) {
    stopById.set(s.stop_id, { name: s.stop_name, lat: parseFloat(s.stop_lat), lon: parseFloat(s.stop_lon) })
  }

  const shapeRaw = new Map()
  for (const s of shapes) {
    if (!shapeRaw.has(s.shape_id)) shapeRaw.set(s.shape_id, [])
    shapeRaw.get(s.shape_id).push({
      seq: parseInt(s.shape_pt_sequence),
      lat: parseFloat(s.shape_pt_lat),
      lon: parseFloat(s.shape_pt_lon),
    })
  }
  const shapePoints = new Map()
  for (const [shapeId, pts] of shapeRaw) {
    pts.sort((a, b) => a.seq - b.seq)
    shapePoints.set(shapeId, pts.map((p) => [p.lat, p.lon]))
  }

  // trip_id -> { routeName, type, shapeId, stops: [{stopId, seq, lat, lon, shapeIndex}] }
  const tripInfo = new Map()
  for (const t of trips) {
    const route = routeById.get(t.route_id)
    if (!route) continue
    tripInfo.set(t.trip_id, { routeName: route.name, type: route.type, shapeId: t.shape_id, stops: [] })
  }

  for (const st of stopTimes) {
    const trip = tripInfo.get(st.trip_id)
    if (!trip) continue
    const stop = stopById.get(st.stop_id)
    if (!stop) continue
    trip.stops.push({
      stopId: st.stop_id,
      seq: parseInt(st.stop_sequence),
      lat: stop.lat,
      lon: stop.lon,
    })
  }

  let indexed = 0
  for (const trip of tripInfo.values()) {
    trip.stops.sort((a, b) => a.seq - b.seq)
    if (trip.stops.length > 0) indexed++

    const shape = shapePoints.get(trip.shapeId)
    if (!shape) continue
    for (const stop of trip.stops) {
      let bestIdx = 0
      let bestDist = Infinity
      for (let i = 0; i < shape.length; i++) {
        const d = distSq(stop.lat, stop.lon, shape[i][0], shape[i][1])
        if (d < bestDist) { bestDist = d; bestIdx = i }
      }
      stop.shapeIndex = bestIdx
    }
  }

  console.log(`Index prêt : ${indexed} trajets.`)

  return { tripInfo, shapePoints }
}
