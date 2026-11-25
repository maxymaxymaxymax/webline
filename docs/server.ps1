# Tiny local web server for Webline (no install needed). Keep this window open while playing.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8000
$l = New-Object System.Net.HttpListener
while ($true) { try { $l.Prefixes.Clear(); $l.Prefixes.Add("http://localhost:$port/"); $l.Start(); break } catch { $port++; if ($port -gt 8020) { Write-Host "Could not start server"; Read-Host; exit } } }
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript'; '.json'='application/json'; '.glb'='model/gltf-binary'; '.wasm'='application/wasm'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.mp3'='audio/mpeg'; '.wav'='audio/wav'; '.css'='text/css'; '.txt'='text/plain'; '.bin'='application/octet-stream'; '.gltf'='model/gltf+json' }
Write-Host "Webline is running at http://localhost:$port  -  keep this window open while playing."
Start-Process "http://localhost:$port/"
while ($l.IsListening) {
  try {
    $c = $l.GetContext(); $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath).TrimStart('/')
    if ($p -eq '') { $p = 'index.html' }
    if ($p -eq 'suits/__list.json') { $names = @(Get-ChildItem -Path (Join-Path $root 'suits') -File | Where-Object { $_.Extension -match '^\.(glb|gltf)$' } | ForEach-Object { '"' + $_.Name.Replace('"','') + '"' }); $b = [Text.Encoding]::UTF8.GetBytes('[' + ($names -join ',') + ']'); $c.Response.ContentType = 'application/json'; $c.Response.OutputStream.Write($b, 0, $b.Length); $c.Response.Close(); continue }
    $f = Join-Path $root $p
    if ((Test-Path $f -PathType Leaf) -and ([IO.Path]::GetFullPath($f).StartsWith($root))) {
      $b = [IO.File]::ReadAllBytes($f); $e = [IO.Path]::GetExtension($f).ToLower()
      $c.Response.ContentType = $(if ($mime[$e]) { $mime[$e] } else { 'application/octet-stream' })
      $c.Response.ContentLength64 = $b.Length; $c.Response.OutputStream.Write($b, 0, $b.Length)
    } else { $c.Response.StatusCode = 404 }
    $c.Response.Close()
  } catch { }
}
