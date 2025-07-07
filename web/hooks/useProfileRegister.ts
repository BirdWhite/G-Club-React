import { useState } from 'react';
import { getCroppedImg, resizeImage, CropArea, getImageDimensions } from '@/lib/cropImage';
import { useProfileForm, ProfileFormErrors } from './useProfileForm';
import { useRouter } from 'next/navigation';

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
      
      // 서버에 데이터 전송
      const requestBody = {
        name,
        birthDate,
        profileImage: null as string | null
      };
      
      // 크롭된 이미지를 base64로 변환
      if (imageToSend) {
        console.log('크롭된 이미지를 base64로 변환 중...');
        const base64Image = await blobToBase64(imageToSend);
        requestBody.profileImage = base64Image;
        console.log('base64 변환 완료');
      }
      
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (res.ok) {
        // 프로필 업데이트 이벤트 발생 - Header 컴포넌트에서 감지하여 프로필 데이터 새로고침
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        
        router.push('/');
      } else {
        const errorData = await res.json();
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
