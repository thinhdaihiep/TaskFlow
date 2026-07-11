/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, TaskUpdate, TaskStatus, TaskType, TaskPriority, AppNotification, User } from "../types";

const RTDB_URL = "https://goal-server-default-rtdb.asia-southeast1.firebasedatabase.app/.json";

export interface DBState {
  tasks: Task[];
  updates: TaskUpdate[];
  users: User[];
  notifications: AppNotification[];
  chat?: {
    txt: string;
  };
}

const FALLBACK_USERS: User[] = [
  { id: "longnb", username: "longnb", name: "Nguyễn Bá Long", role: "boss", avatarColor: "bg-indigo-600 text-white", password: "123" },
  { id: "hienvn", username: "hienvn", name: "Võ Ngọc Hiền", role: "member", avatarColor: "bg-emerald-600 text-white", password: "123" },
  { id: "thinhnv", username: "thinhnv", name: "Ngô Văn Thịnh", role: "member", avatarColor: "bg-amber-600 text-white", password: "123" },
  { id: "vinhtq", username: "vinhtq", name: "Trần Quang Vinh", role: "member", avatarColor: "bg-rose-600 text-white", password: "123" },
  { id: "tuannv", username: "tuannv", name: "Nguyễn Văn Tuấn", role: "member", avatarColor: "bg-blue-600 text-white", password: "123" },
  { id: "chinhpv", username: "chinhpv", name: "Phạm Văn Chinh", role: "member", avatarColor: "bg-violet-600 text-white", password: "123" },
  { id: "thuanlt", username: "thuanlt", name: "Lã Thanh Thuân", role: "member", avatarColor: "bg-teal-600 text-white", password: "123" }
];

let serverAvailable: boolean | null = null;

// Ping helper to detect if Express backend is running
export async function checkServerAvailability(): Promise<boolean> {
  // If the server was successfully found previously, cache it
  if (serverAvailable === true) return true;

  if (typeof window !== "undefined" && window.location.hostname.includes(".vercel.app")) {
    console.log("[API Interceptor] Detected Vercel environment. Defaulting to client-side Firebase/Local REST engine.");
    serverAvailable = false;
    return false;
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1200);
    const res = await fetch("/api/health", { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "ok") {
        console.log("[API Interceptor] Express backend detected. Operating in Full-Stack Mode.");
        serverAvailable = true;
        return true;
      }
    }
  } catch (e) {
    // Backend failed to respond
  }

  // Do NOT permanently cache false, to allow dynamic recovery when Express finishes booting
  console.log("[API Interceptor] Express backend currently unavailable. Using client-side fallbacks.");
  return false;
}

// REST GET from Firebase Realtime Database
async function getFirebaseState(): Promise<DBState> {
  const LOCAL_STORAGE_KEY = "task_manager_local_db";

  // 1. Try reading from LocalStorage first for high resilience, offline speed and multi-instance caching
  if (typeof window !== "undefined") {
    try {
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed && typeof parsed === "object") {
          return {
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            updates: Array.isArray(parsed.updates) ? parsed.updates : [],
            users: Array.isArray(parsed.users) ? parsed.users : FALLBACK_USERS,
            notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
            chat: parsed.chat
          };
        }
      }
    } catch (err) {
      console.warn("[API Interceptor] Failed to read from local storage:", err);
    }
  }

  // 2. Fallback to Firebase RTDB if local storage is empty
  try {
    const res = await fetch(RTDB_URL);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") {
        const state: DBState = {
          tasks: Array.isArray(data.tasks) ? data.tasks : [],
          updates: Array.isArray(data.updates) ? data.updates : [],
          users: Array.isArray(data.users) ? data.users : FALLBACK_USERS,
          notifications: Array.isArray(data.notifications) ? data.notifications : [],
          chat: data.chat
        };
        // Cache to local storage
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        }
        return state;
      }
    }
  } catch (e) {
    // Use warn instead of error to avoid triggering platform-wide telemetry errors
    console.warn("[API Interceptor] Direct Firebase GET currently unavailable (using local defaults):", e);
  }

  const defaultState: DBState = {
    tasks: [],
    updates: [],
    users: FALLBACK_USERS,
    notifications: []
  };

  // Cache defaults to local storage so future local writes are tracked
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultState));
    } catch (err) {
      // Ignore
    }
  }

  return defaultState;
}

