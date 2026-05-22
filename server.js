const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let globalConfig = {
  userName: "赵超越",
  userNameEn: "Zhao Chaoyue",
  qrCodeBase64: "",
  qrRef: "2888028969364814"
};
let scanLogs = [];

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
  pingTimeout: 60000
});

io.on('connection', (socket) => {
  socket.emit('config-update', globalConfig);
  socket.emit('scan-logs', scanLogs);
  socket.on('disconnect', () => {});
});

app.post('/upload-scan', (req, res) => {
  const { result } = req.body;
  if (!result) return res.json({success:false,msg:"空数据"});
  globalConfig.qrCodeBase64 = result;
  globalConfig.qrRef = String(Date.now()).slice(-16);
  scanLogs.unshift({
    time: new Date().toLocaleString(),
    result: result.substring(0,100)+"..."
  });
  if(scanLogs.length>20) scanLogs.pop();
  io.emit('config-update', globalConfig);
  io.emit('scan-logs', scanLogs);
  res.json({success:true});
});

app.post('/admin/update-name', (req, res) => {
  const {userName,userNameEn} = req.body;
  if(userName) globalConfig.userName = userName;
  if(userNameEn) globalConfig.userNameEn = userNameEn;
  io.emit('config-update', globalConfig);
  res.json({success:true});
});

app.post('/admin/refresh-qr', (req, res) => {
  globalConfig.qrRef = String(Date.now()).slice(-16);
  io.emit('config-update', globalConfig);
  res.json({success:true});
});

server.listen(PORT, () => {
  console.log(`服务启动成功 端口:${PORT}`);
});
