export type User = {
  id: string;
  email: string;
  role: 'ADMIN' | 'REGULAR';
  languagePreference: string;
  themePreference: string;
}
