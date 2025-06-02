import { StateCreator } from 'zustand';
import { RootState, Document } from '../../types/store';
import { generateId } from '../../lib/utils/index';

// Define the Document slice interface contributions to RootState
export interface DocumentsSliceState {
  documents: Record<string, Document>;
  activeDocumentId_doc: string | null;
  loadingStates_doc: {
    fetchDocuments: boolean;
    saveDocument: boolean;
  };
}

export interface DocumentsSliceActions {
  fetchDocuments: () => Promise<void>;
  createDocument: (data: { title: string; content: string }) => Promise<Document>;
  updateDocument: (id: string, data: Partial<Omit<Document, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  setActiveDocument_doc: (id: string | null) => void;
}

export type FullDocumentsSlice = DocumentsSliceState & DocumentsSliceActions;

// Create the slice
export const createDocumentsSlice: StateCreator<
  RootState,
  [],
  [],
  FullDocumentsSlice
> = (set, get) => ({
  // Initial state parts managed by this slice, will be merged into RootState
  documents: {},
  activeDocumentId_doc: null,
  loadingStates_doc: {
    fetchDocuments: false,
    saveDocument: false,
  },
  
  // Actions
  fetchDocuments: async () => {
    set((state: RootState) => ({
      ...state, // Spread current state to preserve other parts
      ui: {
        ...state.ui,
        loadingStates_doc: { ...state.ui.loadingStates_doc, fetchDocuments: true },
      },
    }));
    
    try {
      const storedDocuments = localStorage.getItem('coai-documents');
      const fetchedDocs = storedDocuments ? JSON.parse(storedDocuments) : {};
      Object.values(fetchedDocs).forEach((doc: any) => {
        doc.createdAt = new Date(doc.createdAt);
        doc.updatedAt = new Date(doc.updatedAt);
      });
      
      set((state: RootState) => ({
        ...state,
        entities: {
          ...state.entities,
          documents: fetchedDocs, // Update documents within entities
        },
        ui: {
          ...state.ui,
          loadingStates_doc: { ...state.ui.loadingStates_doc, fetchDocuments: false },
        },
      }));
    } catch (error) {
              console.error('Error fetching documents:', error);
        set((state: RootState) => ({
          ...state,
          ui: {
            ...state.ui,
            loadingStates_doc: { ...state.ui.loadingStates_doc, fetchDocuments: false },
          },
        }));
    }
  },
  
  createDocument: async (data) => {
    set((state: RootState) => ({
      ...state,
      ui: {
        ...state.ui,
        loadingStates_doc: { ...state.ui.loadingStates_doc, saveDocument: true },
      },
    }));
    
    try {
      const now = new Date();
      const newDocument: Document = {
        id: generateId(),
        title: data.title,
        content: data.content,
        createdAt: now,
        updatedAt: now,
      };
      
      set((state: RootState) => {
        const updatedDocuments = {
          ...(state.entities?.documents || {}), // Ensure documents object exists
          [newDocument.id]: newDocument,
        };
        localStorage.setItem('coai-documents', JSON.stringify(updatedDocuments));
        return {
          ...state,
          entities: {
            ...state.entities,
            documents: updatedDocuments,
          },
          ui: {
            ...state.ui,
            activeDocumentId_doc: newDocument.id,
            loadingStates_doc: { ...state.ui.loadingStates_doc, saveDocument: false },
          },
        };
      });
      return newDocument;
    } catch (error) {
      console.error('Error creating document:', error);
      set((state: RootState) => ({
        ...state,
        ui: {
          ...state.ui,
          loadingStates_doc: { ...state.ui.loadingStates_doc, saveDocument: false },
        },
      }));
      throw error;
    }
  },
  
  updateDocument: async (id, data) => {
    set((state: RootState) => ({
      ...state,
      ui: {
        ...state.ui,
        loadingStates_doc: { ...state.ui.loadingStates_doc, saveDocument: true },
      },
    }));
    
    try {
      const existingDocument = get().entities.documents[id];
      if (!existingDocument) throw new Error(`Document with ID ${id} not found`);
      
      const updatedDoc: Document = { ...existingDocument, ...data, updatedAt: new Date() };
      
      set((state: RootState) => {
        const updatedDocuments = {
          ...(state.entities?.documents || {}),
          [id]: updatedDoc,
        };
        localStorage.setItem('coai-documents', JSON.stringify(updatedDocuments));
        return {
          ...state,
          entities: {
            ...state.entities,
            documents: updatedDocuments,
          },
          ui: {
            ...state.ui,
            loadingStates_doc: { ...state.ui.loadingStates_doc, saveDocument: false },
          },
        };
      });
      return updatedDoc;
    } catch (error) {
      console.error('Error updating document:', error);
      set((state: RootState) => ({
        ...state,
        ui: {
          ...state.ui,
          loadingStates_doc: { ...state.ui.loadingStates_doc, saveDocument: false },
        },
      }));
      throw error;
    }
  },
  
  deleteDocument: async (id) => {
    try {
      set((state: RootState) => {
        const { [id]: _, ...remainingDocuments } = (state.entities?.documents || {});
        localStorage.setItem('coai-documents', JSON.stringify(remainingDocuments));
        return {
          ...state,
          entities: {
            ...state.entities,
            documents: remainingDocuments,
          },
          ui: {
            ...state.ui,
            activeDocumentId_doc: state.ui.activeDocumentId_doc === id ? null : state.ui.activeDocumentId_doc,
          },
        };
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },
  
  setActiveDocument_doc: (id: string | null) => {
    set((state: RootState) => ({
      ...state,
      ui: {
        ...state.ui,
        activeDocumentId_doc: id,
      },
    }));
  },
}); 