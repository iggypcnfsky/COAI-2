import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Check, Wand2, User, Loader2, Sparkles, Bot } from 'lucide-react';
import { AIEmployee } from '@/types';
import { Card } from '@/components/ui/card';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelSelectItems } from '@/components/ModelSelect';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { generateAITeam } from '@/lib/api-utils';
import Logo from '@/components/Logo';

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
  const [teamType, setTeamType] = useState<'team' | 'group'>('team');
  const [averageAge, setAverageAge] = useState(35);
  const [aiBaseModel, setAiBaseModel] = useState('claude-3-5-sonnet');
  
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

  // Handle gender distribution changes ensuring they always add up to 100%
  const handleGenderDistributionChange = (gender: 'male' | 'female' | 'nonBinary', value: number) => {
    setGenderDistribution(prev => {
      const newDistribution = { ...prev };
      const otherGenders = Object.keys(newDistribution).filter(g => g !== gender) as Array<'male' | 'female' | 'nonBinary'>;
      
      // Set the new value for the changed gender
      newDistribution[gender] = value;
      
      // Calculate remaining percentage for other genders
      const remaining = 100 - value;
      
      if (remaining <= 0) {
        // If the current gender takes 100% or more, set others to 0
        otherGenders.forEach(g => {
          newDistribution[g] = 0;
        });
        newDistribution[gender] = 100;
      } else {
        // Distribute the remaining percentage proportionally among other genders
        const currentOtherTotal = otherGenders.reduce((sum, g) => sum + prev[g], 0);
        
        if (currentOtherTotal > 0) {
          // Distribute proportionally based on current values
          let distributedTotal = 0;
          otherGenders.forEach((g, index) => {
            if (index === otherGenders.length - 1) {
              // Last gender gets the remainder to ensure exact 100%
              newDistribution[g] = remaining - distributedTotal;
            } else {
              const proportion = prev[g] / currentOtherTotal;
              const newValue = Math.round(remaining * proportion);
              newDistribution[g] = newValue;
              distributedTotal += newValue;
            }
          });
        } else {
          // If other genders were 0, distribute equally
          const perGender = Math.floor(remaining / otherGenders.length);
          const remainder = remaining % otherGenders.length;
          
          otherGenders.forEach((g, index) => {
            newDistribution[g] = perGender + (index < remainder ? 1 : 0);
          });
        }
      }
      
      return newDistribution;
    });
  };

  const handleGenerateAITeam = async () => {
    if (!aiKeywords.trim()) {
      alert('Please enter some keywords to generate a team');
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
    setTeamSize(3);
    setIncludeExistingSynths(false);
    setGeneratedTeam(null);
    setTeamType('team');
    setActiveTab('ai');
    setAverageAge(35);
    setAiBaseModel('claude-3-5-sonnet');
    setGenderDistribution({ male: 50, female: 50, nonBinary: 0 });
    setIsPublic(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-center gap-3 text-2xl">
            <Logo size={32} color="#8b5cf6" />
            Create New Team
          </DialogTitle>
        </DialogHeader>
        
        {/* AI/Manual Toggle and Content */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'ai' | 'manual')} className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
              <TabsTrigger value="ai" className="flex items-center gap-2 text-base">
                <Wand2 className="h-5 w-5" />
                AI
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2 text-base">
                <User className="h-5 w-5" />
                Manual
              </TabsTrigger>
            </TabsList>
          </div>

          {/* AI-Powered Creation Tab */}
          <TabsContent value="ai" className="space-y-6 mt-0">
            <div className="space-y-6">
              {/* Keywords Input - Bigger */}
              <div className="space-y-3">
                <Label htmlFor="ai-keywords" className="text-lg font-semibold">
                  Describe Your Team
                </Label>
                <Textarea
                  id="ai-keywords"
                  value={aiKeywords}
                  onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="e.g., marketing experts for social media campaigns, data science team for analytics, angry customers complaining about service..."
                  disabled={isGenerating}
                  className="min-h-[120px] text-base resize-none"
                />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Be specific about the team type, roles, expertise, and any special traits you want. The more detail, the better the result.
                </p>
              </div>

              {/* Team Type Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Team Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTeamType('team')}
                    disabled={isGenerating}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      teamType === 'team'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 dark:border-purple-400'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="font-medium">Team</div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      Collaborative group working together
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
                      e.g., "design studio", "marketing team"
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamType('group')}
                    disabled={isGenerating}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      teamType === 'group'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 dark:border-purple-400'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="font-medium">Group</div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      Collection of individuals with shared traits
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
                      e.g., "angry customers", "investors"
                    </div>
                  </button>
                </div>
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Size */}
                <div className="space-y-3">
                  <Label htmlFor="ai-team-size" className="text-base font-medium">Team Size</Label>
                  <div className="relative">
                    <Input
                      id="ai-team-size"
                      type="number"
                      min="2"
                      max="20"
                      value={teamSize}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 2 && value <= 20) {
                          setTeamSize(value);
                        }
                      }}
                      disabled={isGenerating}
                      className="h-12 pr-20"
                      placeholder="Enter team size"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
                      members
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Choose between 2-20 team members
                  </p>
                </div>

                {/* AI Model */}
                <div className="space-y-3">
                  <Label htmlFor="ai-model" className="text-base font-medium">AI Model</Label>
                  <Select value={aiBaseModel} onValueChange={setAiBaseModel} disabled={isGenerating}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <ModelSelectItems />
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Age Slider */}
              <div className="space-y-4">
                <Label htmlFor="ai-average-age" className="text-base font-medium">Average Age</Label>
                <div className="space-y-3">
                  <Slider
                    value={[averageAge]}
                    onValueChange={(value) => setAverageAge(value[0])}
                    max={120}
                    min={5}
                    step={1}
                    disabled={isGenerating}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                    <span>5</span>
                    <span className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">{averageAge} years old</span>
                    <span>120</span>
                  </div>
                </div>
              </div>

              {/* Gender Distribution */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Gender Distribution</Label>
                <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                  {/* Male */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">Male</Label>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{genderDistribution.male}%</span>
                    </div>
                    <Slider
                      value={[genderDistribution.male]}
                      onValueChange={(value) => handleGenderDistributionChange('male', value[0])}
                      max={100}
                      min={0}
                      step={5}
                      disabled={isGenerating}
                      className="w-full"
                    />
                  </div>

                  {/* Female */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">Female</Label>
                      <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">{genderDistribution.female}%</span>
                    </div>
                    <Slider
                      value={[genderDistribution.female]}
                      onValueChange={(value) => handleGenderDistributionChange('female', value[0])}
                      max={100}
                      min={0}
                      step={5}
                      disabled={isGenerating}
                      className="w-full"
                    />
                  </div>

                  {/* Non-binary */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">Non-binary</Label>
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{genderDistribution.nonBinary}%</span>
                    </div>
                    <Slider
                      value={[genderDistribution.nonBinary]}
                      onValueChange={(value) => handleGenderDistributionChange('nonBinary', value[0])}
                      max={100}
                      min={0}
                      step={5}
                      disabled={isGenerating}
                      className="w-full"
                    />
                  </div>

                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    Total: {genderDistribution.male + genderDistribution.female + genderDistribution.nonBinary}%
                    <span className="text-green-600 dark:text-green-400 ml-1">✓ Balanced</span>
                  </div>
                </div>
              </div>

              {/* Include Existing Synths Toggle */}
              <div className="flex items-center space-x-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <Checkbox 
                  id="include-existing" 
                  checked={includeExistingSynths} 
                  onCheckedChange={(checked) => setIncludeExistingSynths(checked as boolean)}
                  className="h-5 w-5"
                  disabled={isGenerating}
                />
                <div className="flex-1">
                  <Label htmlFor="include-existing" className="text-base font-medium cursor-pointer">
                    Include existing synths
                  </Label>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    AI will try to use your existing synths when they match the team requirements
                  </p>
                </div>
              </div>

              {/* Public/Private Toggle */}
              <div className="flex items-center space-x-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <Checkbox 
                  id="ai-is-public" 
                  checked={isPublic} 
                  onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                  className="h-5 w-5"
                />
                <div className="flex-1">
                  <Label htmlFor="ai-is-public" className="text-base font-medium cursor-pointer">
                    Make this team public
                  </Label>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Public teams can be discovered and used by other users
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerateAITeam}
                disabled={isGenerating || !aiKeywords.trim() || teamSize < 2 || teamSize > 20}
                className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                    Generating Team...
                  </>
                ) : (
                  <>
                    <Logo size={24} color="white" className="mr-3" />
                    Generate AI Team
                  </>
                )}
              </Button>

              {/* Generated Team Preview */}
              {generatedTeam && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Team Generated Successfully!
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
                          {generatedTeam.members.length} members • {teamType}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Team Members</Label>
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
            </div>
          </TabsContent>

          {/* Manual Creation Tab */}
          <TabsContent value="manual" className="space-y-6 mt-0">
            {/* Team Image Upload */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Team Image (Optional)</Label>
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
            <div className="space-y-3">
              <Label htmlFor="team-name" className="text-base font-medium">Team Name *</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter team name"
                className="h-12"
              />
            </div>

            {/* Team Description */}
            <div className="space-y-3">
              <Label htmlFor="team-description" className="text-base font-medium">Description (Optional)</Label>
              <Textarea
                id="team-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this team does..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Synth Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Team Members</Label>
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
                    <p className="text-sm">Create some synths first to add them to teams</p>
                  </div>
                )}
              </div>
              {selectedSynths.length > 0 && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {selectedSynths.length} synth{selectedSynths.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Public/Private Toggle */}
            <div className="flex items-center space-x-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <Checkbox 
                id="manual-is-public" 
                checked={isPublic} 
                onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                className="h-5 w-5"
              />
              <div className="flex-1">
                <Label htmlFor="manual-is-public" className="text-base font-medium cursor-pointer">
                  Make this team public
                </Label>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Public teams can be discovered and used by other users
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="outline" onClick={handleClose} className="h-12 px-6">
            Cancel
          </Button>
          {activeTab === 'ai' ? (
            <Button 
              onClick={handleSaveAITeam}
              disabled={!generatedTeam}
              className="h-12 px-6"
            >
              Create AI Team
            </Button>
          ) : (
            <Button 
              onClick={handleSaveManual} 
              disabled={!formData.name.trim() || selectedSynths.length === 0}
              className="h-12 px-6"
            >
              Create Team
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamModal; 