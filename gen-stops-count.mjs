import { readFileSync, writeFileSync } from 'fs'

const stops = JSON.parse(readFileSync('../twisto-alert/src/data/stops.json', 'utf-8'))
writeFileSync('stops-count.mjs', `export default { count: ${stops.length} }\n`)
console.log(`stops-count.mjs généré avec ${stops.length} arrêts (source: front fusionné).`)
