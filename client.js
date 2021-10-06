// ------------ Image ------------
const background = document.getElementById("background");
const sprite = document.getElementById("sprite");
const spritePos = document.getElementById("imagePos");

function setBackground(url) {
  console.log("Set background " + url);
  const image = document.getElementById("backgroundImage");
  image.src = url;
  image.onload = function () {
    background.width = image.width;
    background.height = image.height;
  };
}

function setSprite(url) {
  console.log("Set sprite " + url);
  const image = document.getElementById("spriteImage");
  image.src = url;
  image.onload = function () {
    sprite.width = image.width;
    sprite.height = image.height;
  };
}

var spriteX = 0;
var spriteY = 0;
function setSpritePos(x, y) {
  sprite.style.left = x + "px";
  sprite.style.top = y + "px";
  spriteX = x;
  spriteY = y;
  spritePos.innerHTML = "Position X:" + x + " Y:" + y;
}

// ------------ Image Dragging ------------
var offsetX;
var offsetY;
var dragging = false;
sprite.addEventListener("pointerdown", (e) => {
  const leftButton = 0;
  const rightButton = 2;
  if (e.button == leftButton) {
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    dragging = true;
    sprite.setPointerCapture(e.pointerId);
  }
});
sprite.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const diffX = e.offsetX - offsetX;
  const diffY = e.offsetY - offsetY;
  if (diffX != 0 || diffY != 0) {
    setSpritePos(spriteX + diffX, spriteY + diffY);
  }
});
sprite.addEventListener("pointerup", (e) => {
  dragging = false;
});
sprite.addEventListener("lostpointercapture", (e) => {
  dragging = false;
});

// ------------ Selection ------------
const dirBackground = "background";
const dirImage = "image";
const selBackground = document.getElementById("selBackground");
const selImage = document.getElementById("selImage");
const reloadImage = document.getElementById("reloadImage");
const resetImages = document.getElementById("resetImages");

function selectImage(index) {
  if (selImage.length <= 0) return;
  if (index < 0) index = selImage.length - 1;
  if (index >= selImage.length) index = 0;
  selImage.selectedIndex = index;
  selImage.dispatchEvent(new Event("change"));
}

function clearImage() {
  for (i = selImage.length - 1; i >= 0; i--) {
    const value = selImage.options[i].value;
    if (value.match(/^blob:/)) {
      console.log("Revoke " + value);
      URL.revokeObjectURL(value);
    }
    selImage.remove(i);
  }
  const image = document.getElementById("spriteImage");
  image.src = "";
}

function addOption(sel, name, value) {
  var opt = document.createElement("option");
  opt.value = value;
  opt.innerHTML = name;
  sel.add(opt);
}

selBackground.addEventListener("change", () => {
  setBackground(selBackground.options[selBackground.selectedIndex].value);
});
selImage.addEventListener("change", () => {
  setSprite(selImage.options[selImage.selectedIndex].value);
  setSpritePos(spriteX, spriteY);
});
reloadImage.addEventListener("click", () => {
  const image = document.getElementById("spriteImage");
  image.src = "";
  image.src = selImage.options[selImage.selectedIndex].value;
});
resetImages.addEventListener("click", () => {
  clearImage();
});
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      selectImage(selImage.selectedIndex - 1);
      break;
    case "ArrowDown":
      selectImage(selImage.selectedIndex + 1);
      break;
    default:
      break;
  }
});

// ------------ Request list ------------
function addOptions(url, sel, arraytext) {
  try {
    const array = JSON.parse(arraytext);
    array.forEach((name) => {
      addOption(sel, name, url + "/" + name);
    });
    sel.dispatchEvent(new Event("change"));
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
function dropFile(file, startindex) {
  file.arrayBuffer().then((buf) => {
    const url = URL.createObjectURL(new Blob([buf]));
    addOption(selImage, file.name, url);
    selectImage(startindex);
  });
}

function dropDirectory(direntry, startindex) {
  let reader = direntry.createReader();
  let getEntries = function () {
    reader.readEntries(
      (entries) => {
        for (entry of entries) {
          if (entry.isDirectory) {
            console.log("SubDirectory: " + entry.name);
            dropDirectory(entry);
          } else if (entry.isFile) {
            entry.file((f) => {
              dropFile(f, startindex);
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

document.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
  const startindex = selImage.length;
  for (const item of e.dataTransfer.items) {
    if (item.kind == "file") {
      if (item.type.match(/^image/)) {
        const file = item.getAsFile();
        console.log("Image file: " + file.name);
        dropFile(file, startindex);
      } else if (item.type == "") {
        // directory? try.
        // const handle = item.getAsFileSystemHandle(); // https only
        if (item.webkitGetAsEntry) {
          // not recommended but no other way
          entry = item.webkitGetAsEntry();
          if (entry.isDirectory) {
            console.log("Directory: " + entry.name);
            clearImage();
            dropDirectory(entry, startindex);
          }
        } else {
          console.log("No webkitGetAsEntry support: " + item.getAsFile().name);
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

// ------------ Start ------------
window.addEventListener(
  "load",
  () => {
    sendRequest(dirBackground, selBackground);
    sendRequest(dirImage, selImage);
  },
  false
);
