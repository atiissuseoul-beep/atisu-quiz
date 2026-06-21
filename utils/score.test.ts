import { describe, it, expect } from 'vitest'
import { checkAnswer } from './score'

describe('checkAnswer', () => {
  it('정확히 일치하면 true', () => {
    expect(checkAnswer('마들렌 쿠키', '마들렌 쿠키')).toBe(true)
  })

  it('앞뒤 공백 무시', () => {
    expect(checkAnswer('  마들렌 쿠키  ', '마들렌 쿠키')).toBe(true)
  })

  it('다른 이름은 false', () => {
    expect(checkAnswer('마드렌 쿠키', '마들렌 쿠키')).toBe(false)
  })

  it('빈 입력은 false', () => {
    expect(checkAnswer('', '마들렌 쿠키')).toBe(false)
  })
})
