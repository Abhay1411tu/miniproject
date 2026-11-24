// ─────────────────────────────────────────────────────────────────────────────
// Browser Speech Recognition, Synthesis & MediaRecorder Audio Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MicDiagnosis {
  isPermission: boolean;
  message: string;
  resolution: string;
}

export class SpeechService {
  private static synth: SpeechSynthesis | null = null;
  private static preferredVoice: SpeechSynthesisVoice | null = null;

  static isRecognitionSupported(): boolean {
    if (typeof window === "undefined") return false;
    return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  }

  static isSynthesisSupported(): boolean {
    if (typeof window === "undefined") return false;
    return "speechSynthesis" in window;
  }

  static isMediaRecorderSupported(): boolean {
    if (typeof window === "undefined") return false;
    return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
  }

  static diagnoseMicError(err: any): MicDiagnosis {
    const name = err?.name || err?.error || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "not-allowed") {
      return {
        isPermission: true,
        message: "Microphone permission is blocked by Windows Privacy Settings or your browser.",
        resolution:
          "1. Click the lock/tune icon on the left of http://localhost:3000 in your URL bar and set Microphone to Allow.\n2. In Windows: Open Start > Settings > Privacy & Security > Microphone, and make sure 'Let desktop apps access your microphone' is turned ON.",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        isPermission: false,
        message: "No microphone detected on your system.",
        resolution: "Please plug in earphones/microphone or enable your default recording device in Windows Sound settings.",
      };
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return {
        isPermission: false,
        message: "Microphone is in use by another application.",
        resolution: "Close other applications currently accessing your mic (e.g. Zoom, Teams, Discord, or other tabs).",
      };
    }
    return {
      isPermission: false,
      message: err?.message || "Could not record audio.",
      resolution: "You can type your answer directly in the box below and click Submit Answer.",
    };
  }

  static getVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.isSynthesisSupported()) return Promise.resolve([]);
    this.synth = window.speechSynthesis;

    return new Promise((resolve) => {
      let voices = this.synth!.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      this.synth!.onvoiceschanged = () => {
        voices = this.synth!.getVoices();
        resolve(voices);
      };
    });
  }

  static async initVoice(): Promise<SpeechSynthesisVoice | null> {
    const voices = await this.getVoices();
    const natural = voices.find(
      (v) =>
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Daniel") ||
          v.name.includes("Karen")) &&
        v.lang.startsWith("en"),
    );
    this.preferredVoice = natural || voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
    return this.preferredVoice;
  }

  static speak(
    text: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {},
  ): void {
    if (!this.isSynthesisSupported()) {
      options.onEnd?.();
      return;
    }

    this.stopSpeaking();

    const cleanText = text
      .replace(/[*_#`[\]()]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }

    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        options.onError?.(e);
      }
      options.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  static stopSpeaking(): void {
    if (this.isSynthesisSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }

  static isSpeaking(): boolean {
    return this.isSynthesisSupported() ? window.speechSynthesis.speaking : false;
  }

  /**
   * Captures raw microphone audio using MediaRecorder.
   * Completely independent of Google cloud speech recognition.
   */
  static async startMediaRecording(): Promise<{
    stop: () => Promise<Blob>;
    abort: () => void;
  }> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia not supported in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(250); // collect chunks every 250ms

    return {
      stop: () => {
        return new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            const blob = new Blob(chunks, { type: mimeType });
            resolve(blob);
          };
          try {
            if (recorder.state !== "inactive") recorder.stop();
          } catch {
            stream.getTracks().forEach((track) => track.stop());
            resolve(new Blob(chunks, { type: mimeType }));
          }
        });
      },
      abort: () => {
        try {
          if (recorder.state !== "inactive") recorder.stop();
        } catch {
          // ignore
        }
        stream.getTracks().forEach((track) => track.stop());
      },
    };
  }

  /**
   * Transcribes a recorded audio blob via the server's Groq Whisper model.
   */
  static async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    const ext = audioBlob.type.includes("mp4") ? "mp4" : "webm";
    formData.append("file", audioBlob, `speech.${ext}`);

    const res = await fetch("/api/ai/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Whisper transcription failed");
    }

    const data = await res.json();
    return data.text || "";
  }

  /**
   * Optional real-time speech preview via browser SpeechRecognition.
   */
  static createRecognition(callbacks: {
    onResult: (transcript: string) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  }): { start: () => void; stop: () => void; abort: () => void } {
    if (!this.isRecognitionSupported()) {
      return { start: () => {}, stop: () => {}, abort: () => {} };
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";

    let finalTranscript = "";

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      callbacks.onResult((finalTranscript + interim).trim());
    };

    rec.onerror = (event: any) => {
      callbacks.onError(event.error || "speech-error");
    };

    rec.onend = () => {
      callbacks.onEnd();
    };

    return {
      start: () => {
        try {
          finalTranscript = "";
          rec.start();
        } catch {
          // already started
        }
      },
      stop: () => {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      },
      abort: () => {
        try {
          rec.abort();
        } catch {
          // ignore
        }
      },
    };
  }
}
