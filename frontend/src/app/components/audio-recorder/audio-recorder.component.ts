import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { AudioService } from '../../services/audio.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-audio-recorder',
  templateUrl: './audio-recorder.component.html',
  styleUrls: ['./audio-recorder.component.scss']
})
export class AudioRecorderComponent implements OnInit, OnDestroy {
  @Input() isConnected = false;
  @Input() isRecording = false;
  @Output() toggleRecording = new EventEmitter<void>();

  audioLevel = 0;
  recordingTime = 0;
  private audioLevelSubscription?: Subscription;
  private recordingTimer?: any;

  constructor(private audioService: AudioService) {}

  ngOnInit(): void {
    this.subscribeToAudioLevel();
  }

  ngOnDestroy(): void {
    if (this.audioLevelSubscription) {
      this.audioLevelSubscription.unsubscribe();
    }
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
  }

  private subscribeToAudioLevel(): void {
    this.audioLevelSubscription = this.audioService.audioLevel$.subscribe(level => {
      this.audioLevel = level;
    });

    this.audioService.recording$.subscribe(recording => {
      if (recording && !this.recordingTimer) {
        this.startTimer();
      } else if (!recording && this.recordingTimer) {
        this.stopTimer();
      }
    });
  }

  private startTimer(): void {
    this.recordingTime = 0;
    this.recordingTimer = setInterval(() => {
      this.recordingTime++;
    }, 1000);
  }

  private stopTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.recordingTime = 0;
  }

  onToggleRecording(): void {
    this.toggleRecording.emit();
  }

  getRecordingTimeFormatted(): string {
    const minutes = Math.floor(this.recordingTime / 60);
    const seconds = this.recordingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getAudioBars(): number[] {
    const numBars = 20;
    const bars = [];
    for (let i = 0; i < numBars; i++) {
      const height = Math.random() * this.audioLevel * 2;
      bars.push(height);
    }
    return bars;
  }
}