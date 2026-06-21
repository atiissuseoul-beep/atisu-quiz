// 제품 사진 일괄 업로드 스크립트
// 사용법: node scripts/upload-products.js
//
// 준비:
// 1. 제품 사진 파일 이름을 정확한 제품명으로 저장 (예: 마들렌쿠키.jpg)
// 2. 사진들을 atisu-quiz/제품사진/ 폴더에 넣기
// 3. 터미널에서 node scripts/upload-products.js 실행

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// .env.local 파일 읽기
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) env[key.trim()] = rest.join('=').trim()
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ .env.local 파일에서 Supabase URL 또는 KEY를 찾을 수 없어요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 이미지 폴더 경로 (atisu-quiz/제품사진/ 폴더)
const IMAGES_DIR = path.join(__dirname, '..', '제품사진')

// 지원하는 이미지 확장자
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

async function uploadProducts() {
  // 폴더 존재 확인
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ '제품사진' 폴더가 없어요.`)
    console.error(`   ${IMAGES_DIR} 폴더를 만들고 사진을 넣어주세요.`)
    process.exit(1)
  }

  // 이미지 파일 목록
  const files = fs.readdirSync(IMAGES_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase()
    return IMAGE_EXTENSIONS.includes(ext)
  })

  if (files.length === 0) {
    console.error('❌ 제품사진 폴더에 이미지가 없어요.')
    process.exit(1)
  }

  console.log(`📦 총 ${files.length}개 제품 업로드 시작...\n`)

  let success = 0
  let fail = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = path.extname(file).toLowerCase()
    const productName = path.basename(file, ext) // 파일명 = 제품명
    const filePath = path.join(IMAGES_DIR, file)
    const fileBuffer = fs.readFileSync(filePath)
    const storagePath = `products/${Date.now()}-${file}`

    process.stdout.write(`[${i + 1}/${files.length}] ${productName} ... `)

    // Supabase Storage에 이미지 업로드
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(storagePath, fileBuffer, {
        contentType: `image/${ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1)}`,
        upsert: true,
      })

    if (uploadError) {
      console.log(`❌ 업로드 실패: ${uploadError.message}`)
      fail++
      continue
    }

    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath)

    // products 테이블에 추가
    const { error: insertError } = await supabase
      .from('products')
      .insert({ name: productName, image_url: publicUrl })

    if (insertError) {
      console.log(`❌ DB 저장 실패: ${insertError.message}`)
      fail++
      continue
    }

    console.log(`✅`)
    success++
  }

  console.log(`\n완료! ✅ 성공 ${success}개 / ❌ 실패 ${fail}개`)
}

uploadProducts().catch(err => {
  console.error('오류:', err.message)
  process.exit(1)
})
