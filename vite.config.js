// 开发服务仅绑定本机；React plugin 提供 JSX 转换和热更新，本原型没有 API proxy。
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
