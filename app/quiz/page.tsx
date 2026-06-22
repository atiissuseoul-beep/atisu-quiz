'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, type Product } from '@/lib/supabase'
import { checkAnswer } from '@/utils/score'

function QuizContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const playerName = searchParams.get('name') ?? '익명'
  const mode = searchParams.get('mode')
  const isTimeAttack = mode === 'timeattack'
  const questionCount = Number(searchParams.get('count') ?? 25)
  const category = searchParams.get('category')
  const totalTime = isTimeAttack ? 300 : questionCount * 10

  const [products, setProducts] = useState<Product[]>([])
  const [current, setCurrent] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; answer: string } | null>(null)
  const [timeLeft, setTimeLeft] = useState(totalTime)

  const scoreRef = useRef(0)
  const timeLeftRef = useRef(totalTime)
  const currentRef = useRef(0)
  const savingRef = useRef(false)
  const wrongRef = useRef<{ image_url: string; answer: string; input: string }[]>([])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { timeLeftRef.current = timeLeft }, [timeLeft])
  useEffect(() => { currentRef.current = current }, [current])

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, category')

      if (error || !data) {
        alert('제품 데이터를 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      // 컬렉션 선택 시 해당 카테고리만 출제
      const filtered = category ? data.filter(p => p.category === category) : data
      const shuffled = [...filtered].sort(() => Math.random() - 0.5)
      // 타임어택은 전체 로드 (무제한), 일반 모드는 questionCount만
      const slice = isTimeAttack ? shuffled : shuffled.slice(0, Math.min(questionCount, shuffled.length))
      setProducts(slice)
      setLoading(false)
    }
    fetchProducts()
  }, [questionCount, isTimeAttack, category])

  const finishQuiz = useCallback(async (correctCount: number, remainingTime: number, total: number, fail = false) => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const finalScore = isTimeAttack
      ? correctCount * 100
      : correctCount * 100 + remainingTime * 10
    await supabase.from('scores').insert({
      player_name: playerName,
      score: finalScore,
      total,
    })
    // 이번 판 오답 목록 저장 (만점이면 빈 배열 — 이전 판 잔존 방지)
    sessionStorage.setItem('atisu-wrong', JSON.stringify(wrongRef.current))
    router.push(
      `/result?name=${encodeURIComponent(playerName)}&correct=${correctCount}&total=${total}&timeLeft=${remainingTime}&score=${finalScore}&fail=${fail}&mode=${isTimeAttack ? 'timeattack' : 'normal'}`
    )
  }, [playerName, router, isTimeAttack])

  const handleSubmit = useCallback(() => {
    if (saving || products.length === 0 || feedback) return
    const product = products[currentRef.current % products.length]
    const isCorrect = checkAnswer(input, product.name)
    if (isCorrect) {
      setScore(s => s + 1)
    } else {
      setWrongCount(w => w + 1)
      wrongRef.current = [
        ...wrongRef.current,
        { image_url: product.image_url, answer: product.name, input: input.trim() },
      ]
    }
    setFeedback({ isCorrect, answer: product.name })
  }, [saving, products, input, feedback])

  // 다음 문제 이미지 미리 로드 (깜빡임/지연 방지)
  useEffect(() => {
    if (products.length === 0) return
    const next1 = products[(current + 1) % products.length]
    const next2 = products[(current + 2) % products.length]
    for (const p of [next1, next2]) {
      if (p) {
        const img = new window.Image()
        img.src = p.image_url
      }
    }
  }, [current, products])

  // 전체 타이머
  useEffect(() => {
    if (loading || products.length === 0) return
    const interval = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [loading, products.length])

  // 타이머 종료
  useEffect(() => {
    if (timeLeft > 0 || loading || products.length === 0) return
    finishQuiz(scoreRef.current, 0, isTimeAttack ? currentRef.current : products.length, false)
  }, [timeLeft, loading, products, finishQuiz, isTimeAttack])

  // 피드백 후 처리
  useEffect(() => {
    if (!feedback) return
    const delay = isTimeAttack ? (feedback.isCorrect ? 800 : 1200) : 1500
    const timer = setTimeout(() => {
      if (isTimeAttack && !feedback.isCorrect) {
        // 타임어택: 오답 → 즉시 실패
        finishQuiz(scoreRef.current, timeLeftRef.current, currentRef.current + 1, true)
      } else {
        const isLast = !isTimeAttack && (current + 1 >= products.length)
        if (isLast) {
          finishQuiz(scoreRef.current, timeLeftRef.current, products.length, false)
        } else {
          setCurrent(c => c + 1)
          setInput('')
          setFeedback(null)
        }
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [feedback, current, products, finishQuiz, isTimeAttack])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') handleSubmit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSubmit])

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg">로딩 중...</p>
      </main>
    )
  }

  if (products.length === 0) {
    return (
      <main className="flex flex-col items-center gap-4 p-8">
        <p className="text-red-500 text-center">
          제품 데이터가 없습니다. Supabase에 제품을 추가해주세요.
        </p>
        <button onClick={() => router.push('/')} className="border border-gray-300 rounded-xl px-4 py-2">
          홈으로
        </button>
      </main>
    )
  }

  const product = products[current % products.length]
  const timerPct = (timeLeft / totalTime) * 100
  const timerColor = timerPct <= 20 ? 'bg-red-500' : timerPct <= 40 ? 'bg-yellow-400' : 'bg-green-500'
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timerDisplay = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`

  return (
    <main className="flex flex-col items-center gap-6 p-6 w-full max-w-lg mx-auto">
      <div className="w-full flex justify-between items-center">
        <span className="text-gray-500 text-sm">{playerName}</span>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="text-green-600">✓ {score}</span>
          {!isTimeAttack && <span className="text-red-500">✗ {wrongCount}</span>}
          <span className="text-gray-400">
            {isTimeAttack ? `#${current + 1}` : `${current + 1} / ${products.length}`}
          </span>
        </div>
      </div>

      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <span className={`text-sm font-bold tabular-nums w-12 text-right ${timerPct <= 20 ? 'text-red-500' : 'text-gray-500'}`}>
          {timerDisplay}
        </span>
      </div>

      <div className="w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image_url} alt="제품 이미지" className="w-full h-full object-contain" />
      </div>

      <input
        type="text"
        placeholder="제품명을 입력하세요"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-black"
        autoFocus
        disabled={!!feedback || saving}
      />

      {feedback && (
        <div className={`w-full rounded-xl px-4 py-3 text-center font-semibold ${feedback.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {feedback.isCorrect ? '정답!' : `오답 — 정답: ${feedback.answer}`}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!!feedback || saving}
        className="w-full bg-black text-white rounded-xl px-4 py-3 text-lg font-semibold disabled:opacity-40"
      >
        {saving ? '저장 중...' : '확인'}
      </button>
    </main>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-500">로딩 중...</div>}>
      <QuizContent />
    </Suspense>
  )
}
