const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = required("path");

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";
const db = new Database("rjm_transport.db");

app.use(cors());
app.use(express.json());
// Serve React frontend
const frontendPath = path.join(__dirname, "client", "dist");

app.use(express.static(frontendPath));

app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
        return res.sendFile(path.join(frontendPath, "index.html"));
    }
    next();
});

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  address TEXT,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  service_type TEXT NOT NULL,
  pickup TEXT NOT NULL,
  dropoff TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  package_details TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

const adminMobile = "8778904674";
const adminPassword = bcrypt.hashSync("Siva@2008", 10);
db.prepare(`INSERT OR IGNORE INTO users(name,mobile,address,password,role)
VALUES(?,?,?,?,?)`).run("RJM Admin", adminMobile, "RJM Transport Office", adminPassword, "admin");

function auth(req,res,next){
  const token = (req.headers.authorization || "").replace("Bearer ","");
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({message:"Please login again."}); }
}
function adminOnly(req,res,next){
  if(req.user.role !== "admin") return res.status(403).json({message:"Admin access required."});
  next();
}

app.post("/api/auth/register", async (req,res)=>{
  const {name,mobile,address,password} = req.body;
  if(!name || !mobile || !password) return res.status(400).json({message:"Name, mobile and password are required."});
  try {
    const hash = await bcrypt.hash(password,10);
    const info = db.prepare(`INSERT INTO users(name,mobile,address,password) VALUES(?,?,?,?)`)
      .run(name,mobile,address || "",hash);
    const user = {id:info.lastInsertRowid,name,mobile,address:address||"",role:"user"};
    const token = jwt.sign(user,JWT_SECRET,{expiresIn:"7d"});
    res.json({token,user});
  } catch(e) { res.status(400).json({message:"Mobile number already registered."}); }
});

app.post("/api/auth/login", async (req,res)=>{
  const {mobile,password} = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE mobile=?`).get(mobile);
  if(!user || !(await bcrypt.compare(password,user.password))) return res.status(401).json({message:"Invalid mobile number or password."});
  const safe = {id:user.id,name:user.name,mobile:user.mobile,address:user.address,role:user.role};
  res.json({token:jwt.sign(safe,JWT_SECRET,{expiresIn:"7d"}),user:safe});
});

app.get("/api/me",auth,(req,res)=>res.json({user:req.user}));

app.post("/api/bookings",auth,(req,res)=>{
  const {service_type,pickup,dropoff,date,time,package_details,notes} = req.body;
  if(!service_type || !pickup || !dropoff || !date || !time)
    return res.status(400).json({message:"Please fill all required booking fields."});
  const info = db.prepare(`INSERT INTO bookings(user_id,service_type,pickup,dropoff,date,time,package_details,notes)
    VALUES(?,?,?,?,?,?,?,?)`).run(req.user.id,service_type,pickup,dropoff,date,time,package_details||"",notes||"");
  res.json({message:"Booking submitted for admin approval.",bookingId:info.lastInsertRowid});
});

app.get("/api/bookings",auth,(req,res)=>{
  const rows = req.user.role==="admin"
    ? db.prepare(`SELECT b.*,u.name,u.mobile,u.address FROM bookings b JOIN users u ON u.id=b.user_id ORDER BY b.id DESC`).all()
    : db.prepare(`SELECT b.*,u.name,u.mobile,u.address FROM bookings b JOIN users u ON u.id=b.user_id WHERE user_id=? ORDER BY b.id DESC`).all(req.user.id);
  res.json(rows);
});

app.patch("/api/bookings/:id/status",auth,adminOnly,(req,res)=>{
  const {status} = req.body;
  if(!["Pending","Accepted","Rejected","Completed"].includes(status)) return res.status(400).json({message:"Invalid status."});
  db.prepare(`UPDATE bookings SET status=? WHERE id=?`).run(status,req.params.id);
  res.json({message:`Booking ${status.toLowerCase()}.`});
});

app.get("/api/admin/stats",auth,adminOnly,(req,res)=>{
  const total = db.prepare(`SELECT COUNT(*) c FROM bookings`).get().c;
  const pending = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE status='Pending'`).get().c;
  const accepted = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE status='Accepted'`).get().c;
  const users = db.prepare(`SELECT COUNT(*) c FROM users WHERE role='user'`).get().c;
  res.json({total,pending,accepted,users});
});

app.listen(PORT,()=>console.log(`RJM Transport API running at http://localhost:${PORT}`));
