import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Modern Windows folder picker (IFileOpenDialog with FOS_PICKFOLDERS).
 * Gives the Explorer-style dialog with address bar, sidebar, and search.
 */
const PICKER_SCRIPT = `
$ErrorActionPreference = "Stop"

$code = @"
using System;
using System.Runtime.InteropServices;

public static class ModernFolderPicker
{
    [ComImport]
    [Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")]
    private class FileOpenDialogRCW {}

    [ComImport]
    [Guid("42F85136-DB7E-439C-85F1-E4075D135FC8")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IFileOpenDialog
    {
        [PreserveSig] int Show(IntPtr parent);
        void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);
        void SetFileTypeIndex(uint iFileType);
        void GetFileTypeIndex(out uint piFileType);
        void Advise(IntPtr pfde, out uint pdwCookie);
        void Unadvise(uint dwCookie);
        void SetOptions(uint fos);
        void GetOptions(out uint pfos);
        void SetDefaultFolder(IShellItem psi);
        void SetFolder(IShellItem psi);
        void GetFolder(out IShellItem ppsi);
        void GetCurrentSelection(out IShellItem ppsi);
        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
        void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);
        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
        void GetResult(out IShellItem ppsi);
        void AddPlace(IShellItem psi, int alignment);
        void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);
        void Close(int hr);
        void SetClientGuid(ref Guid guid);
        void ClearClientData();
        void SetFilter(IntPtr pFilter);
        void GetResults(out IntPtr ppenum);
        void GetSelectedItems(out IntPtr ppsai);
    }

    [ComImport]
    [Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellItem
    {
        void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
        void GetParent(out IShellItem ppsi);
        void GetDisplayName(uint sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);
        void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
        void Compare(IShellItem psi, uint hint, out int piOrder);
    }

    private const uint FOS_PICKFOLDERS = 0x00000020;
    private const uint FOS_FORCEFILESYSTEM = 0x00000040;
    private const uint FOS_PATHMUSTEXIST = 0x00000800;
    private const uint SIGDN_FILESYSPATH = 0x80058000;

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    public static string Pick(string title)
    {
        var dialog = (IFileOpenDialog)new FileOpenDialogRCW();
        try
        {
            dialog.SetOptions(FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST);
            if (!string.IsNullOrWhiteSpace(title))
            {
                dialog.SetTitle(title);
            }

            int hr = dialog.Show(GetForegroundWindow());
            if (hr != 0)
            {
                return string.Empty;
            }

            IShellItem item;
            dialog.GetResult(out item);
            string path;
            item.GetDisplayName(SIGDN_FILESYSPATH, out path);
            return path ?? string.Empty;
        }
        finally
        {
            Marshal.FinalReleaseComObject(dialog);
        }
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp
$path = [ModernFolderPicker]::Pick("Select a folder to rename files in")
if (-not [string]::IsNullOrWhiteSpace($path)) {
  [Console]::Out.Write($path)
}
`.trim();

export async function pickFolderWithDialog() {
  if (process.platform !== "win32") {
    return { path: null, error: "Folder picker is only available on Windows." };
  }

  const scriptPath = path.join(
    os.tmpdir(),
    `automateoffice-folder-picker-${process.pid}-${Date.now()}.ps1`,
  );

  try {
    await fs.writeFile(scriptPath, PICKER_SCRIPT, "utf8");

    const { stdout, stderr } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-STA",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
      ],
      {
        windowsHide: false,
        timeout: 10 * 60 * 1000,
        maxBuffer: 1024 * 1024,
      },
    );

    const selected = stdout.trim();
    if (!selected) {
      if (stderr.trim()) {
        return { path: null, error: stderr.trim() };
      }
      return { path: null, cancelled: true };
    }

    return { path: selected };
  } catch (error) {
    return {
      path: null,
      error:
        error instanceof Error ? error.message : "Could not open folder picker.",
    };
  } finally {
    await fs.unlink(scriptPath).catch(() => undefined);
  }
}
