/**
 * Data Service Implementation
 * 
 * This service handles all data operations through Supabase.
 * It provides a clean interface for CRUD operations on all entities.
 * Business logic should be handled in DirectService.
 */

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
  COAITeamSynth
} from '../../types';
import { supabase } from '../supabase';

export interface IDataService {
  // Authentication status
  isAuthenticated(): boolean;
  
  // Synths
  fetchSynths(): Promise<COAISynth[]>;
  getSynth(id: string): Promise<COAISynth | null>;
  createSynth(data: COAISynthData): Promise<COAISynth>;
  updateSynth(id: string, updates: Partial<COAISynthData>): Promise<COAISynth>;
  deleteSynth(id: string): Promise<void>;
  
  // Teams
  fetchTeams(): Promise<COAITeam[]>;
  getTeam(id: string): Promise<COAITeam | null>;
  createTeam(data: COAITeamData): Promise<COAITeam>;
  updateTeam(id: string, updates: Partial<COAITeamData>): Promise<COAITeam>;
  deleteTeam(id: string): Promise<void>;
  addSynthToTeam(teamId: string, synthId: string, reference: COAITeamSynthReference): Promise<void>;
  removeSynthFromTeam(teamId: string, synthId: string): Promise<void>;
  getTeamSynths(teamId: string): Promise<{ synthId: string; reference: COAITeamSynthReference }[]>;
  updateTeamSynthReference(teamId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void>;
  
  // Threads
  fetchThreads(): Promise<Thread[]>;
  getThread(id: string): Promise<Thread | null>;
  createThread(title: string): Promise<Thread>;
  updateThread(id: string, updates: Partial<Thread>): Promise<Thread>;
  deleteThread(id: string): Promise<void>;
  
  // Messages
  fetchMessages(threadId: string, options?: PaginationOptions): Promise<COAIMessage[]>;
  getMessage(id: string): Promise<COAIMessage | null>;
  createMessage(threadId: string, messageData: COAIMessageData): Promise<COAIMessage>;
  updateMessage(id: string, updates: Partial<COAIMessageData>): Promise<COAIMessage>;
  deleteMessage(id: string): Promise<void>;
  
  // Thread-Synth relationships
  addSynthToThread(threadId: string, synthId: string, reference: COAITeamSynthReference): Promise<void>;
  removeSynthFromThread(threadId: string, synthId: string): Promise<void>;
  getThreadSynths(threadId: string): Promise<COAITeamSynth[]>;
  updateThreadSynthReference(threadId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void>;
  
  // User preferences
  getActiveThreadId(): Promise<string | null>;
  setActiveThreadId(threadId: string | null): Promise<void>;
}

// Supabase implementation of DataService
export class SupabaseDataService implements IDataService {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  isAuthenticated(): boolean {
    return true;
  }
  
  getUserId(): string {
    return this.userId;
  }
  
  // SYNTHS
  async fetchSynths(): Promise<COAISynth[]> {
    const { data, error } = await supabase
      .from('coai-synths')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  async getSynth(id: string): Promise<COAISynth | null> {
    const { data, error } = await supabase
      .from('coai-synths')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }
  
  async createSynth(data: COAISynthData): Promise<COAISynth> {
    const { data: result, error } = await supabase
      .from('coai-synths')
      .insert({
        user_id: this.userId,
        synth_data: data
      })
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }
  
  async updateSynth(id: string, updates: Partial<COAISynthData>): Promise<COAISynth> {
    const { data, error } = await supabase
      .from('coai-synths')
      .update({ synth_data: updates })
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async deleteSynth(id: string): Promise<void> {
    const { error } = await supabase
      .from('coai-synths')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);
    
    if (error) throw error;
  }
  
  // TEAMS
  async fetchTeams(): Promise<COAITeam[]> {
    const { data, error } = await supabase
      .from('coai-teams')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  async getTeam(id: string): Promise<COAITeam | null> {
    const { data, error } = await supabase
      .from('coai-teams')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
  
  async createTeam(data: COAITeamData): Promise<COAITeam> {
    const { data: result, error } = await supabase
      .from('coai-teams')
      .insert({
        user_id: this.userId,
        team_data: data
      })
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }
  
  async updateTeam(id: string, updates: Partial<COAITeamData>): Promise<COAITeam> {
    const { data, error } = await supabase
      .from('coai-teams')
      .update({ team_data: updates })
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async deleteTeam(id: string): Promise<void> {
    const { error } = await supabase
      .from('coai-teams')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);
    
    if (error) throw error;
  }
  
  async addSynthToTeam(teamId: string, synthId: string, reference: COAITeamSynthReference): Promise<void> {
    const { error } = await supabase
      .from('coai-team-synths')
      .insert({
        team_id: teamId,
        synth_id: synthId,
        synth_reference: reference
      });
    
    if (error) throw error;
  }
  
  async removeSynthFromTeam(teamId: string, synthId: string): Promise<void> {
    const { error } = await supabase
      .from('coai-team-synths')
      .delete()
      .eq('team_id', teamId)
      .eq('synth_id', synthId);
    
    if (error) throw error;
  }
  
  async getTeamSynths(teamId: string): Promise<{ synthId: string; reference: COAITeamSynthReference }[]> {
    const { data, error } = await supabase
      .from('coai-team-synths')
      .select('synth_id, synth_reference')
      .eq('team_id', teamId);
    
    if (error) throw error;
    return (data || []).map(item => ({
      synthId: item.synth_id,
      reference: item.synth_reference
    }));
  }
  
  async updateTeamSynthReference(teamId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void> {
    const { error } = await supabase
      .from('coai-team-synths')
      .update({ synth_reference: reference })
      .eq('team_id', teamId)
      .eq('synth_id', synthId);
    
    if (error) throw error;
  }
  
  // THREADS
  async fetchThreads(): Promise<Thread[]> {
    const { data, error } = await supabase
      .from('coai-threads')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('DEBUG - fetchThreads error:', error);
      throw error;
    }
    
    // Transform database rows to Thread interface
    const threads = (data || []).map(row => ({
      id: row.id,
      title: row.thread_data?.title || 'Untitled Thread',
      isActive: row.thread_data?.isActive || false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
    
    return threads;
  }
  
  async getThread(id: string): Promise<Thread | null> {
    console.log('DEBUG - getThread: id =', id, 'userId =', this.userId);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('DEBUG - getThread: Invalid UUID format:', id);
      return null;
    }
    
    const { data, error } = await supabase
      .from('coai-threads')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.userId)
      .single();
    
    if (error) {
      console.error('DEBUG - getThread error:', error);
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    // Transform database row to Thread interface
    const thread = {
      id: data.id,
      title: data.thread_data?.title || 'Untitled Thread',
      isActive: data.thread_data?.isActive || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
    
    console.log('DEBUG - getThread result:', thread);
    return thread;
  }
  
  async createThread(title: string): Promise<Thread> {
    console.log('DEBUG - createThread: title =', title, 'userId =', this.userId);
    
    const threadData = {
      title,
      isActive: true
    };
    
    const { data, error } = await supabase
      .from('coai-threads')
      .insert({
        user_id: this.userId || null, // Allow NULL for unauthenticated users
        thread_data: threadData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('DEBUG - createThread error:', error);
      throw error;
    }
    
    // Transform database row to Thread interface
    const thread = {
      id: data.id,
      title: data.thread_data?.title || title,
      isActive: data.thread_data?.isActive || true,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
    
    console.log('DEBUG - createThread result:', thread);
    return thread;
  }
  
  async updateThread(id: string, updates: Partial<Thread>): Promise<Thread> {
    console.log('DEBUG - updateThread: id =', id, 'updates =', updates);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.error('DEBUG - updateThread: Invalid UUID format:', id);
      throw new Error(`Invalid thread ID format: ${id}`);
    }
    
    // Transform Thread updates to database format
    const threadDataUpdates: any = {};
    if (updates.title !== undefined) threadDataUpdates.title = updates.title;
    if (updates.isActive !== undefined) threadDataUpdates.isActive = updates.isActive;
    
    const { data, error } = await supabase
      .from('coai-threads')
      .update({
        thread_data: threadDataUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single();
    
    if (error) {
      console.error('DEBUG - updateThread error:', error);
      throw error;
    }
    
    // Transform database row to Thread interface
    const thread = {
      id: data.id,
      title: data.thread_data?.title || 'Untitled Thread',
      isActive: data.thread_data?.isActive || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
    
    console.log('DEBUG - updateThread result:', thread);
    return thread;
  }
  
  async deleteThread(id: string): Promise<void> {
    const { error } = await supabase
      .from('coai-threads')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);
    
    if (error) throw error;
  }
  
  // MESSAGES
  async fetchMessages(threadId: string, options?: PaginationOptions): Promise<COAIMessage[]> {
    // Debug logging removed to reduce console noise
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(threadId)) {
      console.error('DEBUG - fetchMessages: Invalid UUID format:', threadId);
      throw new Error(`Invalid thread ID format: ${threadId}`);
    }
    
    let query = supabase
      .from('coai-messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    // Note: PaginationOptions uses cursor-based pagination, not offset
    // For now, we'll just use limit. Cursor-based pagination can be added later if needed.
    
    const { data, error } = await query;
    
    if (error) {
      console.error('DEBUG - fetchMessages error:', error);
      throw error;
    }
    
    // Debug logging removed to reduce console noise
    return data || [];
  }
  
  async getMessage(id: string): Promise<COAIMessage | null> {
    const { data, error } = await supabase
      .from('coai-messages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
  
  async createMessage(threadId: string, messageData: COAIMessageData): Promise<COAIMessage> {
    const { data, error } = await supabase
      .from('coai-messages')
      .insert({
        thread_id: threadId,
        message_data: messageData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async updateMessage(id: string, updates: Partial<COAIMessageData>): Promise<COAIMessage> {
    const { data, error } = await supabase
      .from('coai-messages')
      .update({ message_data: updates })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async deleteMessage(id: string): Promise<void> {
    const { error } = await supabase
      .from('coai-messages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
  
  // THREAD-SYNTH RELATIONSHIPS
  async addSynthToThread(threadId: string, synthId: string, reference: COAITeamSynthReference): Promise<void> {
    const { error } = await supabase
      .from('coai-thread-synths')
      .insert({
        thread_id: threadId,
        synth_id: synthId,
        synth_reference: reference
      });
    
    if (error) throw error;
  }
  
  async removeSynthFromThread(threadId: string, synthId: string): Promise<void> {
    const { error } = await supabase
      .from('coai-thread-synths')
      .delete()
      .eq('thread_id', threadId)
      .eq('synth_id', synthId);
    
    if (error) throw error;
  }
  
  async getThreadSynths(threadId: string): Promise<COAITeamSynth[]> {
    const { data, error } = await supabase
      .from('coai-thread-synths')
      .select('*')
      .eq('thread_id', threadId);
    
    if (error) throw error;
    return data || [];
  }

  async updateThreadSynthReference(threadId: string, synthId: string, reference: Partial<COAITeamSynthReference>): Promise<void> {
    // Fetch current reference
    const { data: currentData, error: fetchError } = await supabase
      .from('coai-thread-synths')
      .select('synth_reference')
      .eq('thread_id', threadId)
      .eq('synth_id', synthId)
      .single();
      
    if (fetchError) throw fetchError;
    
    const currentReference = currentData.synth_reference;
    
    // Merge with updates
    const updatedReference = {
      ...currentReference,
      ...reference
    };
    
    // Update in database
    const { error: updateError } = await supabase
      .from('coai-thread-synths')
      .update({ synth_reference: updatedReference })
      .eq('thread_id', threadId)
      .eq('synth_id', synthId);
      
    if (updateError) throw updateError;
  }
  
  // USER PREFERENCES
  async getActiveThreadId(): Promise<string | null> {
    const { data, error } = await supabase
      .from('coai-profiles')
      .select('profile_data')
      .eq('user_id', this.userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data?.profile_data?.activeThreadId || null;
  }
  
  async setActiveThreadId(threadId: string | null): Promise<void> {
    console.log('🔍 DEBUG: setActiveThreadId called with:', { threadId, userId: this.userId });
    
    // If threadId is provided, verify it exists before setting it
    if (threadId) {
      try {
        const { data: threadExists, error: threadError } = await supabase
          .from('coai-threads')
          .select('id')
          .eq('id', threadId)
          .single();
        
        if (threadError || !threadExists) {
          console.log('🔍 DEBUG: Thread does not exist, clearing activeThreadId instead');
          threadId = null;
        }
      } catch (error) {
        console.log('🔍 DEBUG: Error checking thread existence, clearing activeThreadId:', error);
        threadId = null;
      }
    }
    
    // First get the current profile data
    const { data: currentProfile, error: fetchError } = await supabase
      .from('coai-profiles')
      .select('profile_data')
      .eq('user_id', this.userId)
      .single();
    
    console.log('🔍 DEBUG: Profile fetch result:', { 
      hasProfile: !!currentProfile, 
      fetchError: fetchError?.code || null 
    });
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('🔍 DEBUG: Unexpected fetch error:', fetchError);
      throw fetchError;
    }
    
    // If no profile exists, don't create one - let auth slice handle it
    if (!currentProfile) {
      console.log('🔍 DEBUG: No profile found, skipping setActiveThreadId to avoid race condition');
      return;
    }
    
    // Merge the new activeThreadId with existing profile data
    const updatedProfileData = {
      ...(currentProfile?.profile_data || {}),
      activeThreadId: threadId
    };
    
    console.log('🔍 DEBUG: Updating existing profile with activeThreadId:', threadId);
    
    const { error } = await supabase
      .from('coai-profiles')
      .update({
        profile_data: updatedProfileData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', this.userId);
    
    if (error) {
      console.error('🔍 DEBUG: Profile update error:', error);
      throw error;
    }
    
    console.log('🔍 DEBUG: Profile updated successfully');
  }
}

// Static utility methods for public data
export class DataService {
  /**
   * Fetches public synths and optionally user's synths if authenticated
   */
  static async fetchPublicSynths(userId?: string): Promise<COAISynth[]> {
    try {
      console.log('🔍 [DATASERVICE DEBUG] fetchPublicSynths called with userId:', userId);
      
      let query = supabase
        .from('coai-synths')
        .select('*');
      
      if (userId) {
        console.log('🔍 [DATASERVICE DEBUG] Authenticated user - fetching public + user synths');
        // For authenticated users: fetch public synths OR user's own synths
        query = query.or(`synth_data->>isPublic.eq.true,user_id.eq.${userId}`);
      } else {
        console.log('🔍 [DATASERVICE DEBUG] Unauthenticated user - fetching only public synths');
        // For unauthenticated users: only fetch public synths
        query = query.eq('synth_data->>isPublic', 'true');
      }
      
      // Order by creation time (newest first)
      query = query.order('created_at', { ascending: false });
      
      console.log('🔍 [DATASERVICE DEBUG] Executing query...');
      const { data, error } = await query;
      
      if (error) {
        console.error('🔍 [DATASERVICE DEBUG] Query error:', error);
        throw error;
      }
      
      console.log('🔍 [DATASERVICE DEBUG] Query result:', data?.length || 0, 'synths found');
      
      return data as COAISynth[];
    } catch (error) {
      console.error('Error fetching public synths:', error);
      throw error;
    }
  }
  
  /**
   * Fetches public teams and optionally user's teams if authenticated
   */
  static async fetchPublicTeams(userId?: string): Promise<COAITeam[]> {
    try {
      console.log('🔍 [DATASERVICE DEBUG] fetchPublicTeams called with userId:', userId);
      
      let query = supabase
        .from('coai-teams')
        .select('*');
      
      if (userId) {
        console.log('🔍 [DATASERVICE DEBUG] Authenticated user - fetching public + user teams');
        // For authenticated users: fetch public teams OR user's own teams
        query = query.or(`team_data->>isPublic.eq.true,user_id.eq.${userId}`);
      } else {
        console.log('🔍 [DATASERVICE DEBUG] Unauthenticated user - fetching only public teams');
        // For unauthenticated users: only fetch public teams
        query = query.eq('team_data->>isPublic', 'true');
      }
      
      // Order by creation time (newest first)
      query = query.order('created_at', { ascending: false });
      
      console.log('🔍 [DATASERVICE DEBUG] Executing teams query...');
      const { data, error } = await query;
      
      if (error) {
        console.error('🔍 [DATASERVICE DEBUG] Teams query error:', error);
        throw error;
      }
      
      console.log('🔍 [DATASERVICE DEBUG] Teams query result:', data?.length || 0, 'teams found');
      
      return data as COAITeam[];
    } catch (error) {
      console.error('Error fetching public teams:', error);
      throw error;
    }
  }
  
  /**
   * Fetches team-synth relationships for a specific team
   */
  static async fetchTeamSynths(teamId: string): Promise<COAITeamSynth[]> {
    try {
      // Debug logging removed to reduce console noise
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(teamId)) {
        console.error('DEBUG - fetchTeamSynths: Invalid UUID format:', teamId);
        throw new Error(`Invalid team ID format: ${teamId}`);
      }
      
      const { data, error } = await supabase
        .from('coai-team-synths')
        .select('*')
        .eq('team_id', teamId);
      
      if (error) {
        console.error('DEBUG - fetchTeamSynths error:', error);
        throw error;
      }
      
      // Debug logging removed to reduce console noise
      return data as COAITeamSynth[];
    } catch (error) {
      console.error(`Error fetching synths for team ${teamId}:`, error);
      throw error;
    }
  }
} 