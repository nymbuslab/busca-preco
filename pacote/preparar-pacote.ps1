# ============================================================
#   preparar-pacote.ps1
#   Monta a pasta `pacote\` pronta pra zipar e enviar ao cliente.
#
#   Faz:
#     1. Rebuild do .exe via PyInstaller (dist\BuscaPrecoAPI)
#     2. Copia dist\BuscaPrecoAPI    -> pacote\BuscaPrecoAPI
#     3. Baixa nssm.exe              -> pacote\nssm.exe   (se faltar)
#     4. Copia cloudflared.exe       -> pacote\cloudflared.exe
#     5. Cria pacote\logs\ vazia
#     6. (opcional) Zipa o pacote\ em pacote-BuscaPreco.zip
#
#   Executar a partir da raiz do projeto:
#     .\pacote\preparar-pacote.ps1
#
#   Flags opcionais:
#     -SkipBuild    nao reroda PyInstaller (usa dist\ existente)
#     -Zip          ao final, cria pacote-BuscaPreco.zip na raiz
# ============================================================

param(
    [switch]$SkipBuild,
    [switch]$Zip
)

$ErrorActionPreference = "Stop"
$root  = (Resolve-Path "$PSScriptRoot\..").Path
$dist  = Join-Path $root "dist\BuscaPrecoAPI"
$pkg   = Join-Path $root "pacote"
$venv  = Join-Path $root ".venv\Scripts\python.exe"

Write-Host ""
Write-Host "============================================================"
Write-Host "  PREPARAR PACOTE - BuscaPreco" -ForegroundColor Cyan
Write-Host "============================================================"
Write-Host ""

# ----------------------------------------------------------------
# 1. Build do exe
# ----------------------------------------------------------------
if (-not $SkipBuild) {
    Write-Host "[1/5] Rebuildando .exe via PyInstaller..." -ForegroundColor Yellow
    if (-not (Test-Path $venv)) {
        Write-Host "  ERRO: .venv nao encontrado em $venv" -ForegroundColor Red
        exit 1
    }
    & $venv -m PyInstaller `
        --noconfirm `
        --name BuscaPrecoAPI `
        --console `
        --onedir `
        --collect-all uvicorn `
        --collect-all pydantic `
        --collect-all aiomysql `
        --collect-all pymysql `
        --collect-all pydantic_settings `
        api\srv-buscapreco.py | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERRO: PyInstaller falhou (exit $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[1/5] Pulando build (use existente em dist\BuscaPrecoAPI)" -ForegroundColor DarkGray
}

if (-not (Test-Path $dist)) {
    Write-Host "  ERRO: dist\BuscaPrecoAPI nao existe." -ForegroundColor Red
    Write-Host "  Rode sem -SkipBuild ou execute PyInstaller manualmente."
    exit 1
}

# ----------------------------------------------------------------
# 2. Copia BuscaPrecoAPI para pacote\
# ----------------------------------------------------------------
Write-Host "[2/5] Copiando BuscaPrecoAPI -> pacote\BuscaPrecoAPI..." -ForegroundColor Yellow
$target = Join-Path $pkg "BuscaPrecoAPI"
if (Test-Path $target) { Remove-Item $target -Recurse -Force }
Copy-Item -Recurse $dist $target

# ----------------------------------------------------------------
# 3. Baixa nssm.exe se faltar
# ----------------------------------------------------------------
$nssmPath = Join-Path $pkg "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "[3/5] Baixando nssm.exe..." -ForegroundColor Yellow
    $tmpZip = Join-Path $env:TEMP "nssm.zip"
    $tmpDir = Join-Path $env:TEMP "nssm-extract"
    # ordem de tentativa: nssm.cc oficial, github mirror
    $urls = @(
        "https://nssm.cc/release/nssm-2.24.zip",
        "https://github.com/kirillkovalenko/nssm/releases/download/v2.24-101-g897c7ad/nssm-2.24-101-g897c7ad.zip"
    )
    $ok = $false
    foreach ($url in $urls) {
        try {
            Write-Host "       tentando $url" -ForegroundColor DarkGray
            if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
            Invoke-WebRequest -Uri $url -OutFile $tmpZip -ErrorAction Stop
            Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -ErrorAction Stop
            $inner = Get-ChildItem $tmpDir -Recurse -Filter "nssm.exe" |
                     Where-Object { $_.FullName -match "win64" } |
                     Select-Object -First 1
            if ($inner) {
                Copy-Item $inner.FullName $nssmPath -Force
                $ok = $true
                break
            }
        } catch {
            Write-Host "       falhou: $($_.Exception.Message)" -ForegroundColor DarkYellow
        }
    }
    if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue }
    if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue }
    if (-not $ok) {
        Write-Host "  AVISO: nao foi possivel baixar nssm.exe." -ForegroundColor Yellow
        Write-Host "         Baixe manualmente em https://nssm.cc/download"
        Write-Host "         (escolha win64/nssm.exe da release 2.24)"
        Write-Host "         e coloque em $nssmPath"
    }
} else {
    Write-Host "[3/5] nssm.exe ja presente, ok." -ForegroundColor DarkGray
}

# ----------------------------------------------------------------
# 4. Copia cloudflared.exe
# ----------------------------------------------------------------
Write-Host "[4/5] Copiando cloudflared.exe..." -ForegroundColor Yellow
$cfSrc = "C:\pasta_segura\programas\cloudflared.exe"
$cfDst = Join-Path $pkg "cloudflared.exe"
if (Test-Path $cfSrc) {
    Copy-Item $cfSrc $cfDst -Force
} elseif (Test-Path $cfDst) {
    Write-Host "  cloudflared.exe ja presente (origem nao achada), ok." -ForegroundColor DarkGray
} else {
    Write-Host "  AVISO: cloudflared.exe nao achado em $cfSrc" -ForegroundColor Yellow
    Write-Host "         Baixe manualmente em:"
    Write-Host "         https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    Write-Host "         e coloque em $cfDst"
}

# ----------------------------------------------------------------
# 5. logs/ vazia
# ----------------------------------------------------------------
$logsDir = Join-Path $pkg "logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Force -Path $logsDir | Out-Null }

# ----------------------------------------------------------------
# Resumo
# ----------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Conteudo final de pacote\:" -ForegroundColor Yellow
Get-ChildItem $pkg | Format-Table Mode, Name, Length -AutoSize | Out-Host

# ----------------------------------------------------------------
# Zip opcional
# ----------------------------------------------------------------
if ($Zip) {
    $zipPath = Join-Path $root "pacote-BuscaPreco.zip"
    Write-Host "Criando $zipPath..." -ForegroundColor Yellow
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    # exclui o proprio script de empacotamento — ele e para uso interno, nao vai pro cliente
    $itensZip = Get-ChildItem $pkg -Force |
                Where-Object { $_.Name -ne 'preparar-pacote.ps1' } |
                ForEach-Object { $_.FullName }
    Compress-Archive -Path $itensZip -DestinationPath $zipPath -CompressionLevel Optimal
    $bytes = (Get-Item $zipPath).Length
    $mb    = [math]::Round($bytes / 1048576.0, 1)
    $linha = '  OK -> ' + $zipPath + ' (' + $mb + ' MB)'
    Write-Host $linha -ForegroundColor Green
}

Write-Host ""
Write-Host "Pacote pronto. Confira pacote\LEIA-ME.txt antes de enviar." -ForegroundColor Green
Write-Host ""
