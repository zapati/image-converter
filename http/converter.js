const selType = document.getElementById("selType");
const typeOption = document.getElementById("typeOption");
const inInfo = document.getElementById("inInfo");
const dropHere = document.getElementById("dropHere");
const inFiles = document.getElementById("inFiles");
const outInfo = document.getElementById("outInfo");
const outFiles = document.getElementById("outFiles");
const makeAni = document.getElementById("makeAni");
var dirOutFiles = "cwebp";
var inDone = 0;
var inTotal = 0;

// ------------ Conversion Type ------------
selType.addEventListener("change", () => {
  // clear
  dropHere.style.display = "block";
  inFiles.style.display = "none";
  inWait = 0;
  inTotal = 0;
  while (inFiles.lastElementChild) {
    inFiles.removeChild(inFiles.lastElementChild);
  }
  while (outFiles.lastElementChild) {
    outFiles.removeChild(outFiles.lastElementChild);
  }

  // set option
  switch(selType.options[selType.selectedIndex].value) {
    case "WebP":
      dirOutFiles = "cwebp";
      typeOption.style.display = "none";
      break;
    case "AnimatedWebP":
      dirOutFiles = "awebp";
      typeOption.style.display = "block";
      makeAni.disabled = true;
      break;
    case "CleanPNG":
      // TODO:
      break;
    case "ZopfliPNG":
      // TODO:
      break;
  }
  updateInfo();

  // fill outfile list
  sendRequest(dirOutFiles, outFiles);
});

function updateInfo() {
  inInfo.innerHTML = `Input Files (${inDone}/${inTotal})`;
  outInfo.innerHTML = `Converted Images (${dirOutFiles})`;
  if (selType.options[selType.selectedIndex].value != "AnimatedWebP") {
    addOption(outFiles, name, name, url);
    return;
  }
  if (inDone> 0 && inDone == inTotal) {
    makeAni.disabled = false;
  }
}

function onFileConverted(name, url) {
  if (selType.options[selType.selectedIndex].value != "AnimatedWebP") {
    addOption(outFiles, name, name, url);
    return;
  }
}


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
}
function sendRequest(url, sel) {
  var httpRequest = new XMLHttpRequest();
  httpRequest.onreadystatechange = () => {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        addOptions(url, sel, httpRequest.responseText);
      } else {
        console.log("Error " + httpRequest.status + "(" + url + ")");
      }
    }
  };
  httpRequest.open("GET", url);
  httpRequest.send();
}

// ------------ Drop from outside ------------
function dropFile(file, parentpath) {
  const baseurl = dirOutFiles + "/";
  const url = parentpath + "/" + file.name;

  //  left
  dropHere.style.display = "none";
  inFiles.style.display = "block";
  const inOpt = addOption(inFiles, url, url + " (converting...)", "");
  inTotal++; updateInfo();

  file.arrayBuffer().then((buf) => {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = () => {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        inDone++; updateInfo();
        if (httpRequest.status === 201) {
          console.log("Created : " + httpRequest.responseText);
          inOpt.text = url + " (converted)";
          inOpt.className = "text_succeed";
          var name = httpRequest.responseText;
          if (name.indexOf(baseurl) == 0) {
            name = name.substr(baseurl.length); // remove "cwebp/" from the beginning
          }
          onFileConverted(name, httpRequest.responseText);
        } else {
          console.log("Error " + httpRequest.status + "(" + url + ")");
          inOpt.text = url + " (error)";
          inOpt.className = "text_error";
        }
      }
    };
    httpRequest.open("POST", baseurl + url);
    httpRequest.send(buf);
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
          console.log("Type [" + item.type + "] " + item.getAsFile().name);
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


// ------------ Download ------------
function downloadFile(url, filename) {
  var elem = document.createElement('a');
  elem.setAttribute('href', url);
  elem.setAttribute('download', filename);
  elem.style.display = 'none';
  document.body.appendChild(elem);
  elem.click();
  document.body.removeChild(elem);
}
function downloadFiles(options) {
  for (const opt of options) {
    const url = opt.value;
    const name = url.split('/').pop();
    console.log(`Select : ${url} (${name})`);
    downloadFile(url, name);
  }
}
outFiles.addEventListener("dblclick", () => {
  downloadFiles(outFiles.selectedOptions);
});
document.getElementById("dnSel").addEventListener("click", () => {
  downloadFiles(outFiles.selectedOptions);
});
document.getElementById("dnAll").addEventListener("click", () => {
  downloadFiles(outFiles.options);
});

// ------------ Remove ------------
function removeFiles(options) {
  for (const opt of options) {
    const url = opt.value;
    const httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = () => {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 200) {
          console.log(`Removed : ${url}`);
        } else {
          console.log(`Remove Error(${httpRequest.status}) : ${url}`);
        }
        sel = opt.parentElement;
        if (sel) sel.remove(opt.index);
      }
    };
    httpRequest.open("DELETE", url);
    httpRequest.send();
  }
}
document.getElementById("rmSel").addEventListener("click", () => {
  removeFiles(outFiles.selectedOptions);
});
document.getElementById("rmAll").addEventListener("click", () => {
  removeFiles(outFiles.options);
});


// ------------ Start ------------
window.addEventListener(
  "load",
  () => {
    selType.selectedIndex = 1;
    selType.dispatchEvent(new Event("change"));
  },
  false
);
