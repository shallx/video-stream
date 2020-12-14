const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const chalk = require("chalk");
const ioz = require("./socket");
// const ffmpeg = require("fluent-ffmpeg");
// var uuid = require("node-uuid");
// import { parse, resync, stringify } from "subtitle";

app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/video", function (req, res) {
  const path = "assets/conjuring.mp4";
  const stat = fs.statSync(path);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    ioz.getIO().emit("range", {
      action: "create",
      range: range,
    });
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res
        .status(416)
        .send("Requested range not satisfiable\n" + start + " >= " + fileSize);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(path, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    };
    res.writeHead(200, head);
    fs.createReadStream(path).pipe(res);
  }
});
let port = 7090;
let host = "192.168.0.137";

const server = app.listen(port, host, () => {
  console.log(
    chalk.black.bgCyanBright(
      " Server is listening ",
      chalk.underline(`http://${host}:${port} `)
    )
  );
});
const io = require("./socket.js").init(server);
io.on("connection", socket => {
  socket.on("paused", msg => {
    socket.broadcast.emit("paused", { paused_at: msg.paused_at });
  });
  socket.on("play", msg => {
    socket.broadcast.emit("play", { play_at: msg.play_at });
  });
  socket.on("seeked", msg => {
    socket.broadcast.emit("seeked", { seeked_at: msg.seeked_at });
  });
  console.log("Client connected = " + socket.id);
  console.log(io);
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});
