type PostStatus = 'OPEN' | 'CLOSED' | 'COMPLETED';

interface ActionButtonsProps {
  isAuthor: boolean;
  isParticipating: boolean;
  isFull: boolean;
  loading: boolean;
  status: PostStatus;
  onSubmit: () => void;
  onToggleStatus: () => void;
}

export default function ActionButtons({
  isAuthor,
  isParticipating,
  isFull,
  loading,
  status,
  onSubmit,
  onToggleStatus
}: ActionButtonsProps) {
  if (isAuthor) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-end space-x-4">
          <button
            onClick={onToggleStatus}
            disabled={loading}
            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
              status !== 'OPEN' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50`}
          >
            {loading ? '처리 중...' : status !== 'OPEN' ? '모집 재개하기' : '모집 마감하기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-end">
        <button
          onClick={onSubmit}
          disabled={loading || (isFull && !isParticipating)}
          className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
            isParticipating 
              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
              : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 ${(loading || (isFull && !isParticipating)) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            '처리 중...'
          ) : isParticipating ? (
            '참여 취소하기'
          ) : isFull ? (
            '모집이 마감되었습니다'
          ) : (
            '참여하기'
          )}
        </button>
      </div>
    </div>
  );
}
