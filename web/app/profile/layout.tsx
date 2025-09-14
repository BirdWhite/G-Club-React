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
    <div className="bg-cyber-black-200 h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
