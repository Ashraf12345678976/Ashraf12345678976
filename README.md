# Lingua — AI Language Tutor

A mobile app for learning a new language with an AI tutor, similar to conversation-first
apps like Speak/10-Minute Tutor. Built with Expo (React Native + TypeScript) on the
frontend and a small Node/Express backend that proxies requests to the Claude API.

## Features

- **Conversational chat practice** — free-form chat with an AI tutor in your target
  language, with gentle grammar corrections and English translations.
- **Structured lessons** — bite-sized multiple-choice, fill-in-the-blank, and translation
  exercises with XP and streak tracking.
- **Pronunciation practice** — listen to a native reading (text-to-speech), record
  yourself, and get an AI-scored pronunciation assessment with tips.
- **Flashcards with spaced repetition** — AI-generated vocabulary decks reviewed with an
  SM-2 spaced-repetition scheduler, stored locally on-device.
- **Onboarding & profile** — pick your target language and proficiency, track XP/streak.

## Project structure

```
backend/   Express server that proxies Claude API calls (keeps the API key off-device)
mobile/    Expo React Native app (TypeScript)
```

## Backend setup

```bash
cd backend
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm install
npm run dev             # starts on http://localhost:4000
```

Endpoints:

- `POST /api/chat` — conversational tutor turn
- `GET /api/lessons?language=Spanish` — list lessons for a language
- `GET /api/lessons/:id` — a single lesson with exercises
- `POST /api/pronunciation` — score a pronunciation attempt
- `POST /api/flashcards/generate` — generate a flashcard deck for a topic

## Mobile app setup

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android), or press `i`/`a` for a simulator.

By default the app talks to `http://localhost:4000`. When running on a physical device,
update `extra.apiBaseUrl` in `mobile/app.json` to your machine's LAN IP (e.g.
`http://192.168.1.23:4000`) since `localhost` on the phone refers to the phone itself.

## Notes on pronunciation practice

Expo Go doesn't ship a bundled speech-to-text engine. The Speak tab records audio and
plays a native TTS reference, then asks you to type what you said so the AI tutor can
score it — this keeps the whole feature usable without extra native modules or a paid
STT API. Swapping in real on-device speech recognition (e.g. a config-plugin-based
library) is a drop-in replacement for that one step.

## Tech stack

- **Mobile**: Expo, React Navigation (bottom tabs + native stack), AsyncStorage,
  expo-av (recording), expo-speech (TTS)
- **Backend**: Express, `@anthropic-ai/sdk`
- **AI**: Claude API for chat replies/corrections, pronunciation scoring, and
  flashcard generation
