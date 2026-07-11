/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TaskType {
  REGULAR = "Nhiệm vụ thường xuyên",
  LONG_TERM = "Nhiệm vụ lâu dài",
  INCIDENTAL = "Nhiệm vụ đột xuất"
}

export enum TaskPriority {
  HIGH = "Cao",
  MEDIUM = "Trung bình",
  LOW = "Thấp"
}

declare global {
  interface Window {
    AndroidApp?: {
      onLoginSuccess: (userId: string, userRole: string) => void;
      onLogout: () => void;
    };
  }
}

export enum TaskStatus {
  NOT_STARTED = "Chưa bắt đầu",
  IN_PROGRESS = "Đang thực hiện",
  COMPLETED = "Hoàn thành",
  PAUSED = "Tạm dừng",
  OVERDUE = "Quá hạn"
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: "boss" | "member";
  avatarColor: string;
  password?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string; // YYYY-MM-DD
  dueDate?: string;  // YYYY-MM-DD (optional)
  assignedTo: string[]; // List of user IDs
  progress: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
  lastUpdatedToday?: boolean; // dynamic field computed in backend/client
}

export interface TaskUpdate {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  progress: number; // % complete
  workDone: string;
  difficulties?: string;
  notes?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  message?: string; // Optional field for perfect android compatibility
  updateId?: string; // Link to the specific task update to prevent duplicate notifications
  type?: "progress_update" | "task_assigned" | "task_updated";
  taskId?: string;
  senderId?: string;
  senderName?: string;
  receiverId?: string; // memberId, or "boss" (which maps to all boss notifications)
  createdAt?: string;
  isRead: boolean;
  targetRole?: "boss" | "member" | "all"; // Support Android format
  targetUserId?: string; // Support Android format
  timestamp?: string; // Support Android format
  isDeleted?: boolean;
}

export interface AppState {
  tasks: Task[];
  updates: TaskUpdate[];
}

