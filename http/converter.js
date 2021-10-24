const selType = document.getElementById("selType");
const inInfo = document.getElementById("inInfo");

const dropHere = document.getElementById("dropHere");
const inFiles = document.getElementById("inFiles");

const outInfo = document.getElementById("outInfo");
const outFiles = document.getElementById("outFiles");

const muxInfo = document.getElementById("muxInfo");
const muxFiles = document.getElementById("muxFiles");

var inDone = 0;
var inTotal = 0;
var dirOutFiles = "cwebp";
var dirMuxFiles = "awebp";


// ------------ Conversion Type ------------
selType.addEventListener("change", () => {
  // clear
  inWait = 0;
  inTotal = 0;
  dropHere.style.display = "block";
  inFiles.style.display = "none";
  while (inFiles.lastElementChild) {
    inFiles.removeChild(inFiles.lastElementChild);
  }
  while (outFiles.lastElementChild) {
    outFiles.removeChild(outFiles.lastElementChild);
  }
  while (muxFiles.lastElementChild) {
    muxFiles.removeChild(outFiles.lastElementChild);
  }

  // set option
  switch(selType.options[selType.selectedIndex].value) {
    case "WebP":
      dirOutFiles = "cwebp";
      break;
    case "CleanPNG":
      // TODO:
      break;
    case "ZopfliPNG":
      // TODO:
      break;
  }
  updateStatus();

  // fill outfile list
  sendRequest(dirOutFiles, outFiles);
  sendRequest(dirMuxFiles, muxFiles);
});


// ------------ Info and buttons ------------
const outSelAll = document.getElementById("outSelAll");
const outDnSel = document.getElementById("outDnSel");
const outSelInfo = document.getElementById("outSelInfo");
const outRmSel = document.getElementById("outRmSel");
const outRmAll = document.getElementById("outRmAll");
const outDnDrag = document.getElementById("outDnDrag");
const makeAni = document.getElementById("makeAni");
function updateStatus() {
  inInfo.innerHTML = `Input Files (${inDone}/${inTotal})`;
  outInfo.innerHTML = `Converted Images (${dirOutFiles})`;
  muxInfo.innerHTML = `Animated Images (${dirMuxFiles})`;

  const out_count = outFiles.selectedOptions.length;
  const out_total = outFiles.length;
  outSelAll.innerHTML = (out_count == out_total)? "Deselect All" : "Select All";
  outSelAll.disabled = (out_total < 1);
  outDnSel.disabled = (out_count < 1);
  outSelInfo.innerHTML = `Sel:${out_count}/${out_total}`;
  outRmSel.disabled = (out_count < 1);
  outRmAll.disabled = (out_total < 1);
  outDnDrag.className = (out_count < 1)? "dragdownload off" : "dragdownload";
  outDnDrag.disabled = (out_count < 1);

  makeAni.disabled = (out_count < 2);

  const mux_count = muxFiles.selectedOptions.length;
  const mux_total = muxFiles.length;
  muxSelAll.innerHTML = (mux_count == mux_total)? "Deselect All" : "Select All";
  muxSelAll.disabled = (mux_total < 1);
  muxDnSel.disabled = (mux_count < 1);
  muxSelInfo.innerHTML = `Sel:${mux_count}/${mux_total}`;
  muxRmSel.disabled = (mux_count < 1);
  muxRmAll.disabled = (mux_total < 1);
  muxDnDrag.className = (mux_count < 1)? "dragdownload off" : "dragdownload";
  muxDnDrag.disabled = (mux_count < 1);  
}
outFiles.addEventListener("change", () => {updateStatus()});
muxFiles.addEventListener("change", () => {updateStatus()});


// ------------ Request list ------------
function addOption(sel, id, text, value) {
  const exist = sel.options[id];
  if (exist) {
    console.log(`Exist : ${id} ${exist.value} - ${value}`);
    return exist;
  }
  var opt = document.createElement("option");
  opt.id = id;
  opt.text = text;
  opt.value = value;
  opt.className = "text_normal";
  if (sel.draggable) {
    setupDrag(opt);
  }
  sel.add(opt);
  return opt;
}
function addOptions(url, sel, arraytext) {
  try {
    const array = JSON.parse(arraytext);
    array.forEach((name) => {
      addOption(sel, name, name, url + "/" + name);
    });
  } catch (e) {
    console.log("Cannot parse : " + arraytext);
  }
  updateStatus();
}
function onRequestDone(req, onsuccess, onfail) {
  if (req.readyState !== XMLHttpRequest.DONE)
    return;
  if (req.status === 200 || req.status === 201) {
    onsuccess();
  } else if (onfail) {
    onfail();
  } else {
    console.log(`Error ${req.status} (${req.responseURL})`);
  }
}
function sendRequest(url, sel) {
  var req = new XMLHttpRequest();
  req.onreadystatechange = () => {
    onRequestDone(req, () => addOptions(url, sel, req.responseText));
  }
  req.open("GET", url);
  req.send();
}


