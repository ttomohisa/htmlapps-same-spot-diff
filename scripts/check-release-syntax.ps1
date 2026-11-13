# Parse every inline PowerShell run block in the release workflow without executing it.
# This catches syntax errors in the privileged post-merge workflow during PR CI.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$workflow = Join-Path $root '.github\workflows\publish-release.yml'
if (-not (Test-Path -LiteralPath $workflow)) { throw 'Release workflow is missing.' }

$lines = @(Get-Content -LiteralPath $workflow -Encoding UTF8)
$blocks = 0
for ($index = 0; $index -lt $lines.Count; $index++) {
  if ($lines[$index] -notmatch '^ {8}run:\s*\|\s*$') { continue }
  $script = [System.Collections.Generic.List[string]]::new()
  $index++
  while ($index -lt $lines.Count) {
    $line = $lines[$index]
    if ($line -match '^ {10}') {
      $script.Add($line.Substring(10))
    } elseif ([string]::IsNullOrWhiteSpace($line)) {
      $script.Add('')
    } else {
      $index--
      break
    }
    $index++
  }
  $blocks++
  $tokens = $null
  $parseErrors = $null
  [System.Management.Automation.Language.Parser]::ParseInput(($script -join "`n"), [ref]$tokens, [ref]$parseErrors) | Out-Null
  if ($parseErrors.Count -gt 0) {
    $messages = ($parseErrors | ForEach-Object { $_.Message }) -join '; '
    throw "PowerShell syntax error in release workflow run block $blocks : $messages"
  }
}
if ($blocks -lt 4) { throw "Expected four PowerShell run blocks in release workflow, found $blocks." }
Write-Host "[OK] Release workflow PowerShell syntax: $blocks blocks" -ForegroundColor Green
