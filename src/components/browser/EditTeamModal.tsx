import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Plus, Check } from 'lucide-react';
import { AIEmployee } from '@/types';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomTeam } from './CreateTeamModal';

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (team: CustomTeam) => void;
  availableSynths: AIEmployee[];
  customSynths: AIEmployee[];
  team: CustomTeam | null;
}

const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableSynths,
  customSynths,
  team,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teamImage: '',
  });
  const [selectedSynths, setSelectedSynths] = useState<AIEmployee[]>([]);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Initialize form data when team changes
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || '',
        teamImage: team.teamImage || '',
      });
      setSelectedSynths(team.selectedSynths);
      setImagePreview(team.teamImage || '');
    }
  }, [team]);

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
          teamImage: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData(prev => ({
      ...prev,
      teamImage: ''
    }));
  };

  const handleToggleSynth = (synth: AIEmployee) => {
    setSelectedSynths(prev => {
      const isSelected = prev.some(s => s.id === synth.id);
      if (isSelected) {
        return prev.filter(s => s.id !== synth.id);
      } else {
        return [...prev, synth];
      }
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter a team name');
      return;
    }

    if (selectedSynths.length === 0) {
      alert('Please select at least one synth for the team');
      return;
    }

    if (!team) {
      alert('No team selected for editing');
      return;
    }

    // Validate that all selected synths have required properties
    const validatedSynths = selectedSynths.filter(synth => 
      synth && synth.id && synth.name && synth.role
    );

    if (validatedSynths.length === 0) {
      alert('Selected synths are missing required data. Please try again.');
      return;
    }

    const updatedTeam: CustomTeam = {
      ...team,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      selectedSynths: validatedSynths,
      teamImage: formData.teamImage || undefined,
    };

    onSave(updatedTeam);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      teamImage: '',
    });
    setSelectedSynths([]);
    setImagePreview('');
    onClose();
  };

  if (!team) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Team Image Upload */}
          <div className="space-y-2">
            <Label>Team Image (Optional)</Label>
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
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="edit-team-image-upload"
                />
                <Label htmlFor="edit-team-image-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>Upload Image</span>
                  </Button>
                </Label>
                <p className="text-xs text-neutral-500 mt-1">
                  Recommended: 400x400px or larger
                </p>
              </div>
            </div>
          </div>

          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-team-name">Team Name *</Label>
            <Input
              id="edit-team-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter team name"
            />
          </div>

          {/* Team Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-team-description">Description (Optional)</Label>
            <Textarea
              id="edit-team-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this team specializes in..."
              className="min-h-[80px]"
            />
          </div>

          {/* Selected Synths Summary */}
          {selectedSynths.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Team Members ({selectedSynths.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border">
                {selectedSynths.map((synth) => (
                  <div
                    key={synth.id}
                    className="flex items-center gap-2 bg-white dark:bg-neutral-700 border rounded-full pl-1 pr-3 py-1"
                  >
                    <img
                      src={synth.profileImage}
                      alt={synth.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium">{synth.name}</span>
                    <span className="text-xs text-neutral-500">{synth.role}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600"
                      onClick={() => handleToggleSynth(synth)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Synths Selection */}
          <div className="space-y-4">
            <Label>Available Team Members</Label>
            
            {/* Custom Synths Section */}
            {customSynths.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Your Custom Synths ({customSynths.length})
                </h3>
                <ScrollArea className="h-[200px] border rounded-lg p-3 bg-purple-50/30 dark:bg-purple-900/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customSynths.map((synth) => {
                      const isSelected = selectedSynths.some(s => s.id === synth.id);
                      return (
                        <Card
                          key={synth.id}
                          className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isSelected 
                              ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                          onClick={() => handleToggleSynth(synth)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={synth.profileImage}
                                alt={synth.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                                <span className="text-xs font-bold">C</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{synth.name}</h4>
                              <p className="text-xs text-neutral-500 truncate">{synth.role}</p>
                              <p className="text-xs text-neutral-400">Age {synth.age} • {synth.baseModel}</p>
                            </div>
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSynth(synth);
                              }}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  Selected
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Pre-made Synths Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Pre-made Synths ({availableSynths.length})
              </h3>
              <ScrollArea className="h-[200px] border rounded-lg p-3 bg-blue-50/30 dark:bg-blue-900/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableSynths.map((synth) => {
                    const isSelected = selectedSynths.some(s => s.id === synth.id);
                    return (
                      <Card
                        key={synth.id}
                        className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          isSelected 
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        onClick={() => handleToggleSynth(synth)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={synth.profileImage}
                              alt={synth.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{synth.name}</h4>
                            <p className="text-xs text-neutral-500 truncate">{synth.role}</p>
                            <p className="text-xs text-neutral-400">Age {synth.age} • {synth.baseModel}</p>
                          </div>
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className="flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSynth(synth);
                            }}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Selected
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 mr-1" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
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

export default EditTeamModal; 