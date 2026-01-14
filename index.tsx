
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Bắt lỗi toàn cục để hiển thị nếu app bị trắng trang
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global Error Caught:", message, error);
  const root = document.getElementById('root');
  if (root && root.innerHTML === "") {
    root.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h3>Lỗi khởi động hệ thống</h3>
      <p>${message}</p>
      <small>Vui lòng kiểm tra Console (F12) để biết chi tiết.</small>
    </div>`;
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