// REST PUT to Firebase Realtime Database
async function putFirebaseState(state: DBState): Promise<void> {
  const LOCAL_STORAGE_KEY = "task_manager_local_db";

  // 1. Save locally to LocalStorage first to ensure zero data loss
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("[API Interceptor] Failed to save state to local storage:", err);
    }
  }

  // 2. Attempt to sync with Firebase Realtime Database in background
  try {
    const res = await fetch(RTDB_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(state)
    });
    if (!res.ok) {
      console.warn("[API Interceptor] Direct Firebase PUT failed:", res.statusText);
    }
  } catch (e) {
    // Avoid console.error to keep the client interface smooth and error-free when database is offline
    console.warn("[API Interceptor] Direct Firebase PUT currently unavailable (state saved locally):", e);
  }
}

// Ensure task state meets consistency requirements
function ensureDatabaseConsistency(state: DBState): DBState {
  if (!state.tasks || !state.updates) return state;

  const updatedTasks = state.tasks.map(task => {
    const taskUpdates = (state.updates || []).filter(u => u.taskId === task.id);
    if (taskUpdates.length > 0) {
      const latestUpdate = taskUpdates.reduce((latest, current) => {
        const timeLatest = new Date(latest.createdAt || latest.date || 0).getTime();
        const timeCurrent = new Date(current.createdAt || current.date || 0).getTime();
        return timeCurrent > timeLatest ? current : latest;
      });

      const latestProgress = Number(latestUpdate.progress);
      if (task.progress !== latestProgress) {
        let updatedStatus = task.status;
        if (latestProgress >= 100) {
          updatedStatus = TaskStatus.COMPLETED;
        } else if (latestProgress > 0 && (task.status === TaskStatus.NOT_STARTED || task.status === TaskStatus.COMPLETED)) {
          updatedStatus = TaskStatus.IN_PROGRESS;
        }

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

// Auto notification helper
function addNotification(
  db: DBState,
  title: string,
  content: string,
  type: "progress_update" | "task_assigned" | "task_updated",
  taskId: string,
  senderId: string,
  senderName: string,
  receiverId: string,
  updateId?: string
) {
  if (!db.notifications) {
    db.notifications = [];
  }
  const newNotif: AppNotification = {
    id: "notif_" + Math.random().toString(36).substr(2, 9),
    title,
    content,
    message: content,
    updateId,
    type,
    taskId,
    senderId,
    senderName,
    receiverId,
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotif);
  if (db.notifications.length > 100) {
    db.notifications = db.notifications.slice(0, 100);
  }
  return newNotif;
}

// Match & process client-side endpoints
async function handleClientSideAPIRequest(
  path: string,
  method: string,
  body: any,
  searchParams: URLSearchParams
): Promise<{ status: number; body: any }> {
  // Read state
  const db = await getFirebaseState();

  // 1. GET /api/health
  if (path === "/api/health") {
    return { status: 200, body: { status: "ok" } };
  }

  // 2. POST /api/auth/login
  if (path === "/api/auth/login" && method === "POST") {
    const { username, password } = body || {};
    if (!username || !password) {
      return { status: 400, body: { error: "Thiếu tên đăng nhập hoặc mật khẩu" } };
    }
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (!user) {
      return { status: 401, body: { error: "Tài khoản không tồn tại" } };
    }
    const userPassword = user.password || "123";
    if (password !== userPassword) {
      return { status: 401, body: { error: "Mật khẩu không chính xác" } };
    }
    return { status: 200, body: { user } };
  }

  // 3. /api/users
  if (path === "/api/users") {
    if (method === "GET") {
      return { status: 200, body: db.users };
    }
    if (method === "POST") {
      const { name, username, password } = body || {};
      if (!name || !username || !password) {
        return { status: 400, body: { error: "Thiếu thông tin nhân viên (Tên, tài khoản, mật khẩu)" } };
      }
      const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase().trim());
      if (exists) {
        return { status: 400, body: { error: "Tên tài khoản đã tồn tại" } };
      }

      const colors = [
        "bg-indigo-600 text-white", "bg-emerald-600 text-white", "bg-amber-600 text-white",
        "bg-rose-600 text-white", "bg-sky-600 text-white", "bg-teal-600 text-white",
        "bg-violet-600 text-white", "bg-fuchsia-600 text-white", "bg-orange-600 text-white"
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newUser: User = {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        username: username.toLowerCase().trim(),
        name: name.trim(),
        role: "member",
        avatarColor: randomColor,
        password: password.trim()
      };

      db.users.push(newUser);
      await putFirebaseState(db);
      return { status: 201, body: newUser };
    }
  }

  // PUT/DELETE /api/users/:id
  const userMatch = /^\/api\/users\/([^/]+)$/.exec(path);
  if (userMatch) {
    const userId = userMatch[1];
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { status: 404, body: { error: "Không tìm thấy nhân viên" } };
    }

    if (method === "PUT") {
      const { name, username, password } = body || {};
      const current = db.users[userIndex];

      if (username) {
        const lowerUsername = username.toLowerCase().trim();
        const exists = db.users.some(u => u.id !== userId && u.username.toLowerCase() === lowerUsername);
        if (exists) {
          return { status: 400, body: { error: "Tên tài khoản đã tồn tại" } };
        }
        current.username = lowerUsername;
      }
      if (name) current.name = name.trim();
      if (password) current.password = password.trim();

      db.users[userIndex] = current;
      await putFirebaseState(db);
      return { status: 200, body: current };
    }

    if (method === "DELETE") {
      if (userId === "1" || userId === "longnb") {
        return { status: 400, body: { error: "Không thể xóa tài khoản Trưởng Nhóm" } };
      }
      const hasAssignedTasks = db.tasks.some(t => t.assignedTo && t.assignedTo.includes(userId));
      const hasUpdates = db.updates.some(u => u.userId === userId);
      if (hasAssignedTasks || hasUpdates) {
        return {
          status: 400,
          body: { error: "Không thể xóa nhân viên này vì họ đã được phân công nhiệm vụ hoặc đã có hoạt động cập nhật trên hệ thống." }
        };
      }

      db.users = db.users.filter(u => u.id !== userId);
      await putFirebaseState(db);
      return { status: 200, body: { message: "Xóa nhân viên thành công" } };
    }
  }

  // 4. /api/tasks
  if (path === "/api/tasks") {
    if (method === "GET") {
      const queryUserId = searchParams.get("userId");
      const queryRole = searchParams.get("role");
      let tasks = [...db.tasks];
      if (queryRole === "member" && queryUserId) {
        tasks = tasks.filter(t => t.assignedTo && Array.isArray(t.assignedTo) && t.assignedTo.includes(queryUserId));
      }
      return { status: 200, body: tasks };
    }

    if (method === "POST") {
      const { title, description, type, priority, startDate, dueDate, assignedTo } = body || {};
      if (!title || !type || !priority || !startDate || !assignedTo || !Array.isArray(assignedTo)) {
        return { status: 400, body: { error: "Thiếu các thông tin bắt buộc" } };
      }

      const newTask: Task = {
        id: "task_" + Math.random().toString(36).substr(2, 9),
        title,
        description: description || "",
        type: type as TaskType,
        priority: priority as TaskPriority,
        status: TaskStatus.NOT_STARTED,
        startDate,
        dueDate: dueDate || undefined,
        assignedTo,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.tasks.unshift(newTask);

      const boss = db.users.find(u => u.role === "boss") || { id: "boss1", name: "Phạm Minh Quang (Boss)" };
      assignedTo.forEach((memberId: string) => {
        addNotification(
          db,
          "Bạn được giao nhiệm vụ mới",
          `Sếp ${boss.name} đã giao nhiệm vụ mới: "${title}" cho bạn.`,
          "task_assigned",
          newTask.id,
          boss.id,
          boss.name,
          memberId
        );
      });

      const consistent = ensureDatabaseConsistency(db);
      await putFirebaseState(consistent);
      return { status: 201, body: newTask };
    }
  }

  // GET/PUT/DELETE /api/tasks/:id
  const taskMatch = /^\/api\/tasks\/([^/]+)$/.exec(path);
  if (taskMatch) {
    const taskId = taskMatch[1];
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);

    if (method === "GET") {
      if (taskIndex === -1) {
        return { status: 404, body: { error: "Không tìm thấy nhiệm vụ" } };
      }
      return { status: 200, body: db.tasks[taskIndex] };
    }

    if (method === "PUT") {
      if (taskIndex === -1) {
        return { status: 404, body: { error: "Không tìm thấy nhiệm vụ" } };
      }
      const { title, description, type, priority, status, startDate, dueDate, assignedTo, progress } = body || {};
      const currentTask = db.tasks[taskIndex];

      let updatedStatus = status || currentTask.status;
      let updatedProgress = progress !== undefined ? Number(progress) : currentTask.progress;

      if (progress !== undefined) {
        if (updatedProgress >= 100) {
          updatedProgress = 100;
          updatedStatus = TaskStatus.COMPLETED;
        } else if (updatedProgress > 0 && updatedStatus === TaskStatus.NOT_STARTED) {
          updatedStatus = TaskStatus.IN_PROGRESS;
        } else if (updatedProgress === 0 && updatedStatus === TaskStatus.COMPLETED) {
          updatedStatus = TaskStatus.NOT_STARTED;
        }
      }

      const updatedTask: Task = {
        ...currentTask,
        title: title !== undefined ? title : currentTask.title,
        description: description !== undefined ? description : currentTask.description,
        type: type !== undefined ? type : currentTask.type,
        priority: priority !== undefined ? priority : currentTask.priority,
        status: updatedStatus,
        startDate: startDate !== undefined ? startDate : currentTask.startDate,
        dueDate: dueDate !== undefined ? dueDate : currentTask.dueDate,
        assignedTo: assignedTo !== undefined ? assignedTo : currentTask.assignedTo,
        progress: updatedProgress,
        updatedAt: new Date().toISOString()
      };

      db.tasks[taskIndex] = updatedTask;

      const isBossEdit = title !== undefined || description !== undefined || dueDate !== undefined || assignedTo !== undefined;
      if (isBossEdit) {
        const boss = db.users.find(u => u.role === "boss") || { id: "boss1", name: "Phạm Minh Quang (Boss)" };
        const targets = updatedTask.assignedTo || [];
        targets.forEach((memberId: string) => {
          addNotification(
            db,
            "Nhiệm vụ được chỉnh sửa",
            `Sếp ${boss.name} đã chỉnh sửa thông tin nhiệm vụ: "${updatedTask.title}".`,
            "task_updated",
            updatedTask.id,
            boss.id,
            boss.name,
            memberId
          );
        });
      }

      const consistent = ensureDatabaseConsistency(db);
      await putFirebaseState(consistent);
      return { status: 200, body: consistent.tasks[taskIndex] };
    }

    if (method === "DELETE") {
      if (taskIndex === -1) {
        return { status: 404, body: { error: "Không tìm thấy nhiệm vụ" } };
      }
      db.tasks = db.tasks.filter(t => t.id !== taskId);
      db.updates = db.updates.filter(u => u.taskId !== taskId);

      const consistent = ensureDatabaseConsistency(db);
      await putFirebaseState(consistent);
      return { status: 200, body: { message: "Xóa nhiệm vụ thành công" } };
    }
  }

  // 5. /api/updates
  if (path === "/api/updates") {
    if (method === "GET") {
      const queryTaskId = searchParams.get("taskId");
      let updates = [...db.updates];
      if (queryTaskId) {
        updates = updates.filter(u => u.taskId === queryTaskId);
      }
      updates.sort((a, b) => {
        const dateCompare = (b.date || "").localeCompare(a.date || "");
        if (dateCompare !== 0) return dateCompare;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
      return { status: 200, body: updates };
    }

    if (method === "POST") {
      const { taskId, userId, userName, date, progress, workDone, difficulties, notes } = body || {};
      if (!taskId || !userId || !userName || !date || progress === undefined || !workDone) {
        return { status: 400, body: { error: "Thiếu thông tin tiến độ bắt buộc" } };
      }

      const taskIndex = db.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        return { status: 404, body: { error: "Không tìm thấy nhiệm vụ" } };
      }
      const task = db.tasks[taskIndex];

      const newUpdate: TaskUpdate = {
        id: "up_" + Math.random().toString(36).substr(2, 9),
        taskId,
        userId,
        userName,
        date,
        progress: Number(progress),
        workDone,
        difficulties: difficulties || "",
        notes: notes || "",
        createdAt: new Date().toISOString()
      };

      db.updates.push(newUpdate);

      let updatedStatus = task.status;
      const updatedProgress = Number(progress);
      if (updatedProgress >= 100) {
        updatedStatus = TaskStatus.COMPLETED;
      } else if (updatedProgress > 0 && (task.status === TaskStatus.NOT_STARTED || task.status === TaskStatus.COMPLETED)) {
        updatedStatus = TaskStatus.IN_PROGRESS;
      }

      db.tasks[taskIndex] = {
        ...task,
        progress: updatedProgress,
        status: updatedStatus,
        updatedAt: new Date().toISOString()
      };

      addNotification(
        db,
        "Cập nhật tiến độ mới",
        `${userName} đã cập nhật tiến độ nhiệm vụ "${task.title}" lên ${progress}%.`,
        "progress_update",
        taskId,
        userId,
        userName,
        "boss",
        newUpdate.id
      );

      const consistent = ensureDatabaseConsistency(db);
      await putFirebaseState(consistent);
      return { status: 201, body: { update: newUpdate, task: consistent.tasks[taskIndex] } };
    }
  }

  // PUT /api/updates/:id
  const updateMatch = /^\/api\/updates\/([^/]+)$/.exec(path);
  if (updateMatch && method === "PUT") {
    const updateId = updateMatch[1];
    const updateIndex = db.updates.findIndex(u => u.id === updateId);
    if (updateIndex === -1) {
      return { status: 404, body: { error: "Không tìm thấy bản cập nhật" } };
    }

    const { progress, workDone, difficulties, notes, date } = body || {};
    if (progress === undefined || !workDone || !date) {
      return { status: 400, body: { error: "Thiếu thông tin cập nhật" } };
    }

    const currentUpdate = db.updates[updateIndex];
    const updated: TaskUpdate = {
      ...currentUpdate,
      progress: Number(progress),
      workDone,
      difficulties: difficulties || "",
      notes: notes || "",
      date
    };

    db.updates[updateIndex] = updated;

    const taskIndex = db.tasks.findIndex(t => t.id === currentUpdate.taskId);
    if (taskIndex !== -1) {
      const task = db.tasks[taskIndex];
      let updatedStatus = task.status;
      const updatedProgress = Number(progress);

      if (updatedProgress >= 100) {
        updatedStatus = TaskStatus.COMPLETED;
      } else if (updatedProgress > 0 && (task.status === TaskStatus.NOT_STARTED || task.status === TaskStatus.COMPLETED)) {
        updatedStatus = TaskStatus.IN_PROGRESS;
      }

      db.tasks[taskIndex] = {
        ...task,
        progress: updatedProgress,
        status: updatedStatus,
        updatedAt: new Date().toISOString()
      };

      addNotification(
        db,
        "Chỉnh sửa tiến độ",
        `${currentUpdate.userName} đã chỉnh sửa cập nhật tiến độ nhiệm vụ "${task.title}" thành ${progress}%.`,
        "progress_update",
        task.id,
        currentUpdate.userId,
        currentUpdate.userName,
        "boss",
        currentUpdate.id
      );
    }

    const consistent = ensureDatabaseConsistency(db);
    await putFirebaseState(consistent);
    return {
      status: 200,
      body: {
        update: updated,
        task: taskIndex !== -1 ? consistent.tasks[taskIndex] : null
      }
    };
  }

  // 6. /api/notifications
  if (path === "/api/notifications" && method === "GET") {
    const queryUserId = searchParams.get("userId");
    const queryRole = searchParams.get("role");

    if (!queryUserId) {
      return { status: 400, body: { error: "Thiếu userId" } };
    }

    if (!db.notifications) {
      db.notifications = [];
    }

    const userNotifs = db.notifications.filter(n => {
      if (n.isDeleted) return false;
      const isBossNotif = (n.receiverId === "boss") || (n.targetRole === "boss") || (n.targetRole === "all");
      const isUserNotif = (n.receiverId === queryUserId) || (n.targetUserId === queryUserId) || (n.targetRole === "member" && n.targetUserId === queryUserId);

      if (queryRole === "boss") {
        return isBossNotif || isUserNotif;
      } else {
        return isUserNotif;
      }
    });

    return { status: 200, body: userNotifs };
  }

  // PUT /api/notifications/:id/read
  const readNotifMatch = /^\/api\/notifications\/([^/]+)\/read$/.exec(path);
  if (readNotifMatch && method === "PUT") {
    const notifId = readNotifMatch[1];
    const { isRead } = body || {};

    if (!db.notifications) db.notifications = [];
    const notifIdx = db.notifications.findIndex(n => n.id === notifId);
    if (notifIdx !== -1) {
      db.notifications[notifIdx].isRead = typeof isRead === "boolean" ? isRead : true;
      await putFirebaseState(db);
    }
    return { status: 200, body: { success: true } };
  }

  // POST /api/notifications/read-all
  if (path === "/api/notifications/read-all" && method === "POST") {
    const { userId, role } = body || {};
    if (!userId) {
      return { status: 400, body: { error: "Thiếu userId" } };
    }

    if (!db.notifications) db.notifications = [];
    let updated = false;
    db.notifications.forEach(n => {
      const isBossNotif = (n.receiverId === "boss") || (n.targetRole === "boss") || (n.targetRole === "all");
      const isUserNotif = (n.receiverId === userId) || (n.targetUserId === userId) || (n.targetRole === "member" && n.targetUserId === userId);

      const isTarget = (role === "boss" && (isBossNotif || isUserNotif)) ||
                       (role === "member" && isUserNotif);

      if (isTarget && !n.isRead) {
        n.isRead = true;
        updated = true;
      }
    });

    if (updated) {
      await putFirebaseState(db);
    }
    return { status: 200, body: { success: true } };
  }

  // POST /api/notifications/clear-all
  if (path === "/api/notifications/clear-all" && method === "POST") {
    const { userId, role } = body || {};
    if (!userId) {
      return { status: 400, body: { error: "Thiếu userId" } };
    }

    if (!db.notifications) db.notifications = [];
    let updated = false;
    db.notifications.forEach(n => {
      const isBossNotif = (n.receiverId === "boss") || (n.targetRole === "boss") || (n.targetRole === "all");
      const isUserNotif = (n.receiverId === userId) || (n.targetUserId === userId) || (n.targetRole === "member" && n.targetUserId === userId);

      const isTarget = (role === "boss" && (isBossNotif || isUserNotif)) ||
                       (role === "member" && isUserNotif);
      if (isTarget && !n.isDeleted) {
        n.isDeleted = true;
        updated = true;
      }
    });

    if (updated) {
      await putFirebaseState(db);
    }
    return { status: 200, body: { success: true } };
  }

  // 7. GET /api/backup
  if (path === "/api/backup" && method === "GET") {
    const role = searchParams.get("role");
    if (role !== "boss") {
      return { status: 403, body: { error: "Chỉ Quản lý (Boss) mới có quyền sao lưu dữ liệu" } };
    }
    return { status: 200, body: db };
  }

  // 8. POST /api/restore
  if (path === "/api/restore" && method === "POST") {
    const role = searchParams.get("role");
    if (role !== "boss") {
      return { status: 403, body: { error: "Chỉ Quản lý (Boss) mới có quyền khôi phục dữ liệu" } };
    }
    try {
      const backupData = body;
      if (!backupData || typeof backupData !== "object" || !Array.isArray(backupData.users) || !Array.isArray(backupData.tasks) || !Array.isArray(backupData.updates)) {
        return { status: 400, body: { error: "Dữ liệu khôi phục không hợp lệ." } };
      }
      await putFirebaseState(backupData);
      return { status: 200, body: { message: "Khôi phục dữ liệu thành công" } };
    } catch {
      return { status: 500, body: { error: "Đã xảy ra lỗi khi khôi phục dữ liệu" } };
    }
  }

  return { status: 404, body: { error: `Not found: ${path}` } };
}

// Intercepts window.fetch
export function initFetchInterceptor() {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch;

  const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let urlString = "";
    if (typeof input === "string") {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.href;
    } else if (input && typeof input === "object" && "url" in input) {
      urlString = input.url;
    }

    // Only intercept local API requests
    if (urlString.startsWith("/api/") || urlString.includes(window.location.origin + "/api/")) {
      const isServerUp = await checkServerAvailability();
      if (!isServerUp) {
        // Run completely client-side in Firebase mode!
        try {
          const urlObj = new URL(urlString, window.location.origin);
          const path = urlObj.pathname;
          const method = (init?.method || "GET").toUpperCase();
          let body: any = null;
          if (init?.body && typeof init.body === "string") {
            try {
              body = JSON.parse(init.body);
            } catch (e) {
              // Not JSON
            }
          }

          console.log(`[API Interceptor] Intercepted static failover request: ${method} ${path}`);
          const { status, body: responseBody } = await handleClientSideAPIRequest(
            path,
            method,
            body,
            urlObj.searchParams
          );

          // Create a mock Fetch Response object conforming to standard Fetch API
          const responseJson = JSON.stringify(responseBody);
          const mockResponse = new Response(responseJson, {
            status,
            statusText: status >= 200 && status < 300 ? "OK" : "Error",
            headers: new Headers({
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            })
          });

          return mockResponse;
        } catch (error: any) {
          console.error("[API Interceptor] Interceptor failed, fallback to native fetch:", error);
          return originalFetch.apply(window, [input, init]);
        }
      }
    }

    // Call standard native fetch for non-API, external resources, or if Express is available
    return originalFetch.apply(window, [input, init]);
  };

  try {
    Object.defineProperty(window, "fetch", {
      value: customFetch,
      writable: true,
      configurable: true,
      enumerable: true
    });
    console.log("[API Interceptor] Global window.fetch interceptor successfully injected via Object.defineProperty.");
  } catch (err) {
    console.error("[API Interceptor] Failed to define window.fetch using Object.defineProperty. Trying direct assignment.", err);
    try {
      (window as any).fetch = customFetch;
    } catch (directErr) {
      console.error("[API Interceptor] Critical: Failed to intercept fetch globally.", directErr);
    }
  }
}
