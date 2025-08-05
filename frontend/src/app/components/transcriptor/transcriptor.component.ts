import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

import { WebSocketService, WebSocketMessage } from '../../services/websocket.service';
import { AudioService } from '../../services/audio.service';
import { TranslationService, Language, TranscriptionResult, TranslationResult } from '../../services/translation.service';

@Component({
  selector: 'app-transcriptor',
  templateUrl: './transcriptor.component.html',
  styleUrls: ['./transcriptor.component.scss']
})
export class TranscriptorComponent implements OnInit, OnDestroy {
  isRecording = false;
  isConnected = false;
  selectedTargetLanguage = 'en';
  selectedSourceLanguage = 'auto';
  
  languages: Language[] = [];
  transcriptions: TranscriptionResult[] = [];
  translations: TranslationResult[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private webSocketService: WebSocketService,
    private audioService: AudioService,
    private translationService: TranslationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadLanguages();
    this.subscribeToServices();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
  }

  private loadLanguages(): void {
    this.languages = this.translationService.getDefaultLanguages();
    
    // Also try to load from server
    this.translationService.getAvailableLanguages().subscribe({
      next: (languages) => {
        this.languages = languages;
      },
      error: (error) => {
        console.warn('Could not load languages from server, using defaults', error);
      }
    });
  }

  private subscribeToServices(): void {
    // WebSocket connection status
    this.subscriptions.push(
      this.webSocketService.connected$.subscribe(connected => {
        this.isConnected = connected;
        if (connected) {
          this.showMessage('Conectado al servidor');
        } else {
          this.showMessage('Desconectado del servidor', 'error');
        }
      })
    );

    // WebSocket messages
    this.subscriptions.push(
      this.webSocketService.messages$.subscribe(message => {
        this.handleWebSocketMessage(message);
      })
    );

    // Audio recording status
    this.subscriptions.push(
      this.audioService.recording$.subscribe(recording => {
        this.isRecording = recording;
      })
    );

    // Transcriptions and translations from service
    this.subscriptions.push(
      this.translationService.transcriptions$.subscribe(transcriptions => {
        this.transcriptions = transcriptions;
      })
    );

    this.subscriptions.push(
      this.translationService.translations$.subscribe(translations => {
        this.translations = translations;
      })
    );
  }

  private handleWebSocketMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'connected':
        this.showMessage('WebSocket conectado');
        break;
        
      case 'transcription':
        if (message.text) {
          this.translationService.addTranscription({
            text: message.text,
            timestamp: message.timestamp || new Date().toISOString()
          });
        }
        break;
        
      case 'translation':
        if (message.originalText && message.translatedText) {
          this.translationService.addTranslation({
            originalText: message.originalText,
            translatedText: message.translatedText,
            sourceLanguage: message.sourceLanguage || 'auto',
            targetLanguage: message.targetLanguage || 'en',
            timestamp: message.timestamp || new Date().toISOString()
          });
        }
        break;
        
      case 'error':
        this.showMessage(`Error: ${message.message}`, 'error');
        break;
        
      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  async toggleRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        await this.stopRecording();
      } else {
        await this.startRecording();
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      this.showMessage('Error al manejar la grabación', 'error');
    }
  }

  private async startRecording(): Promise<void> {
    const hasPermission = await this.audioService.checkMicrophonePermission();
    if (!hasPermission) {
      this.showMessage('Se necesita permiso para acceder al micrófono', 'error');
      return;
    }

    await this.audioService.startRecording();
    this.showMessage('Grabación iniciada');
  }

  private async stopRecording(): Promise<void> {
    try {
      const audioBlob = await this.audioService.stopRecording();
      const arrayBuffer = await this.audioService.convertBlobToArrayBuffer(audioBlob);
      
      // Send audio data via WebSocket for real-time processing
      this.webSocketService.sendAudioChunk(arrayBuffer, this.selectedTargetLanguage);
      
      this.showMessage('Grabación enviada para transcripción');
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.showMessage('Error al detener la grabación', 'error');
    }
  }

  onTargetLanguageChange(): void {
    // If recording, update the target language for real-time translation
    console.log('Target language changed to:', this.selectedTargetLanguage);
  }

  translateText(text: string): void {
    this.webSocketService.requestTranslation(
      text, 
      this.selectedTargetLanguage, 
      this.selectedSourceLanguage
    );
  }

  clearAll(): void {
    this.translationService.clearAll();
    this.showMessage('Historial limpiado');
  }

  private showMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: type === 'error' ? 'error-snackbar' : 'success-snackbar'
    });
  }
}