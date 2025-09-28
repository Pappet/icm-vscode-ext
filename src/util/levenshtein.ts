/**
 * Berechnet die Levenshtein-Distanz zwischen zwei Strings.
 * @param a Der erste String.
 * @param b Der zweite String.
 * @returns Die Distanz zwischen den beiden Strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // Deletion
        matrix[j - 1][i] + 1, // Insertion
        matrix[j - 1][i - 1] + indicator // Substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Findet den besten Treffer für ein gegebenes Wort aus einer Liste von Kandidaten.
 * @param word Das Wort, für das ein Treffer gesucht wird.
 * @param candidates Eine Liste von möglichen korrekten Wörtern.
 * @param threshold Die maximale erlaubte Distanz für einen Vorschlag.
 * @returns Der beste Kandidat oder null, wenn kein Treffer gefunden wurde.
 */
export function findBestMatch(word: string, candidates: string[], threshold: number = 3): string | null {
  let bestMatch: string | null = null;
  let minDistance = threshold;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(word.toLowerCase(), candidate.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = candidate;
    }
  }
  return bestMatch;
}