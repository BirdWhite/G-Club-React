'use client';

import { useProfileEdit } from '@/hooks';
import { 
  LoadingSpinner, 
  ProfileFormLayout, 
  ProfileFormFields, 
  ProfileImageUpload, 
  ImageCropper 
} from '@/components';

export default function ProfileEditPage() {
  const {
    name,
    setName,
    birthDate,
    setBirthDate,
    image,
    currentImage,
    crop,
    setCrop,
    zoom,
    setZoom,
    croppedImage,
    isLoading,
    isLoadingProfile,
    handleImageUpload,
    onCropComplete,
    handleCropImage,
    handleSubmit,
    router,
  } = useProfileEdit();

  const shouldRenderImageCropper = image && !croppedImage;

  if (isLoadingProfile) {
    return <LoadingSpinner />;
  }

  return (
    <ProfileFormLayout 
      title="프로필 수정" 
      subtitle="기본 정보를 수정해주세요"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 이름과 생년월일 입력 필드 */}
        <ProfileFormFields
          name={name}
          setName={setName}
          birthDate={birthDate}
          setBirthDate={setBirthDate}
        />

        {/* 프로필 이미지 업로드 및 미리보기 */}
        <ProfileImageUpload
          image={image}
          croppedImage={croppedImage}
          currentImage={currentImage}
          onImageUpload={handleImageUpload}
          showCurrentImage={true}
        />

        {/* 이미지가 업로드되었지만 아직 크롭되지 않은 경우 크롭 인터페이스 표시 */}
        {shouldRenderImageCropper && (
          <div>
            <ImageCropper
              image={image}
              crop={crop}
              setCrop={setCrop}
              zoom={zoom}
              setZoom={setZoom}
              onCropComplete={onCropComplete}
              onCropImage={handleCropImage}
              className="edit-img-area"
            />
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </ProfileFormLayout>
  );
}
