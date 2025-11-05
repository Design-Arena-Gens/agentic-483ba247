'use client';

import { useEffect, useMemo, useState } from 'react';
import { parseCommand, SAMPLE_COMMANDS, type ParsedAction } from '@/lib/commandParser';
import { useSpeechRecognition } from './useSpeechRecognition';

type CommandLog = {
  id: string;
  raw: string;
  action: ParsedAction;
  timestamp: string;
};

const createTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const useCommandHistory = () => {
  const [commands, setCommands] = useState<CommandLog[]>([]);

  const push = (raw: string, action: ParsedAction) => {
    setCommands((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        raw,
        action,
        timestamp: createTimestamp()
      },
      ...prev
    ]);
  };

  return {
    commands,
    push
  };
};

const chipColors: Record<ParsedAction['intent'], string> = {
  call: '#2563eb',
  message: '#14b8a6',
  'open-app': '#facc15',
  'toggle-setting': '#8b5cf6',
  'set-reminder': '#f97316',
  navigate: '#ef4444',
  'play-media': '#a855f7',
  volume: '#22d3ee',
  unknown: '#9ca3af'
};

const intentLabels: Record<ParsedAction['intent'], string> = {
  call: 'Call',
  message: 'Message',
  'open-app': 'Open App',
  'toggle-setting': 'Toggle',
  'set-reminder': 'Reminder',
  navigate: 'Navigate',
  'play-media': 'Media',
  volume: 'Volume',
  unknown: 'Unclassified'
};

const StatusBadge = ({ intent }: { intent: ParsedAction['intent'] }) => (
  <span
    style={{
      backgroundColor: `${chipColors[intent]}22`,
      color: '#f5f5f5',
      border: `1px solid ${chipColors[intent]}`,
      borderRadius: '999px',
      padding: '0.25rem 0.75rem',
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }}
  >
    {intentLabels[intent]}
  </span>
);

export const VoiceAssistant = () => {
  const [manualInput, setManualInput] = useState('');
  const [spokenResponse, setSpokenResponse] = useState<string | null>(null);
  const { commands, push } = useCommandHistory();
  const [synthEnabled, setSynthEnabled] = useState(false);

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpokenResponse(text);
  };

  const handleAction = (raw: string) => {
    const action = parseCommand(raw);
    push(raw, action);
    if (synthEnabled) {
      const response = `${intentLabels[action.intent]} request: ${action.summary}. ${action.steps.join(' ')}`;
      speak(response);
    }
  };

  const { start, stop, transcript, isListening, isSupported, error } = useSpeechRecognition(handleAction);

  useEffect(() => {
    if (!isSupported && typeof window !== 'undefined') {
      setSynthEnabled('speechSynthesis' in window);
    }
  }, [isSupported]);

  const recommendations = useMemo(
    () =>
      SAMPLE_COMMANDS.map((cmd) => ({
        value: cmd,
        id: cmd.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      })),
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasSynth = 'speechSynthesis' in window;
    setSynthEnabled(hasSynth);
  }, []);

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    handleAction(manualInput.trim());
    setManualInput('');
  };

  const toggleListening = () => {
    if (!isSupported) return;
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  return (
    <main
      style={{
        maxWidth: '960px',
        width: '100%',
        background: 'rgba(15, 15, 20, 0.8)',
        borderRadius: '24px',
        padding: '2.5rem',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: '0 30px 120px rgba(14, 116, 144, 0.25)'
      }}
    >
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ fontSize: '2.75rem', fontWeight: 700, lineHeight: 1.1 }}>Phone Control Copilot</h1>
            {isSupported ? (
              <button
                type="button"
                onClick={toggleListening}
                style={{
                  borderRadius: '999px',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  background: isListening
                    ? 'linear-gradient(135deg, #ef4444, #f97316)'
                    : 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#f5f5f5',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: isListening
                    ? '0 12px 24px rgba(239, 68, 68, 0.35)'
                    : '0 12px 24px rgba(59, 130, 246, 0.35)'
                }}
              >
                {isListening ? 'Stop Listening' : 'Start Voice' }
              </button>
            ) : (
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Voice capture unavailable in this browser.</span>
            )}
          </div>
          <p style={{ color: '#cbd5f5', maxWidth: '640px', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Speak or type commands to orchestrate phone actions hands-free. The assistant understands natural
            language, classifies your intent, and explains how to complete the task on your device.
          </p>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: '1.5rem'
          }}
        >
          <article
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              background: 'rgba(23, 23, 35, 0.75)'
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Real-time Transcript</h2>
            <div
              style={{
                minHeight: '96px',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                border: '1px solid rgba(148, 163, 184, 0.12)',
                background: 'rgba(15, 23, 42, 0.65)',
                color: transcript ? '#f1f5f9' : '#94a3b8',
                fontSize: '1rem'
              }}
            >
              {transcript || 'Your words will appear here as you speak.'}
            </div>
            {error && (
              <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>Voice engine error: {error}</p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="text"
                value={manualInput}
                placeholder="Type a command instead"
                onChange={(event) => setManualInput(event.target.value)}
                style={{
                  flex: 1,
                  borderRadius: '999px',
                  background: 'rgba(30, 41, 59, 0.65)',
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                  padding: '0.85rem 1.25rem',
                  color: '#e2e8f0',
                  fontSize: '1rem'
                }}
              />
              <button
                type="button"
                onClick={handleManualSubmit}
                style={{
                  borderRadius: '999px',
                  padding: '0.85rem 1.75rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #22d3ee)',
                  color: '#0f172a',
                  fontWeight: 700,
                  letterSpacing: '0.03em'
                }}
              >
                Process
              </button>
            </div>
          </article>

          <article
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              background: 'rgba(17, 24, 39, 0.65)'
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Suggested Commands</h2>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.6rem'
              }}
            >
              {recommendations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    handleAction(item.value);
                  }}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                    background: 'rgba(30, 41, 59, 0.65)',
                    color: '#e0f2fe',
                    padding: '0.65rem 1rem',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {item.value}
                </button>
              ))}
            </div>
            {synthEnabled && spokenResponse && (
              <div
                style={{
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  padding: '0.75rem 1rem',
                  color: '#bfdbfe',
                  fontSize: '0.9rem'
                }}
              >
                Narrating response: {spokenResponse}
              </div>
            )}
          </article>
        </section>

        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Action Center</h2>
            <span style={{ fontSize: '0.9rem', color: '#cbd5f5' }}>
              {commands.length ? `${commands.length} recent` : 'Awaiting your first command'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              maxHeight: '320px',
              overflowY: 'auto'
            }}
          >
            {commands.length === 0 && (
              <div
                style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px dashed rgba(148, 163, 184, 0.25)',
                  color: '#94a3b8',
                  fontSize: '0.95rem'
                }}
              >
                Commands you issue will be analyzed here with clear step-by-step guidance for real devices.
              </div>
            )}
            {commands.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <StatusBadge intent={entry.action.intent} />
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{entry.timestamp}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <p style={{ color: '#e2e8f0', fontSize: '1.05rem', fontWeight: 600 }}>{entry.action.summary}</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>You said: {entry.raw}</p>
                  <p style={{ color: '#cbd5f5', fontSize: '0.85rem' }}>Confidence: {entry.action.confidence}</p>
                </div>
                <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingInlineStart: '1.2rem' }}>
                  {entry.action.steps.map((step) => (
                    <li key={`${entry.id}-${step}`} style={{ color: '#f1f5f9', fontSize: '0.95rem' }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
};
