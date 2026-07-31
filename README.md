# Prepcore Mobile App

This workspace contains the Prepcore Expo + TypeScript mobile app, aligned with the current website and shared Supabase database.

## What is included

- Expo router file-based navigation
- Supabase client setup with AsyncStorage support
- Google OAuth sign-in placeholder
- Onboarding wizard with 4 steps
- Dashboard, Practice, Mock Exam, Progress, Flashcards, Profile tabs
- Upgrade, Quiz, Leaderboard, and Results placeholder pages
- Tailwind / NativeWind styling
- TypeScript configuration

## Next steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Update `app.json` with your Supabase and Google config:

   - `supabaseUrl`
   - `supabaseAnonKey`
   - `googleClientId`

3. Start the app:

   ```bash
   npm run start
   ```

4. Open it on your device/emulator with Expo.

## Notes

- The app exports a mobile-first UI skeleton for Prepcore.
- Real backend integration depends on your Supabase tables being available.
- Replace the placeholder icons and splash assets with the official Prepcore branding.
