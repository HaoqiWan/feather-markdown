#ifndef MyAppVersion
  #define MyAppVersion "0.3.0"
#endif
#ifndef SourceExe
  #define SourceExe "..\..\dist\feather-markdown-windows-amd64.exe"
#endif
#ifndef OutputDir
  #define OutputDir "..\..\dist"
#endif

[Setup]
AppId={{C1AC577A-9B69-4A99-A671-55C156E149DE}
AppName=Feather Markdown
AppVersion={#MyAppVersion}
AppPublisher=HaoqiWan
AppPublisherURL=https://github.com/HaoqiWan/feather-markdown
DefaultDirName={localappdata}\Programs\Feather Markdown
DefaultGroupName=Feather Markdown
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename=Feather-Markdown-v{#MyAppVersion}-windows-x64-setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\FeatherMarkdown.exe
CloseApplications=yes
SetupLogging=yes

[Languages]
Name: "chinesesimp"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#SourceExe}"; DestDir: "{app}"; DestName: "FeatherMarkdown.exe"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Feather Markdown"; Filename: "{app}\FeatherMarkdown.exe"
Name: "{autodesktop}\Feather Markdown"; Filename: "{app}\FeatherMarkdown.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加图标："; Flags: unchecked

[Run]
Filename: "{app}\FeatherMarkdown.exe"; Description: "启动 Feather Markdown"; Flags: nowait postinstall skipifsilent
