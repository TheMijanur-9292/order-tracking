// Scores how well a saved receiver matches a restaurant (address prefix, PIN code, zone name).
export function getReceiverMatchScore(rec, rest) {
  if (!rec || !rest) return 0;
  const rAddr = (rest.address || '').toLowerCase().trim();
  const recAddr = (rec.address || '').toLowerCase().trim();
  const recName = (rec.name || '').toLowerCase().trim();
  const zName = (rest.zone_name || '').toLowerCase().replace(/^kolkata[-_\s]*/i, '').trim();

  let score = 0;
  if (rAddr && recAddr) {
    const normR = rAddr.replace(/[^a-z0-9]/g, '');
    const normRec = recAddr.replace(/[^a-z0-9]/g, '');
    if (normR && normRec && (normR.includes(normRec.slice(0, 18)) || normRec.includes(normR.slice(0, 18)))) {
      score += 100;
    }
    const pinR = rAddr.match(/\b700\d{3}\b/);
    const pinRec = recAddr.match(/\b700\d{3}\b/);
    if (pinR && pinRec && pinR[0] === pinRec[0]) {
      score += 50;
    }
  }
  if (zName && zName.length >= 3) {
    const zParts = zName.split(/[\s/_-]+/).filter(p => p.length >= 3);
    for (const part of zParts) {
      if (recName.includes(part) || recAddr.includes(part)) {
        score += 30;
      }
    }
  }
  return score;
}
