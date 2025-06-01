# AI-Powered Synth and Team Creation Features

This document outlines the comprehensive AI-powered features for automatically creating synths and teams using OpenAI's API.

## Overview

The application now supports two creation modes for both synths and teams:
- **Manual Mode**: Traditional form-based creation (existing functionality)
- **AI-Powered Mode**: Automatic generation using keywords and AI

## Features Implemented

### 1. AI Synth Creation (`create-synth-ai` Edge Function)

**Location**: `supabase/functions/create-synth-ai/index.ts`

**Capabilities**:
- Generates complete synth profiles from keywords
- Creates character details (name, age, role, personality)
- Generates professional system prompts
- Creates profile images using DALL-E 3
- Returns fully formed AIEmployee objects

**API Endpoint**: `POST /functions/v1/create-synth-ai`

**Request Format**:
```json
{
  "keywords": "creative designer, innovative, user-focused",
  "openaiApiKey": "sk-...",
  "baseModel": "gpt-4o"
}
```

**Response Format**:
```json
{
  "success": true,
  "synth": {
    "name": "Sarah Chen",
    "age": 29,
    "role": "Senior UX Designer",
    "systemPrompt": "You are Sarah Chen, a Senior UX Designer...",
    "baseModel": "gpt-4o",
    "profileImage": "data:image/png;base64,...",
    "bio": "Passionate about creating user-centered designs...",
    "experience": ["UI/UX Design", "User Research", "Prototyping", "Design Systems", "Figma"]
  }
}
```

### 2. AI Team Creation (`create-team-ai` Edge Function)

**Location**: `supabase/functions/create-team-ai/index.ts`

**Capabilities**:
- Generates complete teams from keywords
- Creates team concepts and collaboration styles
- Can incorporate existing synths when appropriate
- Generates new team members as needed
- Creates team images using DALL-E 3
- Handles team size preferences (2-6 members)

**API Endpoint**: `POST /functions/v1/create-team-ai`

**Request Format**:
```json
{
  "keywords": "marketing team, startup, data-driven",
  "openaiApiKey": "sk-...",
  "teamSize": 3,
  "useExistingSynths": true,
  "existingSynths": [
    {
      "id": "synth-1",
      "name": "John Doe",
      "role": "Marketing Manager",
      "bio": "Experienced in digital marketing...",
      "experience": ["SEO", "Content Marketing", "Analytics"]
    }
  ],
  "baseModel": "gpt-4o"
}
```

**Response Format**:
```json
{
  "success": true,
  "team": {
    "name": "Growth Marketing Squad",
    "description": "Data-driven marketing team focused on startup growth...",
    "collaborationStyle": "Agile and metrics-focused collaboration",
    "teamImage": "data:image/png;base64,...",
    "members": [
      {
        "name": "John Doe",
        "role": "Marketing Manager",
        "isExisting": true,
        "existingId": "synth-1",
        "systemPrompt": "You are John Doe, working as part of the Growth Marketing Squad..."
      },
      {
        "name": "Emma Rodriguez",
        "role": "Data Analyst",
        "isExisting": false,
        "profileImage": "data:image/png;base64,...",
        "systemPrompt": "You are Emma Rodriguez, a Data Analyst..."
      }
    ]
  }
}
```

### 3. Enhanced UI Components

#### CreateSynthModal
**Location**: `src/components/browser/CreateSynthModal.tsx`

**Features**:
- Tabbed interface (AI-Powered vs Manual)
- Keyword input for AI generation
- Real-time generation progress
- Preview of generated synth before saving
- Fallback to manual mode if needed

#### CreateTeamModal
**Location**: `src/components/browser/CreateTeamModal.tsx`

**Features**:
- Tabbed interface (AI-Powered vs Manual)
- Team size selection (2-6 members)
- Option to include existing synths
- Real-time generation progress
- Preview of generated team and members
- Fallback to manual mode if needed

#### API Key Management
**Location**: `src/components/settings/ApiKeySettings.tsx`

**Features**:
- Secure local storage of OpenAI API keys
- Masked display of stored keys
- Easy editing and removal
- Visual indicators for API key status

### 4. Utility Functions

**Location**: `src/lib/api-utils.ts`

**Functions**:
- `getOpenAIApiKey()`: Retrieve stored API key
- `setOpenAIApiKey(key)`: Store API key locally
- `hasOpenAIApiKey()`: Check if API key is configured
- `generateAISynth(request)`: Call synth generation API
- `generateAITeam(request)`: Call team generation API

