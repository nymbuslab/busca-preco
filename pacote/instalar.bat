@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM   instalar.bat
REM   Registra BuscaPrecoAPI e BuscaPrecoTunnel como servicos
REM   Windows via NSSM. Requer privilegios de Administrador.
REM ============================================================

set "BASE=%~dp0"
set "BASE=%BASE:~0,-1%"
set "NSSM=%BASE%\nssm.exe"
set "API_EXE=%BASE%\BuscaPrecoAPI\BuscaPrecoAPI.exe"
set "API_DIR=%BASE%\BuscaPrecoAPI"
set "CF_EXE=%BASE%\cloudflared.exe"
set "LOGDIR=%BASE%\logs"

REM ---- Resolve onde esta o config.yml ----
REM Procura primeiro no pacote (pasta tunnel\), depois no local padrao do
REM cloudflared (%USERPROFILE%\.cloudflared\). Quem chegar primeiro vence.
set "TUNNEL_CFG=%BASE%\tunnel\config.yml"
if not exist "%TUNNEL_CFG%" (
    if exist "%USERPROFILE%\.cloudflared\config.yml" (
        set "TUNNEL_CFG=%USERPROFILE%\.cloudflared\config.yml"
    )
)

echo.
echo ============================================================
echo   Instalador BuscaPreco
echo ============================================================
echo.

REM ---- Checa privilegio de admin ----
net session >nul 2>&1
if errorlevel 1 (
    echo  ERRO: Execute como Administrador.
    echo  Clique com o botao direito neste arquivo e escolha
    echo  "Executar como administrador".
    echo.
    pause
    exit /b 1
)

REM ---- Checa pre-requisitos ----
if not exist "%NSSM%" (
    echo  ERRO: nssm.exe nao encontrado em %NSSM%
    echo  Coloque o nssm.exe na mesma pasta deste instalador.
    pause
    exit /b 1
)
if not exist "%API_EXE%" (
    echo  ERRO: BuscaPrecoAPI.exe nao encontrado em %API_EXE%
    echo  Verifique se a pasta BuscaPrecoAPI veio completa.
    pause
    exit /b 1
)

REM ---- Garante pasta de logs ----
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

REM ============================================================
REM   Servico: BuscaPrecoAPI
REM ============================================================
echo  [1/2] Registrando servico BuscaPrecoAPI...

"%NSSM%" stop   BuscaPrecoAPI confirm >nul 2>&1
"%NSSM%" remove BuscaPrecoAPI confirm >nul 2>&1

"%NSSM%" install BuscaPrecoAPI "%API_EXE%"                 >nul
"%NSSM%" set BuscaPrecoAPI AppDirectory "%API_DIR%"         >nul
"%NSSM%" set BuscaPrecoAPI Description ^
    "API de consulta de precos por codigo de barras"        >nul
"%NSSM%" set BuscaPrecoAPI Start SERVICE_AUTO_START         >nul
"%NSSM%" set BuscaPrecoAPI AppStdout "%LOGDIR%\api.log"     >nul
"%NSSM%" set BuscaPrecoAPI AppStderr "%LOGDIR%\api.log"     >nul
"%NSSM%" set BuscaPrecoAPI AppRotateFiles 1                 >nul
"%NSSM%" set BuscaPrecoAPI AppRotateBytes 10485760          >nul
"%NSSM%" set BuscaPrecoAPI AppStopMethodSkip 0              >nul

echo      OK

REM ============================================================
REM   Servico: BuscaPrecoTunnel (so se houver config.yml)
REM ============================================================
if exist "%CF_EXE%" (
    if exist "%TUNNEL_CFG%" (
        echo  [2/2] Registrando servico BuscaPrecoTunnel...
        echo       config.yml: %TUNNEL_CFG%

        "%NSSM%" stop   BuscaPrecoTunnel confirm >nul 2>&1
        "%NSSM%" remove BuscaPrecoTunnel confirm >nul 2>&1

        "%NSSM%" install BuscaPrecoTunnel "%CF_EXE%" ^
            "--no-autoupdate" "--config" "%TUNNEL_CFG%" "tunnel" "run"     >nul
        "%NSSM%" set BuscaPrecoTunnel AppDirectory "%BASE%"                >nul
        "%NSSM%" set BuscaPrecoTunnel Description ^
            "Cloudflare Tunnel - Busca Preco"                              >nul
        "%NSSM%" set BuscaPrecoTunnel Start SERVICE_AUTO_START             >nul
        "%NSSM%" set BuscaPrecoTunnel AppStdout "%LOGDIR%\tunnel.log"      >nul
        "%NSSM%" set BuscaPrecoTunnel AppStderr "%LOGDIR%\tunnel.log"      >nul
        "%NSSM%" set BuscaPrecoTunnel AppRotateFiles 1                     >nul
        "%NSSM%" set BuscaPrecoTunnel AppRotateBytes 10485760              >nul
        set "HAS_TUNNEL=1"
        echo      OK
    ) else (
        echo  [2/2] Servico BuscaPrecoTunnel NAO instalado.
        echo       Motivo: config.yml nao encontrado.
        echo       Locais procurados:
        echo         %BASE%\tunnel\config.yml
        echo         %USERPROFILE%\.cloudflared\config.yml
        echo       Veja LEIA-ME.txt - secao "Configurar Cloudflare Tunnel".
        set "HAS_TUNNEL=0"
    )
) else (
    echo  [2/2] Servico BuscaPrecoTunnel NAO instalado.
    echo       Motivo: cloudflared.exe nao encontrado em %CF_EXE%.
    set "HAS_TUNNEL=0"
)

REM ============================================================
REM   Sobe os servicos
REM ============================================================
echo.
echo  Iniciando servicos...
"%NSSM%" start BuscaPrecoAPI >nul 2>&1
if "!HAS_TUNNEL!"=="1" "%NSSM%" start BuscaPrecoTunnel >nul 2>&1

echo.
echo ============================================================
echo   Instalacao concluida
echo ============================================================
echo.
echo  Status:       sc query BuscaPrecoAPI
echo                sc query BuscaPrecoTunnel
echo  Logs:         %LOGDIR%\api.log
echo                %LOGDIR%\tunnel.log
echo  Desinstalar:  desinstalar.bat
echo.
echo  Teste local:  abra http://localhost:8000/docs no navegador
echo.
pause
endlocal
