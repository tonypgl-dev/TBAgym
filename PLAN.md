# GBuddy - Project Roadmap & Strategy

## Project Vision
A real-time, social workout tracking app for 3 friends, featuring AI-powered workout parsing and visual exercise guidance.

## Core Features
- [ ] **AI Workout Parser:** Paste raw text from LLMs/notes and convert it into interactive cards.
- [ ] **Real-time Sync:** See friends' progress instantly (exercises completed, current set).
- [ ] **Social Features:** Copy routines from friends, edit in real-time.
- [ ] **Exercise Library (GIFs):** Integration with ExerciseDB (RapidAPI) for automated visual guidance.
- [ ] **History & Persistence:** Daily logs stored in Supabase.
- [ ] **PWA / Mobile First:** Large touch-friendly UI for gym usage.

## Technical Stack
- **Framework:** Next.js (TypeScript)
- **Backend/DB:** Supabase (Auth, PostgreSQL, Realtime)
- **AI Parsing:** Claude Haiku / Gemini 1.5 Flash
- **Media:** ExerciseDB API (GIFs)
- **Styling:** Vanilla CSS (per user preference)

## Future Features (v2)
- [ ] **Muscle Map SVG:** Interactive visual representation of muscle fatigue/engagement.
- [ ] **Rest Timer:** Automatic countdown between sets.
- [ ] **Progressive Overload Tracking:** Automatic weight suggestions based on history.

## Implementation Phases
1. **Phase 1: Infrastructure** - Setup Supabase, DB schemas, and Auth.
2. **Phase 2: The Parser** - Implement LLM API to turn text into JSON.
3. **Phase 3: Workout UI** - Build the interactive cards and real-time state.
4. **Phase 4: Media Integration** - Connect to ExerciseDB for GIFs.
5. **Phase 5: Social & Polish** - Multi-user views and final UI adjustments.
