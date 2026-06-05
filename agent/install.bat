@echo off
echo === Infra-Desk Monitoring Agent ===
echo.

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

echo Instalando servico...
infra-desk-agent.exe install

echo Iniciando servico...
infra-desk-agent.exe start

echo.
echo Agente instalado e rodando!
echo Para verificar: services.msc -> "Infra-Desk Monitoring Agent"
echo Logs em: agent.log (nesta pasta)
pause
