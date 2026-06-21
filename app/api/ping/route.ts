import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Supabase 무료 프로젝트가 7일 미사용 시 잠자기로 들어가는 것을 막기 위한 핑.
// Vercel Cron이 매일 1회 호출 → DB에 가벼운 쿼리를 보내 활성 상태 유지.
export const dynamic = 'force-dynamic'

export async function GET() {
  const { error } = await supabase.from('products').select('id').limit(1)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
