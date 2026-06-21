'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [name, setName] = useState('')
  const router = useRouter()

  function handleStart() {
    const trimmed = name.trim()
    if (!trimmed) return
    router.push(`/quiz?name=${encodeURIComponent(trimmed)}`)
  }

  return (
    <main className="flex flex-col items-center gap-6 p-8 w-full max-w-sm">
      <h1 className="text-3xl font-bold text-center">어티슈 제품 퀴즈</h1>
      <p className="text-gray-500 text-center">사진을 보고 제품명을 맞혀보세요</p>
      <input
        type="text"
        placeholder="이름을 입력하세요"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-black"
        autoFocus
      />
      <button
        onClick={handleStart}
        disabled={!name.trim()}
        className="w-full bg-black text-white rounded-xl px-4 py-3 text-lg font-semibold disabled:opacity-40"
      >
        시작하기
      </button>
    </main>
  )
}
