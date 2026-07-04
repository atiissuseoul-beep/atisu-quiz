'use client'

import { useEffect, useState } from 'react'
import { supabase, type Product, type Score, type Collection } from '@/lib/supabase'

const ADMIN_PASSWORD = 'junyoung'

function AdminContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'uncategorized' | 카테고리명
  const [view, setView] = useState<'products' | 'scores' | 'collections'>('products')
  const [scores, setScores] = useState<Score[]>([])
  const [scoresLoaded, setScoresLoaded] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [newCollection, setNewCollection] = useState('')

  // 신규 추가 폼
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [adding, setAdding] = useState(false)
  const [fileKey, setFileKey] = useState(0) // 파일 input 초기화용
  const [preview, setPreview] = useState<string | null>(null)

  function pickFile(f: File | null) {
    setNewFile(f)
    setPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return f ? URL.createObjectURL(f) : null
    })
  }

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('id, name, image_url, category')
      .order('name')
    if (data) setProducts(data)
    setLoading(false)
  }

  async function loadCollections() {
    const { data } = await supabase.from('collections').select('id, name').order('name')
    if (data) setCollections(data)
  }

  useEffect(() => { loadProducts(); loadCollections() }, [])

  async function addCollection() {
    const trimmed = newCollection.trim()
    if (!trimmed) return
    const { error } = await supabase.from('collections').insert({ name: trimmed })
    if (error) {
      alert('추가 실패 (이미 있는 이름일 수 있어요): ' + error.message)
      return
    }
    setNewCollection('')
    await loadCollections()
  }

  async function renameCollection(id: number, oldName: string, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return
    // 제품 카테고리 먼저 갱신 (중간 실패해도 기존 이름이 유효)
    await supabase.from('products').update({ category: trimmed }).eq('category', oldName)
    await supabase.from('collections').update({ name: trimmed }).eq('id', id)
    await loadCollections()
    await loadProducts()
  }

  async function deleteCollection(id: number, name: string) {
    if (!confirm(`'${name}' 컬렉션을 삭제할까요? 이 컬렉션 제품은 '미분류'가 돼요.`)) return
    await supabase.from('products').update({ category: null }).eq('category', name)
    await supabase.from('collections').delete().eq('id', id)
    await loadCollections()
    await loadProducts()
  }

  async function loadScores() {
    const { data } = await supabase
      .from('scores')
      .select('id, player_name, score, total, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(200)
    if (data) setScores(data)
    setScoresLoaded(true)
  }

  useEffect(() => {
    if (view === 'scores' && !scoresLoaded) loadScores()
  }, [view, scoresLoaded])

  async function deleteScore(entry: Score) {
    if (!confirm(`${entry.player_name}님의 ${entry.score.toLocaleString()}점 기록을 삭제할까요?`)) return
    const { data, error } = await supabase.from('scores').delete().eq('id', entry.id).select()
    if (error || !data?.length) {
      alert('삭제 실패: ' + (error?.message ?? 'Supabase에 scores 삭제 정책(RLS)이 필요해요.'))
      return
    }
    setScores(s => s.filter(e => e.id !== entry.id))
  }

  async function updateCategory(id: number, category: string) {
    const value = category || null
    await supabase.from('products').update({ category: value }).eq('id', id)
    setProducts(ps => ps.map(p => (p.id === id ? { ...p, category: value } : p)))
  }

  async function updateName(id: number, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    await supabase.from('products').update({ name: trimmed }).eq('id', id)
    setProducts(ps => ps.map(p => (p.id === id ? { ...p, name: trimmed } : p)))
  }

  async function deleteProduct(id: number, name: string) {
    if (!confirm(`'${name}' 제품을 삭제할까요?`)) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(ps => ps.filter(p => p.id !== id))
  }

  async function addProduct() {
    if (!newFile || !newName.trim()) {
      alert('사진과 이름을 모두 입력해주세요.')
      return
    }
    setAdding(true)
    const ext = newFile.name.split('.').pop() || 'jpg'
    const storagePath = `products/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('product-images')
      .upload(storagePath, newFile, { upsert: true })
    if (upErr) {
      alert('사진 업로드 실패: ' + upErr.message)
      setAdding(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath)

    const { error: insErr } = await supabase
      .from('products')
      .insert({ name: newName.trim(), image_url: publicUrl, category: newCategory || null })
    if (insErr) {
      alert('저장 실패: ' + insErr.message)
      setAdding(false)
      return
    }

    pickFile(null)
    setNewName('')
    setNewCategory('')
    setFileKey(k => k + 1)
    await loadProducts()
    setAdding(false)
  }

  const uncategorized = products.filter(p => !p.category).length
  const categoryCounts = collections.map(c => ({
    name: c.name,
    count: products.filter(p => p.category === c.name).length,
  }))

  const visible = products.filter(p => {
    if (filter === 'uncategorized') {
      if (p.category) return false
    } else if (filter !== 'all') {
      if (p.category !== filter) return false
    }
    const q = search.trim().toLowerCase()
    if (q && !p.name.toLowerCase().includes(q)) return false
    return true
  })

  const chips = [
    { key: 'all', label: '전체', count: products.length },
    ...categoryCounts.map(c => ({ key: c.name, label: c.name, count: c.count })),
    { key: 'uncategorized', label: '미분류', count: uncategorized },
  ]

  return (
    <main className="flex flex-col gap-5 p-6 w-full max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">관리자</h1>

      {/* 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('products')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${view === 'products' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          제품 관리
        </button>
        <button
          onClick={() => setView('collections')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${view === 'collections' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          컬렉션
        </button>
        <button
          onClick={() => setView('scores')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${view === 'scores' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          🏆 랭킹
        </button>
      </div>

      {view === 'products' && (
      <>
      {/* 신규 추가 — 강조 */}
      <div className="bg-white border-2 border-black rounded-2xl p-5 flex flex-col gap-4 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">➕</span>
          <h2 className="text-lg font-bold">신상품 추가</h2>
        </div>

        {/* 이미지 업로드 버튼 + 미리보기 */}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-black text-white rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap hover:bg-gray-800 transition-colors">
            이미지 업로드
            <input
              key={fileKey}
              type="file"
              accept="image/*"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="미리보기" className="w-14 h-14 object-contain rounded-lg bg-gray-100 shrink-0" />
          ) : (
            <span className="text-sm text-gray-400">선택된 이미지 없음</span>
          )}
        </div>

        <input
          type="text"
          placeholder="제품명"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black"
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">미분류</option>
          {collections.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={addProduct}
          disabled={adding}
          className="bg-black text-white rounded-xl px-4 py-3 font-bold text-base disabled:opacity-40 hover:bg-gray-800 transition-colors"
        >
          {adding ? '추가 중...' : '+ 추가하기'}
        </button>
      </div>

      {/* 필터 칩 (카테고리별 개수) */}
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === c.key ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            {c.label} <span className={filter === c.key ? 'text-gray-300' : 'text-gray-400'}>{c.count}</span>
          </button>
        ))}
      </div>

      {/* 검색 */}
      <input
        type="text"
        placeholder="제품명 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black"
      />

      {/* 제품 목록 */}
      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <p className="text-gray-400 text-center py-8">조건에 맞는 제품이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">{visible.length}개 표시 중</p>
          {visible.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt={p.name} className="w-12 h-12 object-contain rounded bg-gray-100 shrink-0" />
              <input
                key={`name-${p.id}-${p.name}`}
                defaultValue={p.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && v !== p.name) updateName(p.id, v)
                }}
                className="flex-1 min-w-0 text-sm font-medium border border-gray-200 hover:border-gray-300 focus:border-black rounded-lg px-2 py-1 focus:outline-none"
              />
              <select
                value={p.category ?? ''}
                onChange={(e) => updateCategory(p.id, e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
              >
                <option value="">미분류</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => deleteProduct(p.id, p.name)}
                className="text-red-500 text-sm px-2 shrink-0"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {view === 'collections' && (
        <div className="flex flex-col gap-4">
          {/* 새 컬렉션 추가 */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 flex flex-col gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xl">➕</span>
              <h2 className="text-lg font-bold">새 컬렉션 추가</h2>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="컬렉션 이름 (예: SUMMER)"
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCollection()}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                onClick={addCollection}
                className="bg-black text-white rounded-xl px-4 py-2.5 font-semibold whitespace-nowrap hover:bg-gray-800"
              >
                추가
              </button>
            </div>
          </div>

          {/* 컬렉션 목록 */}
          {collections.length === 0 ? (
            <p className="text-gray-400 text-center py-8">아직 컬렉션이 없어요.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-400">이름을 고치고 다른 곳을 누르면 저장돼요. 그 컬렉션 제품도 함께 바뀝니다.</p>
              {collections.map((c) => (
                <div key={c.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2">
                  <input
                    key={`col-${c.id}-${c.name}`}
                    defaultValue={c.name}
                    onBlur={(e) => renameCollection(c.id, c.name, e.target.value)}
                    className="flex-1 min-w-0 text-sm font-semibold border border-gray-200 hover:border-gray-300 focus:border-black rounded-lg px-2 py-1.5 focus:outline-none"
                  />
                  <span className="text-xs text-gray-400 shrink-0">
                    {products.filter(p => p.category === c.name).length}개
                  </span>
                  <button
                    onClick={() => deleteCollection(c.id, c.name)}
                    className="text-red-500 text-sm px-2 shrink-0"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'scores' && (
        !scoresLoaded ? (
          <p className="text-gray-500">불러오는 중...</p>
        ) : scores.length === 0 ? (
          <p className="text-gray-400 text-center py-8">아직 기록이 없어요.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="py-3 px-4 text-left">순위</th>
                  <th className="py-3 px-4 text-left">이름</th>
                  <th className="py-3 px-4 text-right">점수</th>
                  <th className="py-3 px-4 text-right">날짜</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {scores.map((entry, index) => (
                  <tr key={entry.id} className="border-t">
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4">{entry.player_name}</td>
                    <td className="py-3 px-4 text-right">{entry.score.toLocaleString()}점</td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => deleteScore(entry)}
                        className="text-red-500 text-sm px-2 shrink-0"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('atisu-admin') === 'ok') setAuthed(true)
  }, [])

  function tryLogin() {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('atisu-admin', 'ok')
      setAuthed(true)
    } else {
      alert('비밀번호가 틀렸어요.')
    }
  }

  if (!authed) {
    return (
      <main className="flex flex-col items-center gap-4 p-8 w-full max-w-sm mx-auto min-h-screen justify-center">
        <h1 className="text-2xl font-bold">관리자</h1>
        <input
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && tryLogin()}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-black"
          autoFocus
        />
        <button
          onClick={tryLogin}
          className="w-full bg-black text-white rounded-xl px-4 py-3 text-lg font-semibold"
        >
          들어가기
        </button>
      </main>
    )
  }

  return <AdminContent />
}
