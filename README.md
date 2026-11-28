# Sahaaya — Voice-First Digital Accessibility Assistant

**Tagline:** *Your Voice. Your Phone. Your Freedom.*

Sahaaya is a multilingual, voice-first digital accessibility web prototype designed for elderly users and people in India who find conventional smartphone navigation and typing difficult. It demonstrates how natural spoken instructions in **English**, **Hindi (हिन्दी)**, and **Kannada (ಕನ್ನಡ)** can guide everyday smartphone tasks, interactive demonstrations, and accessible form filling without requiring external paid APIs or LLM keys.

---

## 1. Hackathon Context & Submission Overview

- **Event:** India Runs on Voice Hackathon
- **Project Name:** Sahaaya
- **Core Objective:** Provide a calm, dignified, voice-first conversational layer over everyday smartphone workflows and public-service form completion, with transparent safety confirmations and strict honesty between browser capabilities and simulated demonstrations.
- **Runtime Cost & Dependency Guarantee:** **Zero paid APIs, zero Gemini/LLM runtime API calls, zero API keys required.** All intent recognition, conversation state management, math evaluation, calendar storage, and speech session control run deterministically in the browser.

---

## 2. Implementation Honesty Matrix

To ensure complete transparency during hackathon evaluation, every capability is categorized accurately below:

### A. Implemented & Verified in Browser / Deterministic Code
- **Continuous Voice Conversation Controller** (`src/utils/speechSessionController.ts`): Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) + `SpeechSynthesis` with automatic mic-resume after TTS, echo-guard teardown during speaking, unexpected-stop recovery, permission/network/unsupported-browser detection, and **Normal / Slower Speech** rate toggle (`0.92` vs `0.74`).
- **Multilingual UI & NLU** (`src/i18n/translations.ts`, `src/utils/commandIntentEngine.ts`): English (`en-IN`), Hindi (`hi-IN`), and Kannada (`kn-IN`) command parsing, task follow-ups, and spoken/visual responses.
- **Conversation & Task State-Machine Arbiter** (`src/utils/conversationTaskManager.ts`): Deterministic handling of `idle`, `listening`, `processing`, `needs_info`, `awaiting_confirmation`, `executing`, `completed`, `cancelled`, and `error` states, plus clean task switching, abandonment/cancellation, contextual follow-ups (`"Give me the link"`, `"Open the second video"`, `"Show directions"`), generic continuation handling (`"Continue with the browser supported task"`), and strict isolation between general commands and welfare form capture.
- **Deterministic Calculator Engine** (`src/utils/calculatorEngine.ts`): Safe recursive-descent arithmetic parser supporting spoken and symbolic math (`+`, `-`, `*`, `/`, percentages, division-by-zero handling) with **no `eval()` or `new Function()`**.
- **Local Calendar Storage Engine** (`src/utils/calendarEngine.ts`): `localStorage`-backed event store (`sahaaya_demo_calendar_events_v1`) supporting relative dates (`today`, `tomorrow`, weekdays), month-day dates (`"30th November"`, `"नवंबर 30"`, `"ನವೆಂಬರ್ 30"`), numeric `DD/MM`, multi-turn `date` → `time` → `title` slot filling, plus add, inline edit, and delete.
- **Real Browser Mode Execution** (`src/utils/platformExecutor.ts`): Opens official websites (`YouTube`, `Google`, `Google Maps`, `WhatsApp Web`, `Spotify Web`) in a new browser tab after explicit confirmation, prepares prefilled `https://wa.me/?text=...` drafts (never auto-sent), and requests `navigator.geolocation` only after user confirmation.
- **Senior Citizen Welfare Application** (`src/utils/applicationLogic.ts`, `src/screens/ApplicationFormScreen.tsx`, `src/screens/ReviewScreen.tsx`, `src/screens/SuccessScreen.tsx`): 9-field validated form starting empty (`0/9`), readback confirmation, letter-by-letter name spelling pad, validation, receipt download, and explicit simulation disclaimer.
- **Automated Test Suite** (`tests/sahaaya.test.ts`): **123/123 scenarios verified** via `npx tsx tests/sahaaya.test.ts`.

### B. Simulated Locally (Interactive Demo Mode)
- **Simulated Smartphone Home Screen & 11 Apps** (`src/components/DemoDeviceScreen.tsx`, `src/utils/demoAppRegistry.ts`, `src/utils/demoExecutionEngine.ts`):
  1. **WhatsApp**: Contact list, contact selection, animated typing, simulated Sent badge (clearly labelled: *no real WhatsApp message sent*).
  2. **YouTube**: Animated search bar, example result selection, simulated video player with play/pause & elapsed timer, plus official YouTube search link.
  3. **Google Chrome**: Address bar animation and selectable demonstration search results, plus real Google Search link.
  4. **Google Maps**: Location permission check (uses real permitted browser coordinates if granted, or clearly labelled example demonstration cards if unavailable), plus real Maps / Directions links.
  5. **Spotify**: Animated search and simulated track preview player (clearly labelled: *simulated preview only — no real streaming API*), plus official Spotify Web link.
  6. **Calculator**: Interactive keypad, voice-computed results, and calculation history.
  7. **Calendar**: Monthly grid navigation, date selection, voice scheduling, and inline event add/edit/delete stored only in browser `localStorage` (*no real device calendar or alarm created*).
  8. **Phone**: Interactive dialer keypad and simulated call state (*no real phone call placed*).
  9. **Messages (SMS)**: Simulated inbox and local outgoing demo message preview (*no real SMS sent*).
  10. **Camera**: Simulated viewfinder and demo shutter toggle (*real device camera is not accessed*).
  11. **Settings**: Simulated toggles (Wi-Fi, Display Text Size, Voice Volume) (*actual device settings are not modified*).
