import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 카카오 CDN 이미지 URL인지 확인 (k.kakaocdn.net, img1.kakaocdn.net, t1.kakaocdn.net 등)
 * 웹사이트에서 카카오 이미지는 표시하지 않음 (Next.js Image 도메인 미허용)
 */
export function isKakaoImageUrl(url: string | null | undefined): boolean {
  return Boolean(url && String(url).includes('kakaocdn.net'))
}

/**
 * 표시용 프로필 이미지 URL 반환. 카카오 이미지는 null로 변환
 */
export function getDisplayImageUrl(url: string | null | undefined): string | null {
  return url && !isKakaoImageUrl(url) ? String(url) : null
}

/** 유저 입력 필드별 글자 수 제한 */
export const INPUT_LIMITS = {
  /** 프로필 이름 */
  PROFILE_NAME_MAX: 10,
  /** 프로필 이름 최소 (실명) */
  PROFILE_NAME_MIN: 1,
  /** 게임 모집글 제목 */
  GAME_POST_TITLE_MAX: 50,
  /** 게임 모집글 내용 */
  GAME_POST_CONTENT_MAX: 2000,
  /** 댓글 내용 (게임 모집글) */
  GAME_POST_COMMENT_MAX: 500,
  /** 댓글 내용 (공지사항) */
  NOTICE_COMMENT_MAX: 1000,
} as const

interface TiptapNode {
  type: string;
  attrs?: { src?: string };
  content?: TiptapNode[];
}

/**
 * Tiptap JSON 콘텐츠에서 첫 번째 이미지 URL을 추출
 */
export function extractFirstImageUrl(content: unknown): string | null {
  if (!content || typeof content !== 'object') return null;
  const node = content as TiptapNode;
  if (node.type === 'image' && node.attrs?.src) return node.attrs.src;
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const found = extractFirstImageUrl(child);
      if (found) return found;
    }
  }
  return null;
}

/**
 * HTML 태그, 스크립트, 위험한 패턴 제거 (XSS 방지)
 * 유저 입력 필드에 사용
 */
export function sanitizeUserInput(input: string | null | undefined): string {
  if (input == null || typeof input !== 'string') return ''
  let s = input
  // HTML 태그 제거
  s = s.replace(/<[^>]*>/g, '')
  // javascript:, data:, vbscript: 등 위험한 프로토콜 제거
  s = s.replace(/\s*(javascript|data|vbscript):/gi, '')
  // on\w+= 이벤트 핸들러 패턴 제거
  s = s.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  s = s.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
  // &lt;script 등 HTML 엔티티 기반 스크립트 시도 제거
  s = s.replace(/&lt;script/gi, '')
  s = s.replace(/&lt;\/script&gt;/gi, '')
  return s.trim()
}
