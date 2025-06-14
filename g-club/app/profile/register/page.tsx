'use client';

import { useState } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg, resizeImage } from '@/lib/cropImage';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// 크롭 영역 인터페이스 정의
interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ProfileRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 크기 제한 (예: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지는 5MB 이하로 업로드해 주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_: unknown, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };
  
  const showCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;
    
    try {
      // 1. 이미지 크롭
      const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
      // 2. 이미지 리사이즈 (500x500 이하로 축소)
      const resizedImageBlob = await resizeImage(croppedImageBlob, 500, 500);
      
      // Blob을 Base64 문자열로 변환
      const reader = new FileReader();
      reader.readAsDataURL(resizedImageBlob);
      reader.onloadend = () => {
        setCroppedImage(reader.result as string);
      };
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
      
      // 이미지가 크롭되지 않았다면 크롭 처리
      if (!croppedImage && image && croppedAreaPixels) {
        await showCroppedImage();
      }
      
      // 서버에 데이터 전송
      const formData = new FormData();
      formData.append('name', name);
      formData.append('birthDate', birthDate);
      
      // 크롭된 이미지가 있으면 사용, 없으면 기본 이미지 사용
      if (croppedImage) {
        formData.append('profileImage', croppedImage);
      }
      
      const res = await fetch('/api/profile', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">프로필 등록</h1>
          <p className="text-gray-600 mt-2">기본 정보를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 이름 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">성명(본명)</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 생년월일 */}
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">생년월일</label>
            <input
              type="date"
              id="birthDate"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 프로필 이미지 업로드 */}
          <div>
            <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700">프로필 사진</label>
            <input
              type="file"
              id="profileImage"
              accept="image/*"
              onChange={handleImageUpload}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {image && !croppedImage && (
            <div className="flex justify-center">
              <div className="register-img-area">
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <button 
                type="button" 
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onClick={showCroppedImage}
              >
                이미지 자르기
              </button>
            </div>
          )}
          
          {croppedImage && (
            <div className="flex justify-center">
              <img src={croppedImage} alt="프로필 미리보기" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200" />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '등록 중...' : '등록'}
          </button>
        </form>
      </div>
    </div>
  );
}
