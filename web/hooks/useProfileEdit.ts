import { useEffect, useState } from 'react';
import { getCroppedImg, resizeImage, CropArea, getImageDimensions } from '@/lib/cropImage';
import { useProfileForm } from './useProfileForm';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// 이전 프로필 이미지 URL을 저장할 인터페이스
interface ProfileData {
  imageUrl?: string;
  fullName: string;
  birthDate: string;
}

export const useProfileEdit = () => {
  const supabase = createClient();
  const router = useRouter();
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [session, setSession] = useState<any>(null);
  
  // 사용자 정보 가져오기
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setSession({ user });
      } catch (error) {
        console.error('사용자 정보를 가져오는 중 오류 발생:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    getUser();
  }, []);
  
  const profileForm = useProfileForm();
  const {
    name,
    setName,
    birthDate,
    setBirthDate,
    image,
    setImage,
    croppedAreaPixels,
    setCroppedAreaPixels,
    croppedImage,
    setCroppedImage,
    isLoading,
    setIsLoading,
    handleImageUpload: profileHandleImageUpload,
    onCropComplete: profileOnCropComplete
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
      const onCropComplete = (croppedArea: any, croppedAreaPixels: CropArea) => {
        setCroppedAreaPixels(croppedAreaPixels);
      };
      
      // 2. 이미지 크롭
      const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
      
      // 3. 이미지를 정확히 512x512로 리사이즈
      const resizedImageBlob = await resizeImage(croppedImageBlob, 512, 512);
      
      // 4. 리사이즈된 이미지 저장
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setCroppedImage(null);
      setCroppedAreaPixels(null);

    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setName(value);

    } else if (name === 'birthDate') {
      setBirthDate(value);

    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !birthDate) {
      alert('이름과 생년월일을 입력해 주세요.');
      return;
    }
    
    try {
      setIsLoading(true);
      // 저장 시 변경사항 없음으로 표시
      
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
      
      // 4. 프로필 업데이트 API 호출 - FormData 사용
      const formData = new FormData();
      formData.append('fullName', name);
      formData.append('birthDate', birthDate);
      
      // 이미지가 있는 경우에만 추가
      if (imageToSend) {
        // Blob을 WebP File 객체로 변환
        const file = new File([imageToSend], 'profile.webp', { type: 'image/webp' });
        formData.append('image', file);
      }
      
      const updateResponse = await fetch('/api/profile', {
        method: 'PUT',
        body: formData,
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || '프로필 업데이트에 실패했습니다.');
      }
      
      // 프로필 업데이트 이벤트 발생 - Header 컴포넌트에서 감지하여 프로필 데이터 새로고침
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
      // 프로필 페이지로 리다이렉트
      router.push('/profile');
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
    handleSubmit,
    session,
  };
};

export default useProfileEdit;
