/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { readDB, writeDB, USERS, DBState } from "./src/server/db";
import { Task, TaskUpdate, TaskStatus, TaskType, TaskPriority, AppNotification } from "./src/types";

// Helper to create and add a new notification to the DB
function addNotification(
  db: any,
  title: string,
  content: string,
  type: "progress_update" | "task_assigned" | "task_updated",
  taskId: string,
  senderId: string,
  senderName: string,
  receiverId: string,
  updateId?: string,
  groupId?: string
) {
  if (!db.notifications) {
    db.notifications = [];
  }
  const newNotif: AppNotification = {
    id: "notif_" + Math.random().toString(36).substr(2, 9),
    title,
    content,
    message: content, // Dual field support for Android App
    updateId,
    type,
    taskId,
    senderId,
    senderName,
    receiverId,
    groupId: groupId || "longnb", // Ensure groupId is assigned
    createdAt: new Date().toISOString(),
    isRead: false
  };
  db.notifications.unshift(newNotif);
  
  // Cap to 100 recent notifications
  if (db.notifications.length > 100) {
    db.notifications = db.notifications.slice(0, 100);
  }
  return newNotif;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON bodies
  app.use(express.json());

  // API: Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API: Auth Login
  app.post("/api/auth/login", (req, res) => {
    const { username, password, groupId } = req.body;
    if (!username || !password) {
       res.status(400).json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" });
       return;
    }

    const db = readDB();
    let user = null;

    // First check if the username is a Boss (boss usernames are globally unique)
    const bossUser = db.users.find(u => u.role === "boss" && u.username.toLowerCase() === username.toLowerCase().trim());
    if (bossUser) {
      user = bossUser;
    } else if (groupId) {
      // If not a boss, look for member in the selected group
      user = db.users.find(u => u.role === "member" && u.username.toLowerCase() === username.toLowerCase().trim() && u.groupId === groupId);
    } else {
      // Fallback for older logins or if groupId is not supplied but user is unique
      const matchingUsers = db.users.filter(u => u.username.toLowerCase() === username.toLowerCase().trim());
      if (matchingUsers.length === 1) {
        user = matchingUsers[0];
      } else if (matchingUsers.length > 1) {
        res.status(400).json({ error: "Tên đăng nhập này trùng lặp ở nhiều nhóm khác nhau. Vui lòng chọn Nhóm của bạn để đăng nhập." });
        return;
      }
    }

    if (!user) {
       res.status(401).json({ error: "Tài khoản không tồn tại trong nhóm này" });
       return;
    }

    // Validate password (individual or defaults to '123')
    const userPassword = user.password || "123";
    if (password !== userPassword) {
       res.status(401).json({ error: "Mật khẩu không chính xác" });
       return;
    }

    res.json({ user });
  });

  // API: Register a New Boss & Group
  app.post("/api/auth/register-group", (req, res) => {
    const { username, name, password, groupName } = req.body;
    if (!username || !name || !password || !groupName) {
      res.status(400).json({ error: "Thiếu thông tin đăng ký (Tài khoản sếp, tên sếp, mật khẩu, tên nhóm)" });
      return;
    }

    const db = readDB();
    
    // Check if username is already taken by any user (boss or member) to prevent conflicts, since boss username is the groupId
    const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (exists) {
      res.status(400).json({ error: "Tên tài khoản sếp này đã tồn tại trong hệ thống. Vui lòng chọn tên khác." });
      return;
    }

    const colors = [
      "bg-indigo-600 text-white", 
      "bg-emerald-600 text-white", 
      "bg-amber-600 text-white", 
      "bg-rose-600 text-white", 
      "bg-sky-600 text-white", 
      "bg-teal-600 text-white",
      "bg-violet-600 text-white",
      "bg-fuchsia-600 text-white",
      "bg-orange-600 text-white"
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newBoss = {
      id: "user_" + Math.random().toString(36).substr(2, 9),
      username: username.toLowerCase().trim(),
      name: name.trim(),
      role: "boss" as const,
      groupId: username.toLowerCase().trim(), // Boss ID is their own username
      groupName: groupName.trim(),
      avatarColor: randomColor,
      password: password.trim()
    };

    db.users.push(newBoss);
    writeDB(db);

    res.status(201).json(newBoss);
  });

  // API: Get Groups List
  app.get("/api/groups", (req, res) => {
    const db = readDB();
    const groups = db.users
      .filter(u => u.role === "boss")
      .map(u => ({
        groupId: u.username,
        groupName: u.groupName || u.name + "'s Group",
        bossName: u.name
      }));
    res.json(groups);
  });

  // API: Get Users List (for assignment and stats)
  app.get("/api/users", (req, res) => {
    const groupId = req.query.groupId as string;
    if (!groupId) {
      res.json([]);
      return;
    }
    const db = readDB();
    let result = db.users.filter(u => u.groupId === groupId);
    res.json(result);
  });

  // API: Add User (Boss Only)
  app.post("/api/users", (req, res) => {
    const { name, username, password, groupId, groupName } = req.body;
    if (!name || !username || !password) {
      res.status(400).json({ error: "Thiếu thông tin nhân viên (Tên, tài khoản, mật khẩu)" });
      return;
    }

    const db = readDB();
    
    // Check if username is already taken by any Boss
    const isBossConflict = db.users.some(u => u.role === "boss" && u.username.toLowerCase() === username.toLowerCase().trim());
    if (isBossConflict) {
      res.status(400).json({ error: "Tên đăng nhập này trùng với tài khoản Sếp hệ thống. Vui lòng chọn tên khác." });
      return;
    }

    // Check if username is already taken within the same group
    if (groupId) {
      const existsInGroup = db.users.some(u => u.groupId === groupId && u.username.toLowerCase() === username.toLowerCase().trim());
      if (existsInGroup) {
        res.status(400).json({ error: "Tên tài khoản nhân viên đã tồn tại trong nhóm của bạn." });
        return;
      }
    } else {
      // Fallback logic
      const existsGlobal = db.users.some(u => u.username.toLowerCase() === username.toLowerCase().trim());
      if (existsGlobal) {
        res.status(400).json({ error: "Tên tài khoản nhân viên đã tồn tại." });
        return;
      }
    }

    const colors = [
      "bg-indigo-600 text-white", 
      "bg-emerald-600 text-white", 
      "bg-amber-600 text-white", 
      "bg-rose-600 text-white", 
      "bg-sky-600 text-white", 
      "bg-teal-600 text-white",
      "bg-violet-600 text-white",
      "bg-fuchsia-600 text-white",
      "bg-orange-600 text-white"
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser = {
      id: "user_" + Math.random().toString(36).substr(2, 9),
      username: username.toLowerCase().trim(),
      name: name.trim(),
      role: "member" as const,
      groupId: groupId || "longnb", // Default fallback
      groupName: groupName || "Ban Bản đồ", // Default fallback
      avatarColor: randomColor,
      password: password.trim()
    };

    db.users.push(newUser);
    writeDB(db);

    res.status(201).json(newUser);
  });

  // API: Edit User (Boss Only)
  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { name, username, password } = req.body;

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ error: "Không tìm thấy nhân viên" });
      return;
    }

    const current = db.users[userIndex];

    if (username) {
      const lowerUsername = username.toLowerCase().trim();
      
      // Check boss collision
      const isBossConflict = db.users.some(u => u.role === "boss" && u.username.toLowerCase() === lowerUsername);
      if (isBossConflict) {
        res.status(400).json({ error: "Tên đăng nhập này trùng với tài khoản Sếp hệ thống. Vui lòng chọn tên khác." });
        return;
      }

      // Check same group collision
      const existsInGroup = db.users.some(u => u.id !== id && u.groupId === current.groupId && u.username.toLowerCase() === lowerUsername);
      if (existsInGroup) {
        res.status(400).json({ error: "Tên tài khoản nhân viên đã tồn tại trong nhóm." });
        return;
      }
      current.username = lowerUsername;
    }

    if (name) {
      current.name = name.trim();
    }

    if (password) {
      current.password = password.trim();
    }

    db.users[userIndex] = current;
    writeDB(db);

    res.json(current);
  });

  // API: Delete User (Boss Only)
  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    if (id === "1") {
      res.status(400).json({ error: "Không thể xóa tài khoản Trưởng Nhóm" });
      return;
    }

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ error: "Không tìm thấy nhân viên" });
      return;
    }

    // Check if the user is assigned to any tasks
    const hasAssignedTasks = db.tasks.some(t => t.assignedTo && t.assignedTo.includes(id));
    // Check if the user has recorded any updates
    const hasUpdates = db.updates.some(u => u.userId === id);

    if (hasAssignedTasks || hasUpdates) {
      res.status(400).json({ 
        error: "Không thể xóa nhân viên này vì họ đã được phân công nhiệm vụ hoặc đã có hoạt động cập nhật trên hệ thống." 
      });
      return;
    }

    db.users = db.users.filter(u => u.id !== id);

    writeDB(db);
    res.json({ message: "Xóa nhân viên thành công" });
  });

  // API: Get Tasks
  app.get("/api/tasks", (req, res) => {
    const userId = req.query.userId as string;
    const userRole = req.query.role as string;
    const groupId = req.query.groupId as string;
    
    if (!groupId) {
      res.json([]);
      return;
    }

    const db = readDB();
    let tasks = db.tasks.filter(t => !t.isDeleted && t.groupId === groupId);

    // Check if the user is a member, filter tasks assigned to them
    if (userRole === "member" && userId) {
      tasks = tasks.filter(t => t.assignedTo && Array.isArray(t.assignedTo) && t.assignedTo.includes(userId));
    }

    res.json(tasks);
  });

  // API: Get Task by ID
  app.get("/api/tasks/:id", (req, res) => {
    const db = readDB();
    const task = db.tasks.find(t => t.id === req.params.id && !t.isDeleted);
    if (!task) {
       res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
       return;
    }
    res.json(task);
  });

  // API: Create Task (Boss Only)
  app.post("/api/tasks", (req, res) => {
    const { title, description, type, priority, startDate, dueDate, assignedTo, groupId } = req.body;
    
    if (!title || !type || !priority || !startDate || !assignedTo || !Array.isArray(assignedTo)) {
       res.status(400).json({ error: "Thiếu các thông tin bắt buộc" });
       return;
    }

    const db = readDB();
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
      groupId: groupId || "longnb", // Default fallback
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.tasks.unshift(newTask);

    // Generate notifications for assigned members
    const boss = db.users.find(u => u.role === "boss" && u.username === newTask.groupId) || { id: "boss1", name: "Sếp" };
    assignedTo.forEach((memberId: string) => {
      addNotification(
        db,
        "Bạn được giao nhiệm vụ mới",
        `Sếp ${boss.name} đã giao nhiệm vụ mới: "${title}" cho bạn.`,
        "task_assigned",
        newTask.id,
        boss.id,
        boss.name,
        memberId,
        undefined,
        newTask.groupId
      );
    });

    writeDB(db);

    res.status(201).json(newTask);
  });

  // API: Update Task (Boss edit, or manual status/progress update)
  app.put("/api/tasks/:id", (req, res) => {
    const taskId = req.params.id;
    const { title, description, type, priority, status, startDate, dueDate, assignedTo, progress } = req.body;

    const db = readDB();
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
       res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
       return;
    }

    const currentTask = db.tasks[taskIndex];
    
    // Auto calculate status if progress is changed
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

    const isBossEdit = title !== undefined || description !== undefined || dueDate !== undefined || assignedTo !== undefined;

    db.tasks[taskIndex] = updatedTask;

    if (isBossEdit) {
      // Generate notifications for assigned members
      const boss = db.users.find(u => u.role === "boss" && u.username === updatedTask.groupId) || { id: "boss1", name: "Sếp" };
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
          memberId,
          undefined,
          updatedTask.groupId
        );
      });
    }

    writeDB(db);

    res.json(updatedTask);
  });

  // API: Delete Task (Boss Only)
  app.delete("/api/tasks/:id", (req, res) => {
    const taskId = req.params.id;
    const db = readDB();
    
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) {
       res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
       return;
    }
    
    task.isDeleted = true;
    task.updatedAt = new Date().toISOString();
    
    // Also clean up updates for this task by soft deleting them
    db.updates.forEach(u => {
      if (u.taskId === taskId) {
        u.isDeleted = true;
        u.updatedAt = new Date().toISOString();
      }
    });

    writeDB(db);
    res.json({ message: "Xóa nhiệm vụ thành công" });
  });

  // API: Get Updates for a specific task or all updates
  app.get("/api/updates", (req, res) => {
    const taskId = req.query.taskId as string;
    const groupId = req.query.groupId as string;

    if (!groupId && !taskId) {
      res.json([]);
      return;
    }

    const db = readDB();
    
    let updates = db.updates.filter(u => !u.isDeleted);
    if (groupId) {
      updates = updates.filter(u => u.groupId === groupId);
    }
    if (taskId) {
      updates = updates.filter(u => u.taskId === taskId);
    }
    
    // Sort updates by date descending, then createdAt descending
    updates.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      const dateCompare = dateB.localeCompare(dateA);
      if (dateCompare !== 0) return dateCompare;
      const createdA = a.createdAt || "";
      const createdB = b.createdAt || "";
      return createdB.localeCompare(createdA);
    });

    res.json(updates);
  });

  // API: Post Progress Update (Member Only)
  app.post("/api/updates", (req, res) => {
    const { taskId, userId, userName, date, progress, workDone, difficulties, notes } = req.body;

    if (!taskId || !userId || !userName || !date || progress === undefined || !workDone) {
       res.status(400).json({ error: "Thiếu thông tin tiến độ bắt buộc" });
       return;
    }

    const db = readDB();
    
    // Check if task exists
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
       res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
       return;
    }

    const task = db.tasks[taskIndex];

    // Create the task update
    const newUpdate: TaskUpdate = {
      id: "up_" + Math.random().toString(36).substr(2, 9),
      taskId,
      userId,
      userName,
      date, // YYYY-MM-DD
      progress: Number(progress),
      workDone,
      difficulties: difficulties || "",
      notes: notes || "",
      groupId: task.groupId,
      createdAt: new Date().toISOString()
    };

    db.updates.push(newUpdate);

    // Update the parent task progress & status
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

    // Notify the boss
    addNotification(
      db,
      "Cập nhật tiến độ mới",
      `${userName} đã cập nhật tiến độ nhiệm vụ "${task.title}" lên ${progress}%.`,
      "progress_update",
      taskId,
      userId,
      userName,
      task.groupId || "boss",
      newUpdate.id,
      task.groupId
    );

    writeDB(db);

    res.status(201).json({ update: newUpdate, task: db.tasks[taskIndex] });
  });

  // API: Update Today's Progress Update (Member Only)
  app.put("/api/updates/:id", (req, res) => {
    const updateId = req.params.id;
    const { progress, workDone, difficulties, notes, date } = req.body;

    if (progress === undefined || !workDone || !date) {
       res.status(400).json({ error: "Thiếu thông tin cập nhật" });
       return;
    }

    const db = readDB();
    const updateIndex = db.updates.findIndex(u => u.id === updateId);
    
    if (updateIndex === -1) {
       res.status(404).json({ error: "Không tìm thấy bản cập nhật" });
       return;
    }

    const currentUpdate = db.updates[updateIndex];

    // Verify it is indeed today's date or matching dates to allow edit
    // (As required: "Có thể chỉnh sửa bản cập nhật trong ngày")
    const updated: TaskUpdate = {
      ...currentUpdate,
      progress: Number(progress),
      workDone,
      difficulties: difficulties || "",
      notes: notes || "",
      date, // Update date
      updatedAt: new Date().toISOString(),
    };

    db.updates[updateIndex] = updated;

    // Check if we need to update the task's current progress
    // If this is the most recent update, update the task progress accordingly
    const taskIndex = db.tasks.findIndex(t => t.id === currentUpdate.taskId);
    if (taskIndex !== -1) {
      const task = db.tasks[taskIndex];
      
      // Update task's progress and status
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

      // Notify the boss
      addNotification(
        db,
        "Chỉnh sửa tiến độ",
        `${currentUpdate.userName} đã chỉnh sửa cập nhật tiến độ nhiệm vụ "${task.title}" thành ${progress}%.`,
        "progress_update",
        task.id,
        currentUpdate.userId,
        currentUpdate.userName,
        task.groupId || "boss",
        currentUpdate.id,
        task.groupId
      );
    }

    writeDB(db);
    res.json({ update: updated, task: taskIndex !== -1 ? db.tasks[taskIndex] : null });
  });

  // API: Get Notifications
  app.get("/api/notifications", (req, res) => {
    const userId = req.query.userId as string;
    const role = req.query.role as string;
    const groupId = req.query.groupId as string;

    if (!userId || !groupId) {
      res.json([]);
      return;
    }

    const db = readDB();
    if (!db.notifications) {
      db.notifications = [];
    }

    const userNotifs = db.notifications.filter(n => {
      if (n.isDeleted) return false;
      
      if (n.groupId && n.groupId !== groupId) return false;

      const isBossNotif = (n.receiverId === "boss") || (n.receiverId === groupId) || (n.targetRole === "boss") || (n.targetRole === "all");
      const isUserNotif = (n.receiverId === userId) || (n.targetUserId === userId) || (n.targetRole === "member" && n.targetUserId === userId);

      if (role === "boss") {
        return isBossNotif || isUserNotif;
      } else {
        return isUserNotif;
      }
    });

    res.json(userNotifs);
  });

  // API: Mark a Notification as Read/Unread
  app.put("/api/notifications/:id/read", (req, res) => {
    const { id } = req.params;
    const { isRead } = req.body;
    const db = readDB();
    if (!db.notifications) {
      db.notifications = [];
    }

    const notifIndex = db.notifications.findIndex(n => n.id === id);
    if (notifIndex !== -1) {
      db.notifications[notifIndex].isRead = typeof isRead === "boolean" ? isRead : true;
      writeDB(db);
    }
    res.json({ success: true });
  });

  // API: Mark All Notifications as Read for a user
  app.post("/api/notifications/read-all", (req, res) => {
    const { userId, role } = req.body;
    if (!userId) {
      res.status(400).json({ error: "Thiếu userId" });
      return;
    }

    const db = readDB();
    if (!db.notifications) {
      db.notifications = [];
    }

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
      writeDB(db);
    }
    res.json({ success: true });
  });

  // API: Clear All Notifications for a user
  app.post("/api/notifications/clear-all", (req, res) => {
    const { userId, role } = req.body;
    if (!userId) {
      res.status(400).json({ error: "Thiếu userId" });
      return;
    }

    const db = readDB();
    if (!db.notifications) {
      db.notifications = [];
    }

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
      writeDB(db);
    }
    res.json({ success: true });
  });

  // API: Backup Data (Boss Only)
  app.get("/api/backup", (req, res) => {
    const role = req.query.role as string;
    if (role !== "boss") {
      res.status(403).json({ error: "Chỉ Quản lý (Boss) mới có quyền sao lưu dữ liệu" });
      return;
    }

    try {
      const db = readDB();
      const dateStr = new Date().toISOString().split("T")[0];

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=task_manager_backup_${dateStr}.json`);
      res.send(JSON.stringify(db, null, 2));
    } catch (err: any) {
      console.error("Backup error:", err);
      res.status(500).json({ error: "Đã xảy ra lỗi khi sao lưu dữ liệu" });
    }
  });

  // API: Restore Data (Boss Only)
  app.post("/api/restore", (req, res) => {
    const role = req.query.role as string;
    if (role !== "boss") {
      res.status(403).json({ error: "Chỉ Quản lý (Boss) mới có quyền khôi phục dữ liệu" });
      return;
    }

    try {
      const backupData = req.body;
      const validation = validateRestoreState(backupData);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      // Write back to database
      writeDB(backupData);
      res.json({ message: "Khôi phục dữ liệu thành công" });
    } catch (err: any) {
      console.error("Restore error:", err);
      res.status(500).json({ error: "Đã xảy ra lỗi khi khôi phục dữ liệu" });
    }
  });

  // Serve static files / Vite SPA fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

// Helpers for Restore validation

function validateRestoreState(state: any): { valid: boolean; error?: string } {
  if (!state || typeof state !== "object") {
    return { valid: false, error: "Dữ liệu không hợp lệ (không phải là đối tượng JSON)" };
  }

  if (!Array.isArray(state.users)) {
    return { valid: false, error: "Thiếu danh sách nhân viên (users) trong file khôi phục" };
  }
  if (!Array.isArray(state.tasks)) {
    return { valid: false, error: "Thiếu danh sách nhiệm vụ (tasks) trong file khôi phục" };
  }
  if (!Array.isArray(state.updates)) {
    return { valid: false, error: "Thiếu danh sách lịch sử cập nhật (updates) trong file khôi phục" };
  }

  // Validate users
  for (const u of state.users) {
    if (!u.id || !u.username || !u.name || !u.role) {
      return { valid: false, error: "Tài khoản không hợp lệ: Thiếu các trường bắt buộc (id, username, name, role)" };
    }
    if (u.role !== "boss" && u.role !== "member") {
      return { valid: false, error: "Vai trò tài khoản phải là 'boss' hoặc 'member'" };
    }
  }

  // Check if at least one boss exists to prevent lockout
  const hasBoss = state.users.some((u: any) => u.role === "boss");
  if (!hasBoss) {
    return { valid: false, error: "Bản sao lưu phải chứa ít nhất một tài khoản Quản lý (Boss) để tránh khóa tài khoản." };
  }

  // Validate tasks
  for (const t of state.tasks) {
    if (!t.id || !t.title || !t.status) {
      return { valid: false, error: `Nhiệm vụ không hợp lệ: Thiếu trường bắt buộc (id, title, status)` };
    }
    if (!Array.isArray(t.assignedTo)) {
      return { valid: false, error: `Nhiệm vụ '${t.title}' có danh sách phân công (assignedTo) không đúng định dạng` };
    }
  }

  // Validate updates
  for (const u of state.updates) {
    if (!u.id || !u.taskId || !u.userId || !u.date) {
      return { valid: false, error: "Lịch sử cập nhật không hợp lệ: Thiếu trường bắt buộc (id, taskId, userId, date)" };
    }
  }

  // Ensure notifications array exists in state
  if (!state.notifications) {
    state.notifications = [];
  }

  return { valid: true };
}
