import { buildGtfsIndex } from './gtfsIndex.mjs'

const index = buildGtfsIndex()

// Affiche un exemple de trajet pour vérifier que tout est cohérent
const [sampleTripId, sampleTrip] = [...index.tripInfo.entries()].find(([, t]) => t.stops.length > 3)
console.log('\nExemple de trajet:', sampleTripId)
console.log('Ligne:', sampleTrip.routeName, '| Type:', sampleTrip.type)
console.log('Premiers arrêts:', sampleTrip.stops.slice(0, 3).map(s => `${s.stopName} @ ${s.arrivalHM} (shapeIndex ${s.shapeIndex})`))
