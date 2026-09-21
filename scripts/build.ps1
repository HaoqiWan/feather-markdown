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
    $output = Join-Path $dist ("feather-markdown-{0}-{1}{2}" -f $target.OS, $target.Arch, $target.Ext)
    go build -trimpath -buildvcs=false -ldflags "-s -w -buildid= -X main.version=$Version" -o $output .
    $size = (Get-Item -LiteralPath $output).Length
    if ($size -gt $maximum) {
      throw "$(Split-Path -Leaf $output) is $([math]::Round($size / 1MB, 2)) MiB; limit is 10 MiB"
    }
    Write-Host "$(Split-Path -Leaf $output): $([math]::Round($size / 1MB, 2)) MiB"
  }
}
finally {
  Remove-Item Env:GOOS -ErrorAction SilentlyContinue
  Remove-Item Env:GOARCH -ErrorAction SilentlyContinue
  Remove-Item Env:CGO_ENABLED -ErrorAction SilentlyContinue
  Pop-Location
}
