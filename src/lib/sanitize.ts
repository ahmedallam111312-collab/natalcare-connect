export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeFirestorePath(path: string): string {
  if (!path) return '';
  return path.replace(/[\/\.\0]/g, '');
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function truncateInput(input: string, maxLength: number): string {
  if (!input) return '';
  return input.length > maxLength ? input.substring(0, maxLength) : input;
}

export function sanitizeChatMessage(message: string): string {
  const truncated = truncateInput(message, 2000);
  return sanitizeHtml(truncated);
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}
