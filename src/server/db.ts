/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { Task, TaskUpdate, TaskType, TaskPriority, TaskStatus, User, AppNotification } from "../types";

const DB_PATH = path.join(process.cwd(), "database.json");
const RTDB_URL = "https://goal-server-default-rtdb.asia-southeast1.firebasedatabase.app/.json";

// Static users list (fallback matching the current Firebase DB users)
export const USERS: User[] = [
  { id: "longnb", username: "longnb", name: "Nguyễn Bá Long", role: "boss", avatarColor: "bg-indigo-600 text-white" },
  { id: "hienvn", username: "hienvn", name: "Võ Ngọc Hiền", role: "member", avatarColor: "bg-emerald-600 text-white" },
  { id: "thinhnv", username: "thinhnv", name: "Ngô Văn Thịnh", role: "member", avatarColor: "bg-amber-600 text-white" },
  { id: "vinhtq", username: "vinhtq", name: "Trần Quang Vinh", role: "member", avatarColor: "bg-rose-600 text-white" },
  { id: "tuannv", username: "tuannv", name: "Nguyễn Văn Tuấn", role: "member", avatarColor: "bg-blue-600 text-white" },
  { id: "chinhpv", username: "chinhpv", name: "Phạm Văn Chinh", role: "member", avatarColor: "bg-violet-600 text-white" },
  { id: "thuanlt", username: "thuanlt", name: "Lã Thanh Thuân", role: "member", avatarColor: "bg-teal-600 text-white" }
];

export interface DBState {
  tasks: Task[];
  updates: TaskUpdate[];
  users: User[];
  notifications: AppNotification[];
  chat?: {
    txt: string;
  };
}

const CHAT_REQUIREMENTS = `YEU CAU DONG BO THONG BAO GIUA WEB VA ANDROID:
1. Cau truc notification phai dong bo:
   - id: string (bat ky)
   - title: string
   - content: string (noi dung thong bao)
   - message: string (phat trien song song voi content de dam bao tuong thich 100% voi ca 2 ung dung)
   - type: 'progress_update' | 'task_assigned' | 'task_updated'
   - taskId: string
   - senderId: string
   - senderName: string
   - receiverId: string (userId nhan vien, hoac 'boss' de gui cho tat ca sep)
   - createdAt: string (dinh dang ISO, VD: 2026-07-05T12:00:00.000Z)
   - isRead: boolean

2. Luong hoat dong:
   - Khi Android App cap nhat tien do (gui record updates hoac update task), can tao ra thong bao tuong ung gui cho 'boss' de Sep co the nhan thong bao tuc thi.
   - Khi Web App duoc Sep dung de giao viec, cap nhat thong tin, Web App se tu dong tao thong bao cho nhan vien tuong ung va update len Firebase RTDB.
   - Ca hai ung dung thuc hien dong bo va tu dong polling moi 5s tu Firebase Realtime Database de dam bao thoi gian thuc.`;

