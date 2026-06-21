'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, type Score } from '@/lib/supabase'

function ResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const playerName = searchParams.get('name') ?? ''
  const score = Number(searchParams.get('score') ?? 0)
  const total = Number(searchParams.get('total') ?? 25)

  const [leaderboard, setLeaderboard] = useState<Score[]>([])

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from('scores')
        .select('player_name, score, total, created_at')
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(30)

      if (error) {
        console.error('랭킹을 불러오지 못했습니다:', error.message)
        return
      }
      if (data) setLeaderboard(data)
    }
    fetchLeaderboard()
  }, [])

  const percentage = Math.round((score / total) * 100)

  return (
    <main className="flex flex-col items-center gap-6 p-6 w-full max-w-lg mx-auto">
      <div className="w-full bg-white rounded-2xl p-6 shadow-sm text-center">
        <p className="text-gray-500 mb-1">{playerName}님의 결과</p>
        <p className="text-5xl font-bold">
          {score}
          <span className="text-2xl text-gray-400"> / {total}</span>
        </p>
        <p className="text-gray-500 mt-2">{percentage}% 정답</p>
      </div>

      <div className="w-full">
        <h2 className="text-lg font-semibold mb-3">🏆 랭킹</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="py-3 px-4 text-left">순위</th>
                <th className="py-3 px-4 text-left">이름</th>
                <th className="py-3 px-4 text-right">점수</th>
                <th className="py-3 px-4 text-right">날짜</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr
                  key={`${entry.player_name}-${entry.created_at}`}
                  className={`border-t ${entry.player_name === playerName ? 'bg-yellow-50 font-semibold' : ''}`}
                >
                  <td className="py-3 px-4">{index + 1}</td>
                  <td className="py-3 px-4">{entry.player_name}</td>
                  <td className="py-3 px-4 text-right">
                    {entry.score} / {entry.total}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={() => router.push('/')}
        className="w-full border border-gray-300 text-gray-700 rounded-xl px-4 py-3 text-lg"
      >
        다시 하기
      </button>
    </main>
  )
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-500">로딩 중...</div>}>
      <ResultContent />
    </Suspense>
  )
}
