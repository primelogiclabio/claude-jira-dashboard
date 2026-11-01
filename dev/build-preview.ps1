# Builds local previews of template.html with the made-up data in mock.js, one file per state, into dev/out/.
# Open them in a browser (or Claude's browser pane); outside claude.ai there is no real database or connector.
# Each file is plain ASCII with the viewport meta the claude.ai publish skeleton would add, because the
# browser pane opens local files as static snapshots that drop the query string and mangle non-ASCII text.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $PSScriptRoot 'out'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$template = Get-Content -Raw -Encoding utf8 (Join-Path $root 'template.html')
$mock = Get-Content -Raw -Encoding utf8 (Join-Path $PSScriptRoot 'mock.js')

function Build($name, $state, $theme) {
  $themeLine = if ($theme) { " document.documentElement.dataset.theme = '$theme';" } else { '' }
  $head = "<meta charset=`"utf-8`"><meta name=`"viewport`" content=`"width=device-width,initial-scale=1,viewport-fit=cover`">`n" +
    "<script>window.__previewState = '$state';$themeLine</script>`n<script>`n"
  $all = $head + $mock + "</script>`n" + $template
  $sb = New-Object System.Text.StringBuilder
  foreach ($c in $all.ToCharArray()) {
    if ([int]$c -gt 127) { [void]$sb.Append(('\u{0:x4}' -f [int]$c)) } else { [void]$sb.Append($c) }
  }
  $path = Join-Path $out "$name.html"
  [System.IO.File]::WriteAllText($path, $sb.ToString(), (New-Object System.Text.UTF8Encoding $false))
  $path
}

Build 'full' 'full' $null
Build 'full-dark' 'full' 'dark'
Build 'no-refresh' 'none' $null
Build 'empty-dark' 'empty' 'dark'
Build 'old-tabs' 'oldtabs' $null
Build 'no-schedule' 'noschedule' $null
