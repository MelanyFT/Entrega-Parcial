# Exporta los bloques Mermaid de docs/diagramas.md a archivos PNG.
# Uso: pwsh -File scripts/export-diagrams.ps1
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$docPath = Join-Path $root 'docs\diagramas.md'
$outDir = Join-Path $root 'docs\diagramas'

New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$names = @(
  '01-casos-de-uso',
  '02-arquitectura',
  '03-modelo-de-datos',
  '04-estados-del-pedido',
  '05-clases',
  '06-interfaces',
  '07-secuencia-login-rastreo',
  '08-secuencia-menu-duda'
)

$content = Get-Content -Path $docPath -Raw -Encoding UTF8
$blocks = [regex]::Matches($content, '(?ms)^```mermaid[ \t]*\r?\n(?<code>.*?)^```[ \t]*$')

if ($blocks.Count -ne $names.Count) {
  throw "Se esperaban $($names.Count) diagramas, pero se encontraron $($blocks.Count). Revisa el orden de los nombres."
}

for ($i = 0; $i -lt $blocks.Count; $i++) {
  $code = $blocks[$i].Groups['code'].Value.Trim()
  $base64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($code))
  $urlBase64 = $base64.Replace('+', '-').Replace('/', '_').TrimEnd('=')
  $url = "https://mermaid.ink/img/$urlBase64"
  $outFile = Join-Path $outDir ($names[$i] + '.png')

  Invoke-WebRequest -Uri $url -OutFile $outFile -TimeoutSec 90

  $item = Get-Item -Path $outFile
  if ($item.Length -lt 1000) {
    throw "El archivo $($item.Name) parece inválido ($($item.Length) bytes)."
  }

  "$($item.Name): $($item.Length) bytes"
}

"Listo: $($blocks.Count) diagramas exportados a $outDir"
