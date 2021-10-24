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
const starthtml = "converter.html";
const tardir = path.sep + "tar";
const anidir = path.sep + "awebp";

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
  console.error("Not found : " + filepath);
  res.writeHead(404);
  res.end();
}

function sendCreated(res, dir, file) {
  var url = path.join(dir, file)
    .replace(/\\/gi, "/")
    .replace(new RegExp("^[/]+"), "");
  res.writeHead(201); // created
  res.write(url);
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
  return readStream.pipe(res);
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
      console.error("WriteFile Error :" + e);
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
    } else {
      console.log("Delete done");
      res.writeHead(200);
    }
    res.end();
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
  const command = `"${binpath}" -lossless "${from}" -o "${to}"`;
  console.log(`command: ${command}`);
  child_process.exec(command, (error, stdout, stderr) => {
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    if (error) {
      console.error(`exec error: ${error}`);
      res.writeHead(500); // internal server error
      res.end();
    } else {
      sendCreated(res, dir, tofile);
    }
    fs.unlink(from, (e) => {e && console.log("Unlink Error" + e);});
  });
}

function receiveJSON(req, done_cb) {
  let body = [];
  req.on("data", (chunk)=>{
     body.push(chunk);
  }).on("end", ()=>{
    let json;
    try {
      json = JSON.parse(body);
    } catch(e) {
      console.log("Warning : error on parsing " + body);
      res.writeHead(400); // wrong req
      res.end();
      return;
    }
    done_cb(json);
  });
}

const tarmap = new Map();
function registerTar(res, filename, array) {
  tarmap.set(filename, array);
  console.log(`Tar registered : "${filename}" ${array.length} files`);
  sendCreated(res, tardir, filename);
}
function sendTar(res, filename) {
  // get list
  const array = tarmap.get(filename);
  if (!array) {
    sendNotFound(res, path.join(tardir, filename));
    return;
  }
  console.log(`Tar send : "${filename}" ${array.length} files`);

  // check temp directory
  const temppath = path.join(__dirname, tempdir);
  if (!fs.existsSync(temppath)) {
    console.log("mkdir : " + temppath);
    fs.mkdirSync(temppath, { recursive: true });
  }

  // define command
  let filepath = path.join(temppath, filename);
  command = `tar --format ustar -cf "${filepath}" -C "${__dirname}"`;
  for (const file of array) { // TODO : exceed number...
    command += ` "${file}"`;
  }
  console.log(`Tar command : "${command}"`);

  // tar
  child_process.exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      res.writeHead(500); // internal server error
      res.end();
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    sendFile(res, tempdir, filename).on("finish", ()=>{
      console.log("Remove : " + filepath);
      fs.unlink(filepath, (e) => {e && console.log("Unlink Error" + e);});
    });
  });
}

function getCommonName(files) {
  var common_dir = "";
  var common_name = "";
  var dir, name, same;
  var init = true;
  for (file of files) {
    dir = path.dirname(file).split("/").pop();
    name = path.basename(file, path.extname(file));
    if (init) {
      init = false;
      common_dir = dir;
      common_name = name;
      continue;
    }
    for (same = 0; same < dir.length && same < common_dir.length && dir[same] == common_dir[same]; same++);
    common_dir = common_dir.substr(0, same);
    for (same = 0; same < name.length && same < common_name.length && name[same] == common_name[same]; same++);
    common_name = common_name.substr(0, same);
  }
  console.log(`CommonName : dir "${common_dir}"  file "${common_name}"`);
  if (common_dir.length > 0)
    return common_dir;
  if (common_name.length > 0)
    return common_name;
  return "noname";
}

function makeAnimatedWebP(res, info) {
  // refine options
  const fps = info.option.fps;
  const loop = info.option.loop;
  const files = info.files;
  if (fps < 1) {
    console.log(`Invalid FPS ${fps}. Set default 30`);
    fps = 30;
  }
  if (loop < 0) {
    console.log(`Invalid loop ${loop}. Set default 0`);
    loop = 0;
  }
  if (files.length < 2) {
    console.error(`Files(${files.length}) must be more than 2.`);
    res.writeHead(400);
    res.end();
    return;
  }

  // get common name
  const common = getCommonName(files);
  if (!common || common == "") {
    console.error("No common name found");
    res.writeHead(400); // internal server error
    res.end();
    return;
  }

  // dir check
  const argdir = path.join(__dirname, tempdir);
  if (!fs.existsSync(argdir)) {
    console.log("mkdir : " + argdir);
    fs.mkdirSync(argdir, { recursive: true });
  }
  const todir = path.join(__dirname, anidir);
  if (!fs.existsSync(todir)) {
    console.log("mkdir : " + todir);
    fs.mkdirSync(todir, { recursive: true });
  }

  // set argument file
  const argfile = path.join(argdir, common + ".arg" );
  const tofile = path.join(todir, common + ".webp");

  var arg = `-o ${tofile} -loop ${loop}\n`;
  var currtime = 0, nexttime = 0, duration;
  for (var i = 0; i < files.length; i++) {
    currtime = nexttime;
    nexttime = Math.round((i + 1) * 1000 / fps);
    duration = nexttime - currtime;
    const file = path.join(__dirname, files[i]);
    arg += ` -frame ${file} +${duration}+0+0+1+b\n`;
  }
  fs.writeFile(argfile, arg, (err) => {
    if (err) {
      console.log(`File write fail : ${err}`);
      res.writeHead(500); // internal server error
      res.end();
      return;
    }

    // mux
    const binpath = path.join(osdir, "webpmux");
    const command = `"${binpath}" "${argfile}"`;
    console.log(`command: ${command}`);
    child_process.exec(command, (error, stdout, stderr) => {
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
      if (error) {
        console.error(`exec error: ${error}`);
        res.writeHead(500); // internal server error
        res.end();
      } else {
        sendCreated(res, anidir, common + ".webp");
      }
      fs.unlink(argfile, (e) => {e && console.log("Unlink Error" + e);});
    });
  });
}


function msgDispatch(req, res) {
  const addr = url.parse(req.url, true);
  const target = path.normalize(decodeURI(addr.path));
  var dirname = path.dirname(target);
  var filename = path.basename(target);
  console.log(`${req.method} "${dirname}" "${filename}"`);
  if (req.method == "GET") {
    if (filename == "") {
      filename = starthtml;
    }
    if (dirname == tardir) {
      sendTar(res, filename);
    } else {
      sendFile(res, dirname, filename);
    }
  } else if (req.method == "POST") {
    if (dirname == tardir) {
      receiveJSON(req, (json)=>registerTar(res, filename, json));
    } else if (target == anidir) {
      receiveJSON(req, (json)=>makeAnimatedWebP(res, json));
    } else {
      receiveFile(res, dirname, filename, req, convertFileWebP);
    }
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
