/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, Filter, Calendar, CheckCircle2, AlertTriangle, 
  Clock, CheckSquare, Edit, Trash2, LogOut, ChevronLeft, ChevronRight,
  ClipboardList, Activity, Sparkles, MessageSquare, AlertCircle, HelpCircle,
  Eye, CornerDownRight, RefreshCw, UserCheck, Check, CalendarDays, X,
  BarChart3, Users, Key, Shield, Database, Bell
} from "lucide-react";
import { Task, TaskUpdate, TaskType, TaskPriority, TaskStatus, User, AppNotification } from "./types";
import Login from "./components/Login";
import ThemeToggle from "./components/ThemeToggle";
import { 
  StatusPieChart, 
  MemberTaskCountChart 
} from "./components/CustomCharts";
import AnnualStats from "./components/AnnualStats";
import BackupRestore from "./components/BackupRestore";

const TODAY_DATE = "2026-07-05"; // system constant representing current date

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      console.error("Error parsing user from localStorage:", err);
      localStorage.removeItem("user");
      return null;
    }
  });

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // App data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Year Selection & Tab Navigation for statistics
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"board" | "stats" | "employees" | "backup" | "notifications">("board");

  // Dynamic list of available years starting from the earliest task year (or 2026) to current year + 1
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const taskYears = tasks.map(t => t.startDate ? new Date(t.startDate).getFullYear() : null).filter(Boolean) as number[];
    const minYear = taskYears.length > 0 ? Math.min(...taskYears) : 2026;
    const startYear = Math.min(minYear, 2026);
    const endYear = Math.max(startYear, currentYear + 1);
    const list: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
      list.push(y);
    }
    return list;
  }, [tasks]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({ start: "", end: "" });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [updatingTask, setUpdatingTask] = useState<Task | null>(null);
  const [editingUpdate, setEditingUpdate] = useState<TaskUpdate | null>(null);

  // Form fields for Create / Edit Task
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    type: TaskType.REGULAR,
    priority: TaskPriority.MEDIUM,
    startDate: TODAY_DATE,
    dueDate: "",
    assignedTo: [] as string[]
  });

  // Form fields for Task Update
  const [updateForm, setUpdateForm] = useState({
    date: TODAY_DATE,
    progress: 0,
    workDone: "",
    difficulties: "",
    notes: ""
  });

  // Notification Filter State
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "read">("all");

  // Employee Management State
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    username: "",
    password: ""
  });
  const [employeeError, setEmployeeError] = useState("");

  // Custom Dialog State (Alert/Confirm)
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: "alert" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: "alert",
    title: "",
    message: ""
  });

  const showAlert = (title: string, message: string) => {
    setDialog({
      isOpen: true,
      type: "alert",
      title,
      message
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({
      isOpen: true,
      type: "confirm",
      title,
      message,
      onConfirm
    });
  };

  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({ name: "", username: "", password: "" });
    setEmployeeError("");
    setShowEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp: User) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      name: emp.name,
      username: emp.username,
      password: emp.password || "123"
    });
    setEmployeeError("");
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name.trim() || !employeeForm.username.trim() || !employeeForm.password.trim()) {
      setEmployeeError("Vui lòng điền đầy đủ tất cả các thông tin.");
      return;
    }

    try {
      let res;
      if (editingEmployee) {
        // Edit employee
        res = await fetch(`/api/users/${editingEmployee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employeeForm)
        });
      } else {
        // Add employee
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employeeForm)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setEmployeeError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
        return;
      }

      // Success
      setShowEmployeeModal(false);
      fetchData(); // Reload users & tasks
    } catch (err) {
      console.error("Lỗi khi lưu nhân viên:", err);
      setEmployeeError("Không thể kết nối đến máy chủ.");
    }
  };

  const handleDeleteEmployee = (empId: string) => {
    showConfirm(
      "Xác nhận xóa nhân viên",
      "Bạn có chắc chắn muốn xóa nhân viên này? Lưu ý: Chỉ nhân viên chưa được giao nhiệm vụ và chưa có hoạt động nào mới có thể xóa được.",
      async () => {
        try {
          const res = await fetch(`/api/users/${empId}`, {
            method: "DELETE"
          });
          const data = await res.json();
          if (!res.ok) {
            showAlert("Không thể xóa nhân viên", data.error || "Có lỗi xảy ra khi xóa.");
            return;
          }
          fetchData(); // Reload users & tasks
        } catch (err) {
          console.error("Lỗi khi xóa nhân viên:", err);
          showAlert("Lỗi hệ thống", "Không thể kết nối đến máy chủ.");
        }
      }
    );
  };

  // Load theme preference on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Fetch initial data or when user changes
  const fetchData = async (silent = false) => {
    if (!currentUser) return;
    if (!silent) setIsLoading(true);
    try {
      // Fetch users with cache buster to bypass browser caching
      const usersRes = await fetch(`/api/users?_t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      const usersData = await usersRes.json();
      if (Array.isArray(usersData)) {
        setUsers(usersData);
      }

      // Fetch tasks (filtered on server if member) with cache buster
      const tasksUrl = `/api/tasks?userId=${currentUser.id}&role=${currentUser.role}&_t=${Date.now()}`;
      const tasksRes = await fetch(tasksUrl, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      const tasksData = await tasksRes.json();
      if (Array.isArray(tasksData)) {
        setTasks(tasksData);
      }

      // Fetch all updates with cache buster
      const updatesRes = await fetch(`/api/updates?_t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      const updatesData = await updatesRes.json();
      if (Array.isArray(updatesData)) {
        setUpdates(updatesData);
      }

      // Fetch notifications with cache buster
      const notificationsRes = await fetch(`/api/notifications?userId=${currentUser.id}&role=${currentUser.role}&_t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      const notificationsData = await notificationsRes.json();
      if (Array.isArray(notificationsData)) {
        setNotifications(notificationsData);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true })
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Lỗi khi đánh dấu đã đọc:", err);
    }
  };

  const handleToggleNotificationRead = async (id: string, currentIsRead: boolean) => {
    try {
      const nextIsRead = !currentIsRead;
      await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: nextIsRead })
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: nextIsRead } : n))
      );
    } catch (err) {
      console.error("Lỗi khi thay đổi trạng thái đọc thông báo:", err);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (!currentUser) return;
    try {
      await fetch(`/api/notifications/read-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, role: currentUser.role })
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Lỗi khi đánh dấu tất cả đã đọc:", err);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!currentUser) return;
    try {
      await fetch(`/api/notifications/clear-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, role: currentUser.role })
      });
      setNotifications([]);
    } catch (err) {
      console.error("Lỗi khi xóa tất cả thông báo:", err);
    }
  };

  // Sync data on user login/change
  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Reactive auto-updates: Polling, Tab Focus, and Storage Sync across windows/tabs
  useEffect(() => {
    if (!currentUser) return;

    // 1. Background polling every 5 seconds to keep data in-sync across all devices/users
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);

    // 2. Refetch when tab becomes visible or focused (to ensure fresh data when returning)
    const handleFocus = () => {
      fetchData(true);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [currentUser]);

  // Sync auth state (login/logout) in real-time across multiple tabs/frames
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        if (e.newValue) {
          try {
            setCurrentUser(JSON.parse(e.newValue));
          } catch (err) {
            console.error("Lỗi khi đọc thông tin người dùng từ storage:", err);
          }
        } else {
          setCurrentUser(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLoginSuccess = async (user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
    setIsLoading(true);
    try {
      // Fetch users with cache buster to bypass browser caching
      const usersRes = await fetch(`/api/users?_t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      const usersData = await usersRes.json();
      if (Array.isArray(usersData)) {
        setUsers(usersData);
      }

      // Fetch tasks (filtered on server if member) with cache buster
      const tasksUrl = `/api/tasks?userId=${user.id}&role=${user.role}&_t=${Date.now()}`;
      const tasksRes = await fetch(tasksUrl, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      const tasksData = await tasksRes.json();
      if (Array.isArray(tasksData)) {
        setTasks(tasksData);
      }

      // Fetch all updates with cache buster
      const updatesRes = await fetch(`/api/updates?_t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      const updatesData = await updatesRes.json();
      if (Array.isArray(updatesData)) {
        setUpdates(updatesData);
      }

      // Fetch notifications with cache buster
      const notificationsRes = await fetch(`/api/notifications?userId=${user.id}&role=${user.role}&_t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
      });
      const notificationsData = await notificationsRes.json();
      if (Array.isArray(notificationsData)) {
        setNotifications(notificationsData);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu đăng nhập:", err);
    } finally {
      setIsLoading(false);
      setCurrentUser(user);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setCurrentUser(null);
    setTasks([]);
    setUsers([]);
    setUpdates([]);
    setNotifications([]);
    setSelectedTask(null);
    setActiveTab("board");
  };

  // Helper: check if task is overdue
  const isTaskOverdue = (task: Task) => {
    if (task.status === TaskStatus.COMPLETED) return false;
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date(TODAY_DATE);
  };

  // Helper: check if task has update today
  const hasUpdateToday = (taskId: string) => {
    return updates.some(u => u.taskId === taskId && u.date === TODAY_DATE);
  };

  // Filter tasks belonging to the selected year
  const tasksForSelectedYear = useMemo(() => {
    return tasks.filter(t => t.startDate && t.startDate.startsWith(selectedYear.toString()));
  }, [tasks, selectedYear]);

  // Boss stats calculators
  const stats = useMemo(() => {
    const yearTasksList = tasksForSelectedYear;
    const total = yearTasksList.length;
    const inProgress = yearTasksList.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const completed = yearTasksList.filter(t => t.status === TaskStatus.COMPLETED).length;
    const overdue = yearTasksList.filter(isTaskOverdue).length;
    const notUpdatedToday = yearTasksList.filter(t => t.status !== TaskStatus.COMPLETED && !hasUpdateToday(t.id)).length;

    return { total, inProgress, completed, overdue, notUpdatedToday };
  }, [tasksForSelectedYear, updates]);

  // Handle task actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || taskForm.assignedTo.length === 0) {
      showAlert("Cảnh báo", "Vui lòng điền tiêu đề và phân công ít nhất một thành viên.");
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm)
      });
      if (response.ok) {
        setShowCreateModal(false);
        setTaskForm({
          title: "",
          description: "",
          type: TaskType.REGULAR,
          priority: TaskPriority.MEDIUM,
          startDate: TODAY_DATE,
          dueDate: "",
          assignedTo: []
        });
        await fetchData();
      } else {
        const err = await response.json();
        showAlert("Lỗi", err.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      startDate: task.startDate,
      dueDate: task.dueDate || "",
      assignedTo: task.assignedTo
    });
    setShowEditModal(true);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          status: editingTask.status, // Preserve status unless they want to change
          progress: editingTask.progress
        })
      });
      if (response.ok) {
        setShowEditModal(false);
        setEditingTask(null);
        await fetchData();
      } else {
        const err = await response.json();
        showAlert("Lỗi", err.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    showConfirm(
      "Xác nhận xóa nhiệm vụ",
      "Bạn có chắc chắn muốn xóa nhiệm vụ này? Toàn bộ lịch sử cập nhật liên quan cũng sẽ bị xóa.",
      async () => {
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: "DELETE"
          });
          if (response.ok) {
            if (selectedTask?.id === taskId) {
              setSelectedTask(null);
            }
            await fetchData();
          } else {
            showAlert("Không thể xóa", "Không thể xóa nhiệm vụ.");
          }
        } catch (err) {
          console.error(err);
          showAlert("Lỗi hệ thống", "Không thể kết nối đến máy chủ.");
        }
      }
    );
  };

  // Update Progress / Log Action
  const handleOpenUpdateModal = (task: Task, existingUpdate?: TaskUpdate) => {
    setUpdatingTask(task);
    if (existingUpdate) {
      setEditingUpdate(existingUpdate);
      setUpdateForm({
        date: existingUpdate.date,
        progress: existingUpdate.progress,
        workDone: existingUpdate.workDone,
        difficulties: existingUpdate.difficulties || "",
        notes: existingUpdate.notes || ""
      });
    } else {
      setEditingUpdate(null);
      setUpdateForm({
        date: TODAY_DATE,
        progress: task.progress,
        workDone: "",
        difficulties: "",
        notes: ""
      });
    }
    setShowUpdateModal(true);
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingTask) return;
    if (!updateForm.workDone.trim()) {
      showAlert("Cảnh báo", "Vui lòng điền nội dung đã thực hiện.");
      return;
    }

    try {
      let response;
      if (editingUpdate) {
        // Edit current update
        response = await fetch(`/api/updates/${editingUpdate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateForm)
        });
      } else {
        // Post new update
        response = await fetch("/api/updates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updateForm,
            taskId: updatingTask.id,
            userId: currentUser?.id,
            userName: currentUser?.name
          })
        });
      }

      if (response.ok) {
        setShowUpdateModal(false);
        setUpdatingTask(null);
        setEditingUpdate(null);
        await fetchData();
        // Keep selected task updated
        if (selectedTask?.id === updatingTask.id) {
          const updatedTasksRes = await fetch(`/api/tasks/${updatingTask.id}`);
          if (updatedTasksRes.ok) {
            const upTask = await updatedTasksRes.json();
            setSelectedTask(upTask);
          }
        }
      } else {
        const err = await response.json();
        showAlert("Lỗi", err.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Search Logic
  const filteredTasks = useMemo(() => {
    const list = tasksForSelectedYear.filter(task => {
      // 1. Search Query
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            task.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Member filter
      const matchesMember = !filterMember || task.assignedTo.includes(filterMember);

      // 3. Status filter
      let matchesStatus = true;
      if (filterStatus) {
        if (filterStatus === "OVERDUE") {
          matchesStatus = isTaskOverdue(task);
        } else {
          matchesStatus = task.status === filterStatus && !isTaskOverdue(task);
        }
      }

      // 4. Type filter
      const matchesType = !filterType || task.type === filterType;

      // 5. Date filter
      let matchesDate = true;
      if (filterDateRange.start) {
        matchesDate = matchesDate && task.startDate >= filterDateRange.start;
      }
      if (filterDateRange.end) {
        matchesDate = matchesDate && task.startDate <= filterDateRange.end;
      }

      return matchesSearch && matchesMember && matchesStatus && matchesType && matchesDate;
    });

    // Sắp xếp theo thời gian giao giảm dần (nhiệm vụ nào giao sau thì hiện trước)
    return list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [tasksForSelectedYear, searchQuery, filterMember, filterStatus, filterType, filterDateRange]);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;

  // Filter handler changes
  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterMember("");
    setFilterStatus("");
    setFilterType("");
    setFilterDateRange({ start: "", end: "" });
    setCurrentPage(1);
  };

  // Helper for rendering badges
  const getPriorityBadge = (prio: TaskPriority) => {
    switch (prio) {
      case TaskPriority.HIGH:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">Cao</span>;
      case TaskPriority.MEDIUM:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Trung bình</span>;
      case TaskPriority.LOW:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Thấp</span>;
    }
  };

  const getTypeBadge = (type: TaskType) => {
    switch (type) {
      case TaskType.REGULAR:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Thường xuyên</span>;
      case TaskType.LONG_TERM:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Lâu dài</span>;
      case TaskType.INCIDENTAL:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Đột xuất</span>;
    }
  };

  const getStatusBadge = (task: Task) => {
    if (isTaskOverdue(task)) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Quá hạn</span>
        </span>
      );
    }

    switch (task.status) {
      case TaskStatus.NOT_STARTED:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Chưa bắt đầu</span>;
      case TaskStatus.IN_PROGRESS:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Đang tiến hành</span>;
      case TaskStatus.COMPLETED:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Hoàn thành</span>;
      case TaskStatus.PAUSED:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Tạm dừng</span>;
    }
  };

  // Get active updates for the selected task
  const activeTaskUpdates = updates.filter(u => u.taskId === selectedTask?.id);

  // Filter updates based on filtered tasks if selectedTask is not set
  const filteredUpdates = useMemo(() => {
    if (selectedTask) {
      return activeTaskUpdates;
    }
    const filteredTaskIds = new Set(filteredTasks.map(t => t.id));
    return updates.filter(u => filteredTaskIds.has(u.taskId));
  }, [selectedTask, activeTaskUpdates, updates, filteredTasks]);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // Toggle checklist inside description or similar (Optional expansion space)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="absolute top-4 right-4">
          <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
        </div>
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Filter assigned users names
  const getAssignedUserNames = (assignedIds: string[]) => {
    return assignedIds
      .map(id => users.find(u => u.id === id)?.name?.replace(" (Nhân viên)", ""))
      .filter(Boolean)
      .join(", ");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 flex flex-col">
      
      {/* HEADER BAR */}
      <header id="main-header" className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">TaskFlow</span>
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 ml-2 hidden sm:inline border-l border-gray-200 dark:border-gray-800 pl-2">
                Hệ thống Quản lý Tiến độ
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Profile display */}
            <div className="flex items-center space-x-2 bg-gray-100/50 dark:bg-gray-800/50 p-1.5 pr-3.5 rounded-full border border-gray-200/50 dark:border-gray-700/50">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentUser?.avatarColor || "bg-indigo-600 text-white"}`}>
                {currentUser?.name ? currentUser.name.charAt(0) : "U"}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-bold text-gray-800 dark:text-white leading-tight">{currentUser?.name || "Người dùng"}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                  {currentUser?.role === "boss" ? "Trưởng Nhóm" : "Thành viên"}
                </p>
              </div>
            </div>

            <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />

            <button
              id="header-notification-bell-btn"
              onClick={() => setActiveTab("notifications")}
              className={`p-2 rounded-lg border transition-all relative ${
                activeTab === "notifications"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm scale-105"
                  : "text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
              }`}
              title="Thông báo"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-900 leading-none">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            <button
              id="logout-btn"
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 bg-gray-100 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">
        
        {/* WELCOME BANNER */}
        <div className="bg-gradient-to-r from-indigo-550 to-violet-600 bg-indigo-600 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between">
          <div className="absolute right-0 top-0 transform translate-x-12 -translate-y-12 opacity-10">
            <Sparkles className="w-72 h-72" />
          </div>
          <div className="relative z-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-indigo-100">
              {currentUser?.role === "boss" ? "Bảng điều khiển quản lý" : "Không gian thành viên"}
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Xin chào, {currentUser?.name || "Người dùng"}!
            </h2>
            <p className="text-indigo-100 text-sm max-w-xl">
              {currentUser?.role === "boss" 
                ? "Theo dõi trực quan tiến trình các dự án, đánh giá hoạt động hiệu quả của từng thành viên và định hướng phân bổ kế hoạch hằng ngày."
                : "Xem nhanh các nhiệm vụ bạn phụ trách, cập nhật mức hoàn thành của công việc hôm nay và lưu thông tin lịch sử hiệu quả."}
            </p>
          </div>
          <div className="mt-4 md:mt-0 relative z-10 flex items-center space-x-2">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-3 text-center">
              <div className="pr-3 border-r border-white/10">
                <p className="text-[10px] text-indigo-200 font-bold uppercase">Hôm nay</p>
                <p className="text-sm font-black tracking-wider text-white">05 - 07 - 2026</p>
              </div>
              <div className="flex flex-col text-left">
                <label htmlFor="banner-year-select" className="text-[9px] text-indigo-200 font-bold uppercase tracking-wider">Năm Quản Lý</label>
                <select
                  id="banner-year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-white font-extrabold text-xs focus:outline-none focus:ring-0 border-none p-0 cursor-pointer outline-none select-none"
                  style={{ colorScheme: 'dark' }}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y} className="text-gray-950 font-bold bg-white">{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={fetchData}
              disabled={isLoading}
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white rounded-xl border border-white/10 flex items-center justify-center"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ----------------- BOSS VIEW ----------------- */}
        {activeTab === "notifications" ? (
          <div id="notifications-page" className="space-y-6">
            {/* Header / Actions Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800/60">
                <div className="flex items-center space-x-3 pr-8">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                    <Bell className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-950 dark:text-white leading-tight">Trung tâm Thông báo</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {unreadNotifCount > 0 
                        ? `Bạn đang có ${unreadNotifCount} thông báo chưa đọc` 
                        : "Bạn đã xem hết tất cả thông báo"}
                    </p>
                  </div>
                </div>

                {/* Compact Close Button (X) */}
                <button
                  id="notif-btn-back"
                  onClick={() => setActiveTab("board")}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  title="Đóng thông báo và quay lại"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Action Buttons below header - simplified and neat */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  id="notif-btn-read-all"
                  onClick={handleMarkAllNotificationsAsRead}
                  disabled={unreadNotifCount === 0}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-xs font-bold rounded-lg border border-indigo-100/55 dark:border-indigo-900/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Đọc tất cả</span>
                </button>
                <button
                  id="notif-btn-clear-all"
                  onClick={handleClearAllNotifications}
                  disabled={notifications.length === 0}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 text-xs font-bold rounded-lg border border-red-100/55 dark:border-red-900/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa tất cả</span>
                </button>
              </div>
            </div>

            {/* Notifications List Container */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              {/* Filter Tabs inside Notifications container */}
              <div className="p-4 bg-gray-50/50 dark:bg-gray-800/10 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setNotifFilter("all")}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      notifFilter === "all"
                        ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Tất cả ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotifFilter("unread")}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      notifFilter === "unread"
                        ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                        : "text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                    }`}
                  >
                    Chưa đọc ({notifications.filter(n => !n.isRead).length})
                  </button>
                  <button
                    onClick={() => setNotifFilter("read")}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      notifFilter === "read"
                        ? "bg-gray-150 dark:bg-gray-850/50 text-gray-600 dark:text-gray-400"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Đã đọc ({notifications.filter(n => n.isRead).length})
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="divide-y divide-gray-150 dark:divide-gray-800/50">
                {(() => {
                  const filtered = notifications.filter(n => {
                    if (notifFilter === "unread") return !n.isRead;
                    if (notifFilter === "read") return n.isRead;
                    return true;
                  }).sort((a, b) => {
                    const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
                    const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
                    return timeB - timeA;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-12 text-center text-gray-400 dark:text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-gray-700 dark:text-gray-300">Không có thông báo nào</p>
                        <p className="text-xs text-gray-500 font-semibold">Thư mục thông báo của bạn trống.</p>
                      </div>
                    );
                  }

                  return filtered.map((n) => {
                    let typeBg = "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400";
                    let NotifIcon = Bell;

                    if (n.type === "task_assigned") {
                      typeBg = "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400";
                      NotifIcon = Plus;
                    } else if (n.type === "task_updated") {
                      typeBg = "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400";
                      NotifIcon = Edit;
                    } else if (n.type === "progress_update") {
                      typeBg = "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400";
                      NotifIcon = Activity;
                    }

                    return (
                      <div
                        key={n.id}
                        className={`p-4 transition-all hover:bg-gray-50/50 dark:hover:bg-gray-800/10 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          !n.isRead ? "bg-indigo-50/20 dark:bg-indigo-950/5 border-l-4 border-indigo-600" : ""
                        }`}
                      >
                        <div className="flex items-start space-x-3.5">
                          <div className={`p-2.5 rounded-xl shrink-0 ${typeBg}`}>
                            <NotifIcon className="w-5 h-5" />
                          </div>
                          <div className="space-y-1 text-left">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="font-bold text-sm text-gray-950 dark:text-white leading-snug">
                                {n.title}
                              </span>
                              {!n.isRead && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-red-600 text-white leading-none">
                                  Mới
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                              {n.content || n.message}
                            </p>
                            <div className="flex items-center space-x-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold">
                              {n.senderName && (
                                <>
                                  <span>Tác nhân: {n.senderName}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>{new Date(n.createdAt || n.timestamp || new Date()).toLocaleString("vi-VN")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                          <button
                            onClick={() => handleToggleNotificationRead(n.id, n.isRead)}
                            className={`px-2.5 py-1 text-xs font-bold rounded border transition-all cursor-pointer ${
                              n.isRead 
                                ? "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700"
                                : "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900"
                            }`}
                          >
                            {n.isRead ? "Chưa đọc" : "Đã đọc"}
                          </button>
                          {n.taskId && (
                            <button
                              onClick={() => {
                                const task = tasks.find(t => t.id === n.taskId);
                                if (task) {
                                  setSelectedTask(task);
                                  if (!n.isRead) {
                                    handleMarkNotificationAsRead(n.id);
                                  }
                                  setActiveTab("board");
                                } else {
                                  showAlert("Không tìm thấy nhiệm vụ", "Nhiệm vụ liên quan đến thông báo này có thể đã bị xóa.");
                                }
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-xs transition-all cursor-pointer flex items-center space-x-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem nhiệm vụ</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentUser.role === "boss" && (
          <div className="space-y-6">
            
            {/* VIEW TAB CONTROL (Bảng trên cùng của Admin) */}
            <div className="bg-white dark:bg-gray-900 p-2 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full">
              <div className="grid grid-cols-2 md:flex md:items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full">
                <button
                  id="tab-board-btn"
                  onClick={() => setActiveTab("board")}
                  className={`px-3 py-2.5 sm:py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center md:justify-start space-x-1.5 shrink-0 ${
                    activeTab === "board"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/20 dark:hover:bg-gray-700/20"
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Bảng nhiệm vụ</span>
                </button>
                <button
                  id="tab-stats-btn"
                  onClick={() => setActiveTab("stats")}
                  className={`px-3 py-2.5 sm:py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center md:justify-start space-x-1.5 shrink-0 ${
                    activeTab === "stats"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/20 dark:hover:bg-gray-700/20"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Thống kê</span>
                </button>
                <button
                  id="tab-employees-btn"
                  onClick={() => setActiveTab("employees")}
                  className={`px-3 py-2.5 sm:py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center md:justify-start space-x-1.5 shrink-0 ${
                    activeTab === "employees"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/20 dark:hover:bg-gray-700/20"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Nhân viên</span>
                </button>
                <button
                  id="tab-backup-btn"
                  onClick={() => setActiveTab("backup")}
                  className={`px-3 py-2.5 sm:py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center md:justify-start space-x-1.5 shrink-0 ${
                    activeTab === "backup"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/20 dark:hover:bg-gray-700/20"
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Sao lưu</span>
                </button>
              </div>
            </div>

            {activeTab === "stats" ? (
              <AnnualStats
                tasks={tasks}
                users={users}
                selectedYear={selectedYear}
                onSelectYear={setSelectedYear}
              />
            ) : activeTab === "backup" ? (
              <BackupRestore
                currentUser={currentUser}
                onRestoreSuccess={fetchData}
              />
            ) : activeTab === "employees" ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-5 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="font-extrabold text-base text-gray-950 dark:text-white">Danh sách nhân viên</h3>
                      <p className="text-xs text-gray-400">Thêm, sửa đổi hoặc xóa tài khoản nhân viên của nhóm.</p>
                    </div>
                  </div>
                  <button
                    id="add-employee-btn"
                    onClick={handleOpenAddEmployee}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm nhân viên mới</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/40 dark:bg-gray-800/10 border-b border-gray-200/60 dark:border-gray-800/60 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        <th className="px-6 py-3.5">Họ và tên</th>
                        <th className="px-6 py-3.5">Tài khoản</th>
                        <th className="px-6 py-3.5">Mật khẩu</th>
                        <th className="px-6 py-3.5">Chức vụ</th>
                        <th className="px-6 py-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50 text-xs text-gray-700 dark:text-gray-300">
                      {users.map((emp) => {
                        const isCurrentUser = emp.id === currentUser.id;
                        return (
                          <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs select-none ${emp.avatarColor}`}>
                                  {emp.name ? (emp.name.split(" ").slice(-1)[0]?.substring(0, 1).toUpperCase() || "") : ""}
                                </div>
                                <div>
                                  <span className="font-bold text-gray-900 dark:text-white">{emp.name}</span>
                                  {isCurrentUser && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400">Bạn</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-medium text-gray-600 dark:text-gray-400">
                              {emp.username}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs">
                                {emp.password || "123"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {emp.role === "boss" ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  <Shield className="w-3 h-3" />
                                  <span>Trưởng Nhóm</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800 dark:bg-gray-850/50 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
                                  <span>Nhân viên</span>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleOpenEditEmployee(emp)}
                                  disabled={emp.role === "boss"}
                                  className={`p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors ${emp.role === "boss" ? "opacity-30 cursor-not-allowed" : ""}`}
                                  title="Chỉnh sửa thông tin"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                  disabled={emp.role === "boss"}
                                  className={`p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors ${emp.role === "boss" ? "opacity-30 cursor-not-allowed" : ""}`}
                                  title="Xóa nhân viên"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* 1. STATS METRICS ROW */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">Tổng nhiệm vụ</span>
                  <span className="text-2xl font-black text-gray-800 dark:text-white">{stats.total}</span>
                </div>
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <ClipboardList className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">Đang làm</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.inProgress}</span>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">Hoàn thành</span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completed}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">Quá hạn</span>
                  <span className="text-2xl font-black text-red-600 dark:text-red-400">{stats.overdue}</span>
                </div>
                <div className="p-2.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md flex items-center justify-between col-span-2 lg:col-span-1">
                <div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">Chưa cập nhật hôm nay</span>
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.notUpdatedToday}</span>
                </div>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* 2. VISUAL CHARTS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-2 mb-2">
                  <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Trạng thái công việc</h3>
                  <p className="text-[11px] text-gray-500">Tỷ lệ phân bố trạng thái</p>
                </div>
                <div className="flex-1 flex items-center justify-center min-h-[220px]">
                  <StatusPieChart tasks={tasksForSelectedYear} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-2 mb-2">
                  <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Khối lượng công việc</h3>
                  <p className="text-[11px] text-gray-500">Số lượng nhiệm vụ được giao</p>
                </div>
                <div className="flex-1 flex flex-col justify-center min-h-[220px]">
                  <MemberTaskCountChart tasks={tasksForSelectedYear} users={users} />
                </div>
              </div>
            </div>

            {/* 3. TASK LIST WITH ADVANCED FILTERS */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
              
              {/* FILTER ACTION BAR */}
              <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-base text-gray-950 dark:text-white">Bảng tổng hợp nhiệm vụ</h3>
                  </div>
                  <button
                    id="create-task-btn"
                    onClick={() => {
                      setTaskForm({
                        title: "",
                        description: "",
                        type: TaskType.REGULAR,
                        priority: TaskPriority.MEDIUM,
                        startDate: `${selectedYear}-07-05`,
                        dueDate: "",
                        assignedTo: []
                      });
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo nhiệm vụ mới</span>
                  </button>
                </div>

                {/* Filters Input Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-2">
                  
                  {/* Search box */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      id="filter-search-input"
                      type="text"
                      placeholder="Tìm tên, mô tả..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-400"
                    />
                  </div>

                  {/* Member dropdown */}
                  <div className="relative">
                    <select
                      id="filter-member-select"
                      value={filterMember}
                      onChange={(e) => { setFilterMember(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="">-- Lọc theo thành viên --</option>
                      {users.filter(u => u.role === "member").map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status dropdown */}
                  <div className="relative">
                    <select
                      id="filter-status-select"
                      value={filterStatus}
                      onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="">-- Lọc theo trạng thái --</option>
                      <option value={TaskStatus.NOT_STARTED}>Chưa bắt đầu</option>
                      <option value={TaskStatus.IN_PROGRESS}>Đang thực hiện</option>
                      <option value={TaskStatus.COMPLETED}>Hoàn thành</option>
                      <option value={TaskStatus.PAUSED}>Tạm dừng</option>
                      <option value="OVERDUE">Quá hạn</option>
                    </select>
                  </div>

                  {/* Type dropdown */}
                  <div className="relative">
                    <select
                      id="filter-type-select"
                      value={filterType}
                      onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="">-- Lọc theo loại công việc --</option>
                      <option value={TaskType.REGULAR}>Thường xuyên</option>
                      <option value={TaskType.LONG_TERM}>Lâu dài</option>
                      <option value={TaskType.INCIDENTAL}>Đột xuất</option>
                    </select>
                  </div>

                  {/* Date Start Filter */}
                  <div className="flex space-x-1 items-center">
                    <input
                      id="filter-date-start"
                      type="date"
                      value={filterDateRange.start}
                      onChange={(e) => { setFilterDateRange(p => ({ ...p, start: e.target.value })); setCurrentPage(1); }}
                      className="w-full px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-[10px] text-gray-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      title="Ngày bắt đầu từ"
                    />
                    <span className="text-[10px] text-gray-400">đến</span>
                    <input
                      id="filter-date-end"
                      type="date"
                      value={filterDateRange.end}
                      onChange={(e) => { setFilterDateRange(p => ({ ...p, end: e.target.value })); setCurrentPage(1); }}
                      className="w-full px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-[10px] text-gray-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      title="Ngày bắt đầu đến"
                    />
                  </div>
                </div>

                {/* Reset filters */}
                {(searchQuery || filterMember || filterStatus || filterType || filterDateRange.start || filterDateRange.end) && (
                  <div className="flex justify-end">
                    <button
                      id="reset-filters-btn"
                      onClick={handleResetFilters}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <span>Xóa bộ lọc và làm mới</span>
                    </button>
                  </div>
                )}
              </div>

              {/* MAIN DATA TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-[32%] min-w-[240px]">Tên nhiệm vụ</th>
                      <th className="py-3 px-4 w-[18%] min-w-[180px]">Người thực hiện</th>
                      <th className="py-3 px-4 w-[12%] min-w-[110px]">Loại công việc</th>
                      <th className="py-3 px-4 w-[12%] min-w-[110px]">Thời gian giao</th>
                      <th className="py-3 px-4 w-[10%] min-w-[90px]">Tiến độ (%)</th>
                      <th className="py-3 px-4 w-[10%] min-w-[100px]">Hạn hoàn thành</th>
                      <th className="py-3 px-4 w-[10%] min-w-[100px]">Trạng thái</th>
                      <th className="py-3 px-4 w-[6%] min-w-[80px] text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-gray-800/50 text-xs">
                    {paginatedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400 dark:text-gray-500">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <span>Không tìm thấy nhiệm vụ nào thỏa mãn điều kiện lọc.</span>
                        </td>
                      </tr>
                    ) : (
                      paginatedTasks.map((task) => {
                        const isSelected = selectedTask?.id === task.id;
                        return (
                          <tr 
                            key={task.id} 
                            id={`task-row-${task.id}`}
                            className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 cursor-pointer transition-colors ${
                              isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20 font-medium" : ""
                            }`}
                            onClick={() => setSelectedTask(task)}
                          >
                            <td className="py-3 px-4 w-[32%] min-w-[240px] max-w-sm md:max-w-md">
                              <div className="space-y-0.5">
                                <div className="font-bold text-gray-900 dark:text-white line-clamp-2">{task.title}</div>
                                <div className="text-[11px] text-gray-500 line-clamp-2">{task.description}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4 w-[18%] min-w-[180px]">
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {task.assignedTo.map((memberId) => {
                                  const userObj = users.find(u => u.id === memberId);
                                  return (
                                    <span 
                                      key={memberId} 
                                      className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] text-gray-700 dark:text-gray-300 font-medium border border-gray-200/50 dark:border-gray-700"
                                      title={userObj?.name || "Không rõ"}
                                    >
                                      {userObj?.name ? userObj.name.split(" ").pop() : "N/A"}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {getTypeBadge(task.type)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                              {task.createdAt ? new Date(task.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-gray-700 dark:text-gray-300 w-8">{task.progress}%</span>
                                <div className="w-16 bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden shrink-0">
                                  <div 
                                    className={`h-full rounded-full ${
                                      task.progress >= 100 ? "bg-emerald-500" : "bg-indigo-550 bg-indigo-600"
                                    }`} 
                                    style={{ width: `${task.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-400">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{task.dueDate ? task.dueDate : "N/A"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {getStatusBadge(task)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  id={`btn-edit-task-${task.id}`}
                                  onClick={() => handleOpenEditModal(task)}
                                  className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/30 rounded transition-colors"
                                  title="Chỉnh sửa nhiệm vụ"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  id={`btn-delete-task-${task.id}`}
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-950/30 rounded transition-colors"
                                  title="Xóa nhiệm vụ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION BAR */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Hiển thị <span className="font-bold text-gray-800 dark:text-white">{filteredTasks.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> đến{" "}
                  <span className="font-bold text-gray-800 dark:text-white">
                    {Math.min(currentPage * itemsPerPage, filteredTasks.length)}
                  </span>{" "}
                  trong tổng số <span className="font-bold text-gray-800 dark:text-white">{filteredTasks.length}</span> nhiệm vụ
                </p>
                <div className="flex items-center space-x-1">
                  <button
                    id="prev-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg ${
                        currentPage === pageNum 
                          ? "bg-indigo-600 text-white" 
                          : "border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    id="next-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

              </>
            )}

          </div>
        )}

        {/* ----------------- MEMBER VIEW ----------------- */}
        {currentUser.role === "member" && activeTab !== "notifications" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: ACTIVE ASSIGNED TASKS */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
                <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-base text-gray-950 dark:text-white">Nhiệm vụ bạn đang thực hiện</h3>
                  </div>
                  <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold rounded-full">
                    {tasksForSelectedYear.length} Tổng số
                  </span>
                </div>

                {tasksForSelectedYear.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-60" />
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Tuyệt vời! Bạn không có nhiệm vụ tồn đọng.</p>
                    <p className="text-xs text-gray-500">Hãy liên hệ Sếp Nguyễn Văn Hải nếu bạn cần nhận việc mới.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-150 dark:divide-gray-800/50">
                    {tasksForSelectedYear.map((task) => {
                      const isSelected = selectedTask?.id === task.id;
                      const hasLoggedToday = hasUpdateToday(task.id);

                      return (
                        <div
                          key={task.id}
                          id={`member-task-item-${task.id}`}
                          onClick={() => setSelectedTask(task)}
                          className={`p-4 hover:bg-indigo-50/10 cursor-pointer transition-colors ${
                            isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10 border-l-4 border-indigo-600" : ""
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{task.title}</h4>
                                {getPriorityBadge(task.priority)}
                                {getTypeBadge(task.type)}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{task.description}</p>
                            </div>

                            <div className="flex items-center space-x-3 shrink-0 self-end sm:self-auto">
                              <div className="text-right">
                                <p className="text-xs font-bold text-gray-800 dark:text-white">{task.progress}% Hoàn thành</p>
                                <div className="w-24 bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className="bg-indigo-600 h-full rounded-full" 
                                    style={{ width: `${task.progress}%` }}
                                  ></div>
                                </div>
                              </div>

                              <button
                                id={`btn-quick-update-${task.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenUpdateModal(task);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                                  hasLoggedToday 
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95"
                                }`}
                              >
                                {hasLoggedToday ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Đã cập nhật</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Cập nhật</span>
                                  </>
                                )}
                              </button>
                            </div>

                          </div>

                          <div className="flex items-center space-x-4 mt-3 text-[11px] text-gray-400 font-medium">
                            <span className="flex items-center space-x-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              <span>Bắt đầu: {task.startDate}</span>
                            </span>
                            {task.dueDate && (
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5 text-rose-400" />
                                <span className={isTaskOverdue(task) ? "text-red-500 font-bold" : ""}>
                                  Hạn: {task.dueDate} {isTaskOverdue(task) && "(Quá hạn)"}
                                </span>
                              </span>
                            )}
                            <span className="flex items-center space-x-1 border-l border-gray-200 dark:border-gray-800 pl-4">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Phân công cùng: {getAssignedUserNames(task.assignedTo.filter(id => id !== currentUser.id))}</span>
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: RELEVANT METRICS & NOTES */}
            <div className="space-y-6">
              
              {/* MEMBER TODO/DASHBOARD WIDGET */}
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">Tóm tắt công việc của bạn</h3>
                
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100/50 dark:border-indigo-900/50">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Cần làm</span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                      {tasksForSelectedYear.filter(t => t.status !== TaskStatus.COMPLETED).length}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100/50 dark:border-emerald-900/50">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Hoàn thành</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {tasksForSelectedYear.filter(t => t.status === TaskStatus.COMPLETED).length}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800/80 pt-3 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Cần cập nhật hôm nay</span>
                  {tasksForSelectedYear.filter(t => t.status !== TaskStatus.COMPLETED && !hasUpdateToday(t.id)).length === 0 ? (
                    <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tuyệt vời! Bạn đã hoàn thành cập nhật hết tất cả nhiệm vụ hôm nay.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {tasksForSelectedYear.filter(t => t.status !== TaskStatus.COMPLETED && !hasUpdateToday(t.id)).map(t => (
                        <div key={t.id} className="flex items-center justify-between text-xs p-2 bg-rose-500/5 hover:bg-rose-500/10 rounded border border-rose-500/10 font-medium">
                          <span className="font-bold text-gray-800 dark:text-white truncate max-w-[150px]">{t.title}</span>
                          <button
                            id={`btn-remind-update-${t.id}`}
                            onClick={() => handleOpenUpdateModal(t)}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                          >
                            Cập nhật ngay
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RECENT FEEDBACK / NOTES WIDGET */}
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">Các ghi chú gần nhất của nhóm</h3>
                
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {updates.filter(u => {
                    const matchesTask = filteredTasks.some(t => t.id === u.taskId);
                    return u.notes && u.notes.trim() !== "" && matchesTask;
                  }).slice(0, 4).map((up) => {
                    const linkedTask = tasks.find(t => t.id === up.taskId);
                    return (
                      <div key={up.id} className="p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-lg text-xs space-y-1 border border-gray-150 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[10px]">{up.userName}</span>
                          <span className="text-[9px] text-gray-400">{up.date}</span>
                        </div>
                        <p className="italic text-gray-600 dark:text-gray-300">"{up.notes}"</p>
                        {linkedTask && (
                          <div className="text-[10px] text-gray-400 font-semibold truncate pt-1 border-t border-gray-100 dark:border-gray-800">
                            Nhiệm vụ: {linkedTask.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {updates.filter(u => {
                    const matchesTask = filteredTasks.some(t => t.id === u.taskId);
                    return u.notes && u.notes.trim() !== "" && matchesTask;
                  }).length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-4">Chưa có ghi chú nào gần đây.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ----------------- TIMELINE LỊCH SỬ CẬP NHẬT (BOTTOM CONTAINER) ----------------- */}
        <div id="timeline-section" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                <Clock className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-gray-950 dark:text-white">
                  Lịch sử cập nhật tiến độ công việc
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                {selectedTask 
                  ? `Đang hiển thị lịch sử của nhiệm vụ: "${selectedTask.title}"` 
                  : "Chọn một nhiệm vụ từ danh sách phía trên để xem dòng thời gian (timeline) cập nhật chi tiết."}
              </p>
            </div>

            {selectedTask && (
              <button
                id="clear-selected-task-btn"
                onClick={() => setSelectedTask(null)}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-white flex items-center space-x-1"
              >
                <span>Xem tất cả lịch sử</span>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-6">
            
            {/* Timeline component */}
            <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-4 space-y-6">
              
              {filteredUpdates.length === 0 ? (
                <div className="pl-6 text-gray-400 text-xs italic">
                  Không có dữ liệu cập nhật hoặc chưa có thành viên nào báo cáo tiến độ cho công việc này.
                </div>
              ) : (
                filteredUpdates.map((up) => {
                  const isToday = up.date === TODAY_DATE;
                  const isOwnUpdate = currentUser.id === up.userId;
                  const canEdit = isToday && isOwnUpdate;
                  
                  // Find associated task details if looking at all updates
                  const associatedTask = tasks.find(t => t.id === up.taskId);

                  return (
                    <div key={up.id} id={`update-timeline-item-${up.id}`} className="relative pl-6">
                      
                      {/* Circle indicator on timeline */}
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-gray-900 border-2 border-indigo-600 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                      </span>

                      {/* Content Box */}
                      <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-150 dark:border-gray-800 space-y-3 transition-shadow hover:shadow-xs">
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/50 dark:border-gray-700/50 pb-2">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-xs font-black text-gray-900 dark:text-white">{up.userName}</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 text-[10px] font-black rounded-md">
                              Tiến độ: {up.progress}%
                            </span>
                            {isToday && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-bold rounded-md">
                                Hôm nay
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] text-gray-400 font-semibold flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{up.date}</span>
                            </span>
                            {canEdit && (
                              <button
                                id={`edit-update-btn-${up.id}`}
                                onClick={() => {
                                  // Locate the associated task object
                                  const taskObj = tasks.find(t => t.id === up.taskId);
                                  if (taskObj) {
                                    handleOpenUpdateModal(taskObj, up);
                                  }
                                }}
                                className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded bg-white dark:bg-gray-900"
                                title="Chỉnh sửa cập nhật này"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Sửa</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Associated task title if viewing all updates */}
                        {!selectedTask && associatedTask && (
                          <div className="flex items-center text-[11px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/30 dark:bg-indigo-950/10 p-1.5 rounded-lg border border-indigo-100/20">
                            <CornerDownRight className="w-3.5 h-3.5 shrink-0 mr-1" />
                            <span className="truncate">Nhiệm vụ: {associatedTask.title}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                          {/* Work done column */}
                          <div className="md:col-span-8 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nội dung đã thực hiện:</span>
                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                              {up.workDone}
                            </p>
                          </div>

                          {/* Notes column */}
                          <div className="md:col-span-4 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ghi chú:</span>
                            <p className="text-gray-800 dark:text-gray-200 italic whitespace-pre-line">
                              {up.notes && up.notes.trim() !== "" ? (
                                <span>"{up.notes}"</span>
                              ) : (
                                <span className="text-gray-400">Không có</span>
                              )}
                            </p>
                          </div>
                        </div>

                      </div>

                    </div>
                  );
                })
              )}

            </div>

          </div>
        </div>
        </>)}

      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12 py-6 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-400 dark:text-gray-500">
          <div>
            <p className="font-bold text-gray-500 dark:text-gray-400">TaskFlow Enterprise v1.2</p>
            <p className="mt-0.5">Xây dựng để dễ dàng quản lý tiến độ công việc đội ngũ của bạn.</p>
          </div>
          <div className="flex items-center space-x-4">
            <span>Thiết kế đáp ứng cho Máy tính & Điện thoại</span>
            <span>•</span>
            <span>Lưu trữ cục bộ bền vững SQLite & JSON</span>
          </div>
        </div>
      </footer>


      {/* ------------------- MODALS SECTION ------------------- */}

      {/* A. Create Task Modal (Boss Only) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300">
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Tạo Nhiệm Vụ Mới</span>
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">TÊN NHIỆM VỤ *</label>
                <input
                  id="task-title-input"
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ví dụ: Thiết kế giao diện trang chủ..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">MÔ TẢ CHI TIẾT</label>
                <textarea
                  id="task-desc-input"
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Nhập mô tả cụ thể về mục tiêu, yêu cầu..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">LOẠI NHIỆM VỤ</label>
                  <select
                    id="task-type-input"
                    value={taskForm.type}
                    onChange={(e) => setTaskForm(p => ({ ...p, type: e.target.value as TaskType }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={TaskType.REGULAR}>Thường xuyên</option>
                    <option value={TaskType.LONG_TERM}>Lâu dài</option>
                    <option value={TaskType.INCIDENTAL}>Đột xuất</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">MỨC ĐỘ ƯU TIÊN</label>
                  <select
                    id="task-priority-input"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={TaskPriority.HIGH}>Cao</option>
                    <option value={TaskPriority.MEDIUM}>Trung bình</option>
                    <option value={TaskPriority.LOW}>Thấp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">NGÀY BẮT ĐẦU *</label>
                  <input
                    id="task-start-date"
                    type="date"
                    required
                    value={taskForm.startDate}
                    onChange={(e) => setTaskForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">HẠN HOÀN THÀNH (NẾU CÓ)</label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">GIAO CHO (CHỌN NHIỀU THÀNH VIÊN) *</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-800 rounded-lg">
                  {users.filter(u => u.role === "member").map((u) => {
                    const isChecked = taskForm.assignedTo.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                        <input
                          id={`assign-member-${u.id}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setTaskForm(p => ({ ...p, assignedTo: p.assignedTo.filter(id => id !== u.id) }));
                            } else {
                              setTaskForm(p => ({ ...p, assignedTo: [...p.assignedTo, u.id] }));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{u.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  id="cancel-create-btn"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 font-semibold rounded-lg text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  id="submit-create-btn"
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
                >
                  Tạo nhiệm vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. Edit Task Modal (Boss Only) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300">
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center space-x-2">
                <Edit className="w-5 h-5" />
                <span>Chỉnh Sửa Nhiệm Vụ</span>
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">TÊN NHIỆM VỤ *</label>
                <input
                  id="edit-task-title"
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">MÔ TẢ CHI TIẾT</label>
                <textarea
                  id="edit-task-desc"
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">LOẠI NHIỆM VỤ</label>
                  <select
                    id="edit-task-type"
                    value={taskForm.type}
                    onChange={(e) => setTaskForm(p => ({ ...p, type: e.target.value as TaskType }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={TaskType.REGULAR}>Thường xuyên</option>
                    <option value={TaskType.LONG_TERM}>Lâu dài</option>
                    <option value={TaskType.INCIDENTAL}>Đột xuất</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">MỨC ĐỘ ƯU TIÊN</label>
                  <select
                    id="edit-task-priority"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={TaskPriority.HIGH}>Cao</option>
                    <option value={TaskPriority.MEDIUM}>Trung bình</option>
                    <option value={TaskPriority.LOW}>Thấp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">NGÀY BẮT ĐẦU *</label>
                  <input
                    id="edit-task-start"
                    type="date"
                    required
                    value={taskForm.startDate}
                    onChange={(e) => setTaskForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">HẠN HOÀN THÀNH (NẾU CÓ)</label>
                  <input
                    id="edit-task-due"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">GIAO CHO (CHỌN NHIỀU THÀNH VIÊN) *</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-800 rounded-lg">
                  {users.filter(u => u.role === "member").map((u) => {
                    const isChecked = taskForm.assignedTo.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                        <input
                          id={`edit-assign-member-${u.id}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setTaskForm(p => ({ ...p, assignedTo: p.assignedTo.filter(id => id !== u.id) }));
                            } else {
                              setTaskForm(p => ({ ...p, assignedTo: [...p.assignedTo, u.id] }));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{u.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  id="cancel-edit-btn"
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 font-semibold rounded-lg text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  id="submit-edit-btn"
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
                >
                  Lưu nhiệm vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Update Progress Modal (Member Only / Today edit) */}
      {showUpdateModal && updatingTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-lg w-full overflow-hidden transition-all duration-300">
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>
                  {editingUpdate ? "Sửa Bản Cập Nhật Hôm Nay" : "Cập Nhật Tiến Độ Hằng Ngày"}
                </span>
              </h3>
              <button 
                onClick={() => {
                  setShowUpdateModal(false);
                  setUpdatingTask(null);
                  setEditingUpdate(null);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-lg border border-gray-150 dark:border-gray-800 text-xs">
                <p className="font-bold text-gray-800 dark:text-white mb-1">Nhiệm vụ: {updatingTask.title}</p>
                <p className="text-gray-500 leading-normal">{updatingTask.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">NGÀY CẬP NHẬT</label>
                  <input
                    id="update-date-input"
                    type="date"
                    required
                    value={updateForm.date}
                    onChange={(e) => setUpdateForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">TIẾN ĐỘ (%) HOÀN THÀNH</label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="update-progress-range"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={updateForm.progress}
                      onChange={(e) => setUpdateForm(p => ({ ...p, progress: Number(e.target.value) }))}
                      className="w-full accent-indigo-600"
                    />
                    <span className="text-xs font-black w-10 text-right">{updateForm.progress}%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">NỘI DUNG ĐÃ THỰC HIỆN *</label>
                <textarea
                  id="update-workdone-input"
                  rows={3}
                  required
                  placeholder="Mô tả cụ thể hôm nay bạn đã làm được những gì..."
                  value={updateForm.workDone}
                  onChange={(e) => setUpdateForm(p => ({ ...p, workDone: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">GHI CHÚ THÊM (NẾU CÓ)</label>
                <input
                  id="update-notes-input"
                  type="text"
                  placeholder="Ghi chú thêm về dự toán, tài liệu tham khảo..."
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  id="cancel-update-btn"
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setUpdatingTask(null);
                    setEditingUpdate(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 font-semibold rounded-lg text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  id="submit-update-btn"
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
                >
                  {editingUpdate ? "Lưu thay đổi" : "Lưu cập nhật"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. Employee Management Modal (Boss Only) */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-md w-full overflow-hidden transition-all duration-300">
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>{editingEmployee ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới"}</span>
              </h3>
              <button 
                onClick={() => setShowEmployeeModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              {employeeError && (
                <div className="p-3 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 text-xs rounded-lg border border-red-200 dark:border-red-900/50 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{employeeError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Họ và tên *</label>
                <input
                  id="employee-name-input"
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tài khoản đăng nhập *</label>
                <input
                  id="employee-username-input"
                  type="text"
                  required
                  disabled={!!editingEmployee}
                  placeholder="Ví dụ: anv"
                  value={employeeForm.username}
                  onChange={(e) => setEmployeeForm(p => ({ ...p, username: e.target.value }))}
                  className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white ${!!editingEmployee ? "opacity-50 cursor-not-allowed" : ""}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mật khẩu đăng nhập *</label>
                <input
                  id="employee-password-input"
                  type="text"
                  required
                  placeholder="Nhập mật khẩu cho tài khoản..."
                  value={employeeForm.password}
                  onChange={(e) => setEmployeeForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Chức vụ</label>
                <input
                  type="text"
                  disabled
                  value="Nhân viên"
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-205 dark:border-gray-700 rounded-lg text-xs text-gray-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-gray-400 mt-1">Hệ thống phân quyền mặc định chức vụ của tài khoản được tạo là Nhân viên.</p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  id="cancel-employee-btn"
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 font-semibold rounded-lg text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  id="submit-employee-btn"
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Custom Alert / Confirm Dialog */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-sm w-full overflow-hidden transition-all duration-300">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 mb-4">
                {dialog.type === "confirm" ? (
                  <HelpCircle className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>
              
              <h3 className="text-sm font-bold text-gray-950 dark:text-white mb-2">
                {dialog.title}
              </h3>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 whitespace-pre-line leading-relaxed">
                {dialog.message}
              </p>
              
              <div className="flex items-center justify-center space-x-3">
                {dialog.type === "confirm" ? (
                  <>
                    <button
                      onClick={() => setDialog(p => ({ ...p, isOpen: false }))}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 font-bold rounded-lg text-xs transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={() => {
                        setDialog(p => ({ ...p, isOpen: false }));
                        if (dialog.onConfirm) dialog.onConfirm();
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                    >
                      Xác nhận
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setDialog(p => ({ ...p, isOpen: false }))}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                  >
                    Đồng ý
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