export function getSeededDatabaseState(): DBState {
  const seededUsers: User[] = USERS.map(u => ({ ...u, password: "123" }));
  
  const tasks: Task[] = [
    {
      id: "task_1",
      title: "Xây dựng tài liệu đặc tả hệ thống",
      description: "Nghiên cứu yêu cầu hệ thống và lập tài liệu đặc tả chức năng chi tiết cho toàn bộ dự án.",
      type: TaskType.REGULAR,
      priority: TaskPriority.HIGH,
      status: TaskStatus.COMPLETED,
      assignedTo: ["hienvn"],
      progress: 100,
      startDate: "2026-07-01",
      dueDate: "2026-07-20",
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-10T15:00:00.000Z"
    },
    {
      id: "task_2",
      title: "Thiết kế cơ sở dữ liệu và API",
      description: "Thiết kế các bảng dữ liệu trên PostgreSQL và xây dựng các API cơ bản cho ứng dụng di động.",
      type: TaskType.REGULAR,
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      assignedTo: ["thinhnv"],
      progress: 60,
      startDate: "2026-07-02",
      dueDate: "2026-07-25",
      createdAt: "2026-07-02T09:00:00.000Z",
      updatedAt: "2026-07-07T16:00:00.000Z"
    },
    {
      id: "task_3",
      title: "Phát triển module Đăng ký & Đăng nhập",
      description: "Tích hợp Firebase Auth và xây dựng màn hình Đăng nhập/Đăng ký trên ứng dụng di động.",
      type: TaskType.LONG_TERM,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.IN_PROGRESS,
      assignedTo: ["vinhtq", "tuannv"],
      progress: 40,
      startDate: "2026-07-03",
      dueDate: "2026-07-28",
      createdAt: "2026-07-03T10:00:00.000Z",
      updatedAt: "2026-07-07T14:00:00.000Z"
    },
    {
      id: "task_4",
      title: "Thiết kế UI/UX ứng dụng di động",
      description: "Hoàn thiện thiết kế Figma giao diện các màn hình chính và chuyển giao tài nguyên cho đội phát triển.",
      type: TaskType.REGULAR,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.COMPLETED,
      assignedTo: ["chinhpv"],
      progress: 100,
      startDate: "2026-07-01",
      dueDate: "2026-07-15",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-08T11:00:00.000Z"
    },
    {
      id: "task_5",
      title: "Kiểm thử tự động & Viết test case",
      description: "Lập danh sách test case chi tiết và thiết lập môi trường kiểm thử tự động (Unit Test & Integration Test).",
      type: TaskType.INCIDENTAL,
      priority: TaskPriority.LOW,
      status: TaskStatus.NOT_STARTED,
      assignedTo: ["thuanlt"],
      progress: 0,
      startDate: "2026-07-05",
      dueDate: "2026-08-05",
      createdAt: "2026-07-05T11:00:00.000Z",
      updatedAt: "2026-07-05T11:00:00.000Z"
    }
  ];

  const updates: TaskUpdate[] = [
    {
      id: "up_1",
      taskId: "task_1",
      userId: "hienvn",
      userName: "Võ Ngọc Hiền",
      date: "2026-07-05",
      progress: 50,
      workDone: "Đã hoàn thành 50% tài liệu, đã xong phần phác thảo sơ đồ Usecase và luồng dữ liệu.",
      createdAt: "2026-07-05T09:00:00.000Z"
    },
    {
      id: "up_2",
      taskId: "task_1",
      userId: "hienvn",
      userName: "Võ Ngọc Hiền",
      date: "2026-07-10",
      progress: 100,
      workDone: "Đã hoàn thành 100% tài liệu đặc tả và gửi sếp phê duyệt thành công.",
      createdAt: "2026-07-10T15:00:00.000Z"
    },
    {
      id: "up_3",
      taskId: "task_2",
      userId: "thinhnv",
      userName: "Ngô Văn Thịnh",
      date: "2026-07-06",
      progress: 30,
      workDone: "Đã thiết kế xong cấu trúc các bảng cơ sở dữ liệu quan hệ.",
      createdAt: "2026-07-06T10:30:00.000Z"
    },
    {
      id: "up_4",
      taskId: "task_2",
      userId: "thinhnv",
      userName: "Ngô Văn Thịnh",
      date: "2026-07-07",
      progress: 60,
      workDone: "Hoần thành 3/5 API chính, đang tiến hành kết nối với database để kiểm thử luồng dữ liệu.",
      createdAt: "2026-07-07T16:00:00.000Z"
    },
    {
      id: "up_5",
      taskId: "task_3",
      userId: "vinhtq",
      userName: "Trần Quang Vinh",
      date: "2026-07-07",
      progress: 40,
      workDone: "Vinh và Tuấn đã thiết kế xong giao diện Đăng nhập, đang liên kết logic với Firebase Auth.",
      createdAt: "2026-07-07T14:00:00.000Z"
    },
    {
      id: "up_6",
      taskId: "task_4",
      userId: "chinhpv",
      userName: "Phạm Văn Chinh",
      date: "2026-07-08",
      progress: 100,
      workDone: "Đã thiết kế xong 15 màn hình giao diện di động trên Figma và bàn giao toàn bộ tài nguyên cho đội Dev.",
      createdAt: "2026-07-08T11:00:00.000Z"
    }
  ];

  const notifications: AppNotification[] = [
    {
      id: "notif_seed_1",
      title: "📈 Báo cáo tiến độ mới",
      content: "Nhân viên Võ Ngọc Hiền vừa báo cáo tiến độ 50% cho công việc \"Xây dựng tài liệu đặc tả hệ thống\".",
      message: "Nhân viên Võ Ngọc Hiền vừa báo cáo tiến độ 50% cho công việc \"Xây dựng tài liệu đặc tả hệ thống\".",
      updateId: "up_1",
      type: "progress_update",
      taskId: "task_1",
      senderId: "hienvn",
      senderName: "Võ Ngọc Hiền",
      receiverId: "boss",
      targetRole: "boss",
      isRead: false,
      createdAt: "2026-07-05T09:00:00.000Z",
      timestamp: "2026-07-05T09:00:00.000Z"
    },
    {
      id: "notif_seed_2",
      title: "📈 Báo cáo tiến độ mới",
      content: "Nhân viên Võ Ngọc Hiền vừa báo cáo tiến độ 100% cho công việc \"Xây dựng tài liệu đặc tả hệ thống\".",
      message: "Nhân viên Võ Ngọc Hiền vừa báo cáo tiến độ 100% cho công việc \"Xây dựng tài liệu đặc tả hệ thống\".",
      updateId: "up_2",
      type: "progress_update",
      taskId: "task_1",
      senderId: "hienvn",
      senderName: "Võ Ngọc Hiền",
      receiverId: "boss",
      targetRole: "boss",
      isRead: false,
      createdAt: "2026-07-10T15:00:00.000Z",
      timestamp: "2026-07-10T15:00:00.000Z"
    },
    {
      id: "notif_seed_3",
      title: "📈 Báo cáo tiến độ mới",
      content: "Nhân viên Ngô Văn Thịnh vừa báo cáo tiến độ 30% cho công việc \"Thiết kế cơ sở dữ liệu và API\".",
      message: "Nhân viên Ngô Văn Thịnh vừa báo cáo tiến độ 30% cho công việc \"Thiết kế cơ sở dữ liệu và API\".",
      updateId: "up_3",
      type: "progress_update",
      taskId: "task_2",
      senderId: "thinhnv",
      senderName: "Ngô Văn Thịnh",
      receiverId: "boss",
      targetRole: "boss",
      isRead: false,
      createdAt: "2026-07-06T10:30:00.000Z",
      timestamp: "2026-07-06T10:30:00.000Z"
    },
    {
      id: "notif_seed_4",
      title: "📈 Báo cáo tiến độ mới",
      content: "Nhân viên Ngô Văn Thịnh vừa báo cáo tiến độ 60% cho công việc \"Thiết kế cơ sở dữ liệu và API\".",
      message: "Nhân viên Ngô Văn Thịnh vừa báo cáo tiến độ 60% cho công việc \"Thiết kế cơ sở dữ liệu và API\".",
      updateId: "up_4",
      type: "progress_update",
      taskId: "task_2",
      senderId: "thinhnv",
      senderName: "Ngô Văn Thịnh",
      receiverId: "boss",
      targetRole: "boss",
      isRead: false,
      createdAt: "2026-07-07T16:00:00.000Z",
      timestamp: "2026-07-07T16:00:00.000Z"
    },
    {
      id: "notif_seed_5",
      title: "📈 Báo cáo tiến độ mới",
      content: "Nhân viên Trần Quang Vinh vừa báo cáo tiến độ 40% cho công việc \"Phát triển module Đăng ký & Đăng nhập\".",
      message: "Nhân viên Trần Quang Vinh vừa báo cáo tiến độ 40% cho công việc \"Phát triển module Đăng ký & Đăng nhập\".",
      updateId: "up_5",
      type: "progress_update",
      taskId: "task_3",
      senderId: "vinhtq",
      senderName: "Trần Quang Vinh",
      receiverId: "boss",
      targetRole: "boss",
      isRead: false,
      createdAt: "2026-07-07T14:00:00.000Z",
      timestamp: "2026-07-07T14:00:00.000Z"
    },
    {
      id: "notif_seed_6",
      title: "📈 Báo cáo tiến độ mới",
      content: "Nhân viên Phạm Văn Chinh vừa báo cáo tiến độ 100% cho công việc \"Thiết kế UI/UX ứng dụng di động\".",
      message: "Nhân viên Phạm Văn Chinh vừa báo cáo tiến độ 100% cho công việc \"Thiết kế UI/UX ứng dụng di động\".",
      updateId: "up_6",
      type: "progress_update",
      taskId: "task_4",
      senderId: "chinhpv",
      senderName: "Phạm Văn Chinh",
      receiverId: "boss",
      targetRole: "boss",
      isRead: false,
      createdAt: "2026-07-08T11:00:00.000Z",
      timestamp: "2026-07-08T11:00:00.000Z"
    }
  ];

  return {
    tasks,
    updates,
    users: seededUsers,
    notifications,
    chat: {
      txt: CHAT_REQUIREMENTS
    }
  };
}

