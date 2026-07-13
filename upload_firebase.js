const fs = require('fs');
const db = JSON.parse(fs.readFileSync('database.json', 'utf-8'));
fetch("https://react-firebase-a0808-default-rtdb.asia-southeast1.firebasedatabase.app/db.json", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(db)
}).then(res => res.json()).then(console.log).catch(console.error);
