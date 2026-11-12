/** Direct counting only: nominative, whole nonnegative quantities. */
export function countingFormKey(n: number): 'one' | 'few' | 'many' {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('Ожидается целое неотрицательное количество');
  const tail = n % 100;
  if (tail >= 11 && tail <= 14) return 'many';
  if (n % 10 === 1) return 'one';
  if (n % 10 >= 2 && n % 10 <= 4) return 'few';
  return 'many';
}
