interface KakaoLink {
  webUrl?: string;
  mobileWebUrl?: string;
  androidExecutionParams?: string;
  iosExecutionParams?: string;
}

interface KakaoContent {
  title: string;
  imageUrl: string;
  link: KakaoLink;
  description?: string;
  imageWidth?: number;
  imageHeight?: number;
}

interface KakaoSocial {
  likeCount?: number;
  commentCount?: number;
  sharedCount?: number;
  viewCount?: number;
  subscriberCount?: number;
}

interface KakaoButton {
  title: string;
  link: KakaoLink;
}

interface KakaoFeedSettings {
  objectType: 'feed';
  content: KakaoContent;
  social?: KakaoSocial;
  buttons?: KakaoButton[];
  buttonTitle?: string;
}

interface KakaoShareNamespace {
  sendDefault(settings: KakaoFeedSettings): void;
}

interface KakaoStatic {
  init(appKey: string): void;
  isInitialized(): boolean;
  cleanup(): void;
  Share: KakaoShareNamespace;
}

interface Window {
  Kakao?: KakaoStatic;
}
