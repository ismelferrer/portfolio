import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/docs.json', (req, res) => res.json(swaggerSpec));

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || '.wav';
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + extension);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Create directories for audio processing
const audioDir = path.join(__dirname, 'audio');
const uploadsDir = path.join(__dirname, 'uploads');

[audioDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Ollama configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Store active WebSocket connections
const clients = new Set();

// Audio processing utilities
async function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', () => {
        console.log('Audio conversion completed:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Audio conversion error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

async function saveAudioChunk(audioData, filename) {
  const filePath = path.join(audioDir, filename);
  
  try {
    // If audioData is base64, decode it
    let buffer;
    if (typeof audioData === 'string') {
      // Remove data URL prefix if present
      const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else if (Buffer.isBuffer(audioData)) {
      buffer = audioData;
    } else {
      throw new Error('Invalid audio data format');
    }
    
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  } catch (error) {
    console.error('Error saving audio chunk:', error);
    throw error;
  }
}

// Simple transcription service placeholder
// In production, replace this with actual service like Google Cloud Speech, Azure, etc.
async function transcribeAudio(audioFilePath) {
  try {
    console.log('Transcribing audio file:', audioFilePath);
    
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error('Audio file not found');
    }
    
    // Option 1: Google Cloud Speech-to-Text (uncomment to use)
    /*
    const speech = require('@google-cloud/speech');
    const client = new speech.SpeechClient();
    
    const audioBytes = fs.readFileSync(audioFilePath).toString('base64');
    
    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: 'MP3',
        sampleRateHertz: 16000,
        languageCode: 'es-ES', // or 'en-US', 'fr-FR', etc.
        enableAutomaticPunctuation: true,
      },
    };
    
    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    return transcription || 'No se pudo transcribir el audio';
    */
    
    // Option 2: OpenAI Whisper API (uncomment to use)
    /*
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(audioFilePath));
    form.append('model', 'whisper-1');
    form.append('language', 'es'); // or 'en', 'fr', etc.
    
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });
    
    return response.data.text || 'No se pudo transcribir el audio';
    */
    
    // Mock transcription for demo purposes
    const fileSizeKB = Math.round(fs.statSync(audioFilePath).size / 1024);
    const mockTranscriptions = [
      "Hola, este es un ejemplo de transcripción de audio.",
      "Audio transcrito correctamente desde el archivo MP3.",
      "El sistema de transcripción está funcionando correctamente.",
      "Procesando archivo de audio para generar texto.",
      "Transcripción automática generada con éxito."
    ];
    
    // Simulate processing delay based on file size
    const processingTime = Math.min(2000, fileSizeKB * 10);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Return a random mock transcription
    const randomIndex = Math.floor(Math.random() * mockTranscriptions.length);
    return `${mockTranscriptions[randomIndex]} (Archivo: ${fileSizeKB}KB)`;
    
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message type:', data.type);
      
      switch (data.type) {
        case 'audio-chunk':
          await handleAudioChunk(ws, data);
          break;
        case 'translate':
          await handleTranslation(ws, data);
          break;
        case 'get-models':
          await getAvailableModels(ws);
          break;
        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected successfully' }));
});

// Audio transcription handler
async function handleAudioChunk(ws, data) {
  try {
    const { audioData, targetLanguage = 'en', sessionId } = data;
    
    if (!audioData) {
      throw new Error('No audio data provided');
    }
    
    // Generate unique filenames
    const timestamp = Date.now();
    const uniqueId = uuidv4();
    const tempFilename = `temp_${timestamp}_${uniqueId}.wav`;
    const mp3Filename = `audio_${timestamp}_${uniqueId}.mp3`;
    
    // Step 1: Save the audio chunk to a temporary file
    console.log('Saving audio chunk...');
    const tempAudioPath = await saveAudioChunk(audioData, tempFilename);
    
    // Step 2: Convert to MP3
    console.log('Converting to MP3...');
    const mp3Path = path.join(audioDir, mp3Filename);
    await convertToMp3(tempAudioPath, mp3Path);
    
    // Step 3: Transcribe the audio
    console.log('Transcribing audio...');
    const transcriptionText = await transcribeAudio(mp3Path);
    
    // Step 4: Send transcription result
    ws.send(JSON.stringify({
      type: 'transcription',
      text: transcriptionText,
      audioFile: mp3Filename,
      timestamp: new Date().toISOString(),
      sessionId: sessionId || uniqueId
    }));
    
    // Step 5: Auto-translate the transcribed text
    if (transcriptionText && transcriptionText.trim()) {
      await handleTranslation(ws, {
        text: transcriptionText,
        targetLanguage: targetLanguage,
        sessionId: sessionId || uniqueId
      });
    }
    
    // Step 6: Clean up temporary file
    try {
      if (fs.existsSync(tempAudioPath)) {
        await fs.promises.unlink(tempAudioPath);
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
    }
    
    console.log(`Audio processing completed. MP3 saved as: ${mp3Filename}`);
    
  } catch (error) {
    console.error('Error in audio transcription:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: `Transcription failed: ${error.message}` 
    }));
  }
}

// Translation handler using Ollama
async function handleTranslation(ws, data) {
  try {
    const { text, targetLanguage = 'en', sourceLanguage = 'auto' } = data;
    
    const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translation, no explanations:

Text to translate: "${text}"

Translation:`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: DEFAULT_MODEL,
      prompt: prompt,
      stream: false
    });

    const translation = response.data.response.trim();
    
    ws.send(JSON.stringify({
      type: 'translation',
      originalText: text,
      translatedText: translation,
      sourceLanguage,
      targetLanguage,
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Error in translation:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Translation failed: ' + error.message 
    }));
  }
}

// Get available Ollama models
async function getAvailableModels(ws) {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    const models = response.data.models || [];
    
    ws.send(JSON.stringify({
      type: 'models',
      models: models.map(model => ({
        name: model.name,
        size: model.size,
        modified_at: model.modified_at
      }))
    }));
    
  } catch (error) {
    console.error('Error fetching models:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Failed to fetch models: ' + error.message 
    }));
  }
}

// REST API endpoints

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Verificar estado del servicio
 *     description: Endpoint de salud que confirma que el backend está activo.
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: Estado OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * @openapi
 * /transcribe:
 *   post:
 *     summary: Subir audio para transcripción y traducción opcional
 *     description: Acepta un archivo de audio, lo convierte a MP3, lo transcribe y opcionalmente lo traduce.
 *     tags:
 *       - Transcripción
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de audio (WAV, MP3, etc.)
 *               targetLanguage:
 *                 type: string
 *                 description: Idioma objetivo para traducción automática
 *                 example: en
 *     responses:
 *       200:
 *         description: Transcripción realizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transcription:
 *                   type: string
 *                 audioFile:
 *                   type: string
 *                   description: Nombre del archivo MP3 generado
 *                 translation:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     translatedText:
 *                       type: string
 *                     targetLanguage:
 *                       type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 originalFile:
 *                   type: string
 *       400:
 *         description: Solicitud inválida (archivo faltante)
 *       500:
 *         description: Error en el proceso de transcripción
 */
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const { targetLanguage = 'en' } = req.body;
    const uploadedFilePath = req.file.path;
    
    // Generate unique filename for MP3
    const timestamp = Date.now();
    const uniqueId = uuidv4();
    const mp3Filename = `uploaded_${timestamp}_${uniqueId}.mp3`;
    const mp3Path = path.join(audioDir, mp3Filename);
    
    try {
      // Step 1: Convert uploaded file to MP3
      console.log('Converting uploaded file to MP3...');
      await convertToMp3(uploadedFilePath, mp3Path);
      
      // Step 2: Transcribe the audio
      console.log('Transcribing uploaded audio...');
      const transcriptionText = await transcribeAudio(mp3Path);
      
      // Step 3: Optionally translate if target language is specified
      let translationResult = null;
      if (targetLanguage && targetLanguage !== 'auto' && transcriptionText.trim()) {
        try {
          const prompt = `Translate the following text to ${targetLanguage}. Only return the translation, no explanations:

Text to translate: "${transcriptionText}"

Translation:`;

          const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: DEFAULT_MODEL,
            prompt: prompt,
            stream: false
          });

          translationResult = {
            translatedText: response.data.response.trim(),
            targetLanguage: targetLanguage
          };
        } catch (translationError) {
          console.warn('Translation failed:', translationError);
        }
      }
      
      res.json({
        transcription: transcriptionText,
        audioFile: mp3Filename,
        translation: translationResult,
        timestamp: new Date().toISOString(),
        originalFile: req.file.originalname
      });
      
    } finally {
      // Clean up uploaded file
      try {
        if (fs.existsSync(uploadedFilePath)) {
          await fs.promises.unlink(uploadedFilePath);
        }
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file:', cleanupError);
      }
    }
    
  } catch (error) {
    console.error('Error in file transcription:', error);
    res.status(500).json({ 
      error: 'Transcription failed', 
      details: error.message 
    });
  }
});

/**
 * @openapi
 * /translate:
 *   post:
 *     summary: Traducir texto
 *     description: Traduce el texto proporcionado desde un idioma de origen (o detectado automáticamente) hacia un idioma objetivo utilizando Ollama.
 *     tags:
 *       - Traducción
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 description: Texto a traducir
 *               targetLanguage:
 *                 type: string
 *                 description: Idioma objetivo
 *                 example: en
 *               sourceLanguage:
 *                 type: string
 *                 description: Idioma de origen o 'auto'
 *                 example: auto
 *     responses:
 *       200:
 *         description: Traducción generada
 *       400:
 *         description: Falta el texto a traducir
 *       500:
 *         description: Error al traducir
 */
app.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'en', sourceLanguage = 'auto' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translation, no explanations:

Text to translate: "${text}"

Translation:`;

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: DEFAULT_MODEL,
      prompt: prompt,
      stream: false
    });

    const translation = response.data.response.trim();
    
    res.json({
      originalText: text,
      translatedText: translation,
      sourceLanguage,
      targetLanguage,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in translation:', error);
    res.status(500).json({ error: 'Translation failed: ' + error.message });
  }
});

/**
 * @openapi
 * /audio/{filename}:
 *   get:
 *     summary: Descargar archivo de audio generado
 *     tags:
 *       - Archivos
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del archivo MP3 o WAV
 *     responses:
 *       200:
 *         description: Archivo de audio
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Nombre de archivo inválido
 *       404:
 *         description: Archivo no encontrado
 */
app.get('/audio/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(audioDir, filename);
    
    // Validate filename to prevent directory traversal
    if (!filename.match(/^[a-zA-Z0-9_-]+\.(mp3|wav)$/)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    // Set appropriate headers for audio file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving audio file:', error);
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

/**
 * @openapi
 * /audio:
 *   get:
 *     summary: Listar archivos de audio disponibles
 *     tags:
 *       - Archivos
 *     responses:
 *       200:
 *         description: Lista de archivos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       size:
 *                         type: integer
 *                       created:
 *                         type: string
 *                         format: date-time
 *                       modified:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Error al listar archivos
 */
app.get('/audio', (req, res) => {
  try {
    const files = fs.readdirSync(audioDir)
      .filter(file => file.endsWith('.mp3') || file.endsWith('.wav'))
      .map(file => {
        const filePath = path.join(audioDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created); // Sort by creation date, newest first
    
    res.json({ files });
    
  } catch (error) {
    console.error('Error listing audio files:', error);
    res.status(500).json({ error: 'Failed to list audio files' });
  }
});

/**
 * @openapi
 * /languages:
 *   get:
 *     summary: Obtener idiomas disponibles
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: Lista de idiomas soportados
 */
app.get('/languages', (req, res) => {
  const languages = [
    { code: 'es', name: 'Español' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'zh', name: '中文' }
  ];
  
  res.json(languages);
});

/**
 * @openapi
 * /models:
 *   get:
 *     summary: Obtener modelos disponibles en Ollama
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: Lista de modelos
 *       500:
 *         description: Error al consultar modelos
 */
app.get('/models', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    const models = response.data.models || [];
    
    res.json({
      models: models.map(model => ({
        name: model.name,
        size: model.size,
        modified_at: model.modified_at
      }))
    });
    
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  console.log(`Ollama URL: ${OLLAMA_URL}`);
  console.log(`Default model: ${DEFAULT_MODEL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});