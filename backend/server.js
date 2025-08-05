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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

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
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '.wav');
  }
});

const upload = multer({ storage: storage });

// Ollama configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Store active WebSocket connections
const clients = new Set();

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
    // Here we would integrate with a speech recognition service
    // For now, we'll simulate transcription and use a simple approach
    
    // In a real implementation, you would:
    // 1. Save the audio chunk to a file
    // 2. Use a speech recognition service (Google Cloud Speech, Azure, etc.)
    // 3. Return the transcribed text
    
    // For demo purposes, we'll return a mock transcription
    const mockTranscription = "Texto transcrito de ejemplo desde el audio";
    
    ws.send(JSON.stringify({
      type: 'transcription',
      text: mockTranscription,
      timestamp: new Date().toISOString()
    }));
    
    // Auto-translate the transcribed text
    await handleTranslation(ws, {
      text: mockTranscription,
      targetLanguage: data.targetLanguage || 'en'
    });
    
  } catch (error) {
    console.error('Error in audio transcription:', error);
    ws.send(JSON.stringify({ type: 'error', message: 'Transcription failed' }));
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Upload audio file for transcription
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    // Here you would implement actual speech recognition
    // For now, return a mock response
    const mockTranscription = "Transcripción de ejemplo del archivo de audio";
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({
      transcription: mockTranscription,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in file transcription:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// Translate text
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

// Get available languages
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

// Get Ollama models
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