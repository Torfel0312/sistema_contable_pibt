@echo off
cd /d C:\proy_contabilidad_PIBT
echo [1/3] Instalando dependencias...
call npm.cmd install
if errorlevel 1 goto :error

echo [2/3] Inicializando base local...
call npm.cmd run db:init
if errorlevel 1 goto :error

echo [3/3] Iniciando servidor en http://localhost:3000 ...
call npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
goto :eof

:error
echo.
echo Ocurrio un error durante el inicio. Revisa la salida anterior.
pause
