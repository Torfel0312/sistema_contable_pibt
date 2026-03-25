@echo off
cd /d C:\proy_contabilidad_PIBT
echo [1/2] Compilando proyecto...
call npm.cmd run build
if errorlevel 1 goto :error

echo [2/2] Iniciando servidor estable (produccion local) en http://127.0.0.1:3000 ...
call npm.cmd run start -- --hostname 127.0.0.1 --port 3000
goto :eof

:error
echo.
echo Error durante compilacion/inicio.
pause
