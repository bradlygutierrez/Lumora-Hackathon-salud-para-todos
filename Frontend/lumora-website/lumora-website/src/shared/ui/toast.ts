export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export function showToast(message: string, kind: ToastKind = 'info'): void {
  let stack = document.querySelector<HTMLDivElement>('[data-toast-stack]')
  if (!stack) {
    stack = document.createElement('div')
    stack.dataset.toastStack = ''
    stack.className = 'toast-stack'
    document.body.append(stack)
  }

  const toast = document.createElement('div')
  toast.className = `portal-toast portal-toast--${kind}`
  toast.setAttribute('role', 'status')
  toast.textContent = message
  stack.append(toast)

  window.setTimeout(() => toast.remove(), 4800)
}
