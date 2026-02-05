Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
ps1Path = fso.BuildPath(scriptDir, "run-cron.ps1")

shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & ps1Path & """", 0, False
