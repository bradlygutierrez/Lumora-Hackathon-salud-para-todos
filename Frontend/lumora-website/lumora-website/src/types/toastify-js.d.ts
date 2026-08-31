declare module 'toastify-js' {
  interface ToastOptions { text: string; duration?: number; gravity?: 'top' | 'bottom'; position?: 'left' | 'center' | 'right'; className?: string; close?: boolean }
  interface Toast { showToast(): Toast }
  function Toastify(options: ToastOptions): Toast
  export default Toastify
}
