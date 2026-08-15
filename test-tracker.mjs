import { buildGtfsIndex } from './gtfsIndex.mjs'
import { createVehicleTracker } from './vehicleTracker.mjs'

const index = buildGtfsIndex()

const tracker = createVehicleTracker(index, (vehicles) => {
  console.log(`\n${vehicles.length} véhicule(s) positionné(s) :`)
  console.log(vehicles.slice(0, 5))
})

tracker.start(20000)
