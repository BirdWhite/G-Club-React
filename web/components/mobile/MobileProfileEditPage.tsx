'use client';

import { useProfileEdit } from '@/hooks/useProfileEdit';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ProfileFormFields } from '@/components/profile/ProfileFormFields';
import { ProfileImageUpload } from '@/components/profile/ProfileImageUpload';
import { ImageCropper } from '@/components/common/ImageCropper';

export function MobileProfileEditPage() {
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
    <div className="min-h-screen bg-cyber-black-200 py-6 px-4">
      <div className="max-w-sm mx-auto bg-cyber-black-100 rounded-lg border border-cyber-black-300 p-6">
        {/* 모바일용 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-cyber-gray">프로필 수정</h1>
          <p className="text-cyber-darkgray mt-2 text-sm">기본 정보를 수정해주세요</p>
        </div>

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

          {/* 저장 버튼 - 모바일에서는 세로 배치 */}
          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3"
            >
              {isLoading ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full bg-cyber-black-100 text-cyber-gray py-3 px-4 rounded-md hover:bg-cyber-black-200 transition-colors border border-cyber-black-300 hover:border-cyber-gray"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
