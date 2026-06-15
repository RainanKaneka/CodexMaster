export function validateTableRanges(results: { rangeMin: number; rangeMax: number }[]): boolean {
  for (let i = 0; i < results.length; i++) {
    if (isNaN(results[i].rangeMin) || isNaN(results[i].rangeMax)) {
      return false;
    }
    if (results[i].rangeMin > results[i].rangeMax) {
      return false;
    }
  }

  const sorted = [...results].sort((a, b) => a.rangeMin - b.rangeMin);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].rangeMax >= sorted[i + 1].rangeMin) {
      return false;
    }
  }

  return true;
}