- **Welfare Application Submission**: Generates a local demo confirmation number (`SAH-YYYY-XXXXXX`) and downloadable `.txt` receipt; **not** connected to any government portal.

### C. Future Native Android Integration (Not Yet Implemented in Web Prototype)
- Launching and controlling installed third-party Android apps natively via Android Intents and `AccessibilityService`.
- Sending real WhatsApp/SMS messages, placing real cellular calls, or creating native Android Calendar alarms/events.
- System-wide screen reading outside the Sahaaya web view.

### D. Containerization Status
- **Docker Files Prepared & Audited** (`Dockerfile`, `docker-compose.yml`, `nginx.conf`, `.dockerignore`): Multi-stage Node 20 build → Nginx 1.27 Alpine serving `/dist` on port `3000` with `HEALTHCHECK`.
- **Runtime Verification Status:** **Not runtime-tested in this build environment** because the `docker` CLI is not installed inside the AI Studio container. Run `docker compose up --build` on a host with Docker installed to verify container startup locally.

---

## 3. Architecture & Directory Structure

```text
.
├── Dockerfile                  # Multi-stage Vite build + Nginx 1.27 Alpine + HEALTHCHECK
├── docker-compose.yml          # Port 3000:3000 mapping, restart: unless-stopped
├── nginx.conf                  # SPA history fallback & static asset caching on port 3000
├── index.html                  # Document title & metadata synced with metadata.json
├── metadata.json               # App identity & browser permission declarations
├── package.json                # React 19, Vite 8, TypeScript, Tailwind CSS v4, Lucide icons
├── src/
│   ├── App.tsx                 # Top-level state, mode switching, voice/text turn routing
│   ├── main.tsx                # Application entry point
│   ├── index.css               # Tailwind CSS v4 & Warm Sand / Deep Plum design tokens
│   ├── i18n/
│   │   └── translations.ts     # Complete EN / HI / KN strings & field prompts
│   ├── types/
│   │   ├── sahaaya.ts          # Core task, field, capability, and speech types
│   │   └── demoExecution.ts    # 11-app simulator & demo session state types
│   ├── hooks/
│   │   └── useSpeechAssistant.ts # React bridge for SpeechSessionController & permissions
│   ├── components/
│   │   ├── TopBar.tsx          # Navigation bar, language selector & A/A+/A++ scaling
│   │   ├── ExecutionModeToggle.tsx # Interactive Demo Mode vs Real Browser Mode switcher
│   │   ├── SahaayaVoiceOrb.tsx # Animated voice orb (idle/listening/processing/executing/speaking/error)
│   │   ├── DemoExecutionPanel.tsx  # Live step progress, confirm/cancel controls & links
│   │   ├── DemoDeviceScreen.tsx    # Interactive 11-app simulated smartphone frame
│   │   ├── SahaayaLogo.tsx     # Brand mark
│   │   ├── LanguageSelector.tsx # EN / HI / KN selector
│   │   └── TextScaleToggle.tsx # Live A / A+ / A++ typography scaling
│   ├── screens/
│   │   ├── WelcomeScreen.tsx
│   │   ├── VoiceAssistantScreen.tsx # Voice orb, transcript, Slower Speech, simulator & form progress
│   │   ├── ApplicationFormScreen.tsx
│   │   ├── ReviewScreen.tsx
│   │   └── SuccessScreen.tsx
│   └── utils/
│       ├── speechSessionController.ts # Echo-safe Web Speech state machine + rate control
│       ├── commandIntentEngine.ts     # Multilingual deterministic NLU & slot-filling
│       ├── conversationTaskManager.ts # Context arbiter, cancellation, follow-ups & guards
│       ├── platformCapabilities.ts    # Browser/OS/speech/geolocation capability detection
│       ├── platformExecutor.ts        # Safe Real Browser execution & permission checks
│       ├── demoAppRegistry.ts         # Metadata & sample data builders for 11 demo apps
│       ├── demoExecutionEngine.ts     # Simulator timelines, confirmation prompts & execution
│       ├── calculatorEngine.ts        # Deterministic math expression parser (no eval)
│       ├── calendarEngine.ts          # Date/time parser & localStorage event CRUD
│       └── applicationLogic.ts        # Welfare field parsing, validation & letter spelling
└── tests/
    └── sahaaya.test.ts         # 123 automated unit & multi-turn integration scenarios
```

---

## 4. Visual & Accessibility Design

- **Color System:** Deep Plum (`#493451`), Dusty Lavender (`#A995C8`), Warm Sand (`#F7F1E8`), Soft Ivory (`#FFFCF7`), Dark Charcoal (`#302B33`), Muted Terracotta (`#D98570`), Muted Teal (`#648F83`).
- **Accessibility Controls:**
  - **A / A+ / A++** global text scaling (`16px`, `19px`, `22px` root scale).
  - **Slower Speech (`धीमी आवाज़` / `ನಿಧಾನ ಧ್ವನಿ`)** toggle reducing `SpeechSynthesisUtterance.rate` from `0.92` to `0.74`.
  - **Large Touch Targets (`≥ 44px–48px`)**, keyboard focus navigation, ARIA live regions for transcripts/replies, and non-color-only status labels.
  - **Always-Available Text Input Fallback** when microphone access is denied, offline, or unsupported.
  - **Readback + Spelling Pad** for personal names, mobile numbers, dates of birth, and annual income.

---

## 5. Voice Conversation Lifecycle & Mode Behavior

1. **Interactive Demo Mode (Default):** Visibly animates smartphone app workflows inside the simulator bezel while speaking responses, collecting missing details (`"Schedule a meeting on 30th November"` → `"10 AM."` → `"Project presentation."`), and confirming sensitive actions (WhatsApp messages, YouTube searches, Maps searches).
2. **Real Browser Mode:** Uses real browser tabs, real official web links (`YouTube`, `Google`, `Google Maps`, `WhatsApp Web`, `Spotify Web`), and real `navigator.geolocation` (only after confirmation). Native-only features (`Camera`, `Settings`, `Phone`, `Calendar`, `Calculator`) honestly explain browser limitations and suggest switching to Interactive Demo Mode rather than pretending to access device hardware.
3. **Strict Form Isolation:** Welfare form field extraction only runs when `conversationMode === 'welfare_form'` (explicitly opened or requested by the user). Corrections or casual utterances after Maps, YouTube, Calculator, or Calendar tasks never hijack into the Welfare Application.

---

## 6. Browser, HTTPS & Speech Compatibility Notes

- **Supported Browsers:** Chrome and Edge (desktop and Android) provide the fullest Web Speech `SpeechRecognition` + `SpeechSynthesis` support; Safari supports `SpeechSynthesis` and partial speech input depending on OS version.
- **Secure Context Requirement:** Web browsers only enable microphone capture (`SpeechRecognition`) and `navigator.geolocation` on `http://localhost` or `https://` origins. Accessing via `http://0.0.0.0:3000` or an unencrypted LAN IP disables mic/location permissions cleanly, falling back to text input.
- **Regional Voice Packs:** `en-IN`, `hi-IN`, and `kn-IN` voices depend on voices installed in the user's OS/browser. When a regional voice pack is absent, Sahaaya alerts the user gently and continues working via visible text transcripts and fallback speech.

---

## 7. Getting Started (Local Development & Verification)

### Prerequisites
- **Node.js 20+** and **npm**
- No API keys or `.env` configuration required to run the core application.

### Install & Run Dev Server
```bash
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Type Check, Production Build & Test Suite
```bash
# TypeScript type check
npm run lint

# Run all 123 automated unit & integration tests
npx tsx tests/sahaaya.test.ts

# Build optimized production bundle into dist/
npm run build
```

---

## 8. Running with Docker / Docker Compose (Clean Clone Quickstart)

Someone cloning this repository requires **no `.env` file**, **no API keys**, and **no manual `npm install` or `npm run build`** on the host machine:

```bash
git clone <repository-url>
cd <repository-folder>
docker compose up
```

Docker builds the multi-stage Vite production bundle inside the container (`node:20-alpine` → `nginx:1.27-alpine`) and serves the application on **`http://localhost:3000`** (use `localhost` rather than `0.0.0.0` so browser microphone and geolocation APIs treat it as a secure context).

> **Verification Note:** Docker files are configured and audited, but `docker compose up` has **not** been runtime-executed inside the AI Studio build container because the `docker` CLI is unavailable in that environment.

---

## 9. Roadmap Toward Native Android Accessibility

To evolve Sahaaya from this browser prototype into a native Android voice accessibility assistant:
1. Build an Android Kotlin/Jetpack Compose host wrapping the deterministic NLU/state-machine logic alongside native `AccessibilityService` permissions (user-granted, foreground-only, revocable anytime).
2. Replace simulated app actions with scoped Android `Intent`s (`ACTION_VIEW`, `ACTION_DIAL`, `CalendarContract`, `AlarmClock`) gated behind Sahaaya's existing confirmation layer.
3. Keep all local privacy guarantees: explicit spoken confirmation before sending messages, placing calls, or modifying device state, with offline/low-connectivity speech fallbacks.
