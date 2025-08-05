import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import { AppComponent } from './app.component';
import { TranscriptorComponent } from './components/transcriptor/transcriptor.component';
import { AudioRecorderComponent } from './components/audio-recorder/audio-recorder.component';
import { TranslationDisplayComponent } from './components/translation-display/translation-display.component';

import { WebSocketService } from './services/websocket.service';
import { AudioService } from './services/audio.service';
import { TranslationService } from './services/translation.service';

@NgModule({
  declarations: [
    AppComponent,
    TranscriptorComponent,
    AudioRecorderComponent,
    TranslationDisplayComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatChipsModule
  ],
  providers: [
    WebSocketService,
    AudioService,
    TranslationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }