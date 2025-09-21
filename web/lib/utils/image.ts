/**
 * 이미지 크롭 및 리사이즈 유틸리티
 * 
 * 이 모듈은 이미지 크롭, 리사이즈 기능을 제공합니다.
 * - 이미지 URL에서 HTMLImageElement 생성
 * - 지정된 영역으로 이미지 크롭
 * - 이미지 크기 조정
 */

// 타입 정의
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// 상수 정의
const DEFAULT_IMAGE_QUALITY = 0.85;  // WebP 기본 품질 85%
const DEFAULT_IMAGE_FORMAT = 'image/webp';  // 기본 형식을 WebP로 변경

/**
 * URL에서 HTMLImageElement를 생성하는 함수
 * @param url 이미지 URL
 * @returns Promise<HTMLImageElement>
 */
async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => {
      reject(new Error(`이미지 로드 실패: ${error}`));
    });
    
    // CORS 이슈 방지
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

/**
 * Canvas 2D 컨텍스트를 안전하게 가져오는 함수
 * @param canvas HTMLCanvasElement
 * @returns CanvasRenderingContext2D
 * @throws Canvas 2D 컨텍스트를 지원하지 않는 경우 에러
 */
function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D 컨텍스트를 지원하지 않습니다.');
  }
  return ctx;
}

/**
 * Canvas를 Blob으로 변환하는 함수
 * @param canvas HTMLCanvasElement
 * @param format 이미지 포맷 (기본값: 'image/jpeg')
 * @param quality 이미지 품질 (기본값: 0.9)
 * @returns Promise<Blob>
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string = DEFAULT_IMAGE_FORMAT,
  quality: number = DEFAULT_IMAGE_QUALITY
): Promise<Blob> {
  // 항상 WebP 형식으로 강제 설정
  format = 'image/webp';
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Blob 생성에 실패했습니다.'));
          return;
        }
        resolve(blob);
      }, format, quality);
    } catch (error) {
      reject(new Error(`Canvas to Blob 변환 실패: ${error}`));
    }
  });
}

/**
 * 이미지 URL에서 이미지 크기를 구하는 함수
 * @param imageSrc 이미지 URL
 * @returns Promise<ImageDimensions> 이미지 크기 정보
 */
export async function getImageDimensions(imageSrc: string): Promise<ImageDimensions> {
  try {
    const image = await createImage(imageSrc);
    return {
      width: image.width,
      height: image.height
    };
  } catch (error) {
    throw new Error(`이미지 크기 정보 가져오기 실패: ${error}`);
  }
}

/**
 * 이미지를 지정된 영역으로 크롭하고 WebP 형식으로 변환하는 함수
 * @param imageSrc 원본 이미지 URL
 * @param pixelCrop 크롭할 영역 정보
 * @returns Promise<Blob> WebP 형식으로 변환된 크롭된 이미지 Blob
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea
): Promise<Blob> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = getCanvasContext(canvas);

    // 원본 이미지가 512x512보다 작으면 원본 크기 유지, 크면 512x512로 리사이즈
    const maxSize = 512;
    let targetWidth = pixelCrop.width;
    let targetHeight = pixelCrop.height;
    
    // 가로 또는 세로 중 더 긴 쪽이 maxSize를 초과하면 비율에 맞게 조정
    if (pixelCrop.width > maxSize || pixelCrop.height > maxSize) {
      const ratio = Math.min(maxSize / pixelCrop.width, maxSize / pixelCrop.height);
      targetWidth = Math.round(pixelCrop.width * ratio);
      targetHeight = Math.round(pixelCrop.height * ratio);
    }
    
    // 캔버스 크기 설정
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // 이미지 크롭 및 필요시 리사이즈하여 그리기
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return await canvasToBlob(canvas);
  } catch (error) {
    throw new Error(`이미지 크롭 실패: ${error}`);
  }
}

/**
 * 이미지를 정확히 지정된 크기(512x512)로 리사이즈하는 함수
 * @param imageBlob 원본 이미지 Blob
 * @param width 원하는 너비 (기본값: 512)
 * @param height 원하는 높이 (기본값: 512)
 * @returns Promise<Blob> WebP 형식으로 변환된 지정된 크기의 이미지 Blob
 */
export async function resizeImage(
  imageBlob: Blob,
  width: number = 512,  // 기본값 512로 설정
  height: number = 512  // 기본값 512로 설정
): Promise<Blob> {
  try {
    const imageUrl = URL.createObjectURL(imageBlob);
    const image = await createImage(imageUrl);
    
    // 메모리 누수 방지를 위해 URL 해제
    URL.revokeObjectURL(imageUrl);
    
    const canvas = document.createElement('canvas');
    const ctx = getCanvasContext(canvas);

    // 캔버스 크기를 정확히 지정된 크기로 설정
    canvas.width = width;
    canvas.height = height;

    // 이미지를 정확히 지정된 크기로 그리기 (비율 무시)
    ctx.drawImage(image, 0, 0, width, height);

    return await canvasToBlob(canvas);
  } catch (error) {
    throw new Error(`이미지 리사이즈 실패: ${error}`);
  }
}

/**
 * 비율을 유지하며 최대 크기 내에서 새로운 크기를 계산하는 함수
 * @param original 원본 이미지 크기
 * @param max 최대 허용 크기
 * @returns ImageDimensions 계산된 새로운 크기
 */
function calculateResizeDimensions(
  original: ImageDimensions,
  max: ImageDimensions
): ImageDimensions {
  let { width, height } = original;

  // 최대 크기를 초과하는 경우에만 리사이즈
  if (width > max.width || height > max.height) {
    const ratio = Math.min(max.width / width, max.height / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  return { width, height };
}
