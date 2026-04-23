export function normalizeForSearch(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .replace(/[đĐ]/g, 'd') // thay đ -> d
    .replace(/[^a-zA-Z0-9\s]/g, '') // bỏ ký tự đặc biệt, giữ khoảng trắng
    .toLowerCase()
    .trim();
}
