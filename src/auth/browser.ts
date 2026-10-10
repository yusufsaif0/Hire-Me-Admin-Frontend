export function csrfCookie(): string {
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('admin_csrf='));
  try {
    return value ? decodeURIComponent(value.slice('admin_csrf='.length)) : '';
  } catch {
    return '';
  }
}
