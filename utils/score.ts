export function checkAnswer(input: string, answer: string): boolean {
  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  return normalize(input) === normalize(answer)
}
