'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { GamePost } from '@/types/models';
import { MobileGameSearch } from '@/components/common/MobileGameSearch';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { JsonValue } from '@prisma/client/runtime/library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MobileTimePicker } from './MobileTimePicker';
import { MobileParticipantManager } from './MobileParticipantManager';
import { useProfile } from '@/contexts/ProfileProvider';
import { useEffect, useRef, useState } from 'react';

const formSchema = z.object({
  title: z.string().min(2, '제목은 2자 이상 입력해주세요.').max(100, '제목은 100자를 초과할 수 없습니다.'),
  gameId: z.string().min(1, '게임을 선택해주세요.'),
  maxParticipants: z.number().min(2, '최소 2명 이상이어야 합니다.').max(100, '최대 100명까지 가능합니다.'),
  startDate: z.date({ message: '시작 날짜를 선택해주세요.' }),
  startTime: z.string().min(1, '시작 시간을 선택해주세요.'),
  content: z.custom<JsonValue>().refine(value => {
    if (!value || typeof value !== 'object' || !('content' in value)) {
        return false;
    }
    const contentArray = (value as { content: Array<{ type: string; content?: Array<{ text?: string }> }> }).content;
    if (!contentArray || contentArray.length === 0) return false;
    if (contentArray.length === 1 && contentArray[0].type === 'paragraph' && !contentArray[0].content) {
        return false;
    }
    return true;
  }, { message: '내용을 입력해주세요.' }),
  participants: z.array(z.object({
    name: z.string().min(1, '이름은 필수입니다.'),
    userId: z.string().optional(),
    note: z.string().optional(),
  })),
});

type GamePostFormData = z.infer<typeof formSchema>;

interface MobileGamePostFormProps {
  initialData?: GamePost;
}

