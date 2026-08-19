import {
  COAISynthData,
  COAITeamData,
  COAIMessageData,
  COAITeamSynthReference,
  PaginationOptions,
  COAISynth,
  COAITeam,
  COAIMessage,
  Thread,
  COAITeamSynth,
} from '../../types';
import { apiFetch } from '../api/client';

export interface IDataService {
  isAuthenticated(): boolean;
  fetchSynths(): Promise<COAISynth[]>;
  getSynth(id: string): Promise<COAISynth | null>;
  createSynth(data: COAISynthData): Promise<COAISynth>;
  updateSynth(id: string, updates: Partial<COAISynthData>): Promise<COAISynth>;
  deleteSynth(id: string): Promise<void>;
  fetchTeams(): Promise<COAITeam[]>;
  getTeam(id: string): Promise<COAITeam | null>;
  createTeam(data: COAITeamData): Promise<COAITeam>;
  updateTeam(id: string, updates: Partial<COAITeamData>): Promise<COAITeam>;
  deleteTeam(id: string): Promise<void>;
  addSynthToTeam(teamId: string, synthId: string, reference: COAITeamSynthReference): Promise<void>;
  removeSynthFromTeam(teamId: string, synthId: string): Promise<void>;
  getTeamSynths(teamId: string): Promise<{ synthId: string; reference: COAITeamSynthReference }[]>;
  updateTeamSynthReference(teamId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void>;
  fetchThreads(): Promise<Thread[]>;
  getThread(id: string): Promise<Thread | null>;
  createThread(title: string): Promise<Thread>;
  updateThread(id: string, updates: Partial<Thread>): Promise<Thread>;
  deleteThread(id: string): Promise<void>;
  fetchMessages(threadId: string, options?: PaginationOptions): Promise<COAIMessage[]>;
  getMessage(id: string): Promise<COAIMessage | null>;
  createMessage(threadId: string, messageData: COAIMessageData): Promise<COAIMessage>;
  updateMessage(id: string, updates: Partial<COAIMessageData>): Promise<COAIMessage>;
  deleteMessage(id: string): Promise<void>;
  addSynthToThread(threadId: string, synthId: string, reference: COAITeamSynthReference): Promise<void>;
  removeSynthFromThread(threadId: string, synthId: string): Promise<void>;
  getThreadSynths(threadId: string): Promise<COAITeamSynth[]>;
  updateThreadSynthReference(threadId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void>;
  getActiveThreadId(): Promise<string | null>;
  setActiveThreadId(threadId: string | null): Promise<void>;
}

function toThread(row: Record<string, unknown>): Thread {
  const data = (row.thread_data as { title?: string; isActive?: boolean } | undefined) || {};
  return {
    id: String(row.id),
    title: (row.title as string) || data.title || 'Untitled Thread',
    isActive: row.isActive !== undefined ? Boolean(row.isActive) : data.isActive !== false,
    createdAt: new Date(String(row.createdAt || row.created_at)),
    updatedAt: new Date(String(row.updatedAt || row.updated_at)),
  };
}

export class HttpDataService implements IDataService {
  isAuthenticated(): boolean {
    return true;
  }

  async fetchSynths(): Promise<COAISynth[]> {
    return apiFetch<COAISynth[]>('/synths');
  }
  async getSynth(id: string): Promise<COAISynth | null> {
    try {
      return await apiFetch<COAISynth>(`/synths/${id}`);
    } catch {
      return null;
    }
  }
  async createSynth(data: COAISynthData): Promise<COAISynth> {
    return apiFetch<COAISynth>('/synths', { method: 'POST', body: JSON.stringify({ synth_data: data }) });
  }
  async updateSynth(id: string, updates: Partial<COAISynthData>): Promise<COAISynth> {
    return apiFetch<COAISynth>(`/synths/${id}`, { method: 'PATCH', body: JSON.stringify({ synth_data: updates }) });
  }
  async deleteSynth(id: string): Promise<void> {
    await apiFetch(`/synths/${id}`, { method: 'DELETE' });
  }

  async fetchTeams(): Promise<COAITeam[]> {
    return apiFetch<COAITeam[]>('/teams');
  }
  async getTeam(id: string): Promise<COAITeam | null> {
    try {
      return await apiFetch<COAITeam>(`/teams/${id}`);
    } catch {
      return null;
    }
  }
  async createTeam(data: COAITeamData): Promise<COAITeam> {
    return apiFetch<COAITeam>('/teams', { method: 'POST', body: JSON.stringify({ team_data: data }) });
  }
  async updateTeam(id: string, updates: Partial<COAITeamData>): Promise<COAITeam> {
    return apiFetch<COAITeam>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify({ team_data: updates }) });
  }
  async deleteTeam(id: string): Promise<void> {
    await apiFetch(`/teams/${id}`, { method: 'DELETE' });
  }
  async addSynthToTeam(teamId: string, synthId: string, reference: COAITeamSynthReference): Promise<void> {
    await apiFetch(`/teams/${teamId}/synths`, {
      method: 'POST',
      body: JSON.stringify({ synth_id: synthId, synth_reference: reference }),
    });
  }
  async removeSynthFromTeam(teamId: string, synthId: string): Promise<void> {
    await apiFetch(`/teams/${teamId}/synths/${synthId}`, { method: 'DELETE' });
  }
  async getTeamSynths(teamId: string): Promise<{ synthId: string; reference: COAITeamSynthReference }[]> {
    const rows = await apiFetch<COAITeamSynth[]>(`/teams/${teamId}/synths`);
    return rows.map((item) => ({ synthId: item.synth_id || item.synth_reference.synthId, reference: item.synth_reference }));
  }
  async updateTeamSynthReference(teamId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void> {
    await apiFetch(`/teams/${teamId}/synths/${synthId}`, {
      method: 'PATCH',
      body: JSON.stringify({ synth_reference: reference }),
    });
  }

  async fetchThreads(): Promise<Thread[]> {
    const rows = await apiFetch<Record<string, unknown>[]>('/threads');
    return rows.map(toThread);
  }
  async getThread(id: string): Promise<Thread | null> {
    try {
      return toThread(await apiFetch<Record<string, unknown>>(`/threads/${id}`));
    } catch {
      return null;
    }
  }
  async createThread(title: string): Promise<Thread> {
    return toThread(await apiFetch<Record<string, unknown>>('/threads', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }));
  }
  async updateThread(id: string, updates: Partial<Thread>): Promise<Thread> {
    return toThread(await apiFetch<Record<string, unknown>>(`/threads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: updates.title, isActive: updates.isActive }),
    }));
  }
  async deleteThread(id: string): Promise<void> {
    await apiFetch(`/threads/${id}`, { method: 'DELETE' });
  }

  async fetchMessages(threadId: string, options?: PaginationOptions): Promise<COAIMessage[]> {
    const params = new URLSearchParams({ threadId });
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', options.before.toISOString());
    return apiFetch<COAIMessage[]>(`/messages?${params.toString()}`);
  }
  async getMessage(id: string): Promise<COAIMessage | null> {
    try {
      return await apiFetch<COAIMessage>(`/messages/${id}`);
    } catch {
      return null;
    }
  }
  async createMessage(threadId: string, messageData: COAIMessageData): Promise<COAIMessage> {
    return apiFetch<COAIMessage>('/messages', {
      method: 'POST',
      body: JSON.stringify({ thread_id: threadId, message_data: messageData }),
    });
  }
  async updateMessage(id: string, updates: Partial<COAIMessageData>): Promise<COAIMessage> {
    return apiFetch<COAIMessage>(`/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ message_data: updates }),
    });
  }
  async deleteMessage(id: string): Promise<void> {
    await apiFetch(`/messages/${id}`, { method: 'DELETE' });
  }

  async addSynthToThread(threadId: string, synthId: string, reference: COAITeamSynthReference): Promise<void> {
    await apiFetch(`/threads/${threadId}/synths`, {
      method: 'POST',
      body: JSON.stringify({ synth_id: synthId, synth_reference: reference }),
    });
  }
  async removeSynthFromThread(threadId: string, synthId: string): Promise<void> {
    await apiFetch(`/threads/${threadId}/synths/${synthId}`, { method: 'DELETE' });
  }
  async getThreadSynths(threadId: string): Promise<COAITeamSynth[]> {
    return apiFetch<COAITeamSynth[]>(`/threads/${threadId}/synths`);
  }
  async updateThreadSynthReference(threadId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void> {
    await apiFetch(`/threads/${threadId}/synths/${synthId}`, {
      method: 'PATCH',
      body: JSON.stringify({ synth_reference: reference }),
    });
  }

  async getActiveThreadId(): Promise<string | null> {
    const me = await apiFetch<{ profile?: { profile_data?: { activeThreadId?: string } } }>('/me');
    return me.profile?.profile_data?.activeThreadId ?? null;
  }
  async setActiveThreadId(threadId: string | null): Promise<void> {
    await apiFetch('/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ activeThreadId: threadId }),
    });
  }

  static async fetchPublicSynths(_userId?: string): Promise<COAISynth[]> {
    return apiFetch<COAISynth[]>('/synths');
  }
  static async fetchPublicTeams(_userId?: string): Promise<COAITeam[]> {
    return apiFetch<COAITeam[]>('/teams');
  }
  static async fetchTeamSynths(teamId: string): Promise<COAITeamSynth[]> {
    return apiFetch<COAITeamSynth[]>(`/teams/${teamId}/synths`);
  }

  async createTeamWithSynths(teamData: COAITeamData, synthReferences: COAITeamSynthReference[]): Promise<COAITeam> {
    const team = await this.createTeam(teamData);
    for (const reference of synthReferences) {
      await this.addSynthToTeam(team.id, reference.synthId, reference);
    }
    return team;
  }
}

export const DataService = HttpDataService;
export const httpDataService = new HttpDataService();
