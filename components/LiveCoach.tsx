import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

const LiveCoach: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{role: string, text: string}[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const selected = await window.aistudio?.hasSelectedApiKey();
      setHasKey(!!selected);
    };
    checkKey();
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    await window.aistudio?.openSelectKey();
  };

  const decodeBase64 = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const decodeAudio = async (data: Uint8Array, ctx: AudioContext) => {
    try {
      // Ensure we're reading the buffer correctly even if it's a view
      const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }
      return buffer;
    } catch (e) {
      console.error("Error decoding audio:", e);
      return ctx.createBuffer(1, 1, 24000);
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const startSession = async () => {
    if (!hasKey) {
      handleOpenKeySelector();
      return;
    }
    setIsConnecting(true);
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = audioContextRef.current.createGain();
      outputNode.connect(audioContextRef.current.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const inputSource = inputContextRef.current.createMediaStreamSource(stream);
      const scriptProcessor = inputContextRef.current.createScriptProcessor(2048, 1, 1);

      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: () => {
            console.log("Live Session Opened");
            setIsConnecting(false);
            setIsActive(true);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                // Clipping protection
                const s = Math.max(-1, Math.min(1, inputData[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              const base64 = arrayBufferToBase64(int16.buffer);
              sessionPromise.then(s => s.sendRealtimeInput({ 
                audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } 
              })).catch(err => console.error("Error sending audio:", err));
            };
            inputSource.connect(scriptProcessor);
            scriptProcessor.connect(inputContextRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              try {
                const buffer = await decodeAudio(decodeBase64(audioData), audioContextRef.current);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(outputNode);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              } catch (e) {
                console.error("Error playing audio chunk:", e);
              }
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
            if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
               const txt = msg.serverContent.modelTurn.parts[0].text;
               setTranscriptions(prev => [...prev, {role: 'model', text: txt}].slice(-5));
            }
          },
          onclose: () => {
            console.log("Live Session Closed");
            stopSession();
          },
          onerror: (err) => {
            console.error("Live Session Error:", err);
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: "You are the Lead Partner at AdStrat Pro. You are talking to a business owner. Be elite, tactical, and direct. Guide them on Meta ad strategy. Keep responses concise for natural conversation."
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error("Failed to start live session:", error);
      setIsConnecting(false);
      setIsActive(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;

    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      inputContextRef.current.close();
    }
    inputContextRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-10 animate-fade bg-slate-50/30">
      <div className="max-w-4xl w-full bg-white border border-slate-200 p-8 md:p-16 rounded-[4rem] shadow-2xl text-center relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
        
        <div className="mb-12 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border border-indigo-100 shadow-sm">Lead Strategic Partner</span>
            {isActive && (
              <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border border-emerald-100 shadow-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                Live Link
              </span>
            )}
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4">Neural <span className="text-indigo-600">Partner.</span></h2>
          <p className="text-slate-500 font-bold text-sm italic max-w-md mx-auto leading-relaxed">Direct tactical audio link to the AdStrat PRO Lead Partner. Real-time synthesis of market data and strategy.</p>
          {hasKey === false && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-center gap-4 animate-pulse max-w-sm mx-auto">
              <i className="fa-solid fa-key text-amber-600"></i>
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">API Key Required for Live Link</p>
              <button onClick={handleOpenKeySelector} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest">Select Key</button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center min-h-[350px] mb-12 relative z-10">
          {isActive ? (
            <div className="flex items-center gap-3 h-32">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-2.5 bg-indigo-500 rounded-full transition-all duration-150" 
                  style={{ 
                    height: `${Math.random() * 80 + 20}%`, 
                    opacity: Math.random() * 0.5 + 0.5,
                    animation: `pulse 1.5s ease-in-out infinite ${i * 0.1}s` 
                  }}
                ></div>
              ))}
            </div>
          ) : isConnecting ? (
            <div className="relative">
              <div className="w-24 h-24 border-4 border-indigo-50 rounded-full"></div>
              <div className="w-24 h-24 border-4 border-transparent border-t-indigo-600 rounded-full absolute top-0 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-satellite-dish text-indigo-600 text-2xl animate-pulse"></i>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 border border-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-500">
                 <i className="fa-solid fa-microphone-lines text-7xl group-hover:text-indigo-200 transition-colors"></i>
              </div>
              <div className="absolute -inset-4 border border-slate-100 rounded-full animate-ping opacity-20"></div>
            </div>
          )}
          
          <div className="mt-12 w-full max-w-lg mx-auto">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 min-h-[80px] flex flex-col justify-center">
              {transcriptions.length > 0 ? (
                <div className="space-y-3">
                  {transcriptions.map((t, i) => (
                    <p key={i} className={`text-xs font-bold animate-fade ${t.role === 'model' ? 'text-indigo-600' : 'text-slate-500'}`}>
                      <span className="uppercase tracking-widest text-[9px] opacity-50 mr-2">{t.role === 'model' ? 'Partner' : 'You'}:</span>
                      {t.text}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Waiting for dialogue initiation...</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8 relative z-10">
          <button 
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`px-16 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 flex items-center gap-4 ${
              isActive 
              ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200' 
              : 'bg-slate-900 text-white hover:bg-black shadow-slate-200'
            }`}
          >
            {isActive ? (
              <>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Terminate Connection
              </>
            ) : isConnecting ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Establishing Link...
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt-lightning"></i>
                Initiate Dialogue
              </>
            )}
          </button>

          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-indigo-500"></div>
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Token Budget: 75%</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-emerald-500 text-[10px]"></i>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encrypted Link</span>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-10 border-t border-slate-50 grid grid-cols-3 gap-4 opacity-40">
           <div className="text-center">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Latency</p>
              <p className="text-xs font-black text-slate-900">240ms</p>
           </div>
           <div className="text-center border-x border-slate-100">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Sample Rate</p>
              <p className="text-xs font-black text-slate-900">24kHz</p>
           </div>
           <div className="text-center">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Model</p>
              <p className="text-xs font-black text-slate-900">Flash 3.1 Live</p>
           </div>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.5); }
        }
      `}</style>
    </div>
  );
};

export default LiveCoach;
