import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createServerClient } from '@/lib/database/supabase/server'
import prisma from '@/lib/database/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  // OAuth 에러가 있는 경우
  if (error) {
    console.error('OAuth 에러:', error, errorDescription)
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error)}`)
  }

  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/'
  }

  if (code) {
    try {
      const supabase = await createServerClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('세션 교환 에러:', exchangeError)
        return NextResponse.redirect(`${origin}/auth/login?error=session_exchange_failed`)
      }

      if (data.session) {
        const user = data.session.user
        try {
          // UserProfile이 없으면 생성 (신규 로그인 시)
          let userProfile = await prisma.userProfile.findUnique({
            where: { userId: user.id },
            select: { termsAgreed: true, privacyAgreed: true }
          })

          if (!userProfile) {
            const metadata = user.user_metadata ?? {}
            const name = (metadata.full_name ?? metadata.name ?? metadata.nickname ?? user.email?.split('@')[0]) || '사용자'
            const birthDate = metadata.birthDate ? new Date(metadata.birthDate) : new Date('2000-01-01')
            // 카카오 CDN(k.kakaocdn.net) 이미지는 사용하지 않음
            const rawImage = metadata.avatar_url ?? metadata.picture ?? metadata.profile_image ?? metadata.profile_image_url
            const image = rawImage && !String(rawImage).includes('k.kakaocdn.net') ? rawImage : null

            // 검증 대기(NONE) 역할 조회 - 신규 가입자는 운영진 부원 확인 전까지 NONE
            const noneRole = await prisma.role.findFirst({ where: { name: 'NONE' }, select: { id: true } })

            await prisma.userProfile.create({
              data: {
                userId: user.id,
                name,
                email: user.email ?? null,
                birthDate,
                image,
                roleId: noneRole?.id ?? null,
                termsAgreed: false,
                privacyAgreed: false
              }
            })
            userProfile = { termsAgreed: false, privacyAgreed: false }
          }

          // 이용약관에 동의하지 않은 경우 약관 동의 페이지로 리다이렉트
          if (!userProfile.termsAgreed || !userProfile.privacyAgreed) {
            return NextResponse.redirect(`${origin}/auth/terms`)
          }
          const forwardedHost = request.headers.get('x-forwarded-host')
          const isLocalEnv = process.env.NODE_ENV === 'development'
          
          if (isLocalEnv) {
            return NextResponse.redirect(`${origin}${next}`)
          } else if (forwardedHost) {
            return NextResponse.redirect(`https://${forwardedHost}${next}`)
          } else {
            return NextResponse.redirect(`${origin}${next}`)
          }
        } catch (profileError) {
          console.error('사용자 프로필 확인 중 에러:', profileError)
          // 프로필 확인 실패 시에도 약관 동의 페이지로 이동
          return NextResponse.redirect(`${origin}/auth/terms`)
        }
      }
    } catch (error) {
      console.error('인증 콜백 처리 중 에러:', error)
      return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`)
    }
  }

  // 코드가 없거나 처리 실패한 경우
  console.error('인증 코드가 없거나 처리 실패')
  return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
}