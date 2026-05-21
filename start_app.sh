#!/bin/bash

echo "=========================================="
echo " Sistema de Gestión de Compras"
echo "=========================================="
echo ""

echo "Iniciando backend (Flask)..."
cd backend
python app.py &
BACKEND_PID=$!
cd ..

sleep 3

echo "Iniciando frontend (servidor local)..."
cd frontend
python -m http.server 5500 &
FRONTEND_PID=$!
cd ..

sleep 2

echo ""
echo "=========================================="
echo " Aplicación iniciada!"
echo "=========================================="
echo "  Backend:  http://localhost:3000"
echo "  Frontend: http://localhost:5500"
echo ""
echo "  Usuario por defecto:"
echo "    - Username: admin"
echo "    - Password: admin123"
echo "=========================================="
echo ""
echo "Presione Ctrl+C para detener..."

# Esperar señal
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
