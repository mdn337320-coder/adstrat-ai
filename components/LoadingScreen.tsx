import React from 'react';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Initializing Neural Link..." }) => {
  // Generate random particles
  const particles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 5 + 5,
    delay: Math.random() * 5
  }));

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-30"></div>
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.02)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.01),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] z-50"></div>

      {/* Floating Neural Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute bg-indigo-200 rounded-full opacity-40"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, 50, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "linear"
            }}
          />
        ))}
      </div>
      
      <div className="relative flex flex-col items-center">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.1, 1],
            rotate: [-10, 5, 0],
            opacity: 1
          }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut"
          }}
          className="relative"
        >
          {/* Outer Glow */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-indigo-400 blur-2xl rounded-3xl"
          />
          
          {/* The Logo */}
          <motion.div 
            animate={{ 
              opacity: [1, 0.9, 1, 0.8, 1],
              x: [0, -1, 1, -1, 0],
            }}
            transition={{ 
              duration: 0.2,
              repeat: Infinity,
              repeatDelay: Math.random() * 5 + 2
            }}
            className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10"
          >
            <motion.i 
              animate={{ 
                rotateY: [0, 180, 360],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="fa-solid fa-chess-knight text-white text-4xl"
            />
          </motion.div>
          
          {/* Orbiting Ring */}
          <svg className="absolute -inset-8 w-[calc(100%+64px)] h-[calc(100%+64px)] pointer-events-none">
            <motion.circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeDasharray="10 20"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* Text Content */}
        <div className="mt-16 text-center space-y-4">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-slate-900 font-black text-xl uppercase tracking-[0.4em]"
          >
            AdStrat <span className="text-indigo-600">PRO</span>
          </motion.h2>
          
          <div className="flex flex-col items-center gap-2">
            <motion.p 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-slate-400 font-black text-[10px] uppercase tracking-[0.5em] italic"
            >
              {message}
            </motion.p>
            
            {/* Progress Bar */}
            <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-full h-full bg-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Status */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neural Core v4.0.2 // Secure Link</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
