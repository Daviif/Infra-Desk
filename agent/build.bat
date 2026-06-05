@echo off
echo Instalando dependencias...
pip install -r requirements.txt

echo.
echo Compilando agent.exe...
pyinstaller --onefile --noconsole --name infra-desk-agent agent.py

echo.
echo Pronto! O executavel esta em: dist\infra-desk-agent.exe
echo Copie dist\infra-desk-agent.exe e o config.json para a maquina destino.
pause
