const res = await fetch('https://data.twisto.fr/api/explore/v2.1/catalog/datasets/horaires-tr/records?limit=1')
const data = await res.json()
console.log(JSON.stringify(data.results[0], null, 2))
