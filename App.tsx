
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Visualizer from './components/Visualizer';
import { VisualizerConfig, ShapeType, Song, GestureType } from './types';
import { audioService } from './services/audioService';
import { storageService } from './services/storageService';
import { GoogleGenAI, Modality } from "@google/genai";
import { PARTICLE_COUNT } from './utils/shapes';

type Language = 'en' | 'zh';

const translations = {
  en: {
    brand: 'NEBULA BEATS',
    interface: 'NEURAL INTERFACE',
    hub: 'NEURAL HUB',
    vault: 'VAULT',
    ai: 'AI',
    engine: 'ENGINE',
    core: 'CORE',
    addSong: 'ADD SONG',
    emptyVault: 'Empty',
    sonicVault: 'Sonic Vault',
    neuralSculptor: 'Neural Sculptor',
    dreamGeometry: 'Dream a 3D geometry...',
    synthesizing: 'Synthesizing...',
    initializeSwarm: 'Initialize Swarm',
    systemCore: 'System Core',
    stopSave: 'Stop & Save MP4',
    captureStream: 'Capture Stream',
    opticalGesture: 'Optical Gesture',
    collision: 'COLLISION',
    scatter: 'SCATTER',
    morph: 'MORPH SPEED',
    voiceMode: 'Voice Interaction',
    voiceConnect: 'Connect Voice',
    voiceDisconnect: 'Disconnect',
    voiceListening: 'Listening...',
    imageGen: 'Image Sculpt',
    imagePrompt: 'Describe an image for the particles...',
    imageSize: 'Size',
    generateImage: 'Generate',
    selectKey: 'Select API Key',
    billingDoc: 'Billing Info',
    gestureHints: {
      FIST: 'FIST: READY',
      PALM: 'PALM: READY',
      INDEX: 'MODEL SWITCH',
      SWIPE: 'ROTATING',
      STAY_PALM: 'PAUSED',
      NONE: 'SCANNING...'
    },
    syncMode: 'Neuro Sync Mode',
    initializing: 'Initializing...',
    decrypting: 'Decrypting Frequency...',
    dynamicsEngine: 'Dynamics Engine'
  },
  zh: {
    brand: '星云律动',
    interface: '神经元音乐接口',
    hub: '神经枢纽',
    vault: '音库',
    ai: 'AI',
    engine: '引擎',
    core: '核心',
    addSong: '导入歌曲',
    emptyVault: '库中无歌曲',
    sonicVault: '声音金库',
    neuralSculptor: '神经雕刻家',
    dreamGeometry: '构思一个3D几何体...',
    synthesizing: '合成中...',
    initializeSwarm: '初始化粒子集群',
    systemCore: '系统核心',
    stopSave: '停止并保存 MP4',
    captureStream: '捕捉流媒体',
    opticalGesture: '视觉手势交互',
    collision: '碰撞排斥力',
    scatter: '随机扩散偏移',
    morph: '变形重组速度',
    voiceMode: '语音交互',
    voiceConnect: '开启对话',
    voiceDisconnect: '结束通话',
    voiceListening: '正在倾听...',
    imageGen: '图像生成模型',
    imagePrompt: '描述想要生成的图像...',
    imageSize: '尺寸',
    generateImage: '生成',
    selectKey: '选择 API Key',
    billingDoc: '计费说明',
    gestureHints: {
      FIST: '握拳：就绪',
      PALM: '手掌：就绪',
      INDEX: '切换模型',
      SWIPE: '视角旋转',
      STAY_PALM: '已暂停',
      NONE: '扫描手势...'
    },
    syncMode: '神经同步模式',
    initializing: '初始化中...',
    decrypting: '频率解密中...',
    dynamicsEngine: '动力学引擎'
  }
};

