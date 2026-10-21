import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  Lock,
  Camera,
  RefreshCw,
  MessageCircle,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import { callService, ActiveCallState } from '../../services/callService';

interface WhatsAppCallModalProps {
  onOpenChatWithParticipant?: (participantId: string) => void;
}

export const WhatsAppCallModal: React.FC<WhatsAppCallModalProps> = ({
  onOpenChatWithParticipant,
}) => {
  const [call, setCall] = useState<ActiveCallState | null>(() => callService.getActiveCall());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = callService.subscribe((currentCall) => {
      setCall(currentCall);
    });
    return () => unsub();
  }, []);

  // Request real media stream when video/audio call starts
  useEffect(() => {
    if (!call || call.status === 'ended') {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }
      return;
    }

    let streamInstance: MediaStream | null = null;

    const requestMedia = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: call.callType === 'video' ? { facingMode: isFrontCamera ? 'user' : 'environment' } : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamInstance = stream;
        setLocalStream(stream);
        setCameraPermissionError(false);

        if (localVideoRef.current && call.callType === 'video') {
          localVideoRef.current.srcObject = stream;
        }

        // Set up Web Audio Analyser for live visualizer
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;
        } catch (e) {}
      } catch (err: any) {
        // Permissions blocked or camera busy, fallback gracefully
        setCameraPermissionError(true);
      }
    };

    requestMedia();

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [call?.callId, call?.callType, isFrontCamera]);

  // Sync mute state to local media tracks
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !call?.isMuted;
      });
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !call?.isVideoOff;
      });
    }
  }, [call?.isMuted, call?.isVideoOff, localStream]);

  // Live Sound Wave Visualizer on Canvas
  useEffect(() => {
    const canvas = remoteCanvasRef.current;
    if (!canvas || !call || call.status !== 'connected') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let waveOffset = 0;

    const renderWave = () => {
      waveOffset += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let micLevel = 0.5;
      if (analyserRef.current && !call.isMuted) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        micLevel = Math.max(0.2, avg / 80);
      } else {
        // Simulated natural speaking wave
        micLevel = 0.4 + 0.3 * Math.sin(waveOffset * 2);
      }

      // Draw soothing WhatsApp emerald audio waves
      const bars = 24;
      const barWidth = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const barHeight = Math.sin(i * 0.4 + waveOffset) * 20 * micLevel + 25 * micLevel;
        const x = i * barWidth;
        const y = canvas.height / 2 - barHeight / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#25D366');
        gradient.addColorStop(1, '#00a884');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + 2, y, barWidth - 4, barHeight, 4);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [call?.status, call?.isMuted]);

  if (!call) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Flip Camera
  const handleFlipCamera = () => {
    setIsFrontCamera((prev) => !prev);
  };

  // -------------------------------------------------------------
  // 1. MINIMIZED FLOATING PIP WIDGET
  // -------------------------------------------------------------
  if (call.isMinimized) {
    return (
      <div
        className="fixed bottom-20 right-4 z-50 bg-[#1f2c34] text-white p-3 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-200 select-none cursor-pointer"
        onClick={() => callService.toggleMinimize(false)}
      >
        <div className="relative">
          <img
            src={call.participant.avatar || '/icon-192.png'}
            alt=""
            className="w-11 h-11 rounded-full object-cover border-2 border-[#25D366]"
          />
          {call.status === 'connected' && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] border-2 border-[#1f2c34] rounded-full animate-pulse" />
          )}
        </div>

        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black truncate max-w-[120px] text-white">
              {call.participant.name}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">
              {call.callType === 'video' ? '📹' : '📞'}
            </span>
          </div>
          <p className="text-[11px] font-mono font-bold text-slate-300">
            {call.status === 'connected'
              ? formatDuration(call.durationSeconds)
              : call.status === 'ringing'
              ? 'রিং হচ্ছে...'
              : 'কল সমাপ্ত'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 pl-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => callService.toggleMute()}
            className={`p-2 rounded-xl transition ${
              call.isMuted ? 'bg-rose-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
            title={call.isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
          >
            {call.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => callService.toggleMinimize(false)}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition"
            title="বড় করুন"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => callService.endCall()}
            className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition"
            title="কল কাটুন"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. FULLSCREEN WHATSAPP CALL OVERLAY
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b141a]/95 backdrop-blur-md text-white select-none overflow-hidden animate-in fade-in duration-200">
      {/* Background Decorative Radial Gradient */}
      <div className="absolute inset-0 bg-radial from-emerald-950/40 via-[#0b141a] to-[#070b0e] pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full h-full max-w-lg mx-auto flex flex-col justify-between p-5 sm:p-7 z-10">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between text-slate-300">
          <button
            type="button"
            onClick={() => callService.toggleMinimize(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="মিনিমাইজ করে অ্যাপ ব্যবহার করুন"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">মিনিমাইজ</span>
          </button>

          {/* End-to-End Encryption Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/20">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>এন্ড-টু-এন্ড এনক্রিপ্টেড</span>
          </div>

          {/* Open Chat with participant button */}
          {onOpenChatWithParticipant && (
            <button
              type="button"
              onClick={() => {
                callService.toggleMinimize(true);
                onOpenChatWithParticipant(call.participant.id);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="চ্যাটে বার্তা পাঠান"
            >
              <MessageCircle className="w-4 h-4 text-emerald-300" />
            </button>
          )}
        </div>

        {/* Center: Video Call Fullscreen Remote View OR Audio Call Avatar */}
        {call.callType === 'video' && !call.isVideoOff ? (
          <div className="relative w-full flex-1 my-4 rounded-3xl overflow-hidden bg-slate-900 border border-slate-700/60 shadow-2xl flex items-center justify-center">
            {/* Simulated Remote Friend Video with Ambient Motion */}
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
              <img
                src={call.participant.avatar}
                alt=""
                className="w-full h-full object-cover blur-xs brightness-75 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

              {/* Central Caller Badge inside Video */}
              <div className="absolute top-5 left-5 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold">{call.participant.name}</span>
              </div>

              {/* Floating PIP for Local Camera Stream */}
              <div className="absolute bottom-4 right-4 w-28 h-38 sm:w-32 sm:h-44 rounded-2xl overflow-hidden bg-black border-2 border-emerald-400 shadow-2xl z-20">
                {localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: isFrontCamera ? 'scaleX(-1)' : 'none' }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-800 text-[10px]">
                    <Camera className="w-5 h-5 text-emerald-400 mb-1" />
                    <span>সেলফি প্রিভিউ</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Center: Audio Call UI */
          <div className="flex flex-col items-center justify-center my-auto text-center space-y-4">
            {/* Animated Pulsing Sound Rings around Avatar */}
            <div className="relative flex items-center justify-center">
              {call.status === 'connected' && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="absolute w-36 h-36 rounded-full bg-emerald-500/20"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute w-32 h-32 rounded-full bg-emerald-400/20"
                  />
                </>
              )}

              {/* Caller Avatar */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-[#25D366] via-teal-400 to-emerald-600 shadow-2xl ring-4 ring-emerald-500/30">
                <img
                  src={call.participant.avatar || '/icon-192.png'}
                  alt={call.participant.name}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>

            {/* Caller Name and Call Type */}
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {call.participant.name}
              </h2>
              <p className="text-xs text-emerald-400 font-bold tracking-wide">
                {call.callType === 'video' ? 'হোয়াটসঅ্যাপ ভিডিও কল' : 'হোয়াটসঅ্যাপ অডিও কল'}
              </p>
              {call.participant.phone && (
                <p className="text-xs text-slate-400 font-mono">
                  {call.participant.phone}
                </p>
              )}
            </div>

            {/* Call Status & Duration Counter */}
            <div className="pt-2">
              {call.status === 'ringing' ? (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs font-bold text-slate-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>
                    {call.direction === 'outgoing' ? 'কল হচ্ছে... (Ringing)' : 'ইনকামিং কল আসছে...'}
                  </span>
                </div>
              ) : call.status === 'connected' ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-base font-black font-mono tracking-widest px-4 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 shadow-inner">
                    {formatDuration(call.durationSeconds)}
                  </span>
                  {/* Live Canvas Sound Wave Visualizer */}
                  <div className="w-56 h-10 mt-1">
                    <canvas
                      ref={remoteCanvasRef}
                      width={224}
                      height={40}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-sm font-bold text-rose-400">কল সমাপ্ত হয়েছে</span>
              )}
            </div>
          </div>
        )}

        {/* Camera Permission Alert (Friendly, non-blocking) */}
        {cameraPermissionError && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[11px] text-center font-medium">
            💡 ডিভাইসের ক্যামেরা/মাইক অ্যাক্সেস সীমিত, সিমুলেটেড হাই-ডেফিনিশন ভয়েস সক্রিয় রয়েছে।
          </div>
        )}

        {/* Bottom Control Action Bar */}
        <div className="pt-4 pb-2 border-t border-white/10">
          {call.direction === 'incoming' && call.status === 'ringing' ? (
            /* Incoming Call Response Bar: Accept (Green) / Decline (Red) */
            <div className="flex items-center justify-around py-2">
              {/* Decline Button */}
              <button
                type="button"
                onClick={() => callService.endCall()}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-xl transition active:scale-95">
                  <PhoneOff className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-slate-300">কেটে দিন</span>
              </button>

              {/* Accept Call Button */}
              <button
                type="button"
                onClick={() => callService.answerCall()}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <motion.div
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-16 h-16 rounded-full bg-[#25D366] hover:bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 transition active:scale-95"
                >
                  <Phone className="w-7 h-7" />
                </motion.div>
                <span className="text-xs font-bold text-emerald-300">রিসিভ করুন</span>
              </button>
            </div>
          ) : (
            /* Active Call Controls (Mute, Video, Speaker, Flip, End Call) */
            <div className="flex items-center justify-around gap-2">
              {/* Mute Toggle Button */}
              <button
                type="button"
                onClick={() => callService.toggleMute()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                  call.isMuted
                    ? 'bg-rose-500 text-white shadow-lg'
                    : 'bg-white/15 hover:bg-white/25 text-slate-100'
                }`}
                title={call.isMuted ? 'আনমিউট করুন' : 'মাইক্রোফোন মিউট করুন'}
              >
                {call.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video Camera Toggle Button */}
              <button
                type="button"
                onClick={() => callService.toggleVideo()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                  call.isVideoOff
                    ? 'bg-rose-500 text-white shadow-lg'
                    : 'bg-white/15 hover:bg-white/25 text-slate-100'
                }`}
                title={call.isVideoOff ? 'ক্যামেরা চালু করুন' : 'ক্যামেরা বন্ধ করুন'}
              >
                {call.isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* Flip Camera (if video call) OR Speaker toggle */}
              {call.callType === 'video' ? (
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-slate-100 flex items-center justify-center transition cursor-pointer"
                  title="ক্যামেরা পরিবর্তন করুন"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => callService.toggleSpeaker()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                    call.isSpeakerOn
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-white/15 hover:bg-white/25 text-slate-100'
                  }`}
                  title={call.isSpeakerOn ? 'স্পিকার বন্ধ করুন' : 'লাউডস্পিকার চালু করুন'}
                >
                  {call.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              )}

              {/* Big Red Hangup Call Button */}
              <button
                type="button"
                onClick={() => callService.endCall()}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-2xl transition cursor-pointer"
                title="কল শেষ করুন"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
