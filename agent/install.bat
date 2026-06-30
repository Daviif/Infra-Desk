@echo off
setlocal

:: Verifica se ja esta rodando como administrador
net session >nul 2>&1
if %errorLevel% EQU 0 goto :main

:: Nao e admin: solicita UAC e relanca
set "VBS=%TEMP%\infra-desk-uac.vbs"
echo Set UAC = CreateObject("Shell.Application") > "%VBS%"
echo UAC.ShellExecute "%~f0", "", "%~dp0", "runas", 1 >> "%VBS%"
wscript "%VBS%"
del /f /q "%VBS%" 2>nul
exit /b

:main
cd /d "%~dp0"

if not exist "config.json" (
    echo ERRO: config.json nao encontrado nesta pasta.
    echo Baixe o config.json pela pagina do equipamento no sistema.
    pause
    exit /b 1
)

if not exist "infra-desk-agent.exe" (
    echo ERRO: infra-desk-agent.exe nao encontrado nesta pasta.
    pause
    exit /b 1
)

infra-desk-agent.exe install
if errorlevel 1 (
    echo ERRO: falha ao instalar o servico do Windows.
    pause
    exit /b 1
)

echo Agente instalado como servico do Windows (inicio automatico).
echo Logs em: agent.log (nesta pasta)
