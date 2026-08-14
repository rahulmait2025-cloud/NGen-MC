"use client";

import React, { useState, useReducer } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Mail,
  Lock,
  Phone,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

type RegisterUiState = { loading: boolean; error: string | null; success: boolean };
type RegisterUiAction =
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_ERROR'; message: string }
  | { type: 'REGISTER_SUCCESS' }
  | { type: 'REGISTER_END' };

function uiReducer(state: RegisterUiState, action: RegisterUiAction): RegisterUiState {
  switch (action.type) {
    case 'REGISTER_START': return { ...state, loading: true, error: null };
    case 'REGISTER_ERROR': return { ...state, error: action.message };
    case 'REGISTER_SUCCESS': return { ...state, success: true };
    case 'REGISTER_END': return { ...state, loading: false };
  }
}

export function RegisterForm() {
  const router = useRouter();

  const [{ loading, error, success }, dispatch] = useReducer(uiReducer, { loading: false, error: null, success: false });
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState(() => ({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  }));

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'REGISTER_START' });

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            phone: formData.phone.trim(),
            role: "superadmin", // Since this is the superadmin portal
          },
        },
      });

      if (signUpError) {
        dispatch({ type: 'REGISTER_ERROR', message: signUpError.message });
        dispatch({ type: 'REGISTER_END' });
        return;
      }

      if (data?.user) {
        dispatch({ type: 'REGISTER_SUCCESS' });
        setTimeout(() => {
          router.push("/login?message=Check your email for confirmation");
        }, 3000);
      }
    } catch {
      dispatch({ type: 'REGISTER_ERROR', message: "An unexpected error occurred. Please try again." });
    } finally {
      dispatch({ type: 'REGISTER_END' });
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="size-20 rounded-full bg-orange-100 flex items-center justify-center shadow-lg shadow-orange-950/10" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <CheckCircle2 className="size-10 text-[#E8541A]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Registration Successful!</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-[280px]">
            Please check your email for a confirmation link to activate your account.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push("/login")}
          className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
        >
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-2xl border border-orange-200/60 bg-zinc-900 shadow-lg shadow-orange-900/15 ring-2 ring-[#E8541A]/25 dark:border-white/10 dark:ring-[#E8541A]/35">
          <Image
            src="/assets/signup-founder.png"
            alt="NextGen CTO"
            width={112}
            height={112}
            className="h-full w-full object-cover object-[center_15%]"
            priority
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Join NextGen CTO</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Start your leadership journey today</p>
        </div>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-500 text-xs animate-in shake-1">
            <AlertCircle className="size-4" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 px-0.5">Full Name</label>
            <div className="relative group">
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleFieldChange}
                placeholder="Ishan Gupta"
                className="h-12 border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 pl-10 text-[15px] focus:border-[#E8541A]/50 focus:ring-[#E8541A]/20 transition-[border-color,box-shadow,background-color] rounded-xl"
              />
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500 group-focus-within:text-[#E8541A] transition-colors" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 px-0.5">Email Address</label>
            <div className="relative group">
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleFieldChange}
                placeholder="xyz@gmail.com"
                className="h-12 border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 pl-10 text-[15px] focus:border-[#E8541A]/50 focus:ring-[#E8541A]/20 transition-[border-color,box-shadow,background-color] rounded-xl"
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500 group-focus-within:text-[#E8541A] transition-colors" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 px-0.5">Phone Number</label>
            <div className="relative group">
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleFieldChange}
                placeholder="+91 99999 99999"
                className="h-12 border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 pl-10 text-[15px] focus:border-[#E8541A]/50 focus:ring-[#E8541A]/20 transition-[border-color,box-shadow,background-color] rounded-xl"
              />
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500 group-focus-within:text-[#E8541A] transition-colors" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 px-0.5">Password</label>
            <div className="relative group">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleFieldChange}
                placeholder="********"
                className="h-12 border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 pl-10 pr-10 text-[15px] focus:border-[#E8541A]/50 focus:ring-[#E8541A]/20 transition-[background-color,border-color,box-shadow] rounded-xl"
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500 group-focus-within:text-[#E8541A] transition-colors" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#E8541A] transition-colors p-1"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-[#E8541A] via-[#ea580c] to-[#7c2d12] text-[15px] font-semibold text-white shadow-lg shadow-orange-900/25 transition hover:brightness-[1.05] disabled:opacity-60"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Creating account...
            </div>
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              <UserPlus className="size-4" />
              Create account
            </span>
          )}
        </Button>
      </form>

      <div className="text-center pt-2">
        <p className="text-zinc-500 text-xs">
          Already have an account?{" "}
          <button type="button"
            onClick={() => router.push("/login")}
            className="text-orange-600 dark:text-orange-400 font-semibold hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
