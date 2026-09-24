import React from 'react';
import { motion } from 'motion/react';
import {
  UserCircle,
  Lock,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';

interface LoginProps {
  loginData: any;
  setLoginData: (data: any) => void;
  handleLogin: (e: React.FormEvent) => void;
  isLoggingIn: boolean;
  authError: string | null;
}

const Login = ({
  loginData,
  setLoginData,
  handleLogin,
  isLoggingIn,
  authError
}: LoginProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Background efeitos */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Card Login */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md relative z-10 p-6 sm:p-10 bg-white/80 backdrop-blur-xl border-white shadow-2xl"
      >

        {/* LOGO + NOME */}
        <div className="flex flex-col items-center mb-10 gap-3">

          <div className="w-16 h-16 drop-shadow-[0_4px_15px_rgba(2,132,199,0.3)]">
            <svg viewBox="0 0 56 56" className="w-full h-full">
              <defs>
                <linearGradient id="i1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <linearGradient id="i2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="i3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#bae6fd" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="56" height="56" rx="16" fill="#0f172a" />
              <rect x="8" y="34" width="10" height="16" rx="3" fill="url(#i1)" />
              <rect x="21" y="24" width="10" height="26" rx="3" fill="url(#i2)" />
              <rect x="34" y="12" width="10" height="38" rx="3" fill="url(#i3)" />
              <polyline
                points="13,32 26,22 39,10"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
              />
              <circle cx="39" cy="10" r="3" fill="#ffffff" opacity="0.9" />
            </svg>
          </div>

          <h1 className="text-3xl font-black tracking-widest text-[#0f172a]">
            NEXUM
          </h1>

          <span className="text-[10px] tracking-[0.4em] text-primary font-black uppercase">
            Gestão Municipal
          </span>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-6">

          <div className="space-y-4">

            {/* USUÁRIO */}
            <div className="relative group">
              <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
              <input
                type="text"
                placeholder="Seu nome de usuário"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:text-slate-400"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                required
              />
            </div>

            {/* SENHA */}
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
              <input
                type="password"
                placeholder="Sua senha"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:text-slate-400"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
            </div>

          </div>

          {/* ERRO */}
          {authError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold shadow-sm"
            >
              <AlertCircle size={18} />
              {authError}
            </motion.div>
          )}

          {/* BOTÃO */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-slate-300 text-white py-4 sm:py-4.5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation cursor-pointer"
          >
            {isLoggingIn
              ? <RefreshCw size={20} className="animate-spin" />
              : 'Acessar Sistema'}
          </button>

        </form>

        {/* SUPORTE */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2 text-slate-400 hover:text-primary transition-colors cursor-pointer group">
            <Info size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest group-hover:underline">
              Esqueci minha senha
            </span>
          </div>
        </div>

      </motion.div>

      {/* FOOTER */}
      <div className="absolute bottom-8 text-center w-full">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em]">
          © 2024 NEXUM TECNOLOGIA • V.2.4.0
        </p>
      </div>

    </div>
  );
};

export default Login;