import { Component, Input, OnInit } from '@angular/core';
import { TranslationResult } from '../../services/translation.service';

@Component({
  selector: 'app-translation-display',
  templateUrl: './translation-display.component.html',
  styleUrls: ['./translation-display.component.scss']
})
export class TranslationDisplayComponent implements OnInit {
  @Input() translations: TranslationResult[] = [];

  constructor() { }

  ngOnInit(): void {
  }

  getLanguageName(code: string): string {
    const languageNames: { [key: string]: string } = {
      'es': 'Español',
      'en': 'English',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文',
      'auto': 'Automático'
    };
    return languageNames[code] || code.toUpperCase();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Success feedback could be added here
      console.log('Text copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const translationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - translationTime.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'hace unos segundos';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `hace ${days} día${days > 1 ? 's' : ''}`;
    }
  }
}