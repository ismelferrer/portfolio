# Transcriptor y Traductor en Tiempo Real

Un sistema completo de transcripción de voz y traducción en tiempo real utilizando Node.js, Angular y Ollama para el procesamiento de modelos LLM.

## 🚀 Características

- **Transcripción en tiempo real**: Convierte voz a texto usando la API Web Speech Recognition
- **Traducción automática**: Utiliza modelos LLM a través de Ollama para traducciones precisas
- **Interfaz moderna**: UI construida con Angular y Angular Material
- **Comunicación WebSocket**: Procesamiento en tiempo real entre frontend y backend
- **Visualización de audio**: Indicadores visuales del nivel de audio durante la grabación
- **Múltiples idiomas**: Soporte para más de 10 idiomas diferentes
- **Diseño responsivo**: Funciona en dispositivos móviles y de escritorio

## 📋 Requisitos Previos

### Software Necesario

1. **Node.js** (v18 o superior)
   ```bash
   # Verificar versión
   node --version
   npm --version
   ```

2. **Ollama** instalado y funcionando
   ```bash
   # Instalar Ollama (Linux/macOS)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # O descargar desde: https://ollama.ai/download
   ```

3. **Modelo LLM** descargado en Ollama
   ```bash
   # Descargar modelo recomendado
   ollama pull llama3.2
   
   # Verificar modelos instalados
   ollama list
   ```

### Navegador Compatible

- **Chrome** (recomendado para mejor soporte de Web Speech API)
- **Firefox** (soporte limitado)
- **Safari** (soporte limitado)
- **Edge** (soporte básico)

## 🛠️ Instalación

### 1. Clonar o Descargar el Proyecto

```bash
# Si tienes el código en git
git clone <repository-url>
cd transcriptor-traductor

# O extraer el archivo zip en una carpeta
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Editar configuración si es necesario
nano .env
```

### 3. Configurar Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# Instalar Angular CLI globalmente (si no está instalado)
npm install -g @angular/cli
```

### 4. Verificar Ollama

```bash
# Verificar que Ollama esté funcionando
curl http://localhost:11434/api/tags

# Iniciar Ollama si no está funcionando
ollama serve
```

## 🚀 Uso

### 1. Iniciar Backend

```bash
cd backend

# Modo desarrollo (con auto-reinicio)
npm run dev

# O modo producción
npm start
```

El servidor se iniciará en `http://localhost:3000`

### 2. Iniciar Frontend

```bash
# En otra terminal
cd frontend

# Modo desarrollo
npm start

# O especificar host y puerto
npm run serve
```

La aplicación estará disponible en `http://localhost:4200`

### 3. Usar la Aplicación

1. **Abrir** `http://localhost:4200` en tu navegador
2. **Permitir** acceso al micrófono cuando se solicite
3. **Seleccionar** idiomas de origen y destino
4. **Presionar** el botón del micrófono para iniciar grabación
5. **Hablar** claramente al micrófono
6. **Presionar** nuevamente para detener y procesar
7. **Ver** la transcripción y traducción en tiempo real

## ⚙️ Configuración

### Variables de Entorno (Backend)

Editar `backend/.env`:

```env
# Puerto del servidor
PORT=3000

# URL de Ollama
OLLAMA_URL=http://localhost:11434

# Modelo LLM a usar
OLLAMA_MODEL=llama3.2

# Configuraciones opcionales para servicios de nube
# GOOGLE_CLOUD_PROJECT_ID=tu-proyecto-id
# AZURE_SPEECH_KEY=tu-clave-azure
```

### Configuración del Frontend

Editar `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  wsUrl: 'ws://localhost:3000'
};
```

## 🏗️ Arquitectura

### Backend (Node.js + Express)

```
backend/
├── server.js              # Servidor principal
├── package.json           # Dependencias del backend
├── .env.example          # Plantilla de configuración
└── uploads/              # Archivos de audio temporales
```

**Componentes principales:**
- **Servidor Express**: API REST y WebSocket
- **WebSocket Server**: Comunicación en tiempo real
- **Integración Ollama**: Procesamiento de traducciones
- **Manejo de Audio**: Procesamiento de archivos de audio

### Frontend (Angular + Material)

```
frontend/src/app/
├── components/
│   ├── transcriptor/           # Componente principal
│   ├── audio-recorder/         # Grabación de audio
│   └── translation-display/    # Visualización de traducciones
├── services/
│   ├── websocket.service.ts    # Comunicación WebSocket
│   ├── audio.service.ts        # Manejo de audio
│   └── translation.service.ts  # Gestión de traducciones
└── app.module.ts              # Configuración principal
```

**Características técnicas:**
- **Angular 17**: Framework principal
- **Angular Material**: Componentes UI
- **WebSocket**: Comunicación en tiempo real
- **Web Speech API**: Reconocimiento de voz del navegador
- **RxJS**: Programación reactiva

## 🔧 API Endpoints

### REST API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado del servidor |
| POST | `/transcribe` | Transcribir archivo de audio |
| POST | `/translate` | Traducir texto |
| GET | `/languages` | Idiomas disponibles |
| GET | `/models` | Modelos Ollama disponibles |

### WebSocket Events

| Evento | Descripción |
|--------|-------------|
| `audio-chunk` | Enviar datos de audio para transcripción |
| `translate` | Solicitar traducción de texto |
| `get-models` | Obtener modelos disponibles |
| `transcription` | Recibir resultado de transcripción |
| `translation` | Recibir resultado de traducción |
| `error` | Notificación de error |

## 🐛 Solución de Problemas

### Problemas Comunes

#### 1. Ollama no responde
```bash
# Verificar si Ollama está funcionando
curl http://localhost:11434/api/tags

# Reiniciar Ollama
ollama serve
```

#### 2. Error de permisos de micrófono
- Asegurar HTTPS o localhost
- Verificar configuración del navegador
- Permitir acceso al micrófono en la configuración del sitio

#### 3. WebSocket no conecta
- Verificar que el backend esté funcionando
- Comprobar puertos (3000 para backend, 4200 para frontend)
- Revisar firewall/antivirus

#### 4. Dependencias faltantes
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install

# Angular CLI global
npm install -g @angular/cli
```

### Logs de Debug

```bash
# Backend logs
cd backend && npm run dev

# Frontend logs (consola del navegador)
F12 > Console

# Ollama logs
ollama logs
```

## 🚀 Producción

### Build del Frontend

```bash
cd frontend
ng build --configuration production
```

### Servir Archivos Estáticos

Agregar al servidor Express:

```javascript
app.use(express.static('dist/transcriptor-frontend'));
```

### Variables de Entorno de Producción

```env
NODE_ENV=production
PORT=3000
OLLAMA_URL=http://localhost:11434
```

## 🤝 Contribuciones

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Reconocimientos

- **Ollama**: Por la integración de modelos LLM
- **Angular Team**: Por el framework y Angular Material
- **Web Speech API**: Por el reconocimiento de voz en navegadores
- **Node.js Community**: Por el ecosistema de herramientas

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa la sección de **Solución de Problemas**
2. Verifica que todos los **Requisitos Previos** estén cumplidos
3. Consulta los logs para errores específicos
4. Abre un issue en el repositorio del proyecto

---

**¡Disfruta transcribiendo y traduciendo en tiempo real! 🎤✨**