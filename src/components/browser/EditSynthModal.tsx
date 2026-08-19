import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelSelectItems } from '@/components/ModelSelect';
import { Upload, X, RefreshCw, Loader2 } from 'lucide-react';
import { AIEmployee } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { generateSynthImage } from '@/lib/api-utils';

interface EditSynthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (synth: AIEmployee) => void;
  synth: AIEmployee | null;
}

const EditSynthModal: React.FC<EditSynthModalProps> = ({
  isOpen,
  onClose,
  onSave,
  synth,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    role: '',
    systemPrompt: '',
    baseModel: '',
    profileImage: '',
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isPublic, setIsPublic] = useState(true);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

  // Populate form when synth changes
  useEffect(() => {
    if (synth) {
      setFormData({
        name: synth.name,
        age: synth.age.toString(),
        role: synth.role,
        systemPrompt: synth.systemPrompt,
        baseModel: synth.baseModel,
        profileImage: synth.profileImage,
      });
      setImagePreview(synth.profileImage);
      // Set isPublic based on synth's property or default to true
      setIsPublic(synth.isPublic !== undefined ? synth.isPublic : true);
    }
  }, [synth]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({
          ...prev,
          profileImage: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData(prev => ({
      ...prev,
      profileImage: ''
    }));
  };

  const handleRegenerateImage = async () => {
    if (!synth) return;
    
    try {
      setIsRegeneratingImage(true);
      
      // Call the edge function to generate a new image
      const newImage = await generateSynthImage({
        name: formData.name,
        age: parseInt(formData.age) || 25,
        role: formData.role,
        systemPrompt: formData.systemPrompt,
        baseModel: formData.baseModel as AIEmployee['baseModel'],
        profileImage: '', // Don't send the existing image
        bio: synth.bio,
      });
      
      // Update form and preview with the new image
      setImagePreview(newImage);
      setFormData(prev => ({
        ...prev,
        profileImage: newImage
      }));
      
      console.log('✅ Image regenerated successfully');
    } catch (error) {
      console.error('❌ Failed to regenerate image:', error);
      alert('Failed to regenerate image. Please try again.');
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.role || !formData.systemPrompt || !formData.baseModel) {
      alert('Please fill in all required fields');
      return;
    }

    if (!synth) {
      alert('No synth selected for editing');
      return;
    }

    const updatedSynth: AIEmployee = {
      ...synth, // Keep the original ID and any other properties
      name: formData.name,
      age: parseInt(formData.age) || 25,
      role: formData.role,
      systemPrompt: formData.systemPrompt,
      baseModel: formData.baseModel as AIEmployee['baseModel'],
      profileImage: formData.profileImage || '/images/default-avatar.png',
      isPublic,
    };

    onSave(updatedSynth);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      age: '',
      role: '',
      systemPrompt: '',
      baseModel: '',
      profileImage: '',
    });
    setImagePreview('');
    setIsPublic(true);
    onClose();
  };

  if (!synth) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Synth: {synth.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Profile Image</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-neutral-400" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="edit-image-upload"
                  />
                  <Label htmlFor="edit-image-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>Upload Image</span>
                    </Button>
                  </Label>
                  
                  {/* Regenerate Image Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateImage}
                    disabled={isRegeneratingImage || !formData.name || !formData.role}
                    className="flex items-center gap-1"
                  >
                    {isRegeneratingImage ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        <span>Regenerate</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">
                  {isRegeneratingImage 
                    ? 'Generating new AI image, please wait...' 
                    : 'Recommended: 400x400px or larger. Or regenerate using AI.'}
                </p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter synth name"
            />
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="edit-age">Age</Label>
            <Input
              id="edit-age"
              type="number"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              placeholder="Enter age (optional)"
              min="18"
              max="100"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role *</Label>
            <Input
              id="edit-role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              placeholder="e.g., Software Engineer, Designer, Marketing Specialist"
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="edit-model">AI Model *</Label>
            <Select value={formData.baseModel} onValueChange={(value) => handleInputChange('baseModel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <ModelSelectItems />
              </SelectContent>
            </Select>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="edit-prompt">System Prompt *</Label>
            <Textarea
              id="edit-prompt"
              value={formData.systemPrompt}
              onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
              placeholder="Define the synth's personality, expertise, and behavior..."
              className="min-h-[120px]"
            />
            <p className="text-xs text-neutral-500">
              This prompt will define how the synth behaves and responds in conversations.
            </p>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="edit-is-public" 
              checked={isPublic} 
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <Label htmlFor="edit-is-public" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Make this synth public
            </Label>
            <p className="text-xs text-neutral-500 ml-2">
              Public synths can be seen and used by other users
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSynthModal; 