export function checkAnswer(input: string, answer: string): boolean {
  return input.trim().toLowerCase() === answer.trim().toLowerCase()
}
