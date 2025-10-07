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
    <div className="bg-background">
      {/* 모바일 헤더 - 카드 바깥에 배치 */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
        >
          {isLoading ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="px-4 py-6">
        <div className="max-w-sm mx-auto bg-card rounded-lg border border-border p-6">
          {/* 설명 텍스트 */}
          <div className="text-center mb-6">
            <p className="text-muted-foreground text-sm">기본 정보를 수정해주세요</p>
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

        </form>
        </div>
      </div>
    </div>
  );
}
