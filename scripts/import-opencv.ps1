param(
  [string]$ReleaseTag = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ConfigPath = Join-Path $Root "opencv-release.json"
$Target = Join-Path $Root "vendor\opencv"
$UserAgent = "htmlapps-same-spot-diff-opencv-import"

function Get-RequiredProperty([object]$Object, [string]$Name) {
  if (-not ($Object.PSObject.Properties.Name -contains $Name)) {
    throw "opencv-release.json is missing required property: $Name"
  }
  $value = [string]$Object.$Name
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "opencv-release.json property is empty: $Name"
  }
  return $value
}

function Expand-AssetName([string]$Template, [string]$Tag) {
  return $Template.Replace("{tag}", $Tag)
}

function Get-ReleaseAsset([object]$Release, [string]$Name) {
  foreach ($asset in @($Release.assets)) {
    if ([string]$asset.name -eq $Name) { return $asset }
  }
  return $null
}

function Get-AssetPairDirectory([string]$ExtractRoot) {
  $jsFiles = @(Get-ChildItem -Path $ExtractRoot -Recurse -File -Filter "opencv.js")
  foreach ($js in $jsFiles) {
    $wasm = Join-Path $js.Directory.FullName "opencv_js.wasm"
    if (Test-Path $wasm) { return $js.Directory.FullName }
  }
  throw "The release asset does not contain a matching opencv.js + opencv_js.wasm pair."
}

if (-not (Test-Path $ConfigPath)) { throw "Release configuration was not found: $ConfigPath" }
$config = Get-Content -Raw -Encoding UTF8 $ConfigPath | ConvertFrom-Json
$repository = Get-RequiredProperty $config "repository"
$configuredTag = Get-RequiredProperty $config "tag"
$profile = Get-RequiredProperty $config "profile"
$preferredTemplate = Get-RequiredProperty $config "preferredAssetTemplate"
$fallbackProfile = Get-RequiredProperty $config "fallbackProfile"
$fallbackTemplate = Get-RequiredProperty $config "fallbackAssetTemplate"
$tag = if ([string]::IsNullOrWhiteSpace($ReleaseTag)) { $configuredTag } else { $ReleaseTag }

if ($tag -notmatch '^v[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$') {
  throw "Release tag must look like v1.0.0. Received: $tag"
}

$preferredAssetName = Expand-AssetName $preferredTemplate $tag
$fallbackAssetName = Expand-AssetName $fallbackTemplate $tag
$apiUrl = "https://api.github.com/repos/$repository/releases/tags/$tag"

try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {
  # PowerShell 7+ / modern .NET can negotiate TLS without this legacy setting.
}

Write-Host "[INFO] Release: https://github.com/$repository/releases/tag/$tag"
Write-Host "[INFO] Looking for: $preferredAssetName"

$headers = @{ "User-Agent" = $UserAgent; "Accept" = "application/vnd.github+json" }
try {
  $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
} catch {
  throw "Could not read GitHub Release $tag from $repository. Check the tag, network connection, and GitHub API availability. $($_.Exception.Message)"
}

if ([string]$release.tag_name -ne $tag) {
  throw "GitHub returned an unexpected release tag: $($release.tag_name)"
}

$asset = Get-ReleaseAsset $release $preferredAssetName
$selectedProfile = $profile
$usedFallback = $false
if ($null -eq $asset) {
  $asset = Get-ReleaseAsset $release $fallbackAssetName
  if ($null -ne $asset) {
    $selectedProfile = $fallbackProfile
    $usedFallback = $true
    Write-Warning "Dedicated '$profile' asset was not found. Falling back to '$fallbackProfile'. The embedded HTML will be larger until the dedicated release asset is published."
  }
}

if ($null -eq $asset) {
  $available = @($release.assets | ForEach-Object { [string]$_.name })
  $availableText = if ($available.Count -gt 0) { $available -join ", " } else { "(no binary assets)" }
  throw "Neither '$preferredAssetName' nor '$fallbackAssetName' exists in Release $tag. Available assets: $availableText"
}

