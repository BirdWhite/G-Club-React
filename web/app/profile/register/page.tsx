'use client';

import { useProfileRegister } from '@/hooks/useProfileRegister';
import { ProfileFormLayout } from '@/components/profile/ProfileFormLayout';
import { ProfileFormFields } from '@/components/profile/ProfileFormFields';
import { ProfileImageUpload } from '@/components/profile/ProfileImageUpload';
import { ImageCropper } from '@/components/common/ImageCropper';

export default function ProfileRegisterPage() {
  const {
    name,
    setName,
    birthDate,
    setBirthDate,
    image,
    crop,
    setCrop,
    zoom,
    setZoom,
    croppedAreaPixels,
    croppedImage,
    isLoading,
    handleImageUpload,
    onCropComplete,
    handleCropImage,
    handleSubmit,
  } = useProfileRegister();

  const shouldRenderImageCropper = image && !croppedImage;

  return (
    <ProfileFormLayout 
      title="프로필 등록" 
      subtitle="기본 정보를 입력해주세요"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <ProfileFormFields
          name={name}
          setName={setName}
          birthDate={birthDate}
          setBirthDate={setBirthDate}
        />

        <ProfileImageUpload
          image={image}
          croppedImage={croppedImage}
          onImageUpload={handleImageUpload}
          showCurrentImage={false}
        />

        {shouldRenderImageCropper && (
          <ImageCropper
            image={image}
            crop={crop}
            setCrop={setCrop}
            zoom={zoom}
            setZoom={setZoom}
            onCropComplete={onCropComplete}
            onCropImage={handleCropImage}
            className="register-img-area"
          />
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '등록 중...' : '등록'}
        </button>
      </form>
    </ProfileFormLayout>
  );
}
