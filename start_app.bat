@echo off
echo ==========================================
echo  Sistema de Gestion de Compras
echo ==========================================
echo.

echo Iniciando servidor integrado (Backend + Frontend)...
start "Servidor Gestion Compras" cmd /k "cd backend && python app.py"

timeout /t 3 /nobreak > nul

echo.
echo ==========================================
echo  Aplicacion iniciada exitosamente!
echo ==========================================
echo  👉 INGRESA AQUI DESDE TU NAVEGADOR:
echo     http://localhost:3000
echo ==========================================
echo.
echo  Usuario por defecto:
echo    - Username: admin
echo    - Password: admin123
echo ==========================================
echo.
echo Presione cualquier tecla para continuar...
pause > nul

