# API de Transcripción de Audio

## Resumen de Mejoras Implementadas

Se han corregido los errores en las funciones de transcripción del servidor y se ha implementado la funcionalidad para crear archivos MP3 que pueden ser enviados a servicios de transcripción.

## Características Principales

- ✅ **Manejo real de datos de audio**: Ya no usa transcripciones mock
- ✅ **Conversión automática a MP3**: Todos los archivos de audio se convierten a formato MP3
- ✅ **Almacenamiento persistente**: Los archivos MP3 se guardan para futuras referencias
- ✅ **Múltiples formatos de entrada**: Acepta WAV, MP3, y otros formatos de audio
- ✅ **Integración preparada**: Código comentado para Google Cloud Speech y OpenAI Whisper
- ✅ **API REST y WebSocket**: Soporte para ambos protocolos
- ✅ **Gestión de errores mejorada**: Manejo robusto de errores en todo el flujo

## Estructura de Archivos

```
backend/
├── audio/          # Archivos MP3 generados (persistentes)
├── uploads/        # Archivos temporales subidos
└── server.js       # Servidor principal
```

## Endpoints del API

### 1. WebSocket - Transcripción en Tiempo Real

**Conexión**: `ws://localhost:3000`

**Mensaje de entrada**:
```json
{
  "type": "audio-chunk",
  "audioData": "data:audio/wav;base64,UklGRnoGAABXQVZFZm10...",
  "targetLanguage": "en",
  "sessionId": "unique-session-id"
}
```

**Respuesta de transcripción**:
```json
{
  "type": "transcription",
  "text": "Texto transcrito del audio",
  "audioFile": "audio_1640995200000_uuid.mp3",
  "timestamp": "2023-12-31T12:00:00.000Z",
  "sessionId": "unique-session-id"
}
```

**Respuesta de traducción automática**:
```json
{
  "type": "translation",
  "originalText": "Texto transcrito del audio",
  "translatedText": "Transcribed text from audio",
  "sourceLanguage": "auto",
  "targetLanguage": "en",
  "timestamp": "2023-12-31T12:00:00.000Z"
}
```

### 2. REST API - Subida de Archivos

**POST** `/transcribe`

**Headers**:
```
Content-Type: multipart/form-data
```

**Body**:
```
audio: [archivo de audio]
targetLanguage: "en" (opcional)
```

**Respuesta**:
```json
{
  "transcription": "Texto transcrito del archivo",
  "audioFile": "uploaded_1640995200000_uuid.mp3",
  "translation": {
    "translatedText": "Translated text from file",
    "targetLanguage": "en"
  },
  "timestamp": "2023-12-31T12:00:00.000Z",
  "originalFile": "mi_audio.wav"
}
```

### 3. Gestión de Archivos de Audio

**GET** `/audio` - Listar archivos de audio disponibles
```json
{
  "files": [
    {
      "filename": "audio_1640995200000_uuid.mp3",
      "size": 1234567,
      "created": "2023-12-31T12:00:00.000Z",
      "modified": "2023-12-31T12:00:00.000Z"
    }
  ]
}
```

**GET** `/audio/:filename` - Descargar archivo de audio específico
- Descarga directa del archivo MP3

## Ejemplos de Uso

### Ejemplo 1: WebSocket con JavaScript

```javascript
const ws = new WebSocket('ws://localhost:3000');

// Enviar audio chunk
function sendAudioChunk(audioBlob) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const audioData = event.target.result;
    ws.send(JSON.stringify({
      type: 'audio-chunk',
      audioData: audioData,
      targetLanguage: 'en',
      sessionId: 'my-session-123'
    }));
  };
  reader.readAsDataURL(audioBlob);
}

// Recibir respuestas
ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  if (data.type === 'transcription') {
    console.log('Transcripción:', data.text);
    console.log('Archivo MP3:', data.audioFile);
    
    // Descargar el archivo MP3
    const downloadUrl = `http://localhost:3000/audio/${data.audioFile}`;
    console.log('Descargar MP3:', downloadUrl);
  }
  
  if (data.type === 'translation') {
    console.log('Traducción:', data.translatedText);
  }
};
```

### Ejemplo 2: REST API con cURL

```bash
# Subir archivo de audio para transcripción
curl -X POST http://localhost:3000/transcribe \
  -F "audio=@mi_audio.wav" \
  -F "targetLanguage=en"

# Listar archivos de audio disponibles
curl http://localhost:3000/audio

# Descargar archivo MP3 específico
curl -O http://localhost:3000/audio/audio_1640995200000_uuid.mp3
```

### Ejemplo 3: REST API con Python

```python
import requests

# Subir archivo de audio
with open('mi_audio.wav', 'rb') as audio_file:
    files = {'audio': audio_file}
    data = {'targetLanguage': 'en'}
    
    response = requests.post(
        'http://localhost:3000/transcribe',
        files=files,
        data=data
    )
    
    result = response.json()
    print(f"Transcripción: {result['transcription']}")
    print(f"Archivo MP3: {result['audioFile']}")
    
    # Descargar el archivo MP3 generado
    if 'audioFile' in result:
        mp3_response = requests.get(
            f"http://localhost:3000/audio/{result['audioFile']}"
        )
        
        with open(f"transcribed_{result['audioFile']}", 'wb') as f:
            f.write(mp3_response.content)
        print(f"MP3 descargado como: transcribed_{result['audioFile']}")
```

## Configuración para Servicios de Transcripción Reales

### Google Cloud Speech-to-Text

1. **Instalar cliente**:
```bash
npm install @google-cloud/speech
```

2. **Variables de entorno**:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
```

3. **Descomentar código** en `server.js` línea ~195 (Opción 1)

### OpenAI Whisper API

1. **Instalar dependencias**:
```bash
npm install form-data
```

2. **Variables de entorno**:
```bash
export OPENAI_API_KEY="your-openai-api-key"
```

3. **Descomentar código** en `server.js` línea ~217 (Opción 2)

## Consideraciones de Producción

1. **Limitaciones de archivo**: Actualmente limitado a 50MB por archivo
2. **Limpieza automática**: Los archivos temporales se eliminan automáticamente
3. **Persistencia**: Los archivos MP3 se mantienen en `./audio/` para futuras referencias
4. **Seguridad**: Validación de nombres de archivo para prevenir ataques de path traversal
5. **Manejo de errores**: Logging completo y respuestas de error estructuradas

## Flujo de Procesamiento

1. **Recepción**: Audio recibido vía WebSocket o REST
2. **Validación**: Verificación de formato y tamaño
3. **Almacenamiento temporal**: Guardado en directorio temporal
4. **Conversión**: Conversión a MP3 usando FFmpeg
5. **Transcripción**: Envío a servicio de transcripción
6. **Respuesta**: Envío de resultado con referencia al archivo MP3
7. **Limpieza**: Eliminación de archivos temporales
8. **Persistencia**: Mantener archivo MP3 para futuras referencias