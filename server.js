const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // 新增 path 模块

const app = express();
app.use(cors());
app.use(express.json());

// 核心修改：用 path.join 强制指定静态文件根目录
app.use(express.static(path.join(__dirname, '/')));

// 新增一个根路由，直接跳转到扫码页
app.get('/', (req, res) => {
  res.redirect('/index.html');
});


// 按房间独立存储数据
let roomConfigs = {};
let roomLogs = {};

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
  pingTimeout: 60000
});

io.on('connection', (socket) => {
  const roomId = socket.handshake.query.room || 'default';
  socket.join(roomId);

  if (!roomConfigs[roomId]) {
    roomConfigs[roomId] = {
      userName: "贵宾用户",
      userNameEn: "VIP Guest",
      qrCodeBase64: "",
      qrRef: String(Date.now()).slice(-16)
    };
    roomLogs[roomId] = [];
  }

  socket.emit('config-update', roomConfigs[roomId]);
  socket.emit('scan-logs', roomLogs[roomId]);

  socket.on('disconnect', () => {});
});

app.post('/upload-scan', (req, res) => {
  const { result, roomId = 'default' } = req.body;
  if (!result) return res.json({success:false,msg:"空数据"});

  if (!roomConfigs[roomId]) {
    roomConfigs[roomId] = {
      userName: "贵宾用户",
      userNameEn: "VIP Guest",
      qrCodeBase64: "",
      qrRef: String(Date.now()).slice(-16)
    };
    roomLogs[roomId] = [];
  }

  roomConfigs[roomId].qrCodeBase64 = result;
  roomConfigs[roomId].qrRef = String(Date.now()).slice(-16);
  roomLogs[roomId].unshift({
    time: new Date().toLocaleString(),
    result: result.substring(0,100)+"..."
  });
  if(roomLogs[roomId].length>20) roomLogs[roomId].pop();

  io.to(roomId).emit('config-update', roomConfigs[roomId]);
  io.to(roomId).emit('scan-logs', roomLogs[roomId]);
  res.json({success:true});
});

app.post('/admin/update-name', (req, res) => {
  const {userName,userNameEn,roomId='default'} = req.body;
  if(!roomConfigs[roomId]) return res.json({success:false});
  if(userName) roomConfigs[roomId].userName = userName;
  if(userNameEn) roomConfigs[roomId].userNameEn = userNameEn;
  io.to(roomId).emit('config-update', roomConfigs[roomId]);
  res.json({success:true});
});

app.post('/admin/refresh-qr', (req, res) => {
  const {roomId='default'} = req.body;
  if(!roomConfigs[roomId]) return res.json({success:false});
  roomConfigs[roomId].qrRef = String(Date.now()).slice(-16);
  io.to(roomId).emit('config-update', roomConfigs[roomId]);
  res.json({success:true});
});

server.listen(PORT, () => {
  console.log(`服务启动成功 端口:${PORT}`);
});
