const res = await fetch('https://data.twisto.fr/api/explore/v2.1/catalog/datasets/horaires-tr/exports/json')
const data = await res.json()
console.log('Nombre total:', data.length)
console.log('Premier enregistrement:', data[0])
