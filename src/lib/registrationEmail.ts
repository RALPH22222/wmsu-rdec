export function isWmsuEmail(email: string): boolean {
  return /^[^\s@]+@wmsu\.edu\.ph$/i.test(email.trim());
}
