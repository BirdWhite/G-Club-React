import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCroppedImg, CropArea } from '@/lib/cropImage';

/**
 * 프로필 폼 상태 관리 타입 정의
 */
export interface ProfileFormState {
  name: string;
  birthDate: string;
  image: string | null;
  croppedImage: Blob | null;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: CropArea | null;
  isLoading: boolean;
}

/**
 * 프로필 폼 유효성 검사 에러 타입
 */
export interface ProfileFormErrors {
  name?: string;
  birthDate?: string;
  image?: string;
}

/**
 * Blob을 base64 문자열로 변환하는 유틸리티 함수
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * 프로필 폼 훅
 * 
 * 프로필 폼 데이터와 유효성 검사 에러를 관리하는 훅입니다.
 * 이미지 업로드, 크롭, 폼 데이터 관리 기능을 제공합니다.
 */
export const useProfileForm = () => {
  // 폼 상태 관리
  const [name, setName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<Blob | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  /**
   * 이미지 업로드 핸들러
   * @param e 파일 입력 이벤트
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      console.log('파일이 선택되지 않았습니다.');
      return;
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    try {
      const imageUrl = URL.createObjectURL(file);
      console.log('이미지 업로드 완료:', imageUrl);
      
      setImage(imageUrl);
      
      // 크롭 관련 상태 초기화
      resetCropStates();
      
      console.log('이미지 업로드 및 상태 초기화 완료');
    } catch (error) {
      console.error('이미지 업로드 중 오류 발생:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  /**
   * 크롭 관련 상태 초기화
   */
  const resetCropStates = () => {
    setCroppedImage(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  /**
   * 크롭 완료 핸들러
   * @param croppedArea 표시용 크롭 영역 (사용하지 않음)
   * @param croppedAreaPixels 실제 픽셀 크롭 영역
   */
  const onCropComplete = (
    croppedArea: any,
    croppedAreaPixels: CropArea
  ) => {
    console.log('크롭 완료:', { croppedArea, croppedAreaPixels });
    setCroppedAreaPixels(croppedAreaPixels);
  };

  /**
   * 이미지 크롭 핸들러
   */
  const handleCropImage = async () => {
    if (!image || !croppedAreaPixels) {
      console.warn('이미지 또는 크롭 영역이 없습니다.');
      return;
    }

    try {
      console.log('이미지 크롭 시작...');
      const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
      setCroppedImage(croppedImageBlob);
      console.log('이미지 크롭 완료');
    } catch (error) {
      console.error('이미지 크롭 중 오류 발생:', error);
      alert('이미지 크롭 중 오류가 발생했습니다.');
    }
  };

  /**
   * 폼 유효성 검사
   * @returns 유효성 검사 결과와 에러 메시지
   */
  const validateForm = (): { isValid: boolean; errors: ProfileFormErrors } => {
    const errors: ProfileFormErrors = {};

    if (!name.trim()) {
      errors.name = '이름을 입력해주세요.';
    } else if (name.trim().length < 2) {
      errors.name = '이름은 2글자 이상 입력해주세요.';
    }

    if (!birthDate) {
      errors.birthDate = '생년월일을 입력해주세요.';
    } else {
      const birth = new Date(birthDate);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear();
      
      if (age < 1 || age > 150) {
        errors.birthDate = '올바른 생년월일을 입력해주세요.';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  /**
   * 폼 초기화
   */
  const resetForm = () => {
    setName('');
    setBirthDate('');
    setImage(null);
    resetCropStates();
    setIsLoading(false);
  };

  return {
    // State
    name,
    setName,
    birthDate,
    setBirthDate,
    image,
    setImage,
    crop,
    setCrop,
    zoom,
    setZoom,
    croppedAreaPixels,
    setCroppedAreaPixels,
    croppedImage,
    setCroppedImage,
    isLoading,
    setIsLoading,
    router,
    
    // Handlers
    handleImageUpload,
    onCropComplete,
    handleCropImage,
    resetForm,
    
    // Utilities
    blobToBase64,
    validateForm,
  };
};
