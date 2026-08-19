import { StateCreator } from 'zustand';
import { RootState } from '../../types/store';
import { apiFetch } from '../../lib/api/client';
import { COAIDocument, COAIDocumentData } from '../../types';
import { upsertEntity, removeEntity } from '../../lib/utils/normalization';
import { LoadingStateKey } from '../../types/store';

// Define the documents slice interface
export interface DocumentsSlice {
  // CRUD operations
  fetchDocuments: () => Promise<{ error: Error | null }>;
  createDocument: (documentData: COAIDocumentData) => Promise<{ data: COAIDocument | null; error: Error | null }>;
  updateDocumentById: (documentId: string, updates: Partial<COAIDocumentData>) => Promise<{ error: Error | null }>;
  deleteDocument: (documentId: string) => Promise<{ error: Error | null }>;
}

// Create the documents slice
export const createDocumentsSlice: StateCreator<
  RootState,
  [["zustand/devtools", never], ["zustand/persist", unknown]],
  [],
  DocumentsSlice
> = (set, get) => ({
  
  // CRUD operations
  fetchDocuments: async () => {
    set((state) => ({
      ...state,
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.FETCH_DOCUMENTS]: true,
        },
        errors: {
          ...state.ui.errors,
          [LoadingStateKey.FETCH_DOCUMENTS]: null,
        },
      },
    }), false, 'documents/fetchDocuments/start');

    try {
      const user = get().user;
      if (!user) {
        return { error: new Error('User not authenticated') };
      }
      
      const data = await apiFetch<COAIDocument[]>('/documents');
      
      // Update entities with documents
      const documentsMap = (data || []).reduce((acc, doc) => {
        acc[doc.id] = doc;
        return acc;
      }, {} as Record<string, COAIDocument>);
      
      set((state) => ({
        ...state,
        entities: {
          ...state.entities,
          documents: documentsMap,
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_DOCUMENTS]: false,
          },
        },
      }), false, 'documents/fetchDocuments/success');
      
      return { error: null };
    } catch (error) {
      set((state) => ({
        ...state,
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.FETCH_DOCUMENTS]: false,
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.FETCH_DOCUMENTS]: error as Error,
          },
        },
      }), false, 'documents/fetchDocuments/error');
      return { error: error as Error };
    }
  },
  
  createDocument: async (documentData) => {
    set((state) => ({
      ...state,
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.CREATE_DOCUMENT]: true,
        },
        errors: {
          ...state.ui.errors,
          [LoadingStateKey.CREATE_DOCUMENT]: null,
        },
      },
    }), false, 'documents/createDocument/start');

    try {
      const user = get().user;
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }
      
      const data = await apiFetch<COAIDocument>('/documents', {
        method: 'POST',
        body: JSON.stringify({ document_data: documentData }),
      });
      
      // Add document to entities
      set((state) => ({
        ...state,
        entities: {
          ...state.entities,
          documents: upsertEntity(state.entities.documents, data),
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.CREATE_DOCUMENT]: false,
          },
          activeDocumentId: data.id,
        },
      }), false, 'documents/createDocument/success');
      
      return { data, error: null };
    } catch (error) {
      set((state) => ({
        ...state,
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.CREATE_DOCUMENT]: false,
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.CREATE_DOCUMENT]: error as Error,
          },
        },
      }), false, 'documents/createDocument/error');
      return { data: null, error: error as Error };
    }
  },
  
  updateDocumentById: async (documentId, updates) => {
    set((state) => ({
      ...state,
      ui: {
        ...state.ui,
        loadingStates: {
          ...state.ui.loadingStates,
          [LoadingStateKey.SAVE_DOCUMENT]: true,
        },
        errors: {
          ...state.ui.errors,
          [LoadingStateKey.SAVE_DOCUMENT]: null,
        },
      },
    }), false, 'documents/updateDocument/start');

    try {
      const user = get().user;
      if (!user) {
        return { error: new Error('User not authenticated') };
      }
      
      // Get current document to merge updates
      const currentDocument = get().entities.documents[documentId];
      if (!currentDocument) {
        return { error: new Error('Document not found') };
      }
      
      const updatedDocumentData = {
        ...currentDocument.document_data,
        ...updates,
      };
      
      const data = await apiFetch<COAIDocument>(`/documents/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ document_data: updatedDocumentData }),
      });
      
      // Update document in entities
      set((state) => ({
        ...state,
        entities: {
          ...state.entities,
          documents: upsertEntity(state.entities.documents, data),
        },
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.SAVE_DOCUMENT]: false,
          },
        },
      }), false, 'documents/updateDocument/success');
      
      return { error: null };
    } catch (error) {
      set((state) => ({
        ...state,
        ui: {
          ...state.ui,
          loadingStates: {
            ...state.ui.loadingStates,
            [LoadingStateKey.SAVE_DOCUMENT]: false,
          },
          errors: {
            ...state.ui.errors,
            [LoadingStateKey.SAVE_DOCUMENT]: error as Error,
          },
        },
      }), false, 'documents/updateDocument/error');
      return { error: error as Error };
    }
  },
  
  deleteDocument: async (documentId) => {
    try {
      const user = get().user;
      if (!user) {
        return { error: new Error('User not authenticated') };
      }
      
      await apiFetch(`/documents/${documentId}`, { method: 'DELETE' });
      
      // Remove document from entities
      set((state) => ({
        ...state,
        entities: {
          ...state.entities,
          documents: removeEntity(state.entities.documents, documentId),
        },
        ui: {
          ...state.ui,
          activeDocumentId: state.ui.activeDocumentId === documentId ? null : state.ui.activeDocumentId,
        },
      }), false, 'documents/deleteDocument/success');
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
}); 