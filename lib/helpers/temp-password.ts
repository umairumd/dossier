export function generateTempPassword(): string {
  // Format: Dossier@XXXX (4 random digits)
  // Memorable, typeable on mobile, meets complexity:
  // uppercase D, lowercase letters, @, 4 digits
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Dossier@${digits}`;
}