export function MobileGamePostForm({ initialData }: MobileGamePostFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const { profile } = useProfile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // 현재 시간에서 가장 가까운 30분 단위 시간 계산
  const getNextTimeSlot = () => {
    // 서버 사이드에서는 기본값 반환
    if (typeof window === 'undefined') {
      return '12:00';
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 현재 분을 30분 단위로 올림
    let nextMinute = currentMinute;
    if (currentMinute > 30) {
      nextMinute = 0;
      now.setHours(currentHour + 1);
    } else if (currentMinute > 0) {
      nextMinute = 30;
    }
    
    return `${now.getHours().toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`;
  };

  // 기본 참여자 목록 생성 (작성자 본인 포함)
const getDefaultParticipants = () => {
    if (isEditMode && initialData?.participants) {
      // 편집 모드: 기존 참여자 목록 사용 (중도 퇴장자 제외하여 UI에만 표시)
      return initialData.participants
        .filter(p => p.status === 'ACTIVE') // 중도 퇴장자가 아닌 활성 참여자만 UI에 표시
        .map(p => {
          const isAuthor = p.userId === initialData.authorId;
          return {
            name: p.participantType === 'GUEST' ? (p.guestName || '') : (p.user?.name || ''),
            userId: p.participantType === 'GUEST' ? '' : (p.user?.userId || ''),
            note: p.participantType === 'GUEST' ? '게스트 참여자' : (isAuthor ? '작성자' : '')
          };
        });
    } else {
      // 새 글 작성 모드: 작성자 본인을 참여자 목록에 추가
      const defaultParticipants = [];
      if (profile?.name) {
        defaultParticipants.push({
          name: profile.name,
          userId: profile.userId,
          note: '작성자'
        });
      }
      return defaultParticipants;
    }
  };

  const form = useForm<GamePostFormData>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit', // 폼 제출 시에만 검증 실행
    reValidateMode: 'onSubmit', // 재검증도 제출 시에만 실행
    defaultValues: {
      title: initialData?.title || '',
      gameId: initialData?.gameId || '',
      maxParticipants: initialData?.maxParticipants || 10,
      startDate: initialData?.startTime ? new Date(initialData.startTime) : new Date(),
      startTime: initialData?.startTime ? new Date(initialData.startTime).toTimeString().slice(0, 5) : getNextTimeSlot(),
      content: initialData?.content || { type: 'doc', content: [{ type: 'paragraph' }] },
      participants: getDefaultParticipants(),
    },
  });

  const { handleSubmit, formState: { isSubmitting }, setValue } = form;

  // 프로필이 로드된 후 작성자 본인을 참여자 목록에 추가 (새 글 작성 시에만)
  useEffect(() => {
    if (!isEditMode && profile?.name) {
      const currentParticipants = form.getValues('participants');
      const hasAuthor = currentParticipants.some(p => p.userId === profile.userId);
      
      if (!hasAuthor) {
        setValue('participants', [
          {
            name: profile.name,
            userId: profile.userId,
            note: '작성자'
          },
          ...currentParticipants
        ]);
      }
    }
  }, [profile, isEditMode, setValue, form]);

  // 모바일 네비게이션 숨김 및 키보드 대응
  useEffect(() => {
    // 모바일 네비게이션 숨김
    document.body.classList.add('mobile-game-form-active');
    
    const handleResize = () => {
      if (containerRef.current) {
        // 뷰포트 높이 변경 시 스크롤 위치 조정
        const currentScrollTop = containerRef.current.scrollTop;
        if (currentScrollTop > 0) {
          // 입력 필드가 보이도록 스크롤 위치 유지
          setTimeout(() => {
            containerRef.current?.scrollTo({
              top: currentScrollTop,
              behavior: 'smooth'
            });
          }, 100);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      // 컴포넌트 언마운트 시 클래스 제거
      document.body.classList.remove('mobile-game-form-active');
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const onSubmit = async (data: GamePostFormData) => {
    try {
      const url = isEditMode ? `/api/game-posts/${initialData.id}` : '/api/game-posts';
      const method = isEditMode ? 'PATCH' : 'POST';

      // 날짜와 시간을 결합하여 UTC 시간으로 변환
      const [hours, minutes] = data.startTime.split(':').map(Number);
      const combinedDateTime = new Date(data.startDate);
      combinedDateTime.setHours(hours, minutes, 0, 0);
      const utcStartTime = combinedDateTime.toISOString();

      const payload = {
        ...data,
        startTime: utcStartTime,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '폼 제출에 실패했습니다.');
      }

      toast.success(isEditMode ? '게시글이 수정되었습니다.' : '게시글이 작성되었습니다.');
      router.push(`/game-mate/${isEditMode ? initialData.id : result.id}`);
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  // 폼 내용이 변경되었는지 확인하는 함수
  const hasFormChanges = () => {
    const currentValues = form.getValues();
    
    // 새 글 작성 모드
    if (!isEditMode) {
      return (
        currentValues.title.trim() !== '' ||
        currentValues.gameId !== '' ||
        (currentValues.content && 
         typeof currentValues.content === 'object' && 
         'content' in currentValues.content &&
         Array.isArray(currentValues.content.content) &&
         currentValues.content.content.some((node) => 
           (node as { type: string; content?: Array<{ text?: string }> }).type === 'paragraph' && 
           (node as { type: string; content?: Array<{ text?: string }> }).content && 
           (node as { type: string; content?: Array<{ text?: string }> }).content!.length > 0 &&
           (node as { type: string; content?: Array<{ text?: string }> }).content!.some((textNode) => textNode.text && textNode.text.trim() !== '')
         )) || // 실제 텍스트 내용이 있는지 확인
        currentValues.participants.length > 1 // 작성자 외 다른 참여자
      );
    }
    
    // 편집 모드 - 초기값과 비교
    if (initialData) {
      return (
        currentValues.title !== initialData.title ||
        currentValues.gameId !== initialData.gameId ||
        currentValues.maxParticipants !== initialData.maxParticipants ||
        JSON.stringify(currentValues.content) !== JSON.stringify(initialData.content)
      );
    }
    
    return false;
  };

  const handleCancel = () => {
    if (hasFormChanges()) {
      setShowExitModal(true);
    } else {
      router.back();
    }
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    router.back();
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden z-40">
      {/* 모바일 헤더 - 고정 위치 */}
      <div className="flex-shrink-0 bg-background px-4 py-3 flex items-center justify-between">
        <button
          onClick={handleCancel}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-accent transition-colors"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
        
        <h1 className="text-lg font-semibold text-foreground">
          {isEditMode ? '게시글 수정' : '게시글 작성'}
        </h1>
        
        <Button
          type="submit"
          form="game-post-form"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium"
          size="sm"
        >
          {isSubmitting ? '저장 중...' : (isEditMode ? '수정' : '작성')}
        </Button>
      </div>

      {/* 스크롤 가능한 콘텐츠 */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 pb-24 space-y-6">
          <Form {...form}>
            <form id="game-post-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="제목" 
                          className="border-none bg-transparent text-xl font-semibold placeholder:text-muted-foreground/60 placeholder:text-xl placeholder:font-semibold focus:ring-0 focus:border-none px-0"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 제목 아래 구분선 */}
                <div className="border-t border-border"></div>
              </div>

              {/* 시간 선택 - 날짜와 시간 통합 */}
              <div className="flex gap-4">
                {/* 왼쪽: 날짜 선택 */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <button
                              type="button"
                              className="flex items-center justify-between w-full py-3 px-0 text-base font-medium text-foreground border-b border-border bg-transparent focus:outline-none focus:border-primary transition-colors"
                            >
                              <span className="truncate">
                                {field.value ? (
                                  (() => {
                                    const today = new Date();
                                    const tomorrow = new Date(today);
                                    tomorrow.setDate(today.getDate() + 1);
                                    const dayAfterTomorrow = new Date(today);
                                    dayAfterTomorrow.setDate(today.getDate() + 2);
                                    
                                    const selectedDate = new Date(field.value);
                                    selectedDate.setHours(0, 0, 0, 0);
                                    today.setHours(0, 0, 0, 0);
                                    tomorrow.setHours(0, 0, 0, 0);
                                    dayAfterTomorrow.setHours(0, 0, 0, 0);
                                    
                                    if (selectedDate.getTime() === today.getTime()) {
                                      return '오늘';
                                    } else if (selectedDate.getTime() === tomorrow.getTime()) {
                                      return '내일';
                                    } else if (selectedDate.getTime() === dayAfterTomorrow.getTime()) {
                                      return '모레';
                                    } else {
                                      return format(field.value, "M월 d일 (E)", { locale: ko });
                                    }
                                  })()
                                ) : (
                                  "날짜 선택"
                                )}
                              </span>
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-0" 
                          align="center" 
                          side="bottom"
                          sideOffset={8}
                          alignOffset={0}
                          avoidCollisions={true}
                          collisionPadding={16}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                            locale={ko}
                            className="w-80 max-w-[calc(100vw-2rem)]"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 오른쪽: 시간 선택 */}
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <MobileTimePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="gameId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MobileGameSearch
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="게임 선택"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-medium text-foreground">모집 인원</span>
                          <Input 
                            type="number" 
                            value={field.value || ''}
                            onChange={e => {
                              const value = e.target.value;
                              if (value === '') {
                                field.onChange(0);
                              } else {
                                const numValue = Number(value);
                                if (!isNaN(numValue)) {
                                  field.onChange(numValue);
                                }
                              }
                            }}
                            min="2"
                            max="100"
                            className="w-16 text-center border-none bg-transparent text-base font-medium focus:ring-0 focus:border-none px-0"
                          />
                          <span className="text-base font-medium text-foreground">명</span>
                        </div>
                        
                        {/* 모바일 친화적 슬라이더 */}
                        <div className="space-y-3">
                          <Slider
                            value={[[2, 4, 5, 8, 10].indexOf(field.value)]}
                            onValueChange={([newValue]) => {
                              const values = [2, 4, 5, 8, 10];
                              const selectedValue = values[newValue];
                              field.onChange(selectedValue);
                            }}
                            max={4}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-sm font-medium text-muted-foreground">
                            <span>2</span>
                            <span>4</span>
                            <span>5</span>
                            <span>8</span>
                            <span>10</span>
                          </div>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 내용 위 구분선 */}
              <div className="border-t border-border"></div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="pb-2">
                        <RichTextEditor 
                          content={field.value} 
                          onChange={field.onChange} 
                          showToolbar={false}
                          placeholder="내용"
                          mobileStyle={true}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 내용 아래 구분선 */}
              <div className="border-t border-border"></div>

              <FormField
                control={form.control}
                name="participants"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MobileParticipantManager
                        participants={field.value || []}
                        onChange={field.onChange}
                        maxParticipants={form.watch('maxParticipants')}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 하단 여백 제거 (이미 pb-24로 충분한 공간 확보) */}
            </form>
          </Form>
        </div>
      </div>

      {/* 나가기 확인 모달 */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                작성을 취소하시겠습니까?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                작성 중인 내용이 삭제됩니다.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelExit}
                  className="flex-1"
                >
                  계속 작성
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmExit}
                  className="flex-1 bg-danger hover:bg-danger-hover text-white"
                >
                  나가기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
