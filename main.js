const { app, BrowserWindow } = require("electron/main");
const path = require("node:path");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: true,
    resizable: true,
    // titleBarStyle: "hidden",
    // titleBarOverlay: {
    //   color: "rgba(47, 50, 65, 0)",
    //   symbolColor: "#74b1be",
    //   height: 40,
    // },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      webviewTag: true,
    },
  });
  win.setContentProtection(true);
  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
