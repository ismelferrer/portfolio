import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WebSocketMessage {
  type: string;
  data?: any;
  text?: string;
  originalText?: string;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  timestamp?: string;
  message?: string;
  models?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<WebSocketMessage>();
  private connectionSubject = new BehaviorSubject<boolean>(false);

  public messages$ = this.messageSubject.asObservable();
  public connected$ = this.connectionSubject.asObservable();

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      this.socket = new WebSocket(environment.wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.connectionSubject.next(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.messageSubject.next(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.connectionSubject.next(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionSubject.next(false);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.connectionSubject.next(false);
    }
  }

  public sendMessage(message: WebSocketMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  public sendAudioChunk(audioData: ArrayBuffer, targetLanguage: string = 'en'): void {
    this.sendMessage({
      type: 'audio-chunk',
      data: Array.from(new Uint8Array(audioData)),
      targetLanguage
    });
  }

  public requestTranslation(text: string, targetLanguage: string = 'en', sourceLanguage: string = 'auto'): void {
    this.sendMessage({
      type: 'translate',
      text,
      targetLanguage,
      sourceLanguage
    });
  }

  public getAvailableModels(): void {
    this.sendMessage({
      type: 'get-models'
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}