const DEFAULT_STATE: DBState = getSeededDatabaseState();

export function ensureDatabaseConsistency(state: DBState): DBState {
  if (!state.tasks || !state.updates) return state;

  const updatedTasks = state.tasks.map(task => {
    const taskUpdates = (state.updates || []).filter(u => u.taskId === task.id);
    if (taskUpdates.length > 0) {
      // Find latest update by date, then by createdAt
      const latestUpdate = taskUpdates.reduce((latest, current) => {
        const timeLatest = new Date(latest.createdAt || latest.date || 0).getTime();
        const timeCurrent = new Date(current.createdAt || current.date || 0).getTime();
        return timeCurrent > timeLatest ? current : latest;
      });

      const latestProgress = Number(latestUpdate.progress);
      if (task.progress !== latestProgress) {
        // Auto calculate status based on progress
        let updatedStatus = task.status;
        if (latestProgress >= 100) {
          updatedStatus = TaskStatus.COMPLETED;
        } else if (latestProgress > 0 && (task.status === TaskStatus.NOT_STARTED || task.status === TaskStatus.COMPLETED)) {
          updatedStatus = TaskStatus.IN_PROGRESS;
        }

        console.log(`[Consistency Engine] Syncing task "${task.title}" (${task.id}) progress from ${task.progress}% to ${latestProgress}% based on latest update (${latestUpdate.id})`);
        return {
          ...task,
          progress: latestProgress,
          status: updatedStatus,
          updatedAt: new Date().toISOString()
        };
      }
    }
    return task;
  });

  return {
    ...state,
    tasks: updatedTasks
  };
}

