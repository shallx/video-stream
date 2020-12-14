const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

var fs = require("fs");
var express = require("express");
var app = express();
var chalk = require("chalk");
const path = require("path");

var addSubtitles = function (key, callback) {
  console.log("inside addSubtitles");
  ffmpeg("./assets/" + key + ".mp4")
    .videoCodec("libx264")
    .audioCodec("libmp3lame")
    .outputOptions("-vf subtitles=./assets/conjuring_subs.srt")
    .on("error", function (err) {
      callback(true, err);
    })
    .save("./moviewithsubtitle.mp4")
    .on("end", function () {
      callback(false, "done");
    });
};

var streaming = function (req, res, newpath) {
  var path = "./assets/" + newpath + ".mp4";
  var stat = fs.statSync(path);
  var total = stat.size;
  if (req.headers["range"]) {
    var range = req.headers.range;
    var parts = range.replace(/bytes=/, "").split("-");
    var partialstart = parts[0];
    var partialend = parts[1];

    var start = parseInt(partialstart, 10);
    var end = partialend ? parseInt(partialend, 10) : total - 1;
    var chunksize = end - start + 1;
    console.log("RANGE: " + start + " - " + end + " = " + chunksize);

    var file = fs.createReadStream(path, {
      start: start,
      end: end,
    });
    res.writeHead(206, {
      "Content-Range": "bytes " + start + "-" + end + "/" + total,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    });
    file.pipe(res);
  } else {
    console.log("ALL: " + total);
    res.writeHead(200, {
      "Content-Length": total,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(path).pipe(res);
  }
};

app.get("/subs", function (req, res) {
  addSubtitles("conjuring", function (error, newpath) {
    console.log(newpath);
    if (error) {
      res.send("error : " + error);
    } else {
      console.log("done");
      res.end();
    }
  });
});
app.get("/dex", function (req, res) {
  res.sendFile(path.join(__dirname + "/index.htm"));
});

app.get("/", function (req, res) {
  streaming(req, res, "conjuring");
});
let port = 7090;
let host = "localhost";

const server = app.listen(port, host, () => {
  console.log(
    chalk.black.bgCyanBright(
      " Server is listening ",
      chalk.underline(`http://${host}:${port} `)
    )
  );
});
