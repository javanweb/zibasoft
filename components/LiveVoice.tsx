import React, { useEffect, useRef, useState } from 'react';
import { createBlob, decodeAudioData, connectLiveSession } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';

const LiveVoice: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputScriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  const cleanup = () => {
    // Stop session
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try {
          session.close();
        } catch (e) {
          console.debug('Session close error', e);
        }
      });
      sessionPromiseRef.current = null;
    }
    
    // Stop Media Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close Audio Contexts safely
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      try {
        inputAudioContextRef.current.close();
      } catch (e) {
        console.debug('Input context close error', e);
      }
    }
    inputAudioContextRef.current = null;

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      try {
        outputAudioContextRef.current.close();
      } catch (e) {
         console.debug('Output context close error', e);
      }
    }
    outputAudioContextRef.current = null;

    // Stop Visualizer
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    
    setConnected(false);
    setIsSpeaking(false);
  };

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Clear with fade effect
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = isSpeaking ? '#ec4899' : '#94a3b8'; // Pink if speaking, slate if idle
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  const startSession = async () => {
    // Ensure clean state before starting
    cleanup();
    
    try {
      setError(null);
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // Setup Visualizer from Input
      if (inputAudioContextRef.current) {
        const source = inputAudioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = inputAudioContextRef.current.createAnalyser();
        source.connect(analyserRef.current);
        visualize();

        // Connect Live API
        sessionPromiseRef.current = connectLiveSession(
          // onOpen
          () => {
            setConnected(true);
            if (!inputAudioContextRef.current) return;
            
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(1024, 1, 1);
            inputScriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
               const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
               
               // Local barge-in / Interruption check:
               let sum = 0;
               for (let i = 0; i < inputData.length; i++) {
                 sum += inputData[i] * inputData[i];
               }
               const rms = Math.sqrt(sum / inputData.length);
               
               // If user starts speaking (RMS > 0.015) and assistant is currently playing audio, stop playback immediately
               if (rms > 0.015 && sourcesRef.current.size > 0) {
                 console.log("Local barge-in detected. Stopping assistant speech...");
                 sourcesRef.current.forEach(s => {
                    try { s.stop(); } catch(e) {}
                 });
                 sourcesRef.current.clear();
                 if (outputAudioContextRef.current) {
                   nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
                 }
                 setIsSpeaking(false);
               }

               const pcmBlob = createBlob(inputData);
               
               if (sessionPromiseRef.current) {
                 sessionPromiseRef.current.then(session => {
                   session.sendRealtimeInput({ audio: pcmBlob });
                 });
               }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          // onMessage
          async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
              setIsSpeaking(true);
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(base64Audio, ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                 sourcesRef.current.delete(source);
                 if (sourcesRef.current.size === 0) setIsSpeaking(false);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
               sourcesRef.current.forEach(s => {
                   try { s.stop(); } catch(e) {}
               });
               sourcesRef.current.clear();
               nextStartTimeRef.current = outputAudioContextRef.current ? outputAudioContextRef.current.currentTime : 0;
               setIsSpeaking(false);
            }
          },
          // onError
          (e) => {
            console.error('Session Error:', e);
            setError("ارتباط قطع شد. لطفا مجدد تلاش کنید.");
            // Don't call cleanup() here to avoid loops, just update state
            setConnected(false);
          },
          // onClose
          () => {
            console.log('Session Closed');
            setConnected(false);
          }
        );
      }

    } catch (err: any) {
      console.error(err);
      setError("دسترسی به میکروفون امکان‌پذیر نیست.");
      // Ensure we clean up any partial initialization
      cleanup();
    }
  };

  const handleToggle = () => {
    if (connected) {
      cleanup();
    } else {
      startSession();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-white rounded-3xl shadow-lg border border-primary-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <span className="material-symbols-rounded text-9xl text-primary-500">graphic_eq</span>
      </div>

      <div className="z-10 text-center space-y-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-slate-800">دستیار صوتی هوشمند</h2>
        <p className="text-slate-500">
          با هوش مصنوعی سالن صحبت کنید. می‌توانید درباره نوبت‌ها، خدمات یا وضعیت فروش سوال بپرسید.
        </p>

        <div className="relative h-32 w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} width={600} height={200} className="absolute inset-0 w-full h-full" />
            {!connected && (
                <span className="text-slate-500 z-10">برای شروع مکالمه دکمه زیر را بزنید</span>
            )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button 
          onClick={handleToggle}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
            connected 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
        >
          <span className="material-symbols-rounded text-white text-4xl">
            {connected ? 'mic_off' : 'mic'}
          </span>
        </button>
        
        <p className="text-sm font-medium text-slate-400">
          {connected ? (isSpeaking ? 'در حال صحبت...' : 'گوش می‌کنم...') : 'غیرفعال'}
        </p>
      </div>
    </div>
  );
};

export default LiveVoice;