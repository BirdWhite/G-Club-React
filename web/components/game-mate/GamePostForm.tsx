'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Game, GamePost } from '@/types/models';
import { GameSearchSelect } from '@/components/ui/game-search-select';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { JsonValue } from '@prisma/client/runtime/library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TimePicker } from '@/components/ui/time-picker';
import { ParticipantManager } from '@/components/game-mate/ParticipantManager';
import type { Participant } from './ParticipantManager';
import { useProfile } from '@/contexts/ProfileProvider';
import { useEffect } from 'react';

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
    const contentArray = (value as { content: any[] }).content;
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
  })).default([]),
});

type GamePostFormData = z.infer<typeof formSchema>;

interface GamePostFormProps {
  games: Game[];
  initialData?: GamePost;
}

export function GamePostForm({ games, initialData }: GamePostFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const { profile } = useProfile();

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
      // 편집 모드: 기존 참여자 목록 사용
      return initialData.participants.map(p => ({
        name: p.participantType === 'GUEST' ? (p.guestName || '') : (p.user?.name || ''),
        userId: p.participantType === 'GUEST' ? '' : (p.user?.userId || ''),
        note: p.participantType === 'GUEST' ? '게스트 참여자' : ''
      }));
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
    resolver: zodResolver(formSchema) as any,
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
    } catch (error: any) {
      toast.error(error.message);
    }
  };




    return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
        <FormField
          control={form.control as any}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목</FormLabel>
              <FormControl>
                <Input 
                  placeholder="파티원을 구하는 목적을 명확하게 보여주세요." 
                  className="bg-input border-border focus:bg-input"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control as any}
            name="gameId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>게임</FormLabel>
                <FormControl>
                  <GameSearchSelect
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="maxParticipants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>최대 인원</FormLabel>
                <FormControl>
                  <div className="space-y-4">
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
                      className="bg-input border-border focus:bg-input"
                    />
                    
                    {/* 슬라이더 */}
                    <div className="space-y-2">
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
                      <div className="flex justify-between text-xs text-muted-foreground">
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control as any}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>시작 날짜</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal bg-input border-border hover:bg-accent"
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ko })
                        ) : (
                          <span>날짜를 선택하세요</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>시작 시간</FormLabel>
                <FormControl>
                  <TimePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="시간을 선택하세요"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control as any}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>내용</FormLabel>
              <FormControl>
                <RichTextEditor 
                  content={field.value} 
                  onChange={field.onChange} 
                  showToolbar={false}
                  placeholder="내용을 입력하세요."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="participants"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ParticipantManager
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

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : (isEditMode ? '수정하기' : '작성하기')}
          </Button>
        </div>
      </form>
    </Form>
  );
} 