const Waveform: React.FC<{ isPaused: boolean }> = ({ isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataArray = useRef(new Uint8Array(256));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const draw = () => {
      audioService.getWaveform(dataArray.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      const sliceWidth = canvas.width / dataArray.current.length;
      let x = 0;
      for (let i = 0; i < dataArray.current.length; i++) {
        const v = dataArray.current[i] / 128.0;
        const y = v * (canvas.height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#3b82f6';
      ctx.stroke();
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} width={200} height={40} className="w-full h-8 opacity-60" />;
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const t = translations[lang];

  const [config, setConfig] = useState<VisualizerConfig>({
    overallScale: 1.0,
    particleSize: 1.4,
    trebleSensitivity: 6,
    explosionIntensity: 2.5,
    diffusionStrength: 1.5,
    collisionStrength: 12.0,
    randomScatter: 20.0,
    colorFactor: 1.3,
    rotationSpeed: 0.005,
    morphSpeed: 0.06,
    activeShape: ShapeType.GALAXY,
    autoRotate: true,
    gestureEnabled: true
  });

  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
  const [isPaused, setIsPaused] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isHubExpanded, setIsHubExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'VAULT' | 'AI' | 'ENGINE' | 'CORE'>('VAULT');
  
  const [hubPos, setHubPos] = useState({ x: 20, y: 20 });
  const [camPos, setCamPos] = useState({ x: 20, y: 20 });
  const [controlsPos, setControlsPos] = useState({ x: 0, y: 32 });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aiPositions, setAiPositions] = useState<Float32Array | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isLiveActive, setIsLiveActive] = useState(false);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const outputAudioContextRef = useRef<AudioContext | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastX = useRef(0.5);
  const lastY = useRef(0.5);
  const [currentGesture, setCurrentGesture] = useState<{type: GestureType, x: number, y: number}>({type: 'NONE', x: 0, y: 0});

  const playSwitchSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0.2, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      osc1.connect(masterGain);
      osc2.connect(masterGain);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context switch sound error:", e);
    }
  }, []);

  useEffect(() => {
    setControlsPos({ x: (window.innerWidth - 384) / 2, y: window.innerHeight - 180 });
    const init = async () => {
      try {
        const songs = await storageService.getAllSongs();
        setPlaylist(songs);
        if (songs.length > 0) {
          setCurrentSongIndex(0);
          await audioService.setupAudio(songs[0].data, handleSongEnd);
        }
      } catch (err) { console.error("Initialization failed:", err); }
      finally { setIsLoading(false); }
    };
    init();
  }, []);

  const playSong = async (index: number) => {
    if (index < 0 || index >= playlist.length) return;
    const song = playlist[index];
    setCurrentSongIndex(index);
    await audioService.setupAudio(song.data, handleSongEnd);
    setIsPaused(false);
  };

  const handleSongEnd = useCallback(() => {
    setCurrentSongIndex(prev => {
      const next = (prev + 1) % playlist.length;
      playSong(next);
      return next;
    });
  }, [playlist]);

  const togglePlay = () => {
    if (audioService.isPlaying()) {
      audioService.pause();
      setIsPaused(true);
    } else {
      audioService.resume();
      setIsPaused(false);
    }
  };

  const toggleRecording = useCallback(() => {
    if (isRecording) { 
      if (recorderRef.current) recorderRef.current.stop(); 
      setIsRecording(false); 
    }
    else {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const vStream = (canvas as any).captureStream ? (canvas as any).captureStream(60) : null;
      if (!vStream) return;
      
      const aStream = audioService.getAudioStream();
      const tracks = [...vStream.getVideoTracks()];
      if (aStream) {
        aStream.getAudioTracks().forEach(t => tracks.push(t));
      }
      
      const stream = new MediaStream(tracks);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      
      chunksRef.current = [];
      recorder.ondataavailable = e => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `NebulaLive_${Date.now()}.webm`; a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start(); 
      recorderRef.current = recorder; 
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleDrag = (e: React.MouseEvent | React.TouchEvent, setter: React.Dispatch<React.SetStateAction<{x: number, y: number}>>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('label')) return;
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const onMove = (m: MouseEvent | TouchEvent) => {
      const cx = 'touches' in m ? m.touches[0].clientX : (m as MouseEvent).clientX;
      const cy = 'touches' in m ? m.touches[0].clientY : (m as MouseEvent).clientY;
      setter(p => ({
        x: Math.max(0, Math.min(window.innerWidth - 80, p.x + (cx - startX))),
        y: Math.max(0, Math.min(window.innerHeight - 80, p.y + (cy - startY)))
      }));
    };
    const onEnd = () => {
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false }); window.addEventListener('touchend', onEnd);
  };

  const getGestureColor = (type: GestureType) => {
    switch (type) {
      case 'INDEX': return 'border-purple-500 shadow-[0_0_35px_rgba(168,85,247,0.8)]';
      case 'SWIPE': return 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.8)]';
      case 'FIST': return 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.8)]';
      case 'PALM': return 'border-blue-400 shadow-[0_0_35px_rgba(96,165,250,0.8)]';
      default: return 'border-white/10 shadow-none';
    }
  };

  const getGestureEmoji = (type: GestureType) => {
    switch (type) {
      case 'INDEX': return '☝️';
      case 'SWIPE': return '↔️';
      case 'FIST': return '✊';
      case 'PALM': return '✋';
      default: return '';
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none text-white flex items-center justify-center">
      <div className="relative w-full h-full max-w-[177.78vh] aspect-video">
        <Visualizer config={config} setConfig={setConfig} gestureState={currentGesture} aiPositions={aiPositions} />

        {/* Main UI Components */}
        <div style={{ left: `${hubPos.x}px`, top: `${hubPos.y}px` }} className="fixed md:absolute z-50 flex flex-col pointer-events-auto">
          <div className={`flex items-center gap-2 p-2 bg-black/50 backdrop-blur-3xl border border-white/10 shadow-2xl transition-all cursor-move ${isHubExpanded ? 'rounded-t-2xl' : 'rounded-2xl'}`} onMouseDown={e => handleDrag(e, setHubPos)} onTouchStart={e => handleDrag(e, setHubPos)}>
            <button onClick={() => setIsHubExpanded(!isHubExpanded)} className={`p-3 rounded-xl transition-all ${isHubExpanded ? 'bg-blue-600' : 'hover:bg-white/10 text-gray-400'}`}>
              <svg className={`w-5 h-5 transition-transform ${isHubExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
            {!isHubExpanded && <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/80 pr-4">{t.hub}</span>}
          </div>
        </div>

        {/* Bottom Controls */}
        <div style={{ left: `${controlsPos.x}px`, top: `${controlsPos.y}px` }} className="fixed md:absolute z-40 w-full max-w-sm pointer-events-auto">
          <div className="bg-black/40 backdrop-blur-[60px] border border-white/10 px-8 py-5 rounded-3xl flex flex-col gap-4 shadow-2xl hover:border-white/20 transition-all cursor-move" onMouseDown={e => handleDrag(e, setControlsPos)} onTouchStart={e => handleDrag(e, setControlsPos)}>
            <div className="flex items-center justify-between gap-6 pointer-events-none">
              <div className="flex-1 min-w-0">
                 <h3 className="text-[10px] md:text-xs font-bold truncate text-gray-100 italic tracking-tighter leading-none">{playlist[currentSongIndex]?.name || t.initializing}</h3>
                 <span className="text-[7px] text-blue-500 font-black uppercase tracking-[0.3em] opacity-60">{t.syncMode}</span>
              </div>
              <div className="flex items-center gap-4 pointer-events-auto">
                <button onClick={togglePlay} className="w-10 h-10 md:w-12 md:h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl">
                  {isPaused ? <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
                </button>
              </div>
            </div>
            {!isPaused && <div className="pointer-events-none"><Waveform isPaused={isPaused} /></div>}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanline { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
        @keyframes glitchReveal {
          0% { opacity: 0; transform: scale(0.9) skewX(20deg); filter: hue-rotate(90deg); }
          100% { transform: scale(1) skewX(0deg); filter: hue-rotate(0deg); }
        }
        @keyframes bounceSmall {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
};

export default App;
