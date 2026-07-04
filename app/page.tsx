'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Score } from '@/lib/supabase'

const COUNT_OPTIONS = [10, 25]
const MEDALS = ['🥇', '🥈', '🥉']

export default function HomePage() {
  const [name, setName] = useState('')
  const [count, setCount] = useState(25)
  const [category, setCategory] = useState('all')
  const [top3, setTop3] = useState<Score[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    async function fetchTop3() {
      const { data } = await supabase
        .from('scores')
        .select('id, player_name, score, total, created_at')
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
      if (data) {
        // 이름별 최고 기록만 남기기 (점수순 정렬이므로 첫 등장이 최고 기록)
        const seen = new Set<string>()
        const deduped = data.filter((entry) => {
          if (seen.has(entry.player_name)) return false
          seen.add(entry.player_name)
          return true
        })
        setTop3(deduped.slice(0, 3))
      }
    }
    async function fetchCollections() {
      const { data } = await supabase.from('collections').select('name').order('name')
      if (data) setCollections(data.map(c => c.name))
    }
    fetchTop3()
    fetchCollections()
  }, [])

  function handleStart(mode: 'normal' | 'timeattack') {
    const trimmed = name.trim()
    if (!trimmed) return
    const params = new URLSearchParams()
    params.set('name', trimmed)
    if (mode === 'timeattack') {
      params.set('mode', 'timeattack')
    } else {
      params.set('count', String(count))
    }
    if (category !== 'all') params.set('category', category)
    router.push(`/quiz?${params.toString()}`)
  }

  return (
    <main className="flex flex-col items-center gap-6 p-8 w-full max-w-sm">
      <h1 className="text-3xl font-bold text-center leading-tight">
        ATIISSU<br />
        Product Quiz
      </h1>
      <p className="text-gray-500 text-center">사진을 보고 제품명을 맞혀보세요</p>

      {top3.length > 0 && (
        <div className="w-full bg-gradient-to-b from-yellow-50 to-white border border-yellow-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-center mb-3">🏆 RANKING 🏆</p>
          <div className="flex flex-col gap-2">
            {top3.map((s, i) => (
              <div key={`${s.player_name}-${s.created_at}`} className="flex items-center gap-2 text-sm">
                <span className="text-xl">{MEDALS[i]}</span>
                <span className="flex-1 font-semibold truncate">{s.player_name}</span>
                <span className="font-bold tabular-nums">{s.score.toLocaleString()}점</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="이름을 입력하세요"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleStart('normal')}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-black"
        autoFocus
      />

      <div className="w-full">
        <p className="text-sm text-gray-500 mb-2">컬렉션</p>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="all">전체</option>
          {collections.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <p className="text-sm text-gray-500 mb-2">문제 수</p>
        <div className="flex gap-2">
          {COUNT_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${count === n ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-700'}`}
            >
              {n}문제
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => handleStart('normal')}
        disabled={!name.trim()}
        className="w-full bg-black text-white rounded-xl px-4 py-3 text-lg font-semibold disabled:opacity-40"
      >
        시작하기
      </button>

      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">또는</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="w-full bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
        <div>
          <p className="font-bold text-lg">5분 타임어택</p>
          <p className="text-sm text-gray-500">전체 컬렉션 · 한 문제만 틀려도 실패</p>
        </div>
        <button
          onClick={() => handleStart('timeattack')}
          disabled={!name.trim() || category !== 'all'}
          className="w-full bg-red-500 text-white rounded-xl px-4 py-3 text-base font-semibold disabled:opacity-40"
        >
          도전하기
        </button>
        {category !== 'all' && (
          <p className="text-xs text-gray-400 text-center">타임어택은 전체 컬렉션에서만 가능해요</p>
        )}
      </div>
    </main>
  )
}
