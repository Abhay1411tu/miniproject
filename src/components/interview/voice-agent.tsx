"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Send, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Sparkles, HelpCircle } from "lucide-react";
import { SpeechService, type MicDiagnosis } from "./speech-service";
import type { InterviewConfig, InterviewTurn, RespondInterviewResponse } from "@/lib/types-interview";
import { cn } from "@/lib/utils";

interface VoiceAgentProps {
  config: InterviewConfig;
  welcomeMessage: string;
  initialQuestion: string;
  initialExpected: string[];
  totalQuestions: number;
  onFinish: (turns: InterviewTurn[], finalReport: any) => void;
  onExit: () => void;
}

export function VoiceAgent({
  config,
  welcomeMessage,
  initialQuestion,
  initialExpected,
  totalQuestions,
  onFinish,
  onExit,
}: VoiceAgentProps) {
  // Turn state
  const [turns, setTurns] = useState<InterviewTurn[]>([
    {
      questionNumber: 1,
      question: initialQuestion,
      expectedKeyPoints: initialExpected,
    },
  ]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  // Audio / Speech state
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Text / Input state
  const [candidateInput, setCandidateInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [micDiagnosis, setMicDiagnosis] = useState<MicDiagnosis | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<{ stop: () => Promise<Blob>; abort: () => void } | null>(null);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  const currentTurn = turns[currentTurnIndex];

  // Initialize Speech
  useEffect(() => {
    void SpeechService.initVoice();

    // Speak initial welcome & question (no auto-listening to respect user gesture boundaries)
    if (!isMuted) {
      const fullIntro = `${welcomeMessage} Let's begin. Question one: ${initialQuestion}`;
      SpeechService.speak(fullIntro, {
        onStart: () => setIsAiSpeaking(true),
        onEnd: () => setIsAiSpeaking(false),
      });
    }

    return () => {
      SpeechService.stopSpeaking();
      if (recognitionRef.current) recognitionRef.current.abort();
      if (mediaRecorderRef.current) mediaRecorderRef.current.abort();
    };
  }, []);

  const startListening = async () => {
    SpeechService.stopSpeaking();
    setIsAiSpeaking(false);
    setErrorMsg(null);
    setMicDiagnosis(null);

    try {
      // 1. Start pure local hardware capture (MediaRecorder)
      const rec = await SpeechService.startMediaRecording();
      mediaRecorderRef.current = rec;
      setIsListening(true);

      // 2. Start browser SpeechRecognition in parallel if available for live visual typing
      if (SpeechService.isRecognitionSupported()) {
        if (recognitionRef.current) recognitionRef.current.abort();
        recognitionRef.current = SpeechService.createRecognition({
          onResult: (text) => {
            setCandidateInput(text);
          },
          onError: () => {
            // Silently ignore Google Cloud Speech API errors (MediaRecorder handles the audio)
          },
          onEnd: () => {},
        });
        recognitionRef.current.start();
      }
    } catch (err: any) {
      const diag = SpeechService.diagnoseMicError(err);
      setMicDiagnosis(diag);
      setErrorMsg(diag.message);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      try {
        const audioBlob = await recorder.stop();
        // If live SpeechRecognition didn't transcribe or was blocked, transcribe via Groq Whisper!
        if (audioBlob && audioBlob.size > 2000 && !candidateInput.trim()) {
          setIsTranscribing(true);
          const text = await SpeechService.transcribeAudio(audioBlob);
          if (text.trim()) {
            setCandidateInput(text.trim());
          }
          setIsTranscribing(false);
        }
      } catch {
        setIsTranscribing(false);
      }
    }
  };

  const toggleMic = () => {
    if (isListening) {
      void stopListening();
    } else {
      void startListening();
    }
  };

  const replayQuestion = () => {
    if (!currentTurn) return;
    SpeechService.speak(currentTurn.question, {
      onStart: () => setIsAiSpeaking(true),
      onEnd: () => setIsAiSpeaking(false),
    });
  };

  const submitAnswer = async () => {
    let finalAnswer = candidateInput.trim();

    // If currently listening, stop and transcribe first
    if (isListening && mediaRecorderRef.current) {
      setIsListening(false);
      if (recognitionRef.current) recognitionRef.current.stop();
      try {
        const recorder = mediaRecorderRef.current;
        mediaRecorderRef.current = null;
        const audioBlob = await recorder.stop();
        if (!finalAnswer && audioBlob && audioBlob.size > 2000) {
          setIsTranscribing(true);
          const text = await SpeechService.transcribeAudio(audioBlob);
          if (text.trim()) {
            finalAnswer = text.trim();
            setCandidateInput(finalAnswer);
          }
          setIsTranscribing(false);
        }
      } catch {
        setIsTranscribing(false);
      }
    }

    if (!finalAnswer || isSubmitting) {
      if (!finalAnswer) setErrorMsg("Please speak or type your answer before submitting.");
      return;
    }

    SpeechService.stopSpeaking();
    setIsAiSpeaking(false);
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const updatedTurn: InterviewTurn = {
        ...currentTurn,
        candidateAnswer: finalAnswer,
      };

      const updatedHistory = [...turns.slice(0, currentTurnIndex), updatedTurn];

      const res = await fetch("/api/ai/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          config,
          turns: updatedHistory,
          answer: finalAnswer,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to evaluate response");
      }

      const data = (await res.json()) as RespondInterviewResponse;

      // Update current turn with feedback
      updatedTurn.feedback = data.evaluation;
      const historyWithFeedback = [...turns.slice(0, currentTurnIndex), updatedTurn];

      if (data.isFinished && data.finalReport) {
        setTurns(historyWithFeedback);
        setIsSubmitting(false);

        // Speak wrap-up before ending
        if (!isMuted) {
          SpeechService.speak(
            `Thank you for completing the interview. Your overall score is ${data.finalReport.overallScore} out of 100 with a grade of ${data.finalReport.grade}. Reviewing your scorecard now.`,
            {
              onEnd: () => onFinish(historyWithFeedback, data.finalReport),
            },
          );
        } else {
          onFinish(historyWithFeedback, data.finalReport);
        }
        return;
      }

      // Next question turn
      if (data.nextQuestion) {
        const nextTurn: InterviewTurn = {
          questionNumber: currentTurnIndex + 2,
          question: data.nextQuestion,
          expectedKeyPoints: data.expectedKeyPoints || [],
        };

        const nextTurns = [...historyWithFeedback, nextTurn];
        setTurns(nextTurns);
        setCurrentTurnIndex(currentTurnIndex + 1);
        setCandidateInput("");
        setIsSubmitting(false);

        // Speak evaluation reaction + next question
        if (!isMuted) {
          const speechScript = `${data.evaluation.spokenFeedback} Now, question ${currentTurnIndex + 2}: ${data.nextQuestion}`;
          SpeechService.speak(speechScript, {
            onStart: () => setIsAiSpeaking(true),
            onEnd: () => setIsAiSpeaking(false),
          });
        }
      }
    } catch {
      setErrorMsg("Error evaluating answer. Please try submitting again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-500/10 text-signal-600 font-bold">
            Q{currentTurnIndex + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                {config.roundType} Round
              </span>
              <span className="text-xs text-line-strong">•</span>
              <span className="text-xs text-ink-2">
                Question {currentTurnIndex + 1} of {totalQuestions}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-ink sm:text-base">
              {config.role} {config.company ? `@ ${config.company}` : ""}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute button */}
          <button
            onClick={() => {
              if (!isMuted) SpeechService.stopSpeaking();
              setIsMuted(!isMuted);
            }}
            title={isMuted ? "Unmute AI voice" : "Mute AI voice"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
              isMuted ? "border-danger/30 bg-danger/10 text-danger" : "border-line bg-base text-ink-2 hover:bg-elevated",
            )}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Replay voice */}
          <button
            onClick={replayQuestion}
            disabled={isAiSpeaking || isSubmitting}
            title="Replay Question Audio"
            className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-base px-3 text-xs font-medium text-ink-2 hover:bg-elevated disabled:opacity-50"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Replay</span>
          </button>

          {/* Exit */}
          <button
            onClick={onExit}
            className="flex h-9 items-center rounded-full border border-line bg-base px-3 text-xs font-medium text-ink-3 hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
          >
            End Early
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-surface via-base to-surface p-6 text-center shadow-lg md:p-10">
        {/* Pulsing AI Visualizer Orb */}
        <div className="relative mb-6 flex h-36 w-36 items-center justify-center">
          {/* Animated concentric rings */}
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-700",
              isAiSpeaking && "scale-125 bg-signal-500/20 animate-ping opacity-60",
              isListening && "scale-110 bg-rose-500/20 animate-pulse opacity-70",
              !isAiSpeaking && !isListening && "bg-line/40 opacity-30",
            )}
          />
          <div
            className={cn(
              "absolute inset-2 rounded-full transition-all duration-500",
              isAiSpeaking && "bg-signal-500/30 scale-110 animate-pulse",
              isListening && "bg-rose-500/30 scale-105 animate-pulse",
              !isAiSpeaking && !isListening && "bg-line/60",
            )}
          />

          {/* Center core sphere */}
          <div
            className={cn(
              "relative flex h-24 w-24 items-center justify-center rounded-full shadow-inner transition-all duration-500",
              isAiSpeaking && "bg-gradient-to-tr from-signal-600 to-emerald-400 text-white shadow-signal-500/50 shadow-lg scale-105",
              isListening && "bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-rose-500/50 shadow-lg scale-105",
              (isSubmitting || isTranscribing) && "bg-gradient-to-tr from-amber-500 to-indigo-600 text-white animate-spin",
              !isAiSpeaking && !isListening && !isSubmitting && !isTranscribing && "bg-elevated border border-line-strong text-ink-3",
            )}
          >
            {isSubmitting || isTranscribing ? (
              <Sparkles size={32} className="animate-spin" />
            ) : isListening ? (
              <Mic size={32} className="animate-bounce" />
            ) : (
              <Volume2 size={32} className={cn(isAiSpeaking && "animate-pulse")} />
            )}
          </div>
        </div>

        {/* Live Audio Status Pill */}
        <div className="mb-4">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors",
              isAiSpeaking && "bg-signal-500/10 text-signal-600 border border-signal-500/20",
              isListening && "bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse",
              isTranscribing && "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
              isSubmitting && "bg-amber-500/10 text-amber-600 border border-amber-500/20",
              !isAiSpeaking && !isListening && !isSubmitting && !isTranscribing && "bg-elevated text-ink-3 border border-line",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isAiSpeaking && "bg-signal-500 animate-ping",
                isListening && "bg-rose-500 animate-pulse",
                (isSubmitting || isTranscribing) && "bg-amber-500",
                !isAiSpeaking && !isListening && !isSubmitting && !isTranscribing && "bg-ink-3",
              )}
            />
            {isTranscribing
              ? "Transcribing your audio with AI Whisper..."
              : isSubmitting
                ? "AI is evaluating your response..."
                : isAiSpeaking
                  ? "Interviewer is speaking..."
                  : isListening
                    ? "Recording your voice... Click 'Stop Recording' or 'Submit Answer' when done."
                    : "Ready. Click 'Speak Answer' to speak or type directly below."}
          </span>
        </div>

        {/* The Current Interview Question */}
        <div className="max-w-2xl px-2">
          <p className="text-lg font-medium leading-relaxed text-ink md:text-xl">
            "{currentTurn.question}"
          </p>
        </div>

        {/* Expected key topics hint */}
        {currentTurn.expectedKeyPoints && currentTurn.expectedKeyPoints.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[11px] font-medium text-ink-3">Key Focus:</span>
            {currentTurn.expectedKeyPoints.map((pt, i) => (
              <span
                key={i}
                className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] text-ink-2"
              >
                {pt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Speech Input & Transcript Box */}
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold text-ink-2">
            Your Spoken Answer / Transcript:
          </label>
          <div className="flex items-center gap-2">
            {isListening && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-rose-600">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
                Recording Audio...
              </span>
            )}
            <span className="text-[11px] text-ink-3">
              {candidateInput.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
        </div>

        {/* Textarea for live transcript & manual editing */}
        <textarea
          rows={4}
          value={candidateInput}
          onChange={(e) => setCandidateInput(e.target.value)}
          placeholder={
            isListening
              ? "Recording audio... Speak your answer. Your speech will be transcribed automatically when you stop or submit."
              : "Click 'Speak Answer' to record, or type your response here directly."
          }
          className="w-full resize-none rounded-2xl border border-line bg-base p-4 text-sm text-ink placeholder:text-ink-3 focus:border-signal-500 focus:outline-none focus:ring-1 focus:ring-signal-500"
        />

        {/* Mic Diagnosis Help Banner */}
        {micDiagnosis && (
          <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold mb-1 text-amber-900 dark:text-amber-100">
              <AlertCircle size={16} className="text-amber-600" />
              <span>{micDiagnosis.message}</span>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-surface/90 p-3 space-y-1.5 text-[11.5px] text-ink-2 mb-3 shadow-xs whitespace-pre-line">
              <div className="font-semibold text-ink">Resolution Steps:</div>
              {micDiagnosis.resolution}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={startListening}
                className="rounded-full bg-amber-600 px-4 py-1.5 font-semibold text-white hover:bg-amber-700 transition-colors shadow-xs"
              >
                Retry Microphone
              </button>
              <span className="text-[11px] text-ink-3">
                Or type your answer in the box above and click "Submit Answer".
              </span>
            </div>
          </div>
        )}

        {errorMsg && !micDiagnosis && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Mic Toggle Button */}
            <button
              onClick={toggleMic}
              disabled={isSubmitting || isTranscribing}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition-all shadow-sm",
                isListening
                  ? "bg-rose-600 text-white hover:bg-rose-700 animate-pulse"
                  : "border border-line bg-base text-ink hover:border-signal-500 hover:text-signal-600",
              )}
            >
              {isListening ? (
                <>
                  <MicOff size={16} />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic size={16} />
                  <span>Speak Answer</span>
                </>
              )}
            </button>

            {candidateInput && (
              <button
                onClick={() => setCandidateInput("")}
                className="text-xs text-ink-3 hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>

          {/* Submit Answer Button */}
          <button
            onClick={submitAnswer}
            disabled={(!candidateInput.trim() && !isListening) || isSubmitting || isTranscribing}
            className="flex items-center gap-2 rounded-full bg-signal-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-signal-500 hover:shadow-lg disabled:opacity-40"
          >
            {isSubmitting || isTranscribing ? (
              <>
                <Sparkles size={15} className="animate-spin" />
                <span>{isTranscribing ? "Transcribing Audio..." : "Evaluating Response..."}</span>
              </>
            ) : (
              <>
                <span>Submit Answer</span>
                <Send size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Accordion: Previous Turn Feedback */}
      {currentTurnIndex > 0 && turns[currentTurnIndex - 1]?.feedback && (
        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-between p-4 text-left text-xs font-semibold text-ink-2 hover:bg-elevated transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-signal-600" />
              <span>Feedback for Question #{currentTurnIndex} (Score: {turns[currentTurnIndex - 1].feedback?.score}/10)</span>
            </div>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showHistory && (
            <div className="border-t border-line bg-base/50 p-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-ink">Spoken Feedback: </span>
                <span className="text-ink-2">{turns[currentTurnIndex - 1].feedback?.spokenFeedback}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-signal-500/20 bg-signal-500/5 p-3">
                  <div className="font-semibold text-signal-700 mb-1">Key Strengths:</div>
                  <ul className="list-disc pl-4 space-y-1 text-ink-2">
                    {turns[currentTurnIndex - 1].feedback?.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="font-semibold text-amber-700 mb-1">Room for Improvement:</div>
                  <ul className="list-disc pl-4 space-y-1 text-ink-2">
                    {turns[currentTurnIndex - 1].feedback?.improvements.map((im, i) => (
                      <li key={i}>{im}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-surface p-3">
                <div className="font-semibold text-ink mb-1">Exemplar Answer Snippet:</div>
                <p className="text-ink-2 italic">{turns[currentTurnIndex - 1].feedback?.modelAnswerSnippet}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
