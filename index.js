const app = require("express")();
const fs = require("fs");
const https = require("https");

const options = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
};

const server = https.createServer(options, app); // 创建 HTTPS 服务器实例
const wsInstance = require("express-ws")(app, server); // 正确初始化 wsInstance

app.ws("/", (ws) => {
  ws.on("message", (data) => {
    // 未做业务处理，收到消息后直接广播
    wsInstance.getWss().clients.forEach((client) => {
      if (client !== ws) {
        client.send(data);
      }
    });
  });
});

app.get("/", (req, res) => {
  res.sendFile("./client/index.html", { root: __dirname });
});

app.get("/p2p", (req, res) => {
  res.sendFile("./client/p2p.html", { root: __dirname });
});

server.listen(8443, "0.0.0.0", () => {
  console.log("HTTPS server listening on port 8443");
});
