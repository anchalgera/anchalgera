export type SessionStartResponse = {
  sessionId: string;
  expiresAt: string;
  initialPrompt?: PromptEvent;
};

export type PromptEvent = {
  id: string;
  type: "prompt" | "response";
  content: string;
  audioUrl?: string;
  createdAt: string;
};

export type SessionSummary = {
  summary: string;
  tips: string[];
  generatedAt: string;
};

export type JournalEntryMeta = {
  id: string;
  sessionStartedAt: string;
  summary?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function startSession(): Promise<SessionStartResponse> {
  return apiFetch<SessionStartResponse>("/sessions", {
    method: "POST",
  });
}

export async function completeSession(sessionId: string): Promise<SessionSummary> {
  return apiFetch<SessionSummary>(`/sessions/${sessionId}/complete`, {
    method: "POST",
  });
}

export async function fetchPersistedSummary(sessionId: string): Promise<SessionSummary> {
  return apiFetch<SessionSummary>(`/sessions/${sessionId}/summary`, {
    method: "GET",
  });
}

export async function fetchJournalHistory(): Promise<JournalEntryMeta[]> {
  return apiFetch<JournalEntryMeta[]>("/journals", {
    method: "GET",
  });
}

export async function fetchJournalEntry(entryId: string): Promise<SessionSummary> {
  return apiFetch<SessionSummary>(`/journals/${entryId}`, {
    method: "GET",
  });
}

export async function uploadAudioChunk(sessionId: string, chunk: Blob, sequence: number) {
  const formData = new FormData();
  formData.append("chunk", chunk, `audio-${sequence}.webm`);
  formData.append("sequence", String(sequence));

  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/audio`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload audio chunk: ${response.status}`);
  }
}

export function createPromptEventSource(sessionId: string) {
  const eventSource = new EventSource(`${API_BASE_URL}/sessions/${sessionId}/events`);
  return eventSource;
}
