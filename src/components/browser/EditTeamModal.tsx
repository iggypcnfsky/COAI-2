import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Check, Bot } from 'lucide-react';
import { AIEmployee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
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

  const memberOptions = useMemo(() => {
    const byId = new Map<string, AIEmployee>();
    for (const synth of customSynths) byId.set(synth.id, synth);
    for (const synth of selectedSynths) {
      if (!byId.has(synth.id)) byId.set(synth.id, synth);
    }
    return Array.from(byId.values());
  }, [customSynths, selectedSynths]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setFormData(prev => ({
        ...prev,
        teamImage: url
      }));
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
      }
      return [...prev, synth];
    });
  };

  const handleClose = () => {
    onClose();
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedSynths.length === 0) {
      alert('Please select at least one synth for the group');
      return;
    }

    if (!team) {
      alert('No group selected for editing');
      return;
    }

    const validatedSynths = selectedSynths.filter(synth =>
      synth && synth.id && synth.name && synth.role
    );

    if (validatedSynths.length === 0) {
      alert('Selected synths are missing required data. Please try again.');
      return;
    }

    onSave({
      ...team,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      selectedSynths: validatedSynths,
      teamImage: formData.teamImage || undefined,
    });
  };

  if (!isOpen || !team) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-sm font-medium">Edit group</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-7 w-7 rounded-full"
          title="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Group image (optional)</Label>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                <div className="relative shrink-0">
                  <img
                    src={imagePreview}
                    alt="Group preview"
                    className="w-24 h-16 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-700"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-24 h-16 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl flex items-center justify-center shrink-0">
                  <Upload className="h-5 w-5 text-neutral-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="edit-team-image-upload"
                />
                <Label
                  htmlFor="edit-team-image-upload"
                  className="cursor-pointer inline-flex items-center gap-2 h-8 rounded-full px-3 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload image
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-team-name" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Group name *</Label>
            <Input
              id="edit-team-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter group name"
              className="rounded-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-team-description" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Description (optional)</Label>
            <Textarea
              id="edit-team-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this group does..."
              className="min-h-[80px] text-sm resize-none rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Select members</Label>
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 max-h-72 overflow-y-auto">
              {memberOptions.length > 0 ? (
                <div className="flex flex-col">
                  {memberOptions.map((synth) => {
                    const isSelected = selectedSynths.some(s => s.id === synth.id);
                    return (
                      <button
                        key={synth.id}
                        type="button"
                        className={`flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-neutral-100 dark:bg-neutral-800'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/70'
                        }`}
                        onClick={() => handleToggleSynth(synth)}
                      >
                        <PersonAvatar
                          name={synth.name}
                          src={synth.profileImage}
                          className="h-9 w-9"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate leading-tight">
                            {synth.name}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {synth.role}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-neutral-700 dark:text-neutral-200 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                  <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No synths available</p>
                  <p className="text-xs mt-1">Create some synths first to add them to groups</p>
                </div>
              )}
            </div>
            {selectedSynths.length > 0 && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {selectedSynths.length} {selectedSynths.length === 1 ? 'member' : 'members'} selected
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 shrink-0">
        <Button variant="outline" onClick={handleClose} className="flex-1 rounded-full">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formData.name.trim() || selectedSynths.length === 0}
          className="flex-1 rounded-full"
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default EditTeamModal;
