import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Language {
  code: string;
  name: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: string;
}

export interface TranscriptionResult {
  text: string;
  timestamp: string;
  confidence?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private transcriptionsSubject = new BehaviorSubject<TranscriptionResult[]>([]);
  private translationsSubject = new BehaviorSubject<TranslationResult[]>([]);

  public transcriptions$ = this.transcriptionsSubject.asObservable();
  public translations$ = this.translationsSubject.asObservable();

  constructor(private http: HttpClient) { }

  getAvailableLanguages(): Observable<Language[]> {
    return this.http.get<Language[]>(`${environment.apiUrl}/languages`);
  }

  translateText(text: string, targetLanguage: string, sourceLanguage: string = 'auto'): Observable<TranslationResult> {
    return this.http.post<TranslationResult>(`${environment.apiUrl}/translate`, {
      text,
      targetLanguage,
      sourceLanguage
    });
  }

  transcribeAudio(audioFile: File): Observable<{ transcription: string; timestamp: string }> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    return this.http.post<{ transcription: string; timestamp: string }>(
      `${environment.apiUrl}/transcribe`,
      formData
    );
  }

  getOllamaModels(): Observable<{ models: any[] }> {
    return this.http.get<{ models: any[] }>(`${environment.apiUrl}/models`);
  }

  addTranscription(transcription: TranscriptionResult): void {
    const current = this.transcriptionsSubject.value;
    this.transcriptionsSubject.next([...current, transcription]);
  }

  addTranslation(translation: TranslationResult): void {
    const current = this.translationsSubject.value;
    this.translationsSubject.next([...current, translation]);
  }

  clearTranscriptions(): void {
    this.transcriptionsSubject.next([]);
  }

  clearTranslations(): void {
    this.translationsSubject.next([]);
  }

  clearAll(): void {
    this.clearTranscriptions();
    this.clearTranslations();
  }

  getDefaultLanguages(): Language[] {
    return [
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
  }
}