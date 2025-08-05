import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  
  private recordingSubject = new BehaviorSubject<boolean>(false);
  private audioLevelSubject = new BehaviorSubject<number>(0);

  public recording$ = this.recordingSubject.asObservable();
  public audioLevel$ = this.audioLevelSubject.asObservable();

  constructor() { }

  async startRecording(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.recordingSubject.next(true);
        this.startAudioLevelMonitoring();
      };

      this.mediaRecorder.onstop = () => {
        this.recordingSubject.next(false);
        this.stopAudioLevelMonitoring();
      };

      this.mediaRecorder.start(1000); // Collect data every second
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private startAudioLevelMonitoring(): void {
    if (!this.audioStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(this.audioStream);
    
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    microphone.connect(analyser);

    const updateAudioLevel = () => {
      if (this.recordingSubject.value) {
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        this.audioLevelSubject.next(average);
        
        requestAnimationFrame(updateAudioLevel);
      }
    };

    updateAudioLevel();
  }

  private stopAudioLevelMonitoring(): void {
    this.audioLevelSubject.next(0);
  }

  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  async convertBlobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return blob.arrayBuffer();
  }

  isRecording(): boolean {
    return this.recordingSubject.value;
  }

  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state === 'granted';
    } catch {
      // Fallback: try to access microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch {
        return false;
      }
    }
  }
}