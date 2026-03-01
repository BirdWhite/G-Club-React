import { useEffect, useState } from 'react';
import { getCroppedImg, resizeImage, getImageDimensions } from '@/lib/utils/image';
import { useProfileForm } from './useProfileForm';
import { createClient } from '@/lib/database/supabase';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileProvider'; // 1. useProfile 훅 임포트

type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// 이전 프로필 이미지 URL을 저장할 인터페이스
interface ProfileData {
  imageUrl?: string;
  fullName: string;
  birthDate: string;
}

export const useProfileEdit = () => {
  const supabase = createClient();
  const router = useRouter();
  const { profile, isLoading: profileLoading, refetchProfile } = useProfile(); // ProfileProvider에서 프로필 데이터 가져오기
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



  // 프로필 정보 불러오기 - ProfileProvider의 데이터 사용
  useEffect(() => {
    if (profile && !profileLoading) {
      // ProfileProvider에서 가져온 프로필 데이터 사용
      const userName = profile.name || '';
      setName(userName);
      
      // 날짜 형식 변환 (YYYY-MM-DD)
      if (profile.birthDate) {
        const date = new Date(profile.birthDate);
        const formattedDate = date.toISOString().split('T')[0];
        setBirthDate(formattedDate);
      }
      
      // 프로필 이미지 설정 (카카오 기본 프로필 포함)
      if (profile.image) {
        setCurrentImage(profile.image);
      }
      
      setIsLoadingProfile(false);
    }
  }, [profile, profileLoading, setName, setBirthDate]);

  const showCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;
    
    try {
      // 1. 이미지 크롭
      const onCropComplete = (croppedArea: { x: number; y: number; width: number; height: number }, croppedAreaPixels: CropArea) => {
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



  const uploadImageToServer = async (file: Blob): Promise<string | null> => {
    try {
      const formData = new FormData();
      // WebP 형식으로 변환된 이미지 파일을 FormData에 추가
      const webpFile = new File([file], 'profile.webp', { type: 'image/webp' });
      formData.append('file', webpFile);
      
      console.log('이미지 업로드 요청 보내는 중...');
      // API 엔드포인트 호출
      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('이미지 업로드 오류:', response.status, errorText);
        return null;
      }

      // 이미지 업로드가 성공하면 프로필 업데이트는 자동으로 처리됨
      // 프로필 새로고침을 위해 이벤트 발생
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
      // 현재 시간을 쿼리 파라미터로 추가하여 캐시 방지
      return `profile-images/${Date.now()}.webp`;
    } catch (error) {
      console.error('이미지 업로드 중 오류 발생:', error);
      return null;
    }
  };

  // 이전 이미지 삭제는 불필요 (같은 이름으로 덮어쓰기 때문에)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !birthDate) {
      alert('이름과 생년월일을 입력해 주세요.');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('프로필 업데이트 시작...');
      
      let imageToSend = croppedImage;
      
      // 이미지가 업로드되었지만 크롭되지 않은 경우 크롭 처리
      if (image && !croppedImage) {
        console.log('이미지가 업로드되었지만 크롭되지 않아 자동 크롭 처리 중...');
        let cropArea: CropArea;
        
        if (croppedAreaPixels) {
          // 사용자가 크롭 영역을 설정한 경우
          cropArea = croppedAreaPixels;
          console.log('사용자 정의 크롭 영역 사용:', cropArea);
        } else {
          // 크롭 영역이 없으면 전체 이미지를 크롭 영역으로 사용
          console.log('자동 크롭 영역 계산 중...');
          const dimensions = await getImageDimensions(image);
          cropArea = {
            x: 0,
            y: 0,
            width: dimensions.width,
            height: dimensions.height,
          };
          console.log('자동 크롭 영역 설정:', cropArea);
        }
        
        try {
          // 1. 이미지 크롭
          console.log('이미지 크롭 중...');
          const croppedImageBlob = await getCroppedImg(image, cropArea);
          
          // 2. 이미지를 정확히 512x512로 리사이즈
          console.log('이미지 리사이즈 중...');
          const resizedImageBlob = await resizeImage(croppedImageBlob, 512, 512);
          
          // 3. 리사이즈된 이미지 사용
          imageToSend = resizedImageBlob;
          setCroppedImage(resizedImageBlob);
          console.log('이미지 크롭 및 리사이즈 완료');
        } catch (cropError) {
          console.error('이미지 처리 중 오류 발생:', cropError);
          throw new Error('이미지 처리 중 오류가 발생했습니다.');
        }
      }
      
      // 이미지를 서버에 업로드
      if (imageToSend) {
        console.log('이미지 서버에 업로드 중...');
        try {
          // 새 이미지 업로드 (WebP 형식으로 변환하여 업로드)
          const uploadSuccess = await uploadImageToServer(imageToSend);
          
          if (!uploadSuccess) {
            console.error('이미지 업로드 실패');
            throw new Error('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
          }
          
          console.log('이미지 업로드 성공');
          
          // 이미지 업로드 후 프로필 업데이트 이벤트가 발생하므로 여기서는 추가 작업이 필요 없음
        } catch (uploadError) {
          console.error('이미지 업로드 중 오류 발생:', uploadError);
          throw new Error('이미지 업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
      }
      
      // 이름과 생년월일만 업데이트 (이미지는 이미 업로드 시 자동으로 업데이트됨)
      console.log('프로필 정보 업데이트 API 호출...');
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name, // API는 name 필드를 기대하므로 fullName 대신 name 사용
          birthDate,
          // 이미지는 이미 업로드되었으므로 여기서는 보내지 않음
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('프로필 업데이트 실패:', response.status, errorText);
        let errorMessage = '프로필 업데이트에 실패했습니다.';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('프로필 정보 업데이트 성공');
      
      // 3. 커스텀 이벤트를 삭제하고 refetchProfile 호출
      await refetchProfile();
      
      // 프로필 페이지로 리다이렉트
      router.push('/profile');
    } catch (error) {
      console.error('프로필 수정 중 오류 발생:', error);
      alert(error instanceof Error ? error.message : '프로필 수정 중 오류가 발생했습니다.');
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
