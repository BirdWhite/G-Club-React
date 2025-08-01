import Image from 'next/image';

interface ProfileImageUploadProps {
  image: string | null;
  croppedImage: Blob | null;
  currentImage?: string | null;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showCurrentImage?: boolean;
}

export const ProfileImageUpload = ({ 
  image, 
  croppedImage, 
  currentImage, 
  onImageUpload, 
  showCurrentImage = true 
}: ProfileImageUploadProps) => {
  return (
    <div>
      {/* 프로필 이미지 업로드 섹션 라벨 */}
      <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700 mb-2">
        프로필 사진
      </label>
      
      {/* 파일 업로드 입력 필드 */}
      <input
        type="file"
        id="profileImage"
        accept="image/*"
        onChange={onImageUpload}
        className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {/* 이미지 미리보기 영역 */}
      <div className="flex justify-center space-x-4">
        {/* 기존 프로필 이미지 표시 (편집 페이지에서만) */}
        {showCurrentImage && currentImage && !image && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">현재 프로필</p>
            <Image 
              src={currentImage} 
              alt="현재 프로필" 
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" 
            />
          </div>
        )}

        {/* 크롭된 이미지 미리보기 */}
        {croppedImage && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">새 프로필</p>
            <Image 
              src={URL.createObjectURL(croppedImage)} 
              alt="프로필 미리보기" 
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover border-2 border-green-200" 
            />
          </div>
        )}
      </div>
    </div>
  );
};
