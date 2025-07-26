'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Game, GamePost } from '@/types/models';
import GameSearchSelect from '@/components/GameSearchSelect';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { JsonValue } from '@prisma/client/runtime/library';

const formSchema = z.object({
  title: z.string().min(2, '제목은 2자 이상 입력해주세요.').max(100, '제목은 100자를 초과할 수 없습니다.'),
  gameId: z.string().min(1, '게임을 선택해주세요.'),
  maxParticipants: z.number().min(2, '최소 2명 이상이어야 합니다.').max(100, '최대 100명까지 가능합니다.'),
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
});

type GamePostFormData = z.infer<typeof formSchema>;

interface GamePostFormProps {
  games: Game[];
  initialData?: GamePost;
}

export default function GamePostForm({ games, initialData }: GamePostFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<GamePostFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      gameId: initialData?.gameId || '',
      maxParticipants: initialData?.maxParticipants || 4,
      startTime: initialData?.startTime ? new Date(initialData.startTime).toISOString().slice(0, 16) : '',
      content: initialData?.content || { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  });

  const { handleSubmit, control, formState: { isSubmitting, errors } } = form;

  const onSubmit = async (data: GamePostFormData) => {
    try {
      const url = isEditMode ? `/api/game-posts/${initialData.id}` : '/api/game-posts';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

  const commonInputStyles = "block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const commonButtonStyles = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
  const primaryButtonStyles = "text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500";
  const secondaryButtonStyles = "text-gray-700 bg-white hover:bg-gray-50 border-gray-300";


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">제목</label>
        <Controller
          name="title"
          control={control}
          render={({ field }) => <input id="title" placeholder="파티원을 구하는 목적을 명확하게 보여주세요." {...field} className={commonInputStyles} />}
        />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
            <label htmlFor="gameId" className="block text-sm font-medium text-gray-700 mb-1">게임</label>
            <Controller
                name="gameId"
                control={control}
                render={({ field }) => (
                    <GameSearchSelect
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            {errors.gameId && <p className="text-red-500 text-sm mt-1">{errors.gameId.message}</p>}
        </div>
        <div>
            <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-1">최대 인원</label>
            <Controller
                name="maxParticipants"
                control={control}
                render={({ field }) => (
                    <input 
                        id="maxParticipants" 
                        type="number" 
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))}
                        className={commonInputStyles} 
                    />
                )}
            />
            {errors.maxParticipants && <p className="text-red-500 text-sm mt-1">{errors.maxParticipants.message}</p>}
        </div>
      </div>
      
      <div>
        <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
        <Controller
          name="startTime"
          control={control}
          render={({ field }) => <input id="startTime" type="datetime-local" {...field} className={commonInputStyles} />}
        />
        {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
        <Controller
          name="content"
          control={control}
          render={({ field }) => <RichTextEditor content={field.value} onChange={field.onChange} />}
        />
        {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
      </div>

      <div className="flex justify-end space-x-4">
        <button type="button" onClick={() => router.back()} className={`${commonButtonStyles} ${secondaryButtonStyles}`}>
          취소
        </button>
        <button type="submit" disabled={isSubmitting} className={`${commonButtonStyles} ${primaryButtonStyles} disabled:opacity-50`}>
          {isSubmitting ? '저장 중...' : (isEditMode ? '수정하기' : '작성하기')}
        </button>
      </div>
    </form>
  );
} 