## Setup Instructions

### 1. Deploy Edge Functions

```bash
# Deploy the synth creation function
supabase functions deploy create-synth-ai

# Deploy the team creation function
supabase functions deploy create-team-ai
```

### 2. Configure Environment Variables

Ensure your Supabase project has the necessary environment variables:
- Functions will receive OpenAI API keys from client requests
- No server-side API key storage required

### 3. Update Frontend Configuration

Add your Supabase URL to environment variables:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
```

### 4. User Setup

Users need to:
1. Obtain an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Configure the API key in the application settings
3. Start using AI-powered creation features

## Usage Examples

### Creating an AI Synth

1. Click "Create new synth" in the browser panel
2. Select "AI-Powered" tab
3. Enter keywords: "data scientist, python expert, machine learning"
4. Choose AI model (default: GPT-4o)
5. Click "Generate AI Synth"
6. Review the generated synth
7. Click "Create AI Synth" to save

### Creating an AI Team

1. Click "Create new team" in the browser panel
2. Select "AI-Powered" tab
3. Enter keywords: "product development, agile, startup"
4. Set team size: 4 members
5. Enable "Include existing synths when possible"
6. Choose AI model for new members
7. Click "Generate AI Team"
8. Review the generated team and members
9. Click "Create AI Team" to save

## Technical Architecture

### AI Generation Pipeline

1. **Input Processing**: Keywords and preferences
2. **Character/Team Concept**: AI generates high-level concept
3. **Detailed Generation**: AI creates specific details for each member
4. **System Prompt Creation**: AI generates contextual prompts
5. **Image Generation**: DALL-E creates profile/team images
6. **Assembly**: Combine all elements into final objects

### Error Handling

- API key validation
- OpenAI API error handling
- Graceful fallbacks to manual mode
- User-friendly error messages
- Retry mechanisms for transient failures

### Performance Considerations

- Parallel API calls where possible
- Image generation optimization
- Progress indicators for long operations
- Caching strategies for repeated requests

## Future Enhancements

### Planned Features

1. **Synth Templates**: Pre-defined synth archetypes
2. **Team Templates**: Common team compositions
3. **Bulk Generation**: Create multiple synths/teams at once
4. **Custom Prompts**: User-defined generation prompts
5. **Integration Improvements**: Better existing synth matching
6. **Export/Import**: Share generated synths/teams

### Advanced AI Features

1. **Personality Consistency**: Ensure generated synths have consistent personalities
2. **Team Chemistry**: AI-optimized team member compatibility
3. **Role Optimization**: AI-suggested role improvements
4. **Dynamic Adaptation**: Synths that evolve based on usage

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify key is correctly formatted (starts with 'sk-')
   - Check OpenAI account has sufficient credits
   - Ensure key has necessary permissions

2. **Generation Fails**
   - Check network connectivity
   - Verify Supabase functions are deployed
   - Review browser console for detailed errors

3. **Images Not Loading**
   - DALL-E API may be temporarily unavailable
   - Check if base64 data is properly formatted
   - Verify image size limits

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('debug_ai_features', 'true');
```

## Security Considerations

- API keys stored locally only
- No server-side key persistence
- HTTPS required for all API calls
- Input sanitization for all user data
- Rate limiting on edge functions

## Cost Considerations

### OpenAI API Usage

- **Synth Generation**: ~3-4 API calls per synth
  - Character generation: ~$0.01
  - System prompt: ~$0.01
  - Image generation: ~$0.04
  - **Total per synth**: ~$0.06

- **Team Generation**: Variable based on team size
  - Team concept: ~$0.01
  - Per new member: ~$0.06
  - Team image: ~$0.04
  - **Total for 3-member team**: ~$0.23

### Optimization Tips

- Use existing synths when possible
- Batch similar requests
- Consider lower-cost models for text generation
- Implement caching for repeated patterns

## Contributing

When contributing to AI features:

1. Test with various keyword combinations
2. Ensure error handling is robust
3. Validate generated content quality
4. Update documentation for new features
5. Consider cost implications of changes

## Support

For issues with AI features:
1. Check this documentation
2. Review browser console logs
3. Verify API key configuration
4. Test with simple keywords first
5. Report bugs with detailed reproduction steps 