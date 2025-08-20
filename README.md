# WebRTC P2P 视频通话示例 (改造版)

这是一个基于 WebRTC 和 WebSocket 实现的 P2P 视频通话示例项目。

## 改造说明

本项目是在 [https://github.com/shushushv/webrtc-p2p](https://github.com/shushushv/webrtc-p2p) 的基础上进行改造和完善的，主要目的是为了解决在非 `localhost` 下，由于浏览器安全上下文限制导致摄像头/麦克风无法调用的问题，并通过配置 HTTPS 和 WSS 来实现安全通信。同时，也完善了 ICE 候选者的处理逻辑，提升了连接的稳定性。

## 主要技术

- **WebRTC** (Web Real-Time Communication)：网页即时通信，允许浏览器之间进行点对点（Peer-to-Peer）的音视频流或其他数据的直接传输，无需中介服务器中转媒体流。
- **WebSocket**：一种在单个 TCP 连接上进行全双工通信的协议。在本示例中，WebSocket 充当信令服务器的角色，用于在通信双方之间交换信令消息（SDP 和 ICE 候选者），以建立 WebRTC 连接。

## 通话建立流程

WebRTC 通话的建立需要一个信令服务器来协调通信双方。基本流程如下：

1.  **连接信令服务器**：通信双方（浏览器 A 和 B）都连接到信令服务器（WebSocket）。
2.  **创建 Offer SDP**：发起方 A 创建本地媒体流（摄像头/麦克风），生成一个 `Offer SDP`（会话描述协议）包含音视频能力等信息。
3.  **发送 Offer SDP**：发起方 A 将 `Offer SDP` 通过信令服务器发送给接收方 B。
4.  **创建 Answer SDP**：接收方 B 收到 `Offer SDP` 后，创建本地媒体流，并生成一个 `Answer SDP` 作为响应，包含其音视频能力。
5.  **发送 Answer SDP**：接收方 B 将 `Answer SDP` 通过信令服务器发送给发起方 A。
6.  **ICE 候选者交换**：A 和 B 开始收集 ICE 候选者（网络连接信息），并通过信令服务器互相交换这些信息，用于“打洞”以穿透防火墙和 NAT。
7.  **建立媒体连接**：在 SDP 和 ICE 候选者交换完成后，A 和 B 之间将尝试建立直接的 P2P 媒体连接。
8.  **开始音视频通话**：连接建立成功后，A 和 B 可以直接进行音视频通话。

## 项目运行

### 前提条件

- **Node.js**: **仅在作为信令服务器的设备上**安装 Node.js (推荐 LTS 版本)。
- **OpenSSL**: 在作为**信令服务器**的设备上安装 OpenSSL 工具，用于生成 SSL 证书。

### 1. 克隆项目与安装依赖

**仅在作为信令服务器的设备上**，执行以下步骤：

```bash
# 克隆项目
git clone https://github.com/Hogon1/WebRTC-demo.git
cd webrtc-p2p

# 安装依赖
npm install
```

**负责通信的客户端设备（例如另一台电脑、手机或平板）无需克隆此项目或安装 Node.js。它们只需一个现代浏览器即可。**

### 2. 配置 SSL 证书 (仅在作为信令服务器的设备上执行)

在作为**信令服务器**的设备上 (例如 IP: `192.168.1.8`)，进入项目根目录，在命令行中依次运行以下命令来生成自签名 SSL 证书：

```bash
# 生成 RSA 私钥 (key.pem)
openssl genrsa -out key.pem 2048

# 生成证书签名请求 (csr.pem)
# 提示输入信息时，除了 Common Name (e.g. server FQDN or YOUR name)
# 请输入你的服务器 IP 地址 (例如 192.168.1.8)，其他可直接回车跳过。
openssl req -new -key key.pem -out csr.pem

# 生成自签名证书 (cert.pem)，有效期 365 天
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
```

执行成功后，项目根目录会生成 `key.pem`、`cert.pem` 和 `csr.pem` 文件。

### 3. 修改服务器配置 (`index.js`)

为了支持 HTTPS 和 WSS，`index.js` 文件已进行改造。你需要确保 `index.js` 文件内容与项目仓库中的最新版本一致，它包含了：

- 引入 `fs` 和 `https` 模块。
- 读取 `key.pem` 和 `cert.pem` 文件。
- 使用 `https.createServer` 创建 HTTPS 服务器。
- 将 `express-ws` 正确绑定到 HTTPS 服务器实例。
- 服务器监听 `8443` 端口 (HTTPS 默认端口)。

**确认你的 `index.js` 文件顶部包含以下代码，并且 `app.listen` 已被 `server.listen` 替换为 `8443` 端口：**

```javascript
const app = require("express")();
const fs = require("fs");
const https = require("https");

const options = {
  key: fs.readFileSync("key.pem"),
  cert: fs.readFileSync("cert.pem"),
};

const server = https.createServer(options, app);
const wsInstance = require("express-ws")(app, server);

// ... （中间代码）

server.listen(8443, "0.0.0.0", () => {
  console.log("HTTPS server listening on port 8443");
});
```

### 4. 修改客户端连接地址 (`client/p2p.html`)

在**客户端设备**上，打开 `client/p2p.html` 文件（你可以直接下载或从信令服务器提供的 `/p2p` 路由获取），将其中的 WebSocket 连接地址修改为指向**信令服务器设备的 HTTPS IP 地址和端口**。

**找到以下行 (大约在第 119 行)：**

```javascript
const socket = new WebSocket("wss://192.168.1.8:8443"); // 将 192.168.1.8 替换为你的服务器实际 IP
```

确保 `192.168.1.8` 是你作为信令服务器的设备的实际 IP 地址，并且协议是 `wss`，端口是 `8443`。

### 5. 启动项目

#### a. 启动信令服务器 (仅在作为信令服务器的设备上执行)

在作为**信令服务器**的设备上，进入项目根目录，运行：

```bash
npm run dev
```

你会在控制台看到 `HTTPS server listening on port 8443` 的输出。

#### b. 访问客户端页面 (在所有需要通信的客户端设备上执行)

在任意需要进行通信的客户端设备上，打开你常用的 Web 浏览器（推荐 Chrome 或 Firefox），并访问以下 URL：

- **发起方**: `https://[信令服务器IP]:8443/p2p?type=offer`
- **接收方**: `https://[信令服务器IP]:8443/p2p?type=answer`

**请注意：**
由于使用的是自签名证书，浏览器会显示**安全警告**（例如“您的连接不是私密连接”）。这是正常的，你需要点击“高级”或“继续访问”等选项来接受风险并访问页面。

### 6. 开始视频通话

在所有客户端设备的浏览器页面都加载完成后：

1.  确认信令通道已创建成功。
2.  在发起方页面点击“start”按钮。
3.  浏览器会请求摄像头和麦克风权限，请务必允许。

如果一切配置正确，所有客户端设备之间应该就能成功进行视频通话了。
