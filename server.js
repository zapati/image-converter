const protocol = "http";
const port = 3000;

const os = require("os");
const path = require("path");
const url = require("url");
const fs = require("fs");

function getContentType(ext) {
  const table = {
    css: "text/css",
    htm: "text/html",
    html: "text/html",
    ico: '"image/vnd.microsoft.icon',
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    js: "application/javascript",
    json: "application/json",
    log: "text/plain",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
    png: "image/png",
    text: "text/plain",
    webm: "video/webm",
    webp: "image/webp",
    xml: "application/xml",
  };
  if (ext in table) {
    return table[ext];
  }
  return "application/octet-stream";
}

function sendNotFound(res, filepath) {
  console.log("Not found : " + filepath);
  res.writeHead(404);
  res.end();
}

function scanFiles(dir, subdir) {
  var files = [];
  fs.readdirSync(path.join(dir, subdir), { withFileTypes: true }).forEach(
    (p) => {
      var subpath;
      if (subdir.length > 0) {
        subpath = subdir + path.sep + p.name;
      } else {
        subpath = p.name;
      }
      if (p.isDirectory()) {
        console.log("====" + subpath);
        files.push(...scanFiles(dir, subpath));
      } else {
        files.push(subpath.replace(/\\/gi, "/"));
      }
    }
  );
  return files;
}

function sendDirectoryInfo(res, dir) {
  const files = scanFiles(dir, "");
  var ret = JSON.stringify(files);
  res.writeHead(200, {
    "Content-Type": "application/json",
  });
  res.write(ret);
  res.end();
}

function sendFile(res, subdir, file) {
  const ext = path.extname(file).substring(1);
  const type = getContentType(ext);
  const filepath = path.join(__dirname, subdir, file);
  console.log(filepath);
  var stat;
  try {
    // console.log("Send : " + filepath);
    stat = fs.statSync(filepath);
  } catch (err) {
    sendNotFound(res, filepath);
    return;
  }
  if (stat.isDirectory()) {
    sendDirectoryInfo(res, filepath);
    return;
  }

  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stat.size,
  });
  var readStream = fs.createReadStream(filepath);
  readStream.pipe(res);
}

function msgDispatch(req, res) {
  const addr = url.parse(req.url, true);
  const target = path.normalize(decodeURI(addr.path));
  const dirname = path.dirname(target);
  var filename = path.basename(target);
  if (filename == "") {
    filename = "index.html";
  }
  // console.log("Path : [" + dirname + "][" + filename + "]");
  sendFile(res, dirname, filename);
}

const server = require(protocol).createServer(msgDispatch);
server.listen(port, function () {
  console.log("Server URL(s) :");
  const ifaces = os.networkInterfaces();
  for (let dev in ifaces) {
    ifaces[dev].forEach(function (details) {
      if (details.family === "IPv4" && details.address !== "127.0.0.1") {
        console.log(`  ${protocol}://${details.address}:${port}`);
      }
    });
  }
  console.log("Now listening...");
});

// launch browser
//const open = require('open');
//const openURL = protocol + '://localhost:' + port;
//open(openURL);
