import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Upload, X, Wand2, User, Loader2, Sparkles } from 'lucide-react';
import { AIEmployee } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateAISynth } from '@/lib/api-utils';
import { Checkbox } from '@/components/ui/checkbox';
import Logo from '@/components/Logo';

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
  const [aiBaseModel, setAiBaseModel] = useState('claude-3-5-sonnet');
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
      isPublic,
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
    setAiBaseModel('claude-3-5-sonnet');
    setAverageAge(35);
    setGender('any');
    setGeneratedSynth(null);
    setActiveTab('ai');
    setIsPublic(true);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-center gap-3 text-2xl">
            <Logo size={32} color="#8b5cf6" />
            Create New Synth
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
                  Describe Your Synth
                </Label>
                <Textarea
                  id="ai-keywords"
                  value={aiKeywords}
                  onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="e.g., creative designer with 10 years experience, marketing expert specializing in social media, friendly data scientist who loves explaining complex concepts..."
                  disabled={isGenerating}
                  className="min-h-[120px] text-base resize-none"
                />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Be specific about the role, personality, expertise, and any special traits you want. The more detail, the better the result.
                </p>
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Model */}
                <div className="space-y-3">
                  <Label htmlFor="ai-model" className="text-base font-medium">AI Model</Label>
                  <Select value={aiBaseModel} onValueChange={setAiBaseModel} disabled={isGenerating}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                      <SelectItem value="o4-mini">O4 Mini</SelectItem>
                      <SelectItem value="o3">O3</SelectItem>
                      <SelectItem value="o1">O1</SelectItem>
                      <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="chatgpt-4o-latest">ChatGPT-4o Latest</SelectItem>
                      <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="claude-4-sonnet">Claude 4 Sonnet</SelectItem>
                      <SelectItem value="claude-4-opus">Claude 4 Opus</SelectItem>
                                          <SelectItem value="sonar">Perplexity Sonar</SelectItem>
                    <SelectItem value="sonar-pro">Perplexity Sonar Pro</SelectItem>
                    <SelectItem value="sonar-reasoning">Perplexity Sonar Reasoning</SelectItem>
                    <SelectItem value="sonar-reasoning-pro">Perplexity Sonar Reasoning Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender */}
                <div className="space-y-3">
                  <Label htmlFor="ai-gender" className="text-base font-medium">Gender</Label>
                  <Select value={gender} onValueChange={setGender} disabled={isGenerating}>
                    <SelectTrigger className="h-12">
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
              </div>

              {/* Age Slider */}
              <div className="space-y-4">
                <Label htmlFor="ai-average-age" className="text-base font-medium">Age</Label>
                <div className="space-y-3">
                  <Slider
                    value={[averageAge]}
                    onValueChange={(value) => setAverageAge(value[0])}
                    max={120}
                    min={18}
                    step={1}
                    disabled={isGenerating}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                    <span>18</span>
                    <span className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">{averageAge} years old</span>
                    <span>120</span>
                  </div>
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
                    Make this synth public
                  </Label>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Public synths can be discovered and used by other users
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerateAISynth}
                disabled={isGenerating || !aiKeywords.trim()}
                className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                    Generating Synth...
                  </>
                ) : (
                  <>
                    <Logo size={24} color="white" className="mr-3" />
                    Generate AI Synth
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
            </div>
          </TabsContent>

          {/* Manual Creation Tab */}
          <TabsContent value="manual" className="space-y-6 mt-0">
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
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter synth name"
            />
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
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
            <Label htmlFor="manual-gender">Gender</Label>
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
            <Label htmlFor="role">Role *</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              placeholder="e.g., Software Engineer, Designer, Marketing Specialist"
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model *</Label>
            <Select value={formData.baseModel} onValueChange={(value) => handleInputChange('baseModel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano</SelectItem>
                <SelectItem value="o4-mini">O4 Mini</SelectItem>
                <SelectItem value="o3">O3</SelectItem>
                <SelectItem value="o1">O1</SelectItem>
                <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="chatgpt-4o-latest">ChatGPT-4o Latest</SelectItem>
                <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="claude-4-sonnet">Claude 4 Sonnet</SelectItem>
                <SelectItem value="claude-4-opus">Claude 4 Opus</SelectItem>
                                    <SelectItem value="sonar">Perplexity Sonar</SelectItem>
                    <SelectItem value="sonar-pro">Perplexity Sonar Pro</SelectItem>
                    <SelectItem value="sonar-reasoning">Perplexity Sonar Reasoning</SelectItem>
                    <SelectItem value="sonar-reasoning-pro">Perplexity Sonar Reasoning Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">System Prompt *</Label>
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

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="manual-is-public" 
              checked={isPublic} 
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <Label htmlFor="manual-is-public" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Make this synth public
            </Label>
            <p className="text-xs text-neutral-500 ml-2">
              Public synths can be seen and used by other users
            </p>
          </div>
        </TabsContent>
        </Tabs>

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={handleClose} className="h-12 px-6">
            Cancel
          </Button>
          {activeTab === 'ai' ? (
            <Button 
              onClick={handleSaveAISynth}
              disabled={!generatedSynth}
              className="h-12 px-6"
            >
              Create AI Synth
            </Button>
          ) : (
            <Button onClick={handleSaveManual} className="h-12 px-6">
              Create Synth
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSynthModal; 