$downloadUrl = [string]$asset.browser_download_url
if ([string]::IsNullOrWhiteSpace($downloadUrl)) { throw "Selected Release asset has no download URL: $($asset.name)" }

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("same-spot-diff-opencv-" + [Guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tempRoot "opencv-runtime.zip"
$extractPath = Join-Path $tempRoot "extract"
New-Item -ItemType Directory -Force -Path $extractPath | Out-Null

try {
  Write-Host "[INFO] Downloading: $($asset.name)"
  Invoke-WebRequest -UseBasicParsing -Uri $downloadUrl -Headers @{ "User-Agent" = $UserAgent } -OutFile $zipPath
  if (-not (Test-Path $zipPath) -or (Get-Item $zipPath).Length -eq 0) {
    throw "Downloaded Release asset is empty: $($asset.name)"
  }

  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force
  $sourceDir = Get-AssetPairDirectory $extractPath

  foreach ($name in @("opencv.js", "opencv_js.wasm")) {
    $path = Join-Path $sourceDir $name
    if (-not (Test-Path $path) -or (Get-Item $path).Length -eq 0) {
      throw "Required OpenCV asset is missing after extraction: $path"
    }
  }

  $manifestPath = Join-Path $sourceDir "manifest.json"
  $resolvedPath = Join-Path $sourceDir "resolved-profile.json"
  $opencvVersion = ""
  $actualProfile = $selectedProfile

  if (Test-Path $manifestPath) {
    $manifest = Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json
    if ($manifest.PSObject.Properties.Name -contains "profile") {
      $actualProfile = [string]$manifest.profile
      if ($actualProfile -ne $selectedProfile) {
        throw "Release asset '$($asset.name)' reports profile '$actualProfile', expected '$selectedProfile'."
      }
    }
    if ($manifest.PSObject.Properties.Name -contains "opencvVersion") {
      $opencvVersion = [string]$manifest.opencvVersion
    }
  }

  if (Test-Path $resolvedPath) {
    $resolved = Get-Content -Raw -Encoding UTF8 $resolvedPath | ConvertFrom-Json
    if ($resolved.PSObject.Properties.Name -contains "resolvedComponents") {
      $resolvedComponents = @($resolved.resolvedComponents | ForEach-Object { [string]$_ })
      foreach ($requiredComponent in @("core", "imgproc", "features", "geometry")) {
        if ($resolvedComponents -notcontains $requiredComponent) {
          throw "Release asset '$($asset.name)' is missing required component '$requiredComponent'."
        }
      }
    }
  }

  New-Item -ItemType Directory -Force -Path $Target | Out-Null
  Copy-Item -Force (Join-Path $sourceDir "opencv.js") (Join-Path $Target "opencv.js")
  Copy-Item -Force (Join-Path $sourceDir "opencv_js.wasm") (Join-Path $Target "opencv_js.wasm")
  foreach ($name in @("manifest.json", "resolved-profile.json")) {
    $source = Join-Path $sourceDir $name
    $destination = Join-Path $Target $name
    if (Test-Path $source) {
      Copy-Item -Force $source $destination
    } elseif (Test-Path $destination) {
      Remove-Item -Force $destination
    }
  }

  $provenance = [ordered]@{
    repository = $repository
    tag = $tag
    asset = [string]$asset.name
    profile = $actualProfile
    preferredProfile = $profile
    usedFallback = $usedFallback
    downloadUrl = $downloadUrl
    opencvVersion = $opencvVersion
    importedAtUtc = [DateTime]::UtcNow.ToString("o")
  }
  [System.IO.File]::WriteAllText(
    (Join-Path $Target "release-source.json"),
    ($provenance | ConvertTo-Json -Depth 10),
    (New-Object System.Text.UTF8Encoding($false))
  )

  if (-not [string]::IsNullOrWhiteSpace($opencvVersion)) {
    $dependenciesPath = Join-Path $Root "dependencies.json"
    $dependencies = Get-Content -Raw -Encoding UTF8 $dependenciesPath | ConvertFrom-Json
    foreach ($dependency in @($dependencies.dependencies)) {
      if ([string]$dependency.id -eq "opencv") {
        $dependency.version = "$opencvVersion-$actualProfile"
      }
    }
    [System.IO.File]::WriteAllText(
      $dependenciesPath,
      ($dependencies | ConvertTo-Json -Depth 20),
      (New-Object System.Text.UTF8Encoding($false))
    )
  }

  Write-Host "[OK] OpenCV JavaScript: $((Get-Item (Join-Path $Target 'opencv.js')).Length) bytes" -ForegroundColor Green
  Write-Host "[OK] OpenCV Wasm:       $((Get-Item (Join-Path $Target 'opencv_js.wasm')).Length) bytes" -ForegroundColor Green
  Write-Host "[OK] Builder Release:   $repository $tag" -ForegroundColor Green
  Write-Host "[OK] Release asset:     $($asset.name)" -ForegroundColor Green
  Write-Host "[OK] Imported profile:  $actualProfile" -ForegroundColor Green
  if (-not [string]::IsNullOrWhiteSpace($opencvVersion)) {
    Write-Host "[OK] OpenCV version:    $opencvVersion" -ForegroundColor Green
  }
} finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $tempRoot
}
