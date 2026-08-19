import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModelSelectItems } from '@/components/ModelSelect';
import { Upload, X, Wand2, User, Loader2, Sparkles } from 'lucide-react';
import { AIEmployee } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateAISynth } from '@/lib/api-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import Logo from '@/components/Logo';
import { getRandomChatColor } from '@/lib/utils/colors';
import { DEFAULT_MODEL_ID } from '@shared/models';

interface CreateSynthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (synth: AIEmployee) => void;
  onGenerationStart?: (generationData: { keywords: string; baseModel: string; averageAge: number; gender: string; }) => void;
}

interface GeneratedSynth {
  name: string;
  age: number;
  gender?: string;
  role: string;
  systemPrompt: string;
  baseModel: string;
  profileImage: string;
  bio?: string;
  experience?: string[];
}

const CreateSynthModal: React.FC<CreateSynthModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onGenerationStart,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSynth, setGeneratedSynth] = useState<GeneratedSynth | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  
  // Manual form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'any',
    role: '',
    systemPrompt: '',
    baseModel: '',
    profileImage: '',
  });
  const [imagePreview, setImagePreview] = useState<string>('');

  // AI form state
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiBaseModel, setAiBaseModel] = useState(DEFAULT_MODEL_ID);
  const [averageAge, setAverageAge] = useState(35);
  const [gender, setGender] = useState('any');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        profileImage: URL.createObjectURL(file)
      }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      profileImage: ''
    }));
    setImagePreview('');
  };

  const handleGenerateAISynth = async () => {
    if (!aiKeywords.trim()) {
      alert('Please enter some keywords to generate a synth');
      return;
    }

    // Notify parent to start showing loading card and close modal
    if (onGenerationStart) {
      onGenerationStart({
        keywords: aiKeywords,
        baseModel: aiBaseModel,
        averageAge: averageAge,
        gender: gender,
      });
      handleClose(); // Close modal immediately
      return;
    }

    // Fallback to old behavior if no onGenerationStart callback
    setIsGenerating(true);
    
    try {
      const generatedSynthData = await generateAISynth({
        keywords: aiKeywords,
        baseModel: aiBaseModel,
        averageAge: averageAge,
      });

      setGeneratedSynth(generatedSynthData);
      console.log('✅ AI Synth generated successfully:', generatedSynthData.name);
    } catch (error) {
      console.error('❌ Error generating AI synth:', error);
      alert(`Failed to generate synth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAISynth = () => {
    if (!generatedSynth) {
      alert('No generated synth to save');
      return;
    }

    const newSynth: AIEmployee = {
      id: `synth-${Date.now()}`,
      name: generatedSynth.name,
      age: generatedSynth.age,
      gender: generatedSynth.gender as AIEmployee['gender'],
      role: generatedSynth.role,
      systemPrompt: generatedSynth.systemPrompt,
      baseModel: generatedSynth.baseModel as AIEmployee['baseModel'],
      profileImage: generatedSynth.profileImage,
      bio: generatedSynth.bio,
      experience: generatedSynth.experience,
      chatColor: getRandomChatColor(),
      isPublic,
      isLoadingImage: true,
    };

    onSave(newSynth);
    handleClose();
  };

  const handleSaveManual = () => {
    if (!formData.name || !formData.role || !formData.systemPrompt || !formData.baseModel) {
      alert('Please fill in all required fields');
      return;
    }

    const newSynth: AIEmployee = {
      id: `synth-${Date.now()}`,
      name: formData.name,
      age: parseInt(formData.age) || 25,
      gender: formData.gender as AIEmployee['gender'],
      role: formData.role,
      systemPrompt: formData.systemPrompt,
      baseModel: formData.baseModel as AIEmployee['baseModel'],
      profileImage: formData.profileImage || '/images/default-avatar.png',
      chatColor: getRandomChatColor(),
      isPublic,
    };

    onSave(newSynth);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      age: '',
      gender: 'any',
      role: '',
      systemPrompt: '',
      baseModel: '',
      profileImage: '',
    });
    setImagePreview('');
    setAiKeywords('');
    setAiBaseModel(DEFAULT_MODEL_ID);
    setAverageAge(35);
    setGender('any');
    setGeneratedSynth(null);
    setActiveTab('ai');
    setIsPublic(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-sm font-medium">Create synth</h2>
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
                Describe your synth
              </Label>
              <Textarea
                id="ai-keywords"
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder="e.g., creative designer with 10 years experience, marketing expert specializing in social media..."
                disabled={isGenerating}
                className="min-h-[120px] text-sm resize-none"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Be specific about the role, personality, and expertise.
              </p>
            </div>

              <Button 
                onClick={handleGenerateAISynth}
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
                    Generate synth
                  </>
                )}
              </Button>

              {/* Generated Synth Preview */}
              {generatedSynth && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Synth Generated Successfully!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={generatedSynth.profileImage}
                        alt={generatedSynth.name}
                        className="w-20 h-20 rounded-lg object-cover border"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{generatedSynth.name}</h3>
                        <p className="text-neutral-600 dark:text-neutral-400">{generatedSynth.role}</p>
                        <p className="text-sm text-neutral-500">
                          Age {generatedSynth.age}
                          {generatedSynth.gender && ` • ${generatedSynth.gender.charAt(0).toUpperCase() + generatedSynth.gender.slice(1)}`}
                          {` • ${generatedSynth.baseModel}`}
                        </p>
                        {generatedSynth.bio && (
                          <p className="text-sm mt-2">{generatedSynth.bio}</p>
                        )}
                      </div>
                    </div>
                    
                    {generatedSynth.experience && generatedSynth.experience.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Experience</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {generatedSynth.experience.map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-sm font-medium">System Prompt Preview</Label>
                      <div className="mt-1 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm max-h-32 overflow-y-auto">
                        {generatedSynth.systemPrompt}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          {/* Manual Creation Tab */}
          <TabsContent value="manual" className="space-y-3 mt-0">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Profile Image</Label>
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
                  id="image-upload"
                />
                <Label htmlFor="image-upload" className="cursor-pointer">
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

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter synth name"
            />
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Age</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              placeholder="Enter age (optional)"
              min="18"
              max="100"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="manual-gender" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Role *</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              placeholder="e.g., Software Engineer, Designer, Marketing Specialist"
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">AI Model *</Label>
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
            <Label htmlFor="prompt" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">System Prompt *</Label>
            <Textarea
              id="prompt"
              value={formData.systemPrompt}
              onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
              placeholder="Define the synth's personality, expertise, and behavior..."
              className="min-h-[120px]"
            />
            <p className="text-xs text-neutral-500">
              This prompt will define how the synth behaves and responds in conversations.
            </p>
          </div>
        </TabsContent>
        </Tabs>
        </div>
      </ScrollArea>

        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          {activeTab === 'ai' && generatedSynth ? (
            <Button 
              onClick={handleSaveAISynth}
              className="flex-1"
            >
              Create synth
            </Button>
          ) : activeTab === 'manual' ? (
            <Button onClick={handleSaveManual} className="flex-1">
              Create synth
            </Button>
          ) : null}
        </div>
    </div>
  );
};

export default CreateSynthModal; 