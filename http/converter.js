const selType = document.getElementById("selType");
const typeOption = document.getElementById("typeOption");
const dropHere = document.getElementById("dropHere");
const inFiles = document.getElementById("inFiles");
const outFiles = document.getElementById("outFiles");
const dirOutFiles = "cwebp";

// ------------ Selection ------------
outFiles.addEventListener("dblclick", () => {
  for (const opt of outFiles.selectedOptions) {
    console.log("Select : " + opt.value);
  }
});

// ------------ Request list ------------
function addOption(sel, name, text, value) {
  const exist = sel.options[name];
  if (exist) {
    console.log(`Exist : ${name} ${exist.value} - ${value}`);
    return exist;
  }
  var opt = document.createElement("option");
  opt.id = name;
  opt.text = text;
  opt.value = value;
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
  const url = parentpath + "/" + file.name;

  //  left
  dropHere.style.display = "none";
  inFiles.style.display = "block";
  const inOpt = addOption(inFiles, url, url + " (converting...)", "");

  file.arrayBuffer().then((buf) => {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = () => {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        if (httpRequest.status === 201) {
          console.log("Created : " + httpRequest.responseText);
          inOpt.text = url + " (converted)";
          var name = httpRequest.responseText;
          const baseurl = dirOutFiles + "/";
          if (name.indexOf(baseurl) == 0) {
            name = name.substr(baseurl.length); // remove "cwebp/" from the beginning
          }
          addOption(outFiles, name, name, httpRequest.responseText);
        } else {
          console.log("Error " + httpRequest.status + "(" + url + ")");
          inOpt.text = url + " (error)";
        }
      }
    };
    httpRequest.open("POST", url);
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

// ------------ Start ------------
window.addEventListener(
  "load",
  () => {
    sendRequest(dirOutFiles, outFiles);
  },
  false
);
