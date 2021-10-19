const protocol = "http";
const port = 3000;

const os = require("os");
const path = require("path");
const url = require("url");
const fs = require("fs");
const child_process = require("child_process");

var osdir = "";
const platform = process.platform;
if (platform == "win32") {
  osdir = path.join(__dirname, "../win");
} else if (platform == "darwin") {
  osdir = path.join(__dirname, "../mac");
} else if (platform == "linux") {
  osdir = path.join(__dirname, "../linux");
} else {
  console.error("Unknown OS? " + platform);
}
const tempdir = "temp";
const cwebpdir = "cwebp";

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
        // console.log(subpath);
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
  // console.log(filepath);
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

function receiveFile(res, dir, file, req, done_cb) {
  const recvdir = path.join(__dirname, tempdir, dir);
  if (!fs.existsSync(recvdir)) {
    console.log("mkdir : " + recvdir);
    fs.mkdirSync(recvdir, { recursive: true });
  }

  console.log("ReceiveFile :[" + recvdir + "][" + file + "]");
  const recvfile = path.join(recvdir, file);
  const writer = fs.createWriteStream(recvfile, { flags: "a" });
  req
    .pipe(writer)
    .on("finish", () => {
      console.log("WriteFile Done :[" + recvfile + "]");
      if (done_cb) {
        done_cb(res, dir, file, recvfile); // convertFileWebP
      }
    })
    .on("error", (e) => {
      console.log("WriteFile Error :" + e);
      res.writeHead(500); // internal server error
      res.end();
    });
}

function deleteFile(res, dir, file) {
  const filepath = path.join(__dirname, dir, file);
  console.log("Delete :[" + filepath + "]");
  fs.unlink(filepath, (err) => {
    if (err) {
      console.error("Delete error : " + err);
      res.writeHead(500); // internal server error
      res.end();
      return;
    }
    console.error("Delete done");
    res.writeHead(200);
  });
}

function convertFileWebP(res, dir, file, from) {
  const todir = path.join(__dirname, dir);
  if (!fs.existsSync(todir)) {
    console.log("mkdir : " + todir);
    fs.mkdirSync(todir, { recursive: true });
  }
  const tofile = path.parse(file).name + ".webp";
  const to = path.join(todir, tofile);
  console.log("From : " + from + " To : " + to);

  const binpath = path.join(osdir, "cwebp");
  /*
  const cwebp = child_process.spawn(binpath, ["-lossless", from, "-o", to]);
  cwebp.stderr.on("data", (data) => {
    console.error("" + data);
  });
  cwebp.on("close", (code) => {
    const i = new Int32Array([code])[0];
    console.log("close " + i);
    if (i == 0) {
      var url = path.join(dir, tofile).replace(/\\/gi, "/");
      res.writeHead(201); // created
      res.write(url);
      res.end();
    } else {
      res.writeHead(500); // internal server error
      res.end();
    }
    */
  const command = '"' + binpath + '" -lossless "' + from + '" -o "' + to + '"';
  console.error(`command: ${command}`);
  const cwebp = child_process.exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      res.writeHead(500); // internal server error
      res.end();
    } else {
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
      var url = path.join(dir, tofile)
        .replace(/\\/gi, "/")
        .replace(new RegExp("^[/]+"), "");
      res.writeHead(201); // created
      res.write(url);
      res.end();
    }

    console.log("Remove : " + from);
    fs.unlink(from, (e) => {
      if (e) {
        console.log("Unlink Error" + e);
      }
    });
  });
}

function msgDispatch(req, res) {
  const addr = url.parse(req.url, true);
  const target = path.normalize(decodeURI(addr.path));
  var dirname = path.dirname(target);
  var filename = path.basename(target);
  //console.log("Method : " + req.method);
  console.log("Path : [" + dirname + "][" + filename + "]");
  if (req.method == "GET") {
    if (filename == "") {
      filename = "converter.html";
    }
    sendFile(res, dirname, filename);
  } else if (req.method == "POST") {
    receiveFile(res, dirname, filename, req, convertFileWebP);
  } else if (req.method == "DELETE") {
    deleteFile(res, dirname, filename);
  }
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
