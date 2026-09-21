param(
  [string]$Version = "dev"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $projectRoot "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null

Push-Location $projectRoot
try {
  go test ./...
  $targets = @(
    @{ OS = "windows"; Arch = "amd64"; Ext = ".exe" },
    @{ OS = "windows"; Arch = "arm64"; Ext = ".exe" },
    @{ OS = "darwin"; Arch = "amd64"; Ext = "" },
    @{ OS = "darwin"; Arch = "arm64"; Ext = "" },
    @{ OS = "linux"; Arch = "amd64"; Ext = "" },
    @{ OS = "linux"; Arch = "arm64"; Ext = "" }
  )
  $maximum = 10MB
  foreach ($target in $targets) {
    $env:GOOS = $target.OS
    $env:GOARCH = $target.Arch
    $env:CGO_ENABLED = "0"
    if ($target.OS -eq "darwin") {
      $appBundle = Join-Path $dist ("Feather Markdown-{0}.app" -f $target.Arch)
      $macOSDirectory = Join-Path $appBundle "Contents\MacOS"
      $resourcesDirectory = Join-Path $appBundle "Contents\Resources"
      New-Item -ItemType Directory -Force -Path $macOSDirectory | Out-Null
      New-Item -ItemType Directory -Force -Path $resourcesDirectory | Out-Null
      Copy-Item -Force (Join-Path $projectRoot "packaging\macos\Info.plist") (Join-Path $appBundle "Contents\Info.plist")
      Copy-Item -Force (Join-Path $projectRoot "packaging\macos\FeatherMarkdown.icns") (Join-Path $resourcesDirectory "FeatherMarkdown.icns")
      $output = Join-Path $macOSDirectory "FeatherMarkdown"
    }
    else {
      $output = Join-Path $dist ("feather-markdown-{0}-{1}{2}" -f $target.OS, $target.Arch, $target.Ext)
    }
    $linkerFlags = "-s -w -buildid= -X main.version=$Version"
    if ($target.OS -eq "windows") { $linkerFlags += " -H=windowsgui" }
    go build -trimpath -buildvcs=false -ldflags $linkerFlags -o $output .
    $size = (Get-Item -LiteralPath $output).Length
    if ($size -gt $maximum) {
      throw "$(Split-Path -Leaf $output) is $([math]::Round($size / 1MB, 2)) MiB; limit is 10 MiB"
    }
    $label = if ($target.OS -eq "darwin") { "Feather Markdown-$($target.Arch).app" } else { Split-Path -Leaf $output }
    Write-Host "${label}: $([math]::Round($size / 1MB, 2)) MiB"
  }
}
finally {
  Remove-Item Env:GOOS -ErrorAction SilentlyContinue
  Remove-Item Env:GOARCH -ErrorAction SilentlyContinue
  Remove-Item Env:CGO_ENABLED -ErrorAction SilentlyContinue
  Pop-Location
}
