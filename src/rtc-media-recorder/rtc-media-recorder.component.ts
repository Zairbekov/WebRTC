import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import {Http} from '@angular/http';
import { Observable, Subscription } from 'rxjs/Rx';

@Component({
  selector: 'ng-rtc-media-recorder',
  templateUrl: './rtc-media-recorder.component.html',
  styleUrls: ['./rtc-media-recorder.component.css']
})
export class RtcMediaRecorderComponent implements OnInit {
  count = 0;
  @ViewChild('recVideo') recVideo: any;

  @Input() constrains = {video: true, audio: true};
  @Input() fileName = 'my_recording';
  @Input() showVideoPlayer = true;

  @Output() startRecording = new EventEmitter();
  @Output() downloadRecording = new EventEmitter();
  @Output() fetchRecording = new EventEmitter();

  format = 'video/webm;codecs=vp8';
  _navigator = <any> navigator;
  localStream;
  video;
  mediaRecorder;
  recordedBlobs = null;
  hideStopBtn = true;
  ticks = 0;
  minutesDisplay = 1;
  secondsDisplay = 59;
  skip = 0;
  sDisplay = 59;
  str = '';
  butn = true;
  public vacancies: any;
  list: Array<String> = ['1. Working?', '2. How did you hear about the position?', '3. What do you know about the company?',
    '4. Can you tell me a little about yourself?', '5. Can you tell me a little about yourself?'];
  sub: Subscription;
  constructor(private http: Http) {}

  ngOnInit() {
    this.http.get('http://142.93.241.248:82/vacancy/all')
             .subscribe(res => this.vacancies = res.json());
    console.log(this.vacancies);
    console.log('creating MediaRecorder for mimeType: ' + this.format);
    if (this.recVideo) {
      this.video = this.recVideo.nativeElement;
    }

    this._navigator.getUserMedia = ( this._navigator.getUserMedia || this._navigator.webkitGetUserMedia
    || this._navigator.mozGetUserMedia || this._navigator.msGetUserMedia );
  }

  private _initStream(navigator) {
    return navigator.mediaDevices.getUserMedia({video: true, audio: true})
      .then((stream) => {
        this.localStream = stream;
        return window.URL ? window.URL.createObjectURL(stream) : stream;
      })
      .catch(err => err);
  }
  private _stopStream() {
    const tracks = this.localStream.getTracks();
    tracks.forEach((track) => {
      track.stop();
    });
  }

  public start() {
    this.butn = false;
    this.startTimer();
    console.log('start recording');
    this.recordedBlobs = [];
    this._initStream(this._navigator)
      .then((stream) => {
        if (!window['MediaRecorder'].isTypeSupported(this.format)) {
          console.log(this.format + ' is not Supported');
          return;
        }
        try {
          this.mediaRecorder = new window['MediaRecorder'](this.localStream, {mimeType: 'video/webm;codecs=vp8'});
          if (this.video) {
            this.video.src = stream;
          }
          this.startRecording.emit(stream);
        } catch (e) {
          console.error('Exception while creating MediaRecorder: ' + e);
          return;
        }
        console.log('Created MediaRecorder', this.mediaRecorder, 'with options', this.format);
        this.hideStopBtn = false;
        this.mediaRecorder.ondataavailable =
          (event) => {
            if (event.data && event.data.size > 0) {
              this.recordedBlobs.push(event.data);
            }};
        this.mediaRecorder.start(10); // collect 10ms of data
      });
  }

  public stop() {
    console.log('stop recording');
    this.hideStopBtn = true;

    this._stopStream();
    this.mediaRecorder.stop();
    this.fetchRecording.emit(this.recordedBlobs);
    if (this.video) {
      this.video.controls = true;
    }
    this.sub.unsubscribe();
    this.download();
  }

  public play() {
    if (!this.video) {
      return;
    }
    console.log('play recorded stream');
    const superBuffer = new Blob(this.recordedBlobs, {type: this.format});
    this.video.src = window.URL.createObjectURL(superBuffer);
  }

  public download() {
    console.log('download recorded stream');
    const blob = new Blob(this.recordedBlobs, {type: this.format});
    console.log(this.recordedBlobs);
    const formData = new FormData();
    formData.append('file', blob);
    this.http.post('http://localhost:8085/uploadFile', formData).subscribe((r) => {
      console.error('Response ' + JSON.stringify(r.json()));
    }, (error) => {
      console.error('Response ' + error.json());
    });
  }
  private startTimer() {
    this.secondsDisplay = 0;
    const timer = Observable.timer(1, 1000);
    this.sub = timer.subscribe(
      t => {
        this.ticks = t;
        if (this.count === 4) {
          this.butn = false;
        }
        if (this.count === 5) {
          this.sub.unsubscribe();
          this.stop();
          this.minutesDisplay = 0;
          this.secondsDisplay = 0;
        }
        if (t === 119 || this.skip === 1) {
          this.sub.unsubscribe();
          this.str = '';
          this.minutesDisplay = 1;
          this.sDisplay = 59;
          this.count = this.count + 1;
          this.startTimer();
          this.skip = 0;
        }
        if (this.count === 4 && t === 119) {
          this.stop();
        }
        if (t === 50 || t === 109) {
          this.str = '0';
        }
        if (t === 59) {
          this.str = '';
          this.minutesDisplay = 0;
          this.sDisplay = 118;
        }
        this.secondsDisplay = this.sDisplay - this.ticks;
      }
    );
  }
  private next() {
    this.skip = 1;
    console.log('qwe');
  }
    public downloadVideo() {
    console.log('download recorded stream');
    const timestamp = new Date().getUTCMilliseconds();
    const blob = new Blob(this.recordedBlobs, {type: this.format});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = timestamp + '__' + this.fileName + '.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.downloadRecording.emit();
    }, 100);
  }
}
