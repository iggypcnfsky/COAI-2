import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Check, Wand2, User, Loader2, Sparkles, Bot } from 'lucide-react';
import { AIEmployee } from '@/types';
import { Card } from '@/components/ui/card';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateAITeam } from '@/lib/api-utils';
import Logo from '@/components/Logo';
import { DEFAULT_MODEL_ID } from '@shared/models';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (team: CustomTeam) => void;
  availableSynths: AIEmployee[];
  customSynths: AIEmployee[];
  onTeamGenerationStart?: (generationData: { 
    keywords: string; 
    teamSize: number; 
    includeExistingSynths: boolean; 
    teamType: string; 
    averageAge: number; 
    genderDistribution: { male: number; female: number; nonBinary: number; };
    baseModel: string;
    existingSynths?: any[]; 
  }) => void;
}

export interface CustomTeam {
  id: string;
  name: string;
  description?: string;
  selectedSynths: AIEmployee[];
  teamImage?: string;
  isPublic: boolean;
}

interface GeneratedTeamMember {
  name: string;
  age: number;
  gender?: string;
  role: string;
  systemPrompt: string;
  baseModel: string;
  profileImage: string;
  bio?: string;
  experience?: string[];
  isExisting?: boolean;
  existingId?: string;
}

interface GeneratedTeam {
  name: string;
  description: string;
  members: GeneratedTeamMember[];
  teamImage?: string;
  collaborationStyle?: string;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customSynths,
  onTeamGenerationStart,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('ai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTeam, setGeneratedTeam] = useState<GeneratedTeam | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  // Manual form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teamImage: '',
  });
  const [selectedSynths, setSelectedSynths] = useState<AIEmployee[]>([]);
  const [imagePreview, setImagePreview] = useState<string>('');

  // AI form state
  const [aiKeywords, setAiKeywords] = useState('');
  const [teamSize, setTeamSize] = useState(3);
  const [includeExistingSynths, setIncludeExistingSynths] = useState(false);
  const [teamType, setTeamType] = useState<'team' | 'group'>('group');
  const [averageAge, setAverageAge] = useState(35);
  const [aiBaseModel, setAiBaseModel] = useState(DEFAULT_MODEL_ID);
  
  // Gender distribution state (percentages that must add up to 100)
  const [genderDistribution, setGenderDistribution] = useState({
    male: 50,
    female: 50,
    nonBinary: 0,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        teamImage: URL.createObjectURL(file)
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
      } else {
        return [...prev, synth];
      }
    });
  };

  const handleGenerateAITeam = async () => {
    if (!aiKeywords.trim()) {
      alert('Please enter some keywords to generate a group');
      return;
    }

    // Notify parent to start showing loading card and close modal
    if (onTeamGenerationStart) {
      onTeamGenerationStart({
        keywords: aiKeywords,
        teamSize: teamSize,
        includeExistingSynths: includeExistingSynths,
        teamType: teamType,
        averageAge: averageAge,
        genderDistribution: genderDistribution,
        baseModel: aiBaseModel,
        existingSynths: includeExistingSynths ? customSynths : [],
      });
      handleClose(); // Close modal immediately
      return;
    }

    // Fallback to old behavior if no onTeamGenerationStart callback
    setIsGenerating(true);
    
    try {
      const generatedTeamData = await generateAITeam({
        keywords: aiKeywords,
        teamSize: teamSize,
        useExistingSynths: includeExistingSynths,
        existingSynths: includeExistingSynths ? customSynths : [],
        baseModel: aiBaseModel,
        teamType: teamType,
        averageAge: averageAge,
        genderDistribution: genderDistribution,
      });

      setGeneratedTeam(generatedTeamData);
      console.log('✅ AI Team generated successfully:', generatedTeamData.name);
    } catch (error) {
      console.error('❌ Error generating AI team:', error);
      alert(`Failed to generate group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAITeam = () => {
    if (!generatedTeam) {
      alert('No generated group to save');
      return;
    }

    // Convert generated team members to AIEmployee format
    const teamSynths: AIEmployee[] = generatedTeam.members.map((member, index) => {
      if (member.isExisting && member.existingId) {
        // Find the existing synth
        const existingSynth = customSynths.find(s => s.id === member.existingId);
        return existingSynth || {
          id: member.existingId,
          name: member.name,
          age: member.age,
          gender: member.gender as AIEmployee['gender'],
          role: member.role,
          systemPrompt: member.systemPrompt,
          baseModel: member.baseModel as AIEmployee['baseModel'],
          profileImage: member.profileImage || '/images/default-avatar.png',
          bio: member.bio,
          experience: member.experience,
        };
      } else {
        // Create new synth from generated data
        return {
          id: `generated-synth-${Date.now()}-${index}`,
          name: member.name,
          age: member.age,
          gender: member.gender as AIEmployee['gender'],
          role: member.role,
          systemPrompt: member.systemPrompt,
          baseModel: member.baseModel as AIEmployee['baseModel'],
          profileImage: member.profileImage,
          bio: member.bio,
          experience: member.experience,
          isLoadingImage: true,
        };
      }
    });

    const newTeam: CustomTeam = {
      id: `ai-team-${Date.now()}`,
      name: generatedTeam.name,
      description: generatedTeam.description,
      selectedSynths: teamSynths,
      teamImage: generatedTeam.teamImage,
      isPublic,
    };

    onSave(newTeam);
    handleClose();
  };

  const handleSaveManual = () => {
    if (!formData.name.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedSynths.length === 0) {
      alert('Please select at least one synth for the group');
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

    const newTeam: CustomTeam = {
      id: `custom-team-${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      selectedSynths: validatedSynths,
      teamImage: formData.teamImage || undefined,
      isPublic,
    };

    onSave(newTeam);
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
    setAiKeywords('');
    setTeamSize(3);
    setIncludeExistingSynths(false);
    setGeneratedTeam(null);
    setTeamType('group');
    setActiveTab('ai');
    setAverageAge(35);
    setAiBaseModel(DEFAULT_MODEL_ID);
    setGenderDistribution({ male: 50, female: 50, nonBinary: 0 });
    setIsPublic(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-sm font-medium">Create group</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-7 w-7"
          title="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3">
        {/* AI/Manual Toggle and Content */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'ai' | 'manual')} className="w-full">
          <div className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                AI
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>
          </div>

          {/* AI-Powered Creation Tab */}
          <TabsContent value="ai" className="space-y-4 mt-0">
            <div className="space-y-3">
              <Label htmlFor="ai-keywords" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Describe your group
              </Label>
              <Textarea
                id="ai-keywords"
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder="e.g., marketing experts for social media campaigns, data science group for analytics..."
                disabled={isGenerating}
                className="min-h-[120px] text-sm resize-none"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Be specific about roles, expertise, and any traits you want.
              </p>
            </div>

              <Button 
                onClick={handleGenerateAITeam}
                disabled={isGenerating || !aiKeywords.trim()}
                className="w-full h-9 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Logo size={16} color="white" className="mr-2" />
                    Generate group
                  </>
                )}
              </Button>

              {/* Generated Team Preview */}
              {generatedTeam && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Group generated
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      {generatedTeam.teamImage && (
                        <img
                          src={generatedTeam.teamImage}
                          alt={generatedTeam.name}
                          className="w-20 h-20 rounded-lg object-cover border"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{generatedTeam.name}</h3>
                        <p className="text-neutral-600 dark:text-neutral-400">{generatedTeam.description}</p>
                        <p className="text-sm text-neutral-500 mt-1">
                          {generatedTeam.members.length} members
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Members</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {generatedTeam.members.map((member, index) => (
                          <div key={index} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                            <div className="font-medium text-sm">{member.name}</div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400">{member.role}</div>
                            <div className="text-xs text-neutral-500">
                              Age {member.age}
                              {member.gender && ` • ${member.gender.charAt(0).toUpperCase() + member.gender.slice(1)}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {generatedTeam.collaborationStyle && (
                      <div>
                        <Label className="text-sm font-medium">Collaboration Style</Label>
                        <div className="mt-1 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm">
                          {generatedTeam.collaborationStyle}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          {/* Manual Creation Tab */}
          <TabsContent value="manual" className="space-y-3 mt-0">
            {/* Team Image Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Group image (optional)</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Team preview"
                      className="w-20 h-20 rounded-lg object-cover border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg flex items-center justify-center">
                    <Upload className="h-8 w-8 text-neutral-400" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="team-image-upload"
                  />
                  <Label
                    htmlFor="team-image-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </Label>
                </div>
              </div>
            </div>

            {/* Team Name */}
            <div className="space-y-2">
              <Label htmlFor="team-name" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Group name *</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter group name"
              />
            </div>

            {/* Team Description */}
            <div className="space-y-2">
              <Label htmlFor="team-description" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Description (optional)</Label>
              <Textarea
                id="team-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this group does..."
                className="min-h-[80px] text-sm resize-none"
              />
            </div>

            {/* Synth Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Select members</Label>
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                {customSynths.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {customSynths.map((synth) => (
                      <div
                        key={synth.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSynths.some(s => s.id === synth.id)
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 dark:border-purple-400'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                        onClick={() => handleToggleSynth(synth)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={synth.profileImage}
                              alt={synth.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div>
                              <div className="font-medium">{synth.name}</div>
                              <div className="text-sm text-neutral-600 dark:text-neutral-400">{synth.role}</div>
                            </div>
                          </div>
                          {selectedSynths.some(s => s.id === synth.id) && (
                            <Check className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                    <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No custom synths available</p>
                    <p className="text-sm">Create some synths first to add them to groups</p>
                  </div>
                )}
              </div>
              {selectedSynths.length > 0 && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {selectedSynths.length} synth{selectedSynths.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </ScrollArea>

        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          {activeTab === 'ai' && generatedTeam ? (
            <Button 
              onClick={handleSaveAITeam}
              className="flex-1"
            >
              Create group
            </Button>
          ) : activeTab === 'manual' ? (
            <Button 
              onClick={handleSaveManual} 
              disabled={!formData.name.trim() || selectedSynths.length === 0}
              className="flex-1"
            >
              Create group
            </Button>
          ) : null}
        </div>
    </div>
  );
};

export default CreateTeamModal; 