import './globals.css';

export const metadata = {
  title: 'T12 圖片更新工具',
  description: 'T12 BMU 吊船閉合文件 - 圖片更新工具',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}