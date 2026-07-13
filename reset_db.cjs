const fs = require('fs');
const dbPath = './database.json';
const db = require(dbPath);

const newUsers = db.users.filter(u => u.groupName === 'Ban Bản đồ');

const newState = {
  tasks: [],
  updates: [],
  users: newUsers,
  notifications: [],
  chat: db.chat || { txt: "Yêu cầu: Ứng dụng Quản lý công việc và báo cáo tiến độ..." }
};

fs.writeFileSync(dbPath, JSON.stringify(newState, null, 2), 'utf-8');
console.log('Local DB reset. Sending to Firebase...');

fetch("https://taskflow-goal-default-rtdb.asia-southeast1.firebasedatabase.app/.json", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(newState)
})
.then(res => {
  if (res.ok) console.log("Firebase DB reset successfully.");
  else console.error("Failed to reset Firebase DB.", res.statusText);
})
.catch(err => console.error("Error pushing to Firebase:", err));
