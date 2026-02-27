import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '내 프로필 | Ultimate',
  description: '내 프로필을 확인하고 관리하세요.',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full">
      <div className="flex flex-col items-center px-8 sm:px-10 lg:px-12 py-6 md:py-8">
        <div className="w-full max-w-4xl">
        {children}
        </div>
      </div>
    </div>
  );
}
