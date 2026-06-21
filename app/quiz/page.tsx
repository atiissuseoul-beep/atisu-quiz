'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Product } from '@/lib/supabase'
import { checkAnswer } from '@/utils/score'

function QuizContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const playerName = searchParams.get('name') ?? '익명'

  const [products, setProducts] = useState<Product[]>([])
  const [current, setCurrent] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchProducts() {
      const { supabase } = await import('@/lib/supabase')
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url')

      if (error || !data) {
        alert('제품 데이터를 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 25)
      setProducts(shuffled)
      setLoading(false)
    }
    fetchProducts()
  }, [])

  const handleNext = useCallback(async () => {
    if (saving || products.length === 0) return
    const product = products[current]
    const isCorrect = checkAnswer(input, product.name)
    const newScore = isCorrect ? score + 1 : score

    if (current + 1 >= products.length) {
      setSaving(true)
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('scores').insert({
        player_name: playerName,
        score: newScore,
        total: products.length,
      })
      router.push(
        `/result?name=${encodeURIComponent(playerName)}&score=${newScore}&total=${products.length}`
      )
    } else {
      setScore(newScore)
      setCurrent(current + 1)
      setInput('')
    }
  }, [current, input, products, score, playerName, router, saving])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') handleNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleNext])

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
        <button
          onClick={() => router.push('/')}
          className="border border-gray-300 rounded-xl px-4 py-2"
        >
          홈으로
        </button>
      </main>
    )
  }

  const product = products[current]

  return (
    <main className="flex flex-col items-center gap-6 p-6 w-full max-w-lg mx-auto">
      <div className="w-full flex justify-between items-center">
        <span className="text-gray-500 text-sm">{playerName}</span>
        <span className="text-gray-700 font-semibold">
          {current + 1} / {products.length}
        </span>
      </div>

      <div className="w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image_url}
          alt="제품 이미지"
          className="w-full h-full object-contain"
        />
      </div>

      <input
        type="text"
        placeholder="제품명을 입력하세요"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-black"
        autoFocus
        disabled={saving}
      />

      <button
        onClick={handleNext}
        disabled={saving}
        className="w-full bg-black text-white rounded-xl px-4 py-3 text-lg font-semibold disabled:opacity-40"
      >
        {saving ? '저장 중...' : current + 1 >= products.length ? '결과 보기' : '다음'}
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
