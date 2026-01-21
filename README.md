<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Nebula Beats - Neural Music Interface

A high-performance 3D music visualizer using Three.js with 100,000 particles, Gemini AI sculpting, and live voice conversation.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1qZAuCX4CZ2xTvsBAU-fD1YrtHe3168hT

## Features

- 🎨 **100,000 Particle System**: Real-time 3D particle visualization with 150+ shape variations
- 🎵 **Music Reactivity**: Audio analysis with frequency-based coloring and dynamics
- 🤖 **AI Integration**: Google Gemini API for particle shape generation from text prompts
- 🎙️ **Voice Interaction**: Live voice conversation using Gemini 2.5 Flash Native Audio
- 👆 **Gesture Control**: MediaPipe hand gesture recognition for interactive control
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎬 **Screen Capture**: Record visualization with audio as WebM video
- 🌐 **Bilingual**: English and Chinese language support

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key:
   ```bash
   GEMINI_API_KEY=your-api-key-here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
.
├── App.tsx              # Main application component
├── components/
│   └── Visualizer.tsx   # Three.js visualization engine
├── services/
│   ├── audioService.ts       # Web Audio API integration
│   ├── connectionService.ts  # P2P and Bluetooth networking
│   └── storageService.ts     # IndexedDB for song management
├── utils/
│   └── shapes.ts        # 150+ particle shape generators
├── types.ts             # TypeScript type definitions
└── index.tsx            # React entry point
```

## Controls

- **Click & Drag**: Rotate the visualization
- **Scroll**: Zoom in/out
- **Hand Gestures**:
  - ☝️ Index Finger: Switch to random shape
  - ✋ Palm: Collision pull effect
  - ✊ Fist: Gather particles to center
  - ↔️ Swipe: Rotate visualization

## Technologies

- **React 19** - UI framework
- **Three.js** - 3D graphics
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Gemini API** - AI features
- **MediaPipe** - Hand gesture detection
- **Web Audio API** - Audio analysis

## License

MIT
