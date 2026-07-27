$ErrorActionPreference = 'Stop'
$port = 8000
$root = (Resolve-Path $PSScriptRoot).Path

function Get-ContentType([string]$path) {
    switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
        '.html' { 'text/html; charset=utf-8' }
        '.css'  { 'text/css; charset=utf-8' }
        '.js'   { 'application/javascript; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.jpg'  { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.png'  { 'image/png' }
        '.gif'  { 'image/gif' }
        '.webp' { 'image/webp' }
        '.svg'  { 'image/svg+xml' }
        '.ico'  { 'image/x-icon' }
        default { 'application/octet-stream' }
    }
}

function Send-Response($stream, [int]$status, [string]$statusText, [byte[]]$body, [string]$contentType) {
    $header = "HTTP/1.1 $status $statusText`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
    $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
    $stream.Flush()
}

$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Any, $port)
try {
    $listener.Start()
} catch {
    Write-Host ''
    Write-Host "Could not start the scrapbook on port $port." -ForegroundColor Red
    Write-Host "It may already be running. Close the other black window and try again."
    exit 1
}

$addresses = [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
    Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
    ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
    Where-Object { $_.Address.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork -and -not $_.Address.ToString().StartsWith('169.254.') } |
    ForEach-Object { $_.Address.ToString() } |
    Select-Object -Unique

Clear-Host
Write-Host 'TRISTAN SCRAPBOOK v1.5' -ForegroundColor Cyan
Write-Host '=======================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'The scrapbook is now running.' -ForegroundColor Green
Write-Host ''
Write-Host 'On this laptop:'
Write-Host "  http://localhost:$port" -ForegroundColor Yellow
Write-Host ''
Write-Host 'On a phone connected to the same home Wi-Fi, try:'
foreach ($address in $addresses) {
    Write-Host "  http://${address}:$port" -ForegroundColor Yellow
}
Write-Host ''
Write-Host 'Leave this window open while using the scrapbook.'
Write-Host 'To stop it, close this window or press Ctrl+C.'
Write-Host ''
Write-Host 'Windows may ask whether to allow access. Choose Allow on private networks.' -ForegroundColor DarkYellow
Write-Host ''

Start-Process "http://localhost:$port"

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 5000
            $stream = $client.GetStream()
            $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
            while (($line = $reader.ReadLine()) -ne $null -and $line -ne '') { }

            $parts = $requestLine.Split(' ')
            if ($parts.Length -lt 2 -or $parts[0] -ne 'GET') {
                $body = [Text.Encoding]::UTF8.GetBytes('Only GET requests are supported.')
                Send-Response $stream 405 'Method Not Allowed' $body 'text/plain; charset=utf-8'
                continue
            }

            $urlPath = [Uri]::UnescapeDataString(($parts[1] -split '\?')[0])
            if ($urlPath -eq '/') { $urlPath = '/index.html' }
            $relative = $urlPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
            $candidate = [IO.Path]::GetFullPath((Join-Path $root $relative))

            if (-not $candidate.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
                $body = [Text.Encoding]::UTF8.GetBytes('Not found')
                Send-Response $stream 404 'Not Found' $body 'text/plain; charset=utf-8'
                continue
            }

            $bytes = [IO.File]::ReadAllBytes($candidate)
            Send-Response $stream 200 'OK' $bytes (Get-ContentType $candidate)
        } catch {
            # A browser may close a connection early; the server should keep running.
        } finally {
            if ($reader) { $reader.Dispose() }
            if ($stream) { $stream.Dispose() }
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
