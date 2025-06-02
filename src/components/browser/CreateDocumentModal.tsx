import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Save, Edit } from 'lucide-react';
import type { Document } from '@/types/store';

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (documentData: { title: string; content: string; id?: string }) => void;
  editDocument?: Document | null;
}

const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editDocument = null,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });

  const isEditMode = editDocument !== null;

  useEffect(() => {
    if (editDocument) {
      setFormData({
        title: editDocument.title,
        content: editDocument.content,
      });
    } else {
      setFormData({
        title: '',
        content: '',
      });
    }
  }, [editDocument]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      alert('Please enter a document title');
      return;
    }

    if (!formData.content.trim()) {
      alert('Please enter some content for the document');
      return;
    }

    const documentToSave = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      ...(isEditMode && { id: editDocument!.id }),
    };

    onSave(documentToSave);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      title: '',
      content: '',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Edit className="h-5 w-5 text-blue-500" />
                Edit Document
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 text-blue-500" />
                Create New Document
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Document Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter document title..."
              className="text-lg"
            />
          </div>

          {/* Document Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Start writing your document content here..."
              className="min-h-[400px] text-base leading-relaxed"
            />
            <p className="text-xs text-neutral-500">
              Write your notes, ideas, or document content. You can format and edit this later.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isEditMode ? 'Save Changes' : 'Create Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDocumentModal; 