// ------------ Drop from outside ------------
function dropFile(file, parentpath) {
  const baseurl = dirOutFiles + "/";
  const url = parentpath + "/" + file.name;

  //  left
  dropHere.style.display = "none";
  inFiles.style.display = "block";
  const inOpt = addOption(inFiles, url, url + " (converting...)", "");
  inTotal++; updateStatus();

  file.arrayBuffer().then((buf) => {
    var req = new XMLHttpRequest();
    req.onreadystatechange = () => {
      onRequestDone(req, () => {
        console.log("Created : " + req.responseText);
        inOpt.text = url + " (converted)";
        inOpt.className = "text_succeed";
        var name = req.responseText;
        if (name.indexOf(baseurl) == 0) {
          name = name.substr(baseurl.length); // remove "cwebp/" from the beginning
        }
        addOption(outFiles, name, name, url);
        inDone++; updateStatus();
      }, () => {
        console.log("Error " + req.status + "(" + url + ")");
        inOpt.text = url + " (error)";
        inOpt.className = "text_error";
        inDone++; updateStatus();
      });
    };
    req.open("POST", baseurl + url);
    req.send(buf);
  });
}

function dropDirectory(direntry, parentpath) {
  let reader = direntry.createReader();
  let getEntries = function () {
    reader.readEntries(
      (entries) => {
        for (entry of entries) {
          if (entry.isDirectory) {
            console.log("SubDirectory: " + entry.name);
            dropDirectory(entry, parentpath + "/" + direntry.name);
          } else if (entry.isFile) {
            entry.file((f) => {
              dropFile(f, parentpath + "/" + direntry.name);
            });
          }
          getEntries();
        }
      },
      (error) => {}
    );
  };
  getEntries();
}

function setupDrop(elem) {
  elem.addEventListener("dragenter", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    elem.style.background = "Beige";
  });
  elem.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  elem.addEventListener("dragleave", (e) => {
    e.preventDefault();
    elem.style.background = "";
  });
  elem.addEventListener("drop", (e) => {
    e.preventDefault();
    elem.style.background = "";
    for (const item of e.dataTransfer.items) {
      if (item.kind == "file") {
        if (item.type.match(/^image/)) {
          const file = item.getAsFile();
          console.log("Image file: " + file.name);
          dropFile(file, "");
        } else if (item.type == "") {
          // directory? try.
          // const handle = item.getAsFileSystemHandle(); // https only
          if (item.webkitGetAsEntry) {
            // not recommended but no other way
            entry = item.webkitGetAsEntry();
            if (entry.isDirectory) {
              console.log("Directory: " + entry.name);
              dropDirectory(entry, "");
            }
          } else {
            console.log(
              "No webkitGetAsEntry support: " + item.getAsFile().name
            );
          }
        } else {
          console.log(`Type "${item.type}" ${item.getAsFile().name}`);
        }
      } else {
        // URL link (TODO : check image link)
        const data = e.dataTransfer.getData("Text");
        const name = data.substring(data.lastIndexOf("/") + 1);
        console.log("Html : " + data);
        addOption(selImage, name, data);
        selectImage(-1);
        return; // should we?
      }
    }
  });
}
setupDrop(inFiles);
setupDrop(dropHere);


// ------------ Select/Unselect ------------
function selectUnselectAll(btn, sel) {
  if (btn.innerHTML == "Select All") {
    for (opt of sel) opt.selected = true;
  } else {
    for (opt of sel) opt.selected = false;
  }
  updateStatus();
}
outSelAll.addEventListener("click", () => selectUnselectAll(outSelAll, outFiles));
muxSelAll.addEventListener("click", () => selectUnselectAll(muxSelAll, muxFiles));


