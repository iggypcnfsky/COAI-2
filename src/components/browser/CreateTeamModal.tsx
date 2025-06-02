import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Plus, Check, Wand2, User, Loader2, Sparkles } from 'lucide-react';
import { AIEmployee } from '@/types';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { generateAITeam } from '@/lib/api-utils';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (team: CustomTeam) => void;
  availableSynths: AIEmployee[];
  customSynths: AIEmployee[];
  onTeamGenerationStart?: (generationData: { keywords: string; teamSize: number; includeExistingSynths: boolean; teamType: string; averageAge: number; existingSynths?: any[]; }) => void;
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
  collaborationStyle: string;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableSynths,
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
  const [teamSize, setTeamSize] = useState('3'); // Keep as string for Select component
  const [includeExistingSynths, setIncludeExistingSynths] = useState(false);
  const [teamType, setTeamType] = useState<'team' | 'group'>('team'); // New state for team type
  const [averageAge, setAverageAge] = useState(35); // New state for average age

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
      alert('Please enter some keywords to generate a team');
      return;
    }

    // Prepare existing synths data if using them
    const existingSynthsData = includeExistingSynths ? 
      [...availableSynths, ...customSynths].map(synth => ({
        id: synth.id,
        name: synth.name,
        role: synth.role,
        bio: synth.bio,
        experience: synth.experience,
      })) : [];

    // Notify parent to start showing loading card and close modal
    if (onTeamGenerationStart) {
      onTeamGenerationStart({
        keywords: aiKeywords,
        teamSize: parseInt(teamSize),
        includeExistingSynths: includeExistingSynths,
        teamType: teamType,
        averageAge: averageAge,
        existingSynths: existingSynthsData,
      });
      handleClose(); // Close modal immediately
      return;
    }

    // Fallback to old behavior if no onTeamGenerationStart callback
    setIsGenerating(true);
    
    try {
      const generatedTeamData = await generateAITeam({
        keywords: aiKeywords,
        teamSize: parseInt(teamSize),
        useExistingSynths: includeExistingSynths,
        existingSynths: existingSynthsData,
        baseModel: 'gpt-4o',
        teamType: teamType,
        averageAge: averageAge,
      });

      setGeneratedTeam(generatedTeamData);
      console.log('✅ AI Team generated successfully:', generatedTeamData.name);
    } catch (error) {
      console.error('❌ Error generating AI team:', error);
      alert(`Failed to generate team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAITeam = () => {
    if (!generatedTeam) {
      alert('No generated team to save');
      return;
    }

    // Convert generated team members to AIEmployee format
    const teamSynths: AIEmployee[] = generatedTeam.members.map((member, index) => {
      if (member.isExisting && member.existingId) {
        // Find the existing synth
        const existingSynth = [...availableSynths, ...customSynths].find(s => s.id === member.existingId);
        return existingSynth || {
          id: member.existingId,
          name: member.name,
          age: member.age,
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
          role: member.role,
          systemPrompt: member.systemPrompt,
          baseModel: member.baseModel as AIEmployee['baseModel'],
          profileImage: member.profileImage,
          bio: member.bio,
          experience: member.experience,
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
      alert('Please enter a team name');
      return;
    }

    if (selectedSynths.length === 0) {
      alert('Please select at least one synth for the team');
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
    setTeamSize('3');
    setIncludeExistingSynths(false);
    setGeneratedTeam(null);
    setTeamType('team'); // Reset team type to default
    setActiveTab('ai');
    setAverageAge(35); // Reset average age to default
    setIsPublic(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Create New Team
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'ai')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              AI-Powered
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          {/* AI-Powered Creation Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-purple-500" />
                  AI-Powered Team Generation
                </CardTitle>
                <CardDescription>
                  Describe what kind of team you need using keywords, and AI will create a complete team with members, roles, and collaboration style.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-keywords">Keywords</Label>
                    <Input
                      id="ai-keywords"
                      placeholder="Enter keywords to describe the team (e.g., 'marketing experts', 'data scientists')"
                      value={aiKeywords}
                      onChange={(e) => setAiKeywords(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Team Type Selection */}
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTeamType('team')}
                        disabled={isGenerating}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          teamType === 'team'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="font-medium">Team</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Collaborative group working together
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          e.g., "design studio", "marketing team"
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeamType('group')}
                        disabled={isGenerating}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          teamType === 'group'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="font-medium">Group</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Collection of individuals with shared traits
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          e.g., "angry customers", "investors"
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-team-size">Team Size</Label>
                    <Select value={teamSize} onValueChange={setTeamSize} disabled={isGenerating}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 members</SelectItem>
                        <SelectItem value="3">3 members</SelectItem>
                        <SelectItem value="4">4 members</SelectItem>
                        <SelectItem value="5">5 members</SelectItem>
                        <SelectItem value="6">6 members</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai-average-age">Average Age</Label>
                    <div className="space-y-2">
                      <Slider
                        value={[averageAge]}
                        onValueChange={(value) => setAverageAge(value[0])}
                        max={120}
                        min={0}
                        step={1}
                        disabled={isGenerating}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0</span>
                        <span className="font-medium">{averageAge} years old</span>
                        <span>120</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="use-existing"
                        checked={includeExistingSynths}
                        onCheckedChange={(checked) => setIncludeExistingSynths(checked as boolean)}
                        disabled={isGenerating}
                      />
                      <Label htmlFor="use-existing" className="text-sm">
                        Include existing synths when possible
                      </Label>
                    </div>
                    <p className="text-xs text-neutral-500">
                      AI will try to use your existing synths if they fit the team roles.
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerateAITeam}
                  disabled={isGenerating || !aiKeywords.trim()}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Team...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate AI Team
                    </>
                  )}
                </Button>

                {/* Generated Team Preview */}
                {generatedTeam && (
                  <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
                    <CardHeader>
                      <CardTitle className="text-green-700 dark:text-green-300">
                        ✅ Team Generated Successfully!
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
                            {generatedTeam.members.length} members • {generatedTeam.collaborationStyle}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Team Members</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          {generatedTeam.members.map((member, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-lg border">
                              <img
                                src={member.profileImage}
                                alt={member.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">
                                  {member.name}
                                  {member.isExisting && (
                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                      Existing
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs text-neutral-500 truncate">{member.role}</p>
                                <p className="text-xs text-neutral-400">Age {member.age}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Add this before the dialog footer buttons in the AI tab */}
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox 
                    id="ai-team-is-public" 
                    checked={isPublic} 
                    onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                  />
                  <Label htmlFor="ai-team-is-public" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Make this team public
                  </Label>
                  <p className="text-xs text-neutral-500 ml-2">
                    Public teams can be seen and used by other users
                  </p>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveAITeam}
                    disabled={!generatedTeam}
                  >
                    Create AI Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Creation Tab */}
          <TabsContent value="manual" className="space-y-6">
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
                    id="team-image-upload"
                  />
                  <Label htmlFor="team-image-upload" className="cursor-pointer">
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
              <Label htmlFor="team-name">Team Name *</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter team name"
              />
            </div>

            {/* Team Description */}
            <div className="space-y-2">
              <Label htmlFor="team-description">Description (Optional)</Label>
              <Textarea
                id="team-description"
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
              <Label>Select Team Members *</Label>
              <p className="text-xs text-neutral-500">
                Choose from existing synths to build your team
              </p>
              
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
                                  className="w-12 h-12 rounded-lg object-cover"
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
                                className="w-12 h-12 rounded-lg object-cover"
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

            {/* Add this before the manual form's dialog footer buttons */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="manual-team-is-public" 
                checked={isPublic} 
                onCheckedChange={(checked) => setIsPublic(checked as boolean)}
              />
              <Label htmlFor="manual-team-is-public" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Make this team public
              </Label>
              <p className="text-xs text-neutral-500 ml-2">
                Public teams can be seen and used by other users
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSaveManual}>
                Create Team
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamModal; 