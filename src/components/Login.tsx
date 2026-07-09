/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LogIn, Key, UserCheck, ShieldAlert, Award, Users, BarChart3, History } from "lucide-react";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Quick accounts state initialized with original default users
  const [dbUsers, setDbUsers] = useState<User[]>([
    { id: "longnb", username: "longnb", name: "Nguyễn Bá Long", role: "boss", avatarColor: "bg-indigo-600 text-white", password: "123" },
    { id: "hienvn", username: "hienvn", name: "Võ Ngọc Hiền", role: "member", avatarColor: "bg-emerald-600 text-white", password: "123" },
    { id: "thinhnv", username: "thinhnv", name: "Ngô Văn Thịnh", role: "member", avatarColor: "bg-amber-600 text-white", password: "123" },
    { id: "vinhtq", username: "vinhtq", name: "Trần Quang Vinh", role: "member", avatarColor: "bg-rose-600 text-white", password: "123" },
    { id: "tuannv", username: "tuannv", name: "Nguyễn Văn Tuấn", role: "member", avatarColor: "bg-blue-600 text-white", password: "123" },
    { id: "chinhpv", username: "chinhpv", name: "Phạm Văn Chinh", role: "member", avatarColor: "bg-violet-600 text-white", password: "123" },
    { id: "thuanlt", username: "thuanlt", name: "Lã Thanh Thuân", role: "member", avatarColor: "bg-teal-600 text-white", password: "123" }
  ]);

  React.useEffect(() => {
    fetch(`/api/users?_t=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDbUsers(data);
        }
      })
      .catch((err) => console.error("Error fetching users for quick login:", err));
  }, []);

  // Map users to quick login button configurations
  const displayAccounts = dbUsers.map((user, idx) => {
    const isBoss = user.role === "boss";
    
    const borderColors = [
      "border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20",
      "border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20",
      "border-amber-500 hover:bg-amber-50/20 dark:hover:bg-amber-950/20",
      "border-rose-500 hover:bg-rose-50/20 dark:hover:bg-rose-950/20",
      "border-sky-500 hover:bg-sky-50/20 dark:hover:bg-sky-950/20",
      "border-teal-500 hover:bg-teal-50/20 dark:hover:bg-teal-950/20",
      "border-fuchsia-500 hover:bg-fuchsia-50/20 dark:hover:bg-fuchsia-950/20",
      "border-violet-500 hover:bg-violet-50/20 dark:hover:bg-violet-950/20",
    ];
    
    const color = isBoss 
      ? "border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20"
      : borderColors[(idx + 1) % borderColors.length]; // offset to avoid duplicate color with boss

    const icon = isBoss ? Award : Users;
    const desc = isBoss ? "Quản trị toàn hệ thống" : "Thành viên nhóm";
    const roleLabel = isBoss ? "Sếp" : "Nhân viên";

    return {
      username: user.username,
      name: user.name,
      role: roleLabel,
      desc,
      icon,
      color,
      password: user.password || "123"
    };
  });

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Đăng nhập thất bại.");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Kết nối máy chủ thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (uname: string) => {
    const userObj = dbUsers.find((u) => u.username === uname);
    const userPass = userObj?.password || "123";

    setUsername(uname);
    setPassword(userPass);
    // Trigger submission
    setError("");
    setIsLoading(true);
    fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: uname, password: userPass }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error); });
        return res.json();
      })
      .then((data) => {
        onLoginSuccess(data.user);
      })
      .catch((err) => {
        setError(err.message || "Kết nối máy chủ thất bại.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div id="login-container" className="flex flex-col lg:flex-row w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300">
      
      {/* Left panel - Visual intro */}
      <div className="lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white p-8 lg:p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wider uppercase font-sans">TaskFlow</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-4 leading-snug">
            Quản Lý & Theo Dõi Tiến Độ Công Việc
          </h1>
          <p className="text-indigo-100 text-sm leading-relaxed mb-6">
            Hệ thống quản lý nhiệm vụ thông minh cho phép bạn phân công, 
            cập nhật và theo dõi tiến độ công việc hằng ngày của từng thành viên một cách trực quan, khoa học.
          </p>
        </div>

        <div className="space-y-4 border-t border-white/10 pt-6">
          <div className="flex items-center space-x-3 text-xs text-indigo-200">
            <UserCheck className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>Theo dõi dễ dàng tiến độ công việc của nhân viên</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-indigo-200">
            <BarChart3 className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>Thống kê kết quả công việc hằng ngày, hằng năm</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-indigo-200">
            <History className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>Lưu vết lịch sử cập nhật công việc chi tiết</span>
          </div>
         
        </div>

        <div className="text-xs text-indigo-300/80 mt-8">
          © 2026 Quản lý Tiến độ Công việc. Đã đăng ký bản quyền.
        </div>
      </div>

      {/* Right panel - Form & Quick accounts */}
      <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Đăng Nhập Hệ Thống</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Nhập tài khoản để bắt đầu hoặc chọn nhanh tài khoản thử nghiệm bên dưới.</p>

          {error && (
            <div className="p-3 mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">TÊN ĐĂNG NHẬP</label>
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
                placeholder="Ví dụ: sep, hoang, lan..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">MẬT KHẨU</label>
              <input
                id="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
                placeholder="Nhập mật khẩu (mặc định: 123)"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                disabled={isLoading}
              />
            </div>

            <button
              id="login-submit-btn"
              type="button"
              onClick={() => handleLogin()}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex justify-center items-center text-sm cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </div>

          {/* Quick Login Section */}
          <div className="mt-8">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">ĐĂNG NHẬP NHANH</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 mt-4">
              {displayAccounts.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.username}
                    id={`quick-login-${acc.username}`}
                    type="button"
                    onClick={() => handleQuickLogin(acc.username)}
                    className={`flex items-center justify-between p-3 border rounded-xl text-left transition-all duration-150 ${acc.color}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {acc.name} <span className="text-[10px] font-medium opacity-60">({acc.username})</span>
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{acc.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {acc.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
