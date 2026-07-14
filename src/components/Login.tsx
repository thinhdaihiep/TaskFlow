/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LogIn, Key, UserCheck, ShieldAlert, Award, Users, BarChart3, History, PlusCircle, ArrowLeft, Building2, X } from "lucide-react";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

interface Group {
  groupId: string;
  groupName: string;
  bossName: string;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("123");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("123");
  const [regGroupName, setRegGroupName] = useState("");

  // Loaded from server/localStorage
  const [groups, setGroups] = useState<Group[]>([]);
  const [loginHistory, setLoginHistory] = useState<User[]>([]);

  // Fetch groups on mount and when registering a new group
  const fetchGroups = () => {
    fetch(`/api/groups?_t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setGroups(data);
        }
      })
      .catch((err) => console.error("Error fetching groups:", err));
  };

  useEffect(() => {
    fetchGroups();
    
    // Load historical logins from localStorage
    try {
      const history = JSON.parse(localStorage.getItem("loginHistory") || "[]");
      if (Array.isArray(history)) {
        const uniqueHistory = history.filter((user, index, self) =>
          index === self.findIndex((u) => u.username === user.username && u.groupId === user.groupId)
        );
        setLoginHistory(uniqueHistory);
      }
    } catch (e) {
      console.error("Error reading login history:", e);
    }
  }, []);

  // Save successful logins to client-side localStorage history
  const saveToLoginHistory = (user: User) => {
    try {
      const history = JSON.parse(localStorage.getItem("loginHistory") || "[]") as User[];
      // Remove matching user and add to top of stack
      const filtered = history.filter(
        (u) => !(u.username === user.username && u.groupId === user.groupId)
      );
      filtered.unshift(user);
      const capped = filtered.slice(0, 5); // Store last 5 accounts
      localStorage.setItem("loginHistory", JSON.stringify(capped));
      setLoginHistory(capped);
    } catch (e) {
      console.error("Error saving login history:", e);
    }
  };

  // Remove a user account from local device storage history
  const removeFromLoginHistory = (usernameToRemove: string, groupIdToRemove?: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const history = JSON.parse(localStorage.getItem("loginHistory") || "[]") as User[];
      const filtered = history.filter(
        (u) => !(u.username === usernameToRemove && u.groupId === (groupIdToRemove || ""))
      );
      localStorage.setItem("loginHistory", JSON.stringify(filtered));
      setLoginHistory(filtered);
    } catch (err) {
      console.error("Error removing from login history:", err);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          username: username.trim().toLowerCase(), 
          password,
          groupId: selectedGroupId || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Đăng nhập thất bại.");
      }

      // Save to device local history
      saveToLoginHistory(data.user);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Kết nối máy chủ thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (user: User) => {
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          username: user.username, 
          password: user.password || "123",
          groupId: user.groupId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Đăng nhập nhanh thất bại.");
      }

      saveToLoginHistory(data.user);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Kết nối máy chủ thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regName.trim() || !regPassword.trim() || !regGroupName.trim()) {
      setError("Vui lòng điền đầy đủ tất cả thông tin để tạo nhóm mới.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: regUsername.trim().toLowerCase(),
          name: regName.trim(),
          password: regPassword,
          groupName: regGroupName.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể đăng ký nhóm mới.");
      }

      setSuccessMsg("Tạo nhóm mới thành công! Đang tự động đăng nhập...");
      
      // Save and login
      saveToLoginHistory(data);
      setTimeout(() => {
        onLoginSuccess(data);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Đăng ký nhóm thất bại.");
      setIsLoading(false);
    }
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
            Hệ thống làm việc cộng tác đa nhóm thông minh. Mỗi Sếp quản lý duy nhất một nhóm làm việc riêng biệt, 
            bảo mật thông tin tối đa và đồng bộ hóa trực tiếp giữa Web và Thiết bị di động.
          </p>
        </div>

        <div className="space-y-4 border-t border-white/10 pt-6">
          <div className="flex items-center space-x-3 text-xs text-indigo-200">
            <Building2 className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>Phân tách không gian làm việc an toàn theo Nhóm</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-indigo-200">
            <UserCheck className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>Sếp chủ động cấp tài khoản và quản lý thành viên</span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-indigo-200">
            <BarChart3 className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>Theo dõi tiến độ, xem báo cáo, biểu đồ trực quan</span>
          </div>
        </div>

        <div className="text-xs text-indigo-300/80 mt-8">
          © 2026 Quản lý Tiến độ Công việc. Đã đăng ký bản quyền.
        </div>
      </div>

      {/* Right panel - Form & Quick accounts */}
      <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          
          {mode === "login" ? (
            /* ================= LOGIN MODE ================= */
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Đăng Nhập</h2>
                <button
                  id="switch-to-register-btn"
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center space-x-1"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Tạo nhóm mới</span>
                </button>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Nhập tài khoản hoặc chọn từ danh sách tài khoản đã đăng nhập trước đó.
              </p>

              {error && (
                <div className="p-3 mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 mb-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-xs">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    CHỌN NHÓM
                  </label>
                  <select
                    id="login-group-select"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                    disabled={isLoading}
                  >
                    <option value="">-- Chọn nhóm làm việc --</option>
                    {groups.map((g) => (
                      <option key={g.groupId} value={g.groupId}>
                        {g.groupName} ({g.bossName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    TÊN ĐĂNG NHẬP
                  </label>
                  <input
                    id="login-username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tên đăng nhập"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    MẬT KHẨU
                  </label>
                  <input
                    id="login-password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                    disabled={isLoading}
                  />
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex justify-center items-center text-sm cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Đăng nhập"
                  )}
                </button>
              </form>

              {/* Quick Login Section (Only previously logged-in accounts) */}
              <div className="mt-8">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    ĐĂNG NHẬP NHANH (ĐÃ LƯU TRÊN THIẾT BỊ)
                  </span>
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                </div>

                {loginHistory.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 mt-4 max-h-[220px] overflow-y-auto pr-1">
                    {loginHistory.map((user) => {
                      const isBoss = user.role === "boss";
                      const borderCol = isBoss 
                        ? "border-indigo-500 bg-indigo-50/5 hover:bg-indigo-50/20" 
                        : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50";
                      
                      return (
                        <div
                          key={`${user.username}-${user.groupId || ""}`}
                          className="relative flex items-center w-full"
                        >
                          <button
                            id={`quick-login-${user.username}`}
                            type="button"
                            onClick={() => handleQuickLogin(user)}
                            className={`flex-grow flex items-center justify-between p-3 border rounded-xl text-left transition-all duration-150 pr-10 ${borderCol}`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                                {isBoss ? <Award className="w-4 h-4 text-indigo-500" /> : <Users className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-900 dark:text-white">
                                  {user.name} <span className="text-[10px] font-normal text-gray-500">({user.username})</span>
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                  Nhóm: {user.groupName || "Ban Bản đồ"}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 mr-2 shrink-0">
                              {isBoss ? "Sếp" : "Nhân viên"}
                            </span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={(e) => removeFromLoginHistory(user.username, user.groupId, e)}
                            className="absolute right-3 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all z-10 cursor-pointer"
                            title="Xóa tài khoản này khỏi lịch sử lưu trên máy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl mt-4">
                    Chưa có tài khoản nào đăng nhập trên trình duyệt/thiết bị này.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= REGISTER MODE (TẠO NHÓM MỚI) ================= */
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <button
                  id="register-back-btn"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tạo Nhóm Mới</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Tạo không gian làm việc mới với vai trò Sếp để phân công nhiệm vụ và quản lý nhân viên của bạn.
              </p>

              {error && (
                <div className="p-3 mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    HỌ VÀ TÊN SẾP (TRƯỞNG NHÓM)
                  </label>
                  <input
                    id="register-boss-name-input"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Bá Long"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    TÊN ĐĂNG NHẬP CỦA SẾP
                  </label>
                  <input
                    id="register-boss-username-input"
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Tên đăng nhập (sẽ làm ID nhóm làm việc)"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    disabled={isLoading}
                  />
                  <p className="text-[10px] text-indigo-500 mt-1">
                    * Lưu ý: Tên đăng nhập này sẽ dùng làm mã nhóm (groupId) để kết nối nhân viên của bạn.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    TÊN NHÓM / PHÒNG BAN QUẢN LÝ
                  </label>
                  <input
                    id="register-group-name-input"
                    type="text"
                    required
                    value={regGroupName}
                    onChange={(e) => setRegGroupName(e.target.value)}
                    placeholder="Ví dụ: Phòng Dự Án IT, Tổ Kỹ Thuật..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    MẬT KHẨU
                  </label>
                  <input
                    id="register-password-input"
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Đặt mật khẩu đăng nhập"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    disabled={isLoading}
                  />
                </div>

                <button
                  id="register-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex justify-center items-center text-sm cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Tạo nhóm & Đăng nhập ngay"
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
