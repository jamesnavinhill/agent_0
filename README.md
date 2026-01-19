
  ___   _____ _____ _   _ _____     ___
 / _ \ / ____| ____| \ | |_   _|   / _ \
| |_| | |  __| |__ |  \| | | |    | | | |
|  _  | | |_ |  __|| . ` | | |    | | | |
| | | | |__| | |___| |\  | | |    | |_| |
|_| |_|\_____|_____|_| \_| |_|     \___/

# Agent Zero

> __Bringing the UI shell online with a living, autonomous AI agent.__

Agent Zero is a next-generation AI agent framework designed to feel alive. It features a reactive UI breathing with the agent's state, autonomous tasks, and deep integration with Google's Gemini 2.0 models.

## Features

- __Living UI__: The agent "breathes" and reacts visually to its internal state (thinking, creating, idle).
- __Autonomous capabilities__: Can schedule and execute tasks without constant user input.
- __Creation Pipeline__: Generates images (Imagen 3), code, and potentially music/video purely through conversation.
- __Persistent Memory__: Remembers past interactions and context.
- __Browser Tools__: Capable of interacting with external web tools (e.g., v0.app, producer.ai).

## Tech Stack

- __Framework__: Next.js 15 (App Router)
- __Styling__: TailwindCSS + Shadcn UI
- __AI__: Google Gemini API (@google/genai)
- __State Management__: Zustand
- __Package Manager__: pnpm (recommended) or npm/yarn

## Getting Started

1. __Clone the repository__:

   ```bash
   git clone https://github.com/jamesnavinhill/agent_0.git
   cd agent_0
   ```

2. __Install dependencies__:

   ```bash
   npm install
   # or
   pnpm install
   ```

3. __Configure Environment__:
   Copy the example environment file:

   ```bash
   cp .env.local.example .env.local
   ```

   Add your Google API Key to `.env.local`:

   ```env
   GOOGLE_API_KEY=your_key_here
   ```

4. __Run Development Server__:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the agent in action.

## Project Structure

- `app/`: Next.js app router pages and API routes.
- `components/`: UI components (agent orb, panels, shadcn ui).
- `lib/api/`: Wrappers for Gemini, Imagen, and other AI services.
- `lib/memory/`: Memory management systems.
- `lib/scheduler/`: Autonomous task scheduling.

## License

MIT
