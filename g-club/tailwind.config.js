/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'g-background': '#333446',  // 배경색
        'g-text': '#7F8CAA',        // 텍스트 색상
        'g-primary': '#333446',     // 주요 색상 
        'g-primary-hover': '#3D3E55', // 호버 시 색상
        'g-border': '#B8CFCE',      // 테두리 색상
        'g-input-focus': '#EAEFEF', // 입력 필드 포커스 색상
      },
      spacing: {
        'profile-padding': '1.5rem',
        'profile-gap': '1rem',
        'profile-margin': '1.5rem',
      },
      borderRadius: {
        'profile': '0.5rem',
      },
      boxShadow: {
        'profile': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'profile-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
