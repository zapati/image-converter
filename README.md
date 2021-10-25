# Image Converter and Tester

We can convert images to WebP or AnimatedWebP and test the result.

## Basic structure

This is a server-client app. So we need to
1. Run server on FileExplorer(win) or Finder(mac)
1. Connect to server on browser

### Run server

Download all contents here.<br/>
Execute `RUNME_win.bat` on Windows PC.<br/>
Execute `RUNME_mac.sh.command` on Mac.

### Connect server

Launch any modern browser. Google Chrome is recommended.<br/>
Input the URL address from the server.

## Basic usage

### How to convert?

Drag and drop files or folders into the input zone.
Automatically converted at `.../http/cwebp` directory.<br/>
You may download each files on the page or just access files in directory.
Drag-and-drop downloding makes `.tar` file.<br/>
(Execuse of inconvenience : Chrome does not support downloading multiple files)

### How to test?
Click a link at right-top corner "Go Test".
We see test images over a certain background.<br/>
A test image can be any format including WebP and Andimated-WebP.<br/>
Default directory is animated webp directory (`awebp`). You can drag and drop your test image files or directories.<br/>
And you may `Reload Image` if you want to check loop-once animation.

------------------
### Contact developer
If you have any issue or question or suggestion, please submit it freely at https://github.com/zapati/webp-testpage