// ------------ Download ------------
function getDownloadURL(options, sourcedir) {
  if (options.length == 1) return options[0].value;
  
  // multi-files
  var array = [];
  for (const opt of options) {
      array.push(opt.value);
  }
  // reserve to tar
  const tardir = "tar";
  const url = tardir + "/" + sourcedir + ".tar";
  const body = JSON.stringify(array);
  const req = new XMLHttpRequest();
  req.onreadystatechange = () => {
    onRequestDone(req, () => console.log(`Registered : ${url}`));
  }
  req.open("POST", url);
  req.send(body);
  return url;
}
function downloadFiles(options, sourcedir) {
  if (options.length < 1) return;
  const url = getDownloadURL(options, sourcedir);
  const name = url.split('/').pop();
  
  console.log(`download : ${url} (${name})`);
  const elem = document.createElement('a');
  elem.setAttribute('href', url);
  elem.setAttribute('download', name);
  elem.style.display = 'none';
  document.body.appendChild(elem);
  elem.click();
  document.body.removeChild(elem);
}
function downloadDragStart(e, options, sourcedir) {
  if (options.length < 1) return;
  const url = window.location + getDownloadURL(options, sourcedir);
  const name = url.split('/').pop();

  console.log(`application/octet-stream:${name}:${url}`);
  e.dataTransfer.setData("DownloadURL", [`application/octet-stream:${name}:${url}`]);
}
outFiles.addEventListener("dblclick", () => downloadFiles(outFiles.selectedOptions, dirOutFiles));
outDnSel.addEventListener("click", () => downloadFiles(outFiles.selectedOptions, dirOutFiles));
outDnDrag.addEventListener("dragstart", (e) => downloadDragStart(e, outFiles.selectedOptions, dirOutFiles));
muxFiles.addEventListener("dblclick", () => downloadFiles(muxFiles.selectedOptions, dirMuxFiles));
muxDnSel.addEventListener("click", () => downloadFiles(muxFiles.selectedOptions, dirMuxFiles));
muxDnDrag.addEventListener("dragstart", (e) => downloadDragStart(e, outFiles.selectedOptions, dirMuxFiles));


// ------------ Remove ------------
function removeFiles(options) {
  for (const opt of options) {
    const url = opt.value;
    const req = new XMLHttpRequest();
    req.onreadystatechange = () => {
      onRequestDone(req,
        () => console.log(`Removed : ${url}`),
        () => console.log(`Remove Error(${req.status}) : ${url}`)
      );
    };
    req.open("DELETE", url);
    req.send();
    opt.parentElement.remove(opt.index);
  }
  updateStatus();
}
function removeSelect(sel) {
  const count = sel.selectedOptions.length;
  if (confirm(`Remove ${count} files?`)) {
    removeFiles(sel.selectedOptions);
  }
}
function removeAll(sel) {
  const count = sel.length;
  if (confirm(`Remove ${count} files?`)) {
    removeFiles(sel.options);
  }
}
outRmSel.addEventListener("click", () => removeSelect(outFiles));
outRmAll.addEventListener("click", () => removeAll(outFiles));
muxRmSel.addEventListener("click", () => removeSelect(muxFiles));
muxRmAll.addEventListener("click", () => removeAll(muxFiles));

function onKeyDown(e) {
  const KeyEvent = {
    DOM_VK_LEFT: 37,
    DOM_VK_UP: 38,
    DOM_VK_RIGHT: 39,
    DOM_VK_DOWN: 40,
    DOM_VK_PRINTSCREEN: 44,
    DOM_VK_INSERT: 45,
    DOM_VK_DELETE: 46
  };
  const code = e.keyCode;
  const focused = document.activeElement;
  if (focused == outFiles || focused == muxFiles) {
    if (code == KeyEvent.DOM_VK_DELETE) {
      removeFiles(focused.selectedOptions);
    }
  }
}
window.addEventListener('keydown', onKeyDown, false);


// ------------ Make Animation ------------
function makeAnimation() {
  const options = outFiles.selectedOptions;
  const frames = options.length;
  if (options.length <= 1) return options[0].value;

  // multi-files
  const optFPS = document.getElementById("muxSelFPS").selectedOptions[0];
  const optLoop = document.getElementById("muxSelLoop").selectedOptions[0];
  if (!optFPS || !optLoop) {
    console.log("Invalid option");
    return;
  }
  const fps = Number(optFPS.value);
  const loop = (optLoop.value == "infinite")? 0 : Number(optLoop.value);
  var body_dic = {
    option: {
      fps: fps,
      loop: loop,
    },
    files: []
  };
  for (const opt of options) {
    body_dic.files.push(opt.value);
  }

  // post request
  const url = dirMuxFiles;
  const body = JSON.stringify(body_dic);
  const req = new XMLHttpRequest();
  //console.log(`URL:${url}\nBody:${body}`);
  req.onreadystatechange = () => {
    onRequestDone(req,
      () => {
        console.log(`Created : ${req.responseText}`);
        const baseurl = dirMuxFiles + "/";
        const url = req.responseText;
        var name = url;
        if (url.indexOf(baseurl) == 0) {
          name = url.substr(baseurl.length); // remove "awebp/" from the beginning
        }
        var text = `${name} (fps:${fps} loop:${loop} frames:${frames})`;
        addOption(muxFiles, name, text, url);
        updateStatus();
      },
      () => console.log(`MakeAni Error(${req.status}) : ${url}`)
    );
  };
  req.open("POST", url);
  req.send(body);
}
makeAni.addEventListener("click", () => makeAnimation());


// ------------ Start ------------
window.addEventListener(
  "load",
  () => {
    selType.selectedIndex = 0;
    selType.dispatchEvent(new Event("change"));
  },
  false
);
