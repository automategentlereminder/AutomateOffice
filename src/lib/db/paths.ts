import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const APP_DIR_NAME = "AutomateOffice";

export function getAppDataRoot() {
  if (process.env.AUTOMATEOFFICE_DATA_DIR) {
    return process.env.AUTOMATEOFFICE_DATA_DIR;
  }

  const localAppData =
    process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");

  return path.join(localAppData, APP_DIR_NAME);
}

export function ensureDataDirectories() {
  const root = getAppDataRoot();
  const dataDir = path.join(root, "data");
  const backupsDir = path.join(root, "backups");
  const logsDir = path.join(root, "logs");

  for (const dir of [root, dataDir, backupsDir, logsDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return { root, dataDir, backupsDir, logsDir };
}

export function getDatabasePath() {
  const { dataDir } = ensureDataDirectories();
  return path.join(dataDir, "automateoffice.db");
}
