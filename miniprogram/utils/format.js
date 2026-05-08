function fmtPrice(value) {
  if (value === null || value === undefined || value === '') return '--';
  const n = Number(value);
  if (Number.isNaN(n)) return '--';
  return n.toFixed(0);
}

function shortAddress(country, city) {
  return [country, city].filter(Boolean).join('市');
}

function joinNames(items, key) {
  if (!items || !items.length) return '';
  return items.map((i) => (key ? i[key] : i)).filter(Boolean).join(',');
}

function genderToText(g) {
  if (g === 'MALE') return '♂';
  if (g === 'FEMALE') return '♀';
  return '';
}

module.exports = { fmtPrice, shortAddress, joinNames, genderToText };
