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
const DEFAULT_IMAGE_QUALITY = 0.9;
const DEFAULT_IMAGE_FORMAT = 'image/jpeg';

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
 * 이미지를 지정된 영역으로 크롭하는 함수
 * @param imageSrc 원본 이미지 URL
 * @param pixelCrop 크롭할 영역 정보
 * @returns Promise<Blob> 크롭된 이미지 Blob
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea
): Promise<Blob> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = getCanvasContext(canvas);

    // 캔버스 크기 설정
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // 이미지 크롭하여 그리기
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return await canvasToBlob(canvas);
  } catch (error) {
    throw new Error(`이미지 크롭 실패: ${error}`);
  }
}

/**
 * 이미지 크기를 최대 크기 내에서 비율을 유지하며 조정하는 함수
 * @param imageBlob 원본 이미지 Blob
 * @param maxWidth 최대 너비
 * @param maxHeight 최대 높이
 * @returns Promise<Blob> 리사이즈된 이미지 Blob
 */
export async function resizeImage(
  imageBlob: Blob,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  try {
    const imageUrl = URL.createObjectURL(imageBlob);
    const image = await createImage(imageUrl);
    
    // 메모리 누수 방지를 위해 URL 해제
    URL.revokeObjectURL(imageUrl);
    
    const canvas = document.createElement('canvas');
    const ctx = getCanvasContext(canvas);

    // 비율 유지하며 크기 계산
    const dimensions = calculateResizeDimensions(
      { width: image.width, height: image.height },
      { width: maxWidth, height: maxHeight }
    );

    // 캔버스 크기 설정
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // 이미지 리사이즈하여 그리기
    ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);

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
