/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string | undefined
  readonly VITE_FIREBASE_AUTH_DOMAIN: string | undefined
  readonly VITE_FIREBASE_PROJECT_ID: string | undefined
  readonly VITE_FIREBASE_STORAGE_BUCKET: string | undefined
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string | undefined
  readonly VITE_FIREBASE_APP_ID: string | undefined
  readonly VITE_GOOGLE_TRANSLATE_API_KEY: string | undefined
  readonly VITE_CLAUDE_API_KEY: string | undefined
  readonly VITE_HOSPITAL_API_URL: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
