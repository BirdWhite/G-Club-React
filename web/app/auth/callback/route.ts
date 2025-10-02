import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createServerClient } from '@/lib/database/supabase'

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
        console.log('인증 성공, 리다이렉트:', next)
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
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