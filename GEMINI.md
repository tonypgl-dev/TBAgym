# GBuddy Instructions

## Context
A workout app for 3 users (friends) to share routines and track progress in real-time.

## Tech Stack Guidelines
- **Framework:** Next.js.
- **Database:** Supabase (Realtime enabled).
- **Styling:** Prefer Vanilla CSS. No Tailwind unless specifically requested.
- **AI:** Use LLMs (Claude/Gemini) for parsing raw text workout plans into structured JSON.
- **Media:** Use ExerciseDB (RapidAPI) for exercise GIFs and muscle group metadata.

## Workflow Conventions
1. **Research First:** Always check existing components in `components/` and state in `hooks/`.
2. **Surgical Edits:** Use `replace` tool for precision.
3. **Validation:** Ensure mobile-first responsiveness for gym use.

## Feature Logic
- **Parsing:** Text -> LLM -> JSON -> DB.
- **Real-time:** Use Supabase subscriptions for cross-user state.
- **Hierarchy:** Workout -> Exercises -> Sets (Checkboxes).
