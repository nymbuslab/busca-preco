@echo off
setlocal

REM ============================================================
REM   desinstalar.bat
REM   Para e remove os servicos BuscaPrecoAPI e BuscaPrecoTunnel.
REM   Nao apaga arquivos — voce pode reinstalar a qualquer momento.
REM ============================================================

set "BASE=%~dp0"
set "BASE=%BASE:~0,-1%"
set "NSSM=%BASE%\nssm.exe"

echo.
echo ============================================================
echo   Desinstalador BuscaPreco
echo ============================================================
echo.

REM ---- Checa privilegio de admin ----
net session >nul 2>&1
if errorlevel 1 (
    echo  ERRO: Execute como Administrador.
    echo.
    pause
    exit /b 1
)

if not exist "%NSSM%" (
    echo  ERRO: nssm.exe nao encontrado em %NSSM%
    pause
    exit /b 1
)

echo  Parando e removendo servicos...
"%NSSM%" stop   BuscaPrecoAPI    confirm >nul 2>&1
"%NSSM%" remove BuscaPrecoAPI    confirm >nul 2>&1
"%NSSM%" stop   BuscaPrecoTunnel confirm >nul 2>&1
"%NSSM%" remove BuscaPrecoTunnel confirm >nul 2>&1

echo.
echo ============================================================
echo   Servicos removidos.
echo ============================================================
echo.
echo  Os arquivos da pasta NAO foram apagados.
echo  Rode instalar.bat novamente para reinstalar.
echo.
pause
endlocal
