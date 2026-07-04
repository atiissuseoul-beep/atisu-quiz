'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, type Score } from '@/lib/supabase'

type WrongItem = { image_url: string; answer: string; input: string }

function ResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const playerName = searchParams.get('name') ?? ''
  const correct = Number(searchParams.get('correct') ?? 0)
  const total = Number(searchParams.get('total') ?? 25)
  const timeLeft = Number(searchParams.get('timeLeft') ?? 0)
  const finalScore = Number(searchParams.get('score') ?? 0)
  const fail = searchParams.get('fail') === 'true'
  const isTimeAttack = searchParams.get('mode') === 'timeattack'

  const correctPoints = correct * 100
  const timePoints = timeLeft * 10

  const [phase, setPhase] = useState<'calculating' | 'review' | 'result'>('calculating')
  const [wrong, setWrong] = useState<WrongItem[]>([])
  const [leaderboard, setLeaderboard] = useState<Score[]>([])

  // 오답 목록 불러오기
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('atisu-wrong')
      if (raw) setWrong(JSON.parse(raw))
    } catch {
      // 무시
    }
  }, [])

  // 점수 계산 화면 후: 일반 모드 → 오답노트, 타임어택 → 바로 랭킹
  useEffect(() => {
    const next = isTimeAttack ? 'result' : 'review'
    const timer = setTimeout(() => setPhase(next), 2000)
    return () => clearTimeout(timer)
  }, [isTimeAttack])

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
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
        setLeaderboard(deduped.slice(0, 30))
      }
      if (error) console.error('leaderboard fetch error:', error)
    }
    fetchLeaderboard()
  }, [])

  // 1) 점수 계산 화면
  if (phase === 'calculating') {
    return (
      <main className="flex flex-col items-center gap-8 p-8 w-full max-w-sm mx-auto min-h-screen justify-center">
        <h2 className="text-2xl font-bold">
          {isTimeAttack ? (fail ? '실패...' : '타임업!') : '점수 계산 중...'}
        </h2>
        <div className="w-full bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4 text-base">
          {isTimeAttack ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">연속 정답</span>
                <span className="font-bold text-2xl">{correct}개</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="font-semibold text-lg">점수</span>
                <span className="text-3xl font-bold">{finalScore.toLocaleString()}점</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">정답 {correct}개 × 100점</span>
                <span className="font-bold">{correctPoints.toLocaleString()}점</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">남은 시간 {timeLeft}초 × 10점</span>
                <span className="font-bold">{timePoints.toLocaleString()}점</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="font-semibold text-lg">최종 점수</span>
                <span className="text-3xl font-bold">{finalScore.toLocaleString()}점</span>
              </div>
            </>
          )}
        </div>
      </main>
    )
  }

  // 2) 오답노트 (일반 모드)
  if (phase === 'review') {
    return (
      <main className="flex flex-col items-center gap-6 p-6 w-full max-w-lg mx-auto">
        <div className="w-full bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-gray-500 mb-1">{playerName}님의 결과</p>
          <p className="text-5xl font-bold">
            {finalScore.toLocaleString()}
            <span className="text-xl text-gray-400">점</span>
          </p>
          <div className="mt-3 flex justify-center gap-4 text-sm text-gray-400">
            <span>정답 {correct}/{total}개</span>
            <span>남은 시간 {timeLeft}초</span>
          </div>
        </div>

        <div className="w-full">
          <h2 className="text-lg font-semibold mb-3">📝 오답노트</h2>
          {wrong.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-4xl mb-2">🎉</p>
              <p className="font-semibold">전부 맞혔어요!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {wrong.map((w, i) => (
                <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.image_url} alt="제품" className="w-14 h-14 object-contain rounded bg-gray-100 shrink-0" />
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-semibold text-green-700 truncate">정답: {w.answer}</p>
                    <p className="text-gray-400 truncate">내 답: {w.input || '(빈칸)'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setPhase('result')}
          className="w-full bg-black text-white rounded-xl px-4 py-3 text-lg font-semibold"
        >
          다음
        </button>
      </main>
    )
  }

  // 3) 랭킹
  return (
    <main className="flex flex-col items-center gap-6 p-6 w-full max-w-lg mx-auto">
      <div className="w-full bg-white rounded-2xl p-6 shadow-sm text-center">
        {isTimeAttack ? (
          <>
            <p className="text-5xl mb-2">{fail ? '💀' : '⏱️'}</p>
            <p className="text-2xl font-bold">{fail ? '실패!' : '타임업!'}</p>
            <p className="text-gray-500 mt-1">
              {playerName}님 — {correct}문제 연속 정답
            </p>
          </>
        ) : (
          <p className="text-gray-500 mb-1">{playerName}님의 결과</p>
        )}
        <p className="text-5xl font-bold mt-3">
          {finalScore.toLocaleString()}
          <span className="text-xl text-gray-400">점</span>
        </p>
        {!isTimeAttack && (
          <div className="mt-3 flex justify-center gap-4 text-sm text-gray-400">
            <span>정답 {correct}/{total}개</span>
            <span>남은 시간 {timeLeft}초</span>
          </div>
        )}
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
                  <td className="py-3 px-4 text-right">{entry.score.toLocaleString()}점</td>
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
