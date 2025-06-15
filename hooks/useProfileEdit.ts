import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getCroppedImg, resizeImage, CropArea, getImageDimensions } from '@/lib/cropImage';
import { useProfileForm } from './useProfileForm';

export const useProfileEdit = () => {
  const { data: session } = useSession();
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const profileForm = useProfileForm();
  const {
    name,
    setName,
    birthDate,
    setBirthDate,
    image,
    croppedAreaPixels,
    croppedImage,
    setCroppedImage,
    isLoading,
    setIsLoading,
    router
  } = profileForm;

  // 프로필 정보 불러오기
  useEffect(() => {
    if (session?.user) {
      fetchProfileData();
    }
  }, [session]);

  const fetchProfileData = async () => {
    try {
      setIsLoadingProfile(true);
      const res = await fetch('/api/profile');
      
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setName(data.profile.fullName);
          // 날짜 형식 변환 (YYYY-MM-DD)
          const date = new Date(data.profile.birthDate);
          const formattedDate = date.toISOString().split('T')[0];
          setBirthDate(formattedDate);
          setCurrentImage(data.profile.profileImage);
        }
      }
    } catch (error) {
      console.error('프로필 정보 불러오기 실패:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const showCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;
    
    try {
      // 1. 이미지 크롭
      const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
      // 2. 이미지 리사이즈 (500x500 이하로 축소)
      const resizedImageBlob = await resizeImage(croppedImageBlob, 500, 500);
      
      // Blob을 직접 상태에 저장
      setCroppedImage(resizedImageBlob);
    } catch (error) {
      console.error('이미지 크롭 중 오류 발생:', error);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !birthDate) {
      alert('이름과 생년월일을 입력해 주세요.');
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
        
        const croppedImageBlob = await getCroppedImg(image, cropArea);
        const resizedImageBlob = await resizeImage(croppedImageBlob, 500, 500);
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
        alert('프로필이 성공적으로 수정되었습니다.');
        
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
    currentImage,
    isLoadingProfile,
    showCroppedImage,
    handleSubmit,
  };
};
