import { useState } from 'react';
import { getCroppedImg, resizeImage, CropArea, getImageDimensions } from '@/lib/cropImage';
import { useProfileForm, ProfileFormErrors } from './useProfileForm';

export const useProfileRegister = () => {
  const profileForm = useProfileForm();
  const {
    name,
    birthDate,
    image,
    crop,
    setCrop,
    zoom,
    setZoom,
    croppedAreaPixels,
    croppedImage,
    setCroppedImage,
    router,
    handleImageUpload,
    onCropComplete,
    handleCropImage,
  } = profileForm;

  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({});

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      profileForm.setName(value);
    } else if (name === 'birthDate') {
      profileForm.setBirthDate(value);
    }
  };

  const handleCropComplete = (croppedArea: any, croppedAreaPixels: CropArea) => {
    profileForm.onCropComplete(croppedArea, croppedAreaPixels);
  };

  const showCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;
    
    try {
      // 1. 이미지 크롭
      const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
      
      // 2. 이미지를 정확히 512x512로 리사이즈
      const resizedImageBlob = await resizeImage(croppedImageBlob, 512, 512);
      
      // 3. 리사이즈된 이미지 저장
      setCroppedImage(resizedImageBlob);
 // 크롭된 이미지가 변경되었을 때 변경사항 있음으로 표시
    } catch (error) {
      console.error('이미지 크롭 중 오류 발생:', error);
    }
  };

  const uploadImageToServer = async (file: Blob): Promise<string | null> => {
    try {
      const formData = new FormData();
      // WebP 형식으로 변환된 이미지 파일을 FormData에 추가
      const webpFile = new File([file], 'profile.webp', { type: 'image/webp' });
      formData.append('file', webpFile);
      
      // API 엔드포인트 호출
      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('이미지 업로드 오류:', errorData);
        return null;
      }

      const { imageUrl } = await response.json();
      return imageUrl;
    } catch (error) {
      console.error('이미지 업로드 중 오류 발생:', error);
      return null;
    }
  };

  const deletePreviousImage = async (imageUrl: string): Promise<boolean> => {
    if (!imageUrl) return true;
    
    try {
      const response = await fetch(`/api/upload/profile-image?url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('이미지 삭제 오류:', errorData.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('이미지 삭제 중 오류 발생:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !birthDate) {
      alert('이름과 생년월일을 입력해 주세요.');
      return;
    }

    if (!croppedImage && !image) {
      alert('프로필 사진을 업로드해 주세요.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      let imageToSend = croppedImage;
      
      // 이미지가 업로드되었지만 크롭되지 않은 경우 크롭 처리
      if (image && !croppedImage) {
        let cropArea: CropArea;
        
        if (croppedAreaPixels) {
          // 사용자가 크롭 영역을 설정한 경우
          cropArea = croppedAreaPixels;
        } else {
          // 크롭 영역이 없으면 전체 이미지를 크롭 영역으로 사용
          const dimensions = await getImageDimensions(image);
          cropArea = {
            x: 0,
            y: 0,
            width: dimensions.width,
            height: dimensions.height,
          };
        }
        
        // 1. 이미지 크롭
        const croppedImageBlob = await getCroppedImg(image, cropArea);
        
        // 2. 이미지를 정확히 512x512로 리사이즈
        const resizedImageBlob = await resizeImage(croppedImageBlob, 512, 512);
        
        // 3. 리사이즈된 이미지 사용
        imageToSend = resizedImageBlob;
        setCroppedImage(resizedImageBlob);
      }
      
      // 이미지를 서버에 업로드하고 URL 가져오기
      let imageUrl = null;
      if (imageToSend) {
        // 이전 이미지가 있으면 삭제
        if (profileForm.image) {
          await deletePreviousImage(profileForm.image);
        }
        
        // 새 이미지 업로드
        imageUrl = await uploadImageToServer(imageToSend);
        
        if (!imageUrl) {
          alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
          setIsLoading(false);
          return;
        }
      }
      
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          birthDate,
          image: imageUrl, // Supabase URL 전송
        }),
      });
      
      if (response.ok) {
        // 프로필 업데이트 이벤트 발생 - Header 컴포넌트에서 감지하여 프로필 데이터 새로고침
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        
        router.push('/');
      } else {
        const errorData = await response.json();
        alert(`오류 발생: ${errorData.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('프로필 저장 중 오류 발생:', error);
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ...profileForm,
    showCroppedImage,
    handleSubmit,
  };
};
