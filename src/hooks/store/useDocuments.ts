import { useAppStore } from '../../stores';
import { LoadingStateKey } from '../../types/store';

/**
 * Hook for managing documents
 * @returns Document management functions and state
 */
export const useDocuments = () => {
  const documents = useAppStore((state) => state.entities.documents);
  const activeDocumentId = useAppStore((state) => state.ui.activeDocumentId);
  const isLoading = useAppStore((state) => state.ui.loadingStates[LoadingStateKey.FETCH_DOCUMENTS] || false);
  const isCreating = useAppStore((state) => state.ui.loadingStates[LoadingStateKey.CREATE_DOCUMENT] || false);
  const isSaving = useAppStore((state) => state.ui.loadingStates[LoadingStateKey.SAVE_DOCUMENT] || false);
  const error = useAppStore((state) => state.ui.errors[LoadingStateKey.FETCH_DOCUMENTS]);
  
  const fetchDocuments = useAppStore((state) => state.fetchDocuments);
  const createDocument = useAppStore((state) => state.createDocument);
  const updateDocument = useAppStore((state) => state.updateDocumentById);
  const deleteDocument = useAppStore((state) => state.deleteDocument);
  
  // Convert documents object to array and sort by updated_at
  const documentsArray = Object.values(documents).sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  
  const activeDocument = activeDocumentId ? documents[activeDocumentId] : null;
  
  const setActiveDocument = (documentId: string | null) => {
    useAppStore.setState((state) => ({
      ui: {
        ...state.ui,
        activeDocumentId: documentId,
      },
    }));
  };
  
  return {
    documents: documentsArray,
    documentsById: documents,
    activeDocument,
    activeDocumentId,
    isLoading,
    isCreating,
    isSaving,
    error,
    
    // Actions
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    setActiveDocument,
  };
};

export const useDocument = (documentId: string | undefined) => {
  const document = useAppStore((state) => 
    documentId ? state.entities.documents[documentId] : null
  );
  
  return document;
}; 