import Cropper from 'react-easy-crop';
import { CropArea } from '@/lib/utils/image';
import { useEffect } from 'react';

/**
 * 이미지 크롭 컴포넌트의 속성 타입 정의
 */
interface ImageCropperProps {
  /**
   * 크롭할 이미지 URL
   */
  image: string;
  /**
   * 현재 크롭 영역 좌표
   */
  crop: { x: number; y: number };
  /**
   * 크롭 영역 좌표를 설정하는 함수
   */
  setCrop: (crop: { x: number; y: number }) => void;
  /**
   * 현재 줌 수준
   */
  zoom: number;
  /**
   * 줌 수준을 설정하는 함수
   */
  setZoom: (zoom: number) => void;
  /**
   * 크롭이 완료되었을 때 호출되는 함수
   */
  onCropComplete: (croppedArea: unknown, croppedAreaPixels: CropArea) => void;
  /**
   * 이미지 자르기 버튼을 클릭했을 때 호출되는 함수
   */
  onCropImage: () => void;
  /**
   * 컴포넌트의 클래스 이름
   */
  className?: string;
}

/**
 * 이미지 크롭 컴포넌트
 */
export const ImageCropper = ({
  image,
  crop,
  setCrop,
  zoom,
  setZoom,
  onCropComplete,
  onCropImage,
  className = "h-96"
}: ImageCropperProps) => {
  console.log('ImageCropper 렌더링됨 - image:', image);
  console.log('ImageCropper props:', { 
    imageExists: !!image, 
    crop, 
    zoom, 
    className,
    hasOnCropComplete: !!onCropComplete,
    hasOnCropImage: !!onCropImage
  });

  useEffect(() => {
    console.log('ImageCropper mounted with image:', !!image);
  }, []);

  useEffect(() => {
    console.log('ImageCropper image changed:', !!image);
  }, [image]);

  if (!image) {
    console.log('ImageCropper: No image provided');
    return <div>이미지가 없습니다.</div>;
  }

  try {
    return (
      <div className="space-y-4">
        {/* 이미지 크롭 영역 - 사용자가 이미지를 원하는 크기로 자를 수 있는 인터페이스 */}
        <div 
          className={`relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 ${className}`}
          style={{ 
            height: '400px', 
            minHeight: '400px',
            width: '100%',
            position: 'relative'
          }}
        >
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1} // 1:1 비율로 정사각형 크롭
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                position: 'relative',
                backgroundColor: '#f3f4f6'
              },
              mediaStyle: {
                width: 'auto',
                height: 'auto'
              },
              cropAreaStyle: {
                border: '2px solid #3b82f6',
                borderRadius: '8px'
              }
            }}
          />
        </div>

        {/* 이미지 자르기 버튼 */}
        <button 
          type="button" 
          onClick={() => {
            console.log('이미지 자르기 버튼 클릭됨');
            console.log('onCropImage 함수:', typeof onCropImage);
            onCropImage();
          }}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          이미지 자르기
        </button>
      </div>
    );
  } catch (error) {
    console.error('ImageCropper 렌더링 에러:', error);
    return <div>이미지 크롭 컴포넌트 로딩 중 오류가 발생했습니다.</div>;
  }
};
