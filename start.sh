#!/bin/bash

# Transcriptor y Traductor en Tiempo Real - Script de Inicio
# Este script inicia tanto el backend como el frontend

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si Ollama está corriendo
check_ollama() {
    if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        log_warning "Ollama no está ejecutándose. Iniciando..."
        ollama serve &
        sleep 3
    else
        log_success "Ollama está ejecutándose"
    fi
}

# Verificar dependencias
check_dependencies() {
    log_info "Verificando dependencias..."
    
    if [ ! -d "backend/node_modules" ]; then
        log_warning "Dependencias del backend no encontradas. Ejecutando npm install..."
        cd backend && npm install && cd ..
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        log_warning "Dependencias del frontend no encontradas. Ejecutando npm install..."
        cd frontend && npm install && cd ..
    fi
    
    log_success "Dependencias verificadas"
}

# Función para limpiar procesos al salir
cleanup() {
    log_info "Deteniendo servicios..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Configurar trap para limpiar al salir
trap cleanup SIGINT SIGTERM

echo "🚀 Iniciando Transcriptor y Traductor en Tiempo Real..."
echo ""

# Verificaciones previas
check_ollama
check_dependencies

echo ""
log_info "Iniciando servicios..."

# Iniciar backend
log_info "Iniciando backend en puerto 3000..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Esperar un poco para que el backend se inicie
sleep 3

# Iniciar frontend
log_info "Iniciando frontend en puerto 4200..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
log_success "🎉 Servicios iniciados!"
echo ""
echo "📋 URLs disponibles:"
echo ""
echo "🔗 Frontend: http://localhost:4200"
echo "🔗 Backend API: http://localhost:3000"
echo "🔗 Health Check: http://localhost:3000/health"
echo ""
log_info "Presiona Ctrl+C para detener todos los servicios"
echo ""

# Esperar a que los procesos terminen
wait $BACKEND_PID $FRONTEND_PID