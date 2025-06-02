import React, { useState } from 'react';
import { FileText, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CreateDocumentModal from './CreateDocumentModal';
import { useDocuments } from '@/hooks/store/useDocuments';
import type { Document } from '@/types/store';

interface FilesSectionProps {
  // Future props for file management
}

const FilesSection: React.FC<FilesSectionProps> = () => {
  const [isCreateDocumentModalOpen, setIsCreateDocumentModalOpen] = useState(false);
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  
  // Use the documents hook from Zustand
  const { 
    documents, 
    createDocument, 
    updateDocument,
    isLoading
  } = useDocuments();

  const handleCreateDocument = () => {
    setEditingDocument(null); // Ensure we're in create mode
    setIsCreateDocumentModalOpen(true);
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setIsCreateDocumentModalOpen(true);
  };

  const handleSaveDocument = async (documentData: { title: string; content: string; id?: string }) => {
    try {
      if (editingDocument) {
        // Update existing document
        await updateDocument(editingDocument.id, {
          title: documentData.title,
          content: documentData.content,
        });
      } else {
        // Create new document
        await createDocument({
          title: documentData.title,
          content: documentData.content,
        });
      }
      setIsCreateDocumentModalOpen(false);
      setEditingDocument(null);
    } catch (error) {
      console.error('Error saving document:', error);
      // Handle error (could show an error message)
    }
  };

  const handleCloseModal = () => {
    setIsCreateDocumentModalOpen(false);
    setEditingDocument(null);
  };

  const handleDragStart = (e: React.DragEvent, doc: Document) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'document',
      document: doc
    }));
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedDocId(doc.id);
    
    // Create a custom drag image that looks like a mini document card
    const dragElement = document.createElement('div');
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    dragElement.style.width = '240px';
    dragElement.style.height = '80px';
    dragElement.style.background = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
    dragElement.style.borderRadius = '8px';
    dragElement.style.color = '#1e40af';
    dragElement.style.display = 'flex';
    dragElement.style.alignItems = 'center';
    dragElement.style.padding = '12px';
    dragElement.style.fontSize = '14px';
    dragElement.style.fontWeight = '600';
    dragElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    dragElement.innerHTML = `
      <div style="margin-right: 12px; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: rgba(59, 130, 246, 0.2); border-radius: 6px;">
        <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${doc.title}</div>
        <div style="font-size: 11px; opacity: 0.8; font-weight: 400;">Document</div>
      </div>
    `;
    
    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, 120, 40);
    
    // Remove the element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragElement);
    }, 100);
  };

  const handleDragEnd = () => {
    setDraggedDocId(null);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header with Create button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex text-xs text-neutral-500 dark:text-neutral-400 items-center gap-1">
            <span>💡</span>
            <span>Upload and share files with your team</span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleCreateDocument}
          >
            <Plus className="h-4 w-4" />
            Create new document
          </Button>
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
              Your Documents ({documents.length})
              <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">💡 Click to edit • Drag to chat to mention</span>
            </h3>
            <div className="space-y-2">
              {documents.map((doc) => (
                <Card 
                  key={doc.id} 
                  className={`p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-all duration-200 ${
                    draggedDocId === doc.id ? 'opacity-50 scale-95' : ''
                  } hover:shadow-md border border-neutral-200 dark:border-neutral-700`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, doc)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleEditDocument(doc)}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {doc.title}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-1">
                        {doc.content}
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        Created {new Date(doc.createdAt).toLocaleDateString()}
                        {new Date(doc.updatedAt).getTime() !== new Date(doc.createdAt).getTime() && (
                          <span> • Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Drag indicator */}
                  <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-lg opacity-0 hover:opacity-20 transition-opacity duration-200 pointer-events-none" />
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Upload area */}
        <Card className="p-6 border-dashed border-2 border-neutral-300 dark:border-neutral-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
              Upload Files
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Drag and drop files here or click to browse
            </p>
          </div>
        </Card>

        {/* Empty state message */}
        {documents.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
              No files uploaded yet
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Upload files or create new documents to get started
            </p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && documents.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Loading documents...
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Document Modal */}
      <CreateDocumentModal
        isOpen={isCreateDocumentModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveDocument}
        editDocument={editingDocument}
      />
    </>
  );
};

export default FilesSection; 