'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { School, Lock, Mail, ShieldCheck, ArrowRight, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const supabase = createClient();
    if (!supabase) {
      setErrorMsg('Hệ thống chưa kết nối cơ sở dữ liệu. Vui lòng kiểm tra file cấu hình .env.local.');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    startTransition(async () => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('Email hoặc mật khẩu không chính xác. Xin Thầy vui lòng kiểm tra lại.');
          } else if (error.message.includes('Email not confirmed')) {
            setErrorMsg('Tài khoản chưa được xác thực email. Xin Thầy kiểm tra hộp thư để kích hoạt hoặc liên hệ Quản trị viên.');
          } else {
            setErrorMsg(`Lỗi đăng nhập: ${error.message}`);
          }
          return;
        }

        setSuccessMsg('Đăng nhập thành công! Đang chuyển hướng vào hệ thống...');
        setTimeout(() => {
          router.push(redirectPath);
          router.refresh();
        }, 600);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định';
        setErrorMsg(`Không thể kết nối đến máy chủ: ${message}`);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-4">
            <School className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            ThayKhaiEdu
          </h1>
          <p className="text-sm font-medium text-blue-600 mt-1">
            Xưởng sản xuất đề kiểm tra AI – Khối 4
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Trường Tiểu học Trần Văn Ơn, Quận 1, TP.HCM
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-900">Đăng nhập hệ thống</h2>
            <p className="text-xs text-slate-500 mt-1">
              Nhập email và mật khẩu được cấp để truy cập xưởng tạo đề
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email tài khoản
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="thaykhai@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{successMsg}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập vào hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Admin Created Policy Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-start gap-2 text-slate-500">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-slate-600">
                <strong>Chính sách bảo mật:</strong> Đăng ký tài khoản công khai đã được đóng. Tài khoản do Quản trị viên/Tổ trưởng cấp thủ công cho giáo viên trong trường.
              </p>
            </div>
            <div className="flex items-start gap-2 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-slate-600">
                Phân quyền chặt chẽ theo vai trò tại <strong>Trường TH Trần Văn Ơn</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Hệ thống bảo vệ dữ liệu theo tiêu chuẩn Thông tư 27/2020/TT-BGDĐT
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Đang tải trang đăng nhập...</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
