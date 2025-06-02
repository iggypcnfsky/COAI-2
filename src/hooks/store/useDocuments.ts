import { useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../../stores/appStore';
import { Document } from '../../types/store';
import { denormalizeRecord } from '../../lib/utils/normalization';

/**
 * Hook for managing documents
 * @returns Document management functions and state
 */
export function useDocuments() {
  // Get documents state from store
  const documents = useAppStore((state) => state.entities.documents) || {};
  const activeDocumentId = useAppStore((state) => state.ui.activeDocumentId);
  const isLoading = useAppStore((state) => 
    state.ui.loadingStates?.fetchDocuments || state.ui.loadingStates?.saveDocument
  );
  
  // Get document actions from store
  const fetchDocuments = useAppStore((state) => state.fetchDocuments);
  const createDocument = useAppStore((state) => state.createDocument);
  const updateDocument = useAppStore((state) => state.updateDocument);
  const deleteDocument = useAppStore((state) => state.deleteDocument);
  const setActiveDocument = useAppStore((state) => state.setActiveDocument);
  
  // Load documents on initial render
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);
  
  // Get documents as an array
  const documentList = useMemo(() => {
    return denormalizeRecord(documents);
  }, [documents]);
  
  // Sort documents by updated date (newest first)
  const sortedDocuments = useMemo(() => {
    return [...documentList].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [documentList]);
  
  // Get active document
  const activeDocument = useMemo(() => {
    return activeDocumentId ? documents[activeDocumentId] : null;
  }, [documents, activeDocumentId]);
  
  // Create a new document with validation
  const handleCreateDocument = useCallback(
    async (data: { title: string; content: string }): Promise<Document> => {
      if (!data.title.trim()) {
        throw new Error('Document title is required');
      }
      
      return createDocument(data);
    },
    [createDocument]
  );
  
  // Update a document with validation
  const handleUpdateDocument = useCallback(
    async (id: string, data: Partial<Omit<Document, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Document> => {
      if (data.title !== undefined && !data.title.trim()) {
        throw new Error('Document title cannot be empty');
      }
      
      return updateDocument(id, data);
    },
    [updateDocument]
  );
  
  return {
    // State
    documents: sortedDocuments,
    activeDocument,
    activeDocumentId,
    isLoading,
    
    // Actions
    fetchDocuments,
    createDocument: handleCreateDocument,
    updateDocument: handleUpdateDocument,
    deleteDocument,
    setActiveDocument,
  };
} 