// In-memory cache to ensure fast synchronous reads for Express routes
let inMemoryState: DBState = DEFAULT_STATE;

// Load initial state from local file if it exists, otherwise use DEFAULT_STATE
try {
  if (fs.existsSync(DB_PATH)) {
    const content = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(content) as DBState;
    const consistent = ensureDatabaseConsistency(parsed);
    inMemoryState = consistent;
    if (JSON.stringify(parsed) !== JSON.stringify(consistent)) {
      console.log("[Seeder] Writing back synchronized database state on boot...");
      fs.writeFileSync(DB_PATH, JSON.stringify(consistent, null, 2), "utf-8");
    }
  } else {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_STATE, null, 2), "utf-8");
    inMemoryState = DEFAULT_STATE;
  }
  
  // Force reset and update if the new boss user "longnb" is not present
  if (!inMemoryState.users || !inMemoryState.users.some(u => u.username === "longnb")) {
    console.log("[Seeder] Force-resetting database with the new users and clean Vietnamese IT tasks...");
    inMemoryState = DEFAULT_STATE;
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_STATE, null, 2), "utf-8");
    uploadToFirebase(DEFAULT_STATE).catch(err => {
      console.error("[Seeder] Initial upload to Firebase failed:", err);
    });
  }
} catch (error) {
  console.error("Error initializing local database file:", error);
}

// Detect and automatically generate notifications for the boss when changes occur from external devices (e.g., Android App)
function detectAndGenerateNotifications(incomingState: DBState): boolean {
  let changed = false;
  if (!incomingState.notifications) {
    incomingState.notifications = [];
  }
  if (!incomingState.updates) {
    incomingState.updates = [];
  }
  if (!incomingState.tasks) {
    incomingState.tasks = [];
  }

  // 1. Check for missing notifications from the 'updates' array
  for (const update of incomingState.updates) {
    const task = incomingState.tasks.find(t => t.id === update.taskId);
    if (!task) continue;

    // Check if there is already a notification for this progress update
    const hasNotification = incomingState.notifications.some(n => 
      n.updateId === update.id ||
      (n.taskId === update.taskId &&
       n.senderId === update.userId &&
       n.type === "progress_update" &&
       (n.content.includes(`${update.progress}%`) || (n.message && n.message.includes(`${update.progress}%`))))
    );

    if (!hasNotification) {
      const newNotif: AppNotification = {
        id: "notif_" + Math.random().toString(36).substr(2, 9),
        title: "Cập nhật tiến độ mới",
        content: `${update.userName} đã cập nhật tiến độ nhiệm vụ "${task.title}" lên ${update.progress}%.`,
        message: `${update.userName} đã cập nhật tiến độ nhiệm vụ "${task.title}" lên ${update.progress}%.`,
        updateId: update.id,
        type: "progress_update",
        taskId: update.taskId,
        senderId: update.userId,
        senderName: update.userName,
        receiverId: "boss",
        createdAt: update.createdAt || new Date().toISOString(),
        isRead: false
      };
      incomingState.notifications.unshift(newNotif);
      changed = true;
      console.log(`[Notification Engine] Auto-generated notification for progress update of task "${task.title}" to ${update.progress}%`);
    }
  }

  // 2. Check for tasks whose progress/status has changed but no notification exists yet
  for (const task of incomingState.tasks) {
    const oldTask = inMemoryState.tasks?.find(t => t.id === task.id);
    if (oldTask) {
      if (task.progress !== oldTask.progress || task.status !== oldTask.status) {
        const progressStr = `${task.progress}%`;
        const hasNotification = incomingState.notifications.some(n =>
          n.taskId === task.id &&
          n.type === "progress_update" &&
          (n.content.includes(progressStr) || (n.message && n.message.includes(progressStr)))
        );

        if (!hasNotification) {
          const assignedUser = incomingState.users.find(u => task.assignedTo?.includes(u.id)) || { id: "system", name: "Thành viên" };
          
          const newNotif: AppNotification = {
            id: "notif_" + Math.random().toString(36).substr(2, 9),
            title: "Cập nhật tiến độ mới",
            content: `${assignedUser.name} đã cập nhật tiến độ nhiệm vụ "${task.title}" lên ${progressStr}.`,
            message: `${assignedUser.name} đã cập nhật tiến độ nhiệm vụ "${task.title}" lên ${progressStr}.`,
            type: "progress_update",
            taskId: task.id,
            senderId: assignedUser.id,
            senderName: assignedUser.name,
            receiverId: "boss",
            createdAt: new Date().toISOString(),
            isRead: false
          };
          incomingState.notifications.unshift(newNotif);
          changed = true;
          console.log(`[Notification Engine] Auto-generated notification for direct task progress change of "${task.title}" to ${progressStr}`);
        }
      }
    }
  }

  if (incomingState.notifications.length > 100) {
    incomingState.notifications = incomingState.notifications.slice(0, 100);
  }

  return changed;
}

let isSyncing = false;

// Helper to merge local and remote DB states safely without losing data from either platform
function mergeStates(local: DBState, remote: DBState): DBState {
  // 1. Merge Users: Union by ID to prevent losing accounts
  const usersMap = new Map<string, User>();
  (remote.users || []).forEach(u => usersMap.set(u.id, u));
  (local.users || []).forEach(u => usersMap.set(u.id, u));
  const mergedUsers = Array.from(usersMap.values());

  // 2. Merge Tasks: Compare updatedAt and keep the newest one (Last-Write-Wins)
  const tasksMap = new Map<string, Task>();
  (remote.tasks || []).forEach(t => tasksMap.set(t.id, t));
  (local.tasks || []).forEach(t => {
    const existing = tasksMap.get(t.id);
    if (!existing) {
      tasksMap.set(t.id, t);
    } else {
      const remoteTime = new Date(existing.updatedAt || 0).getTime();
      const localTime = new Date(t.updatedAt || 0).getTime();
      if (localTime >= remoteTime) {
        tasksMap.set(t.id, t);
      }
    }
  });
  const mergedTasks = Array.from(tasksMap.values());

  // 3. Merge Updates: Union by ID, resolve duplicates by createdAt (newest wins)
  const updatesMap = new Map<string, TaskUpdate>();
  (remote.updates || []).forEach(u => updatesMap.set(u.id, u));
  (local.updates || []).forEach(u => {
    const existing = updatesMap.get(u.id);
    if (!existing) {
      updatesMap.set(u.id, u);
    } else {
      const remoteTime = new Date(existing.createdAt || 0).getTime();
      const localTime = new Date(u.createdAt || 0).getTime();
      if (localTime >= remoteTime) {
        updatesMap.set(u.id, u);
      }
    }
  });
  const mergedUpdates = Array.from(updatesMap.values());

  // 4. Merge Notifications: Union by ID. If either marked as read (isRead = true), keep it true to avoid revert.
  const notificationsMap = new Map<string, AppNotification>();
  (remote.notifications || []).forEach(n => notificationsMap.set(n.id, n));
  (local.notifications || []).forEach(n => {
    const existing = notificationsMap.get(n.id);
    if (!existing) {
      notificationsMap.set(n.id, n);
    } else {
      const mergedNotif = { ...existing, ...n };
      // Keep isRead true if either platform marked it as read
      mergedNotif.isRead = existing.isRead || n.isRead;
      // Keep isDeleted true if either platform marked it as deleted
      mergedNotif.isDeleted = existing.isDeleted || n.isDeleted;
      mergedNotif.content = n.content || existing.content;
      mergedNotif.message = n.message || existing.message || n.content || existing.content;
      notificationsMap.set(n.id, mergedNotif);
    }
  });
  const mergedNotifications = Array.from(notificationsMap.values());

  return ensureDatabaseConsistency({
    tasks: mergedTasks,
    updates: mergedUpdates,
    users: mergedUsers,
    notifications: mergedNotifications,
    chat: local.chat || remote.chat
  });
}

// Function to push to Firebase Realtime Database directly without merge step
async function uploadToFirebaseDirect(state: DBState): Promise<void> {
  try {
    const response = await fetch(RTDB_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(state)
    });
    if (!response.ok) {
      console.error("[Firebase Sync] Failed to push direct state:", response.statusText);
    }
  } catch (error) {
    console.error("[Firebase Sync] Error pushing direct state:", error);
  }
}

// Function to pull from Firebase Realtime Database and merge with local state
async function fetchFromFirebase(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const response = await fetch(RTDB_URL);
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === "object") {
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const updates = Array.isArray(data.updates) ? data.updates : [];
        const users = Array.isArray(data.users) ? data.users : [];
        const notifications = Array.isArray(data.notifications) ? data.notifications : [];
        const chat = data.chat ? data.chat : { txt: CHAT_REQUIREMENTS };
        
        if (users.length > 0) {
          // If remote Firebase doesn't contain the new boss "longnb", force a clean reset and seed
          if (!users.some((u: any) => u.username === "longnb")) {
            console.log("[Firebase Sync] Firebase contains old users list. Overwriting remote Firebase with clean, seeded data...");
            inMemoryState = DEFAULT_STATE;
            fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_STATE, null, 2), "utf-8");
            await uploadToFirebaseDirect(DEFAULT_STATE);
            return;
          }

          const remoteState: DBState = { tasks, updates, users, notifications, chat };
          
          // Merge local and remote state to resolve conflicts
          const newState = mergeStates(inMemoryState, remoteState);
          
          // Detect and generate notifications for any changes made externally (e.g. Android app)
          const addedNotifications = detectAndGenerateNotifications(newState);
          
          // Only update local files if state has actually changed to optimize I/O
          if (JSON.stringify(newState) !== JSON.stringify(inMemoryState) || addedNotifications) {
            inMemoryState = newState;
            fs.writeFileSync(DB_PATH, JSON.stringify(newState, null, 2), "utf-8");
            console.log("[Firebase Sync] Local database updated with merged state from Firebase RTDB.");
            
            // If new notifications were auto-generated, push updated state back to Firebase immediately
            if (addedNotifications) {
              await uploadToFirebaseDirect(newState);
            }
          }
        }
      } else if (data === null) {
        console.log("[Firebase Sync] Firebase Realtime Database is empty. Uploading local state to initialize...");
        await uploadToFirebaseDirect(inMemoryState);
      }
    } else {
      console.error("[Firebase Sync] Failed to fetch from Firebase Realtime Database:", response.statusText);
    }
  } catch (error) {
    console.error("[Firebase Sync] Error polling Firebase Realtime Database:", error);
  } finally {
    isSyncing = false;
  }
}

// Conflict-free push to Firebase using Fetch-Before-Merge pattern
async function uploadToFirebase(state: DBState): Promise<void> {
  const wasSyncing = isSyncing;
  isSyncing = true;
  try {
    const response = await fetch(RTDB_URL);
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === "object") {
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];
        const updates = Array.isArray(data.updates) ? data.updates : [];
        const users = Array.isArray(data.users) ? data.users : [];
        const notifications = Array.isArray(data.notifications) ? data.notifications : [];
        const chat = data.chat ? data.chat : { txt: CHAT_REQUIREMENTS };

        const remoteState: DBState = { tasks, updates, users, notifications, chat };
        
        // Merge our local state with the latest remote state
        const mergedState = mergeStates(state, remoteState);
        
        // Double check auto notifications
        detectAndGenerateNotifications(mergedState);

        // Update local memory and file
        inMemoryState = mergedState;
        fs.writeFileSync(DB_PATH, JSON.stringify(mergedState, null, 2), "utf-8");

        // Upload merged state
        await uploadToFirebaseDirect(mergedState);
        console.log("[Firebase Sync] Successfully merged and uploaded conflict-free state to Firebase.");
      } else {
        await uploadToFirebaseDirect(state);
      }
    } else {
      await uploadToFirebaseDirect(state);
    }
  } catch (error) {
    console.error("[Firebase Sync] Error in conflict-free upload. Falling back to direct push.", error);
    await uploadToFirebaseDirect(state).catch(err => {
      console.error("[Firebase Sync] Fallback push failed as well.", err);
    });
  } finally {
    isSyncing = wasSyncing;
  }
}

// Start polling every 5 seconds to automatically capture changes from the Android application
setInterval(fetchFromFirebase, 5000);

// Perform an immediate initial fetch to populate the database with Firebase data on server boot
fetchFromFirebase().catch(err => {
  console.error("[Firebase Sync] Initial fetch error on startup:", err);
});

// Helper to load db safely
export function readDB(): DBState {
  return inMemoryState;
}

// Helper to write db safely
export function writeDB(state: DBState): void {
  try {
    const consistentState = ensureDatabaseConsistency(state);
    inMemoryState = consistentState;
    fs.writeFileSync(DB_PATH, JSON.stringify(consistentState, null, 2), "utf-8");
    // Asynchronously fetch current Firebase state, merge local changes, and update safely
    uploadToFirebase(consistentState).catch(err => {
      console.error("[Firebase Sync] Async safe-write failed:", err);
    });
  } catch (error) {
    console.error("Error writing to local database:", error);
  }
}
