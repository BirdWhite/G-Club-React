'use client';

import { useProfileEdit } from '@/hooks/useProfileEdit';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ProfileFormFields } from '@/components/profile/ProfileFormFields';
import { ProfileImageUpload } from '@/components/profile/ProfileImageUpload';
import { ImageCropper } from '@/components/common/ImageCropper';

export function ProfileEditForm() {
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
    <div className="h-full bg-background pb-[calc(4rem+max(1rem,env(safe-area-inset-bottom)))] md:pb-8 overflow-y-auto">
      {/* 📱 모바일 상단 헤더 - 모바일에서만 노출 */}
      <div className="flex md:hidden items-center justify-between px-4 py-4 border-b border-border bg-card">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
        >
          취소
        </button>
        <h1 className="text-base font-bold text-foreground">프로필 수정</h1>
        <button
          type="submit"
          disabled={isLoading}
          className="text-primary hover:text-primary/80 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
        >
          {isLoading ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="px-4 py-6 md:py-12">
        <div className="max-w-md mx-auto bg-card rounded-lg border border-border p-6 shadow-md md:shadow-lg">
          {/* 💻 데스크톱 타이틀 영역 */}
          <div className="hidden md:block text-center mb-6">
            <h1 className="text-3xl font-bold text-foreground">프로필 수정</h1>
            <p className="text-muted-foreground text-sm mt-2">기본 정보를 수정해주세요</p>
          </div>

          {/* 📱 모바일 설명 텍스트 */}
          <div className="block md:hidden text-center mb-6">
            <p className="text-muted-foreground text-sm">기본 정보를 수정해주세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
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

            {/* 💻 데스크톱 하단 저장/취소 버튼 */}
            <div className="hidden md:flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 py-3 px-6 transition-colors font-medium border border-border rounded-md bg-secondary text-secondary-foreground hover:bg-muted"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 rounded-md transition-colors font-medium"
              >
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
