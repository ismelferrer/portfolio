#!/bin/bash

# Transcriptor y Traductor en Tiempo Real - Script de Configuración
# Este script automatiza la instalación y configuración del proyecto

set -e

echo "🚀 Iniciando configuración del Transcriptor y Traductor en Tiempo Real..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
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

# Verificar si Node.js está instalado
check_nodejs() {
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        log_success "Node.js encontrado: $NODE_VERSION"
        
        # Verificar versión mínima (v18)
        REQUIRED_VERSION="18"
        CURRENT_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        
        if [ "$CURRENT_VERSION" -lt "$REQUIRED_VERSION" ]; then
            log_error "Node.js versión $REQUIRED_VERSION o superior requerida. Actual: v$CURRENT_VERSION"
            exit 1
        fi
    else
        log_error "Node.js no encontrado. Por favor instala Node.js v18 o superior"
        log_info "Descarga desde: https://nodejs.org/"
        exit 1
    fi
}

# Verificar si npm está instalado
check_npm() {
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        log_success "npm encontrado: $NPM_VERSION"
    else
        log_error "npm no encontrado. Debería venir con Node.js"
        exit 1
    fi
}

# Verificar si Ollama está instalado
check_ollama() {
    if command -v ollama >/dev/null 2>&1; then
        log_success "Ollama encontrado"
        
        # Verificar si Ollama está corriendo
        if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
            log_success "Ollama está ejecutándose"
        else
            log_warning "Ollama no está ejecutándose. Iniciando..."
            ollama serve &
            sleep 3
            
            if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
                log_success "Ollama iniciado correctamente"
            else
                log_error "No se pudo iniciar Ollama automáticamente"
                log_info "Por favor ejecuta 'ollama serve' manualmente"
            fi
        fi
    else
        log_error "Ollama no encontrado"
        log_info "Instala Ollama desde: https://ollama.ai/download"
        log_info "O ejecuta: curl -fsSL https://ollama.ai/install.sh | sh"
        exit 1
    fi
}

# Verificar modelos de Ollama
check_ollama_models() {
    log_info "Verificando modelos de Ollama..."
    
    if ollama list | grep -q "llama3.2"; then
        log_success "Modelo llama3.2 encontrado"
    else
        log_warning "Modelo llama3.2 no encontrado. Descargando..."
        ollama pull llama3.2
        
        if [ $? -eq 0 ]; then
            log_success "Modelo llama3.2 descargado correctamente"
        else
            log_error "Error al descargar el modelo llama3.2"
            exit 1
        fi
    fi
}

# Configurar backend
setup_backend() {
    log_info "Configurando backend..."
    
    cd backend
    
    # Instalar dependencias
    log_info "Instalando dependencias del backend..."
    npm install
    
    if [ $? -eq 0 ]; then
        log_success "Dependencias del backend instaladas"
    else
        log_error "Error al instalar dependencias del backend"
        exit 1
    fi
    
    # Copiar archivo de configuración
    if [ ! -f .env ]; then
        cp .env.example .env
        log_success "Archivo .env creado desde .env.example"
        log_info "Puedes editar backend/.env para personalizar la configuración"
    else
        log_info "Archivo .env ya existe"
    fi
    
    cd ..
}

# Configurar frontend
setup_frontend() {
    log_info "Configurando frontend..."
    
    cd frontend
    
    # Verificar si Angular CLI está instalado globalmente
    if ! command -v ng >/dev/null 2>&1; then
        log_warning "Angular CLI no encontrado. Instalando globalmente..."
        npm install -g @angular/cli
        
        if [ $? -eq 0 ]; then
            log_success "Angular CLI instalado globalmente"
        else
            log_error "Error al instalar Angular CLI"
            exit 1
        fi
    else
        log_success "Angular CLI encontrado"
    fi
    
    # Instalar dependencias
    log_info "Instalando dependencias del frontend..."
    npm install
    
    if [ $? -eq 0 ]; then
        log_success "Dependencias del frontend instaladas"
    else
        log_error "Error al instalar dependencias del frontend"
        exit 1
    fi
    
    cd ..
}

# Función principal
main() {
    echo ""
    log_info "Verificando requisitos del sistema..."
    
    check_nodejs
    check_npm
    check_ollama
    check_ollama_models
    
    echo ""
    log_info "Configurando el proyecto..."
    
    setup_backend
    setup_frontend
    
    echo ""
    log_success "🎉 ¡Configuración completada!"
    
    echo ""
    echo "📋 Próximos pasos:"
    echo ""
    echo "1. Iniciar el backend:"
    echo "   cd backend && npm run dev"
    echo ""
    echo "2. En otra terminal, iniciar el frontend:"
    echo "   cd frontend && npm start"
    echo ""
    echo "3. Abrir en el navegador:"
    echo "   http://localhost:4200"
    echo ""
    
    log_info "¡Disfruta transcribiendo y traduciendo en tiempo real! 🎤✨"
}

# Ejecutar función principal
main