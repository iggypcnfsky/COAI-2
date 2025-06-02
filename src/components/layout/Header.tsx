import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useApiKey } from '@/hooks/store/useApiKey';
import { useAuth } from '@/hooks/store/useAuth';
import { Key, Check, LogIn, LogOut, PanelLeftOpen, Image } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/Logo';
import { getRunwareApiKey, setRunwareApiKey, hasRunwareApiKey } from '@/lib/api-utils';
import { supabase } from '@/lib/supabase';

interface HeaderProps {
  isBrowserCollapsed: boolean;
  onToggleBrowser: () => void;
  isLoadingData?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isBrowserCollapsed, onToggleBrowser, isLoadingData = false }) => {
  const { openaiApiKey, setOpenaiApiKey, isApiKeyValid } = useApiKey();
  const { 
    user, 
    profile, 
    loading, 
    signInWithGoogle, 
    signOut,
    refreshProfile
  } = useAuth();
  const [tempApiKey, setTempApiKey] = useState(openaiApiKey);
  const [tempRunwareApiKey, setTempRunwareApiKey] = useState(getRunwareApiKey() || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Mark auth as initialized when loading is false
  React.useEffect(() => {
    if (!loading) {
      setAuthInitialized(true);
    }
  }, [loading]);

  // Increase timeout and add more robust recovery
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!authInitialized) {
        console.log('⚠️ Auth initialization timed out, forcing state transition');
        setAuthInitialized(true);
        
        // If we timed out but have a user in local storage, attempt recovery
        try {
          const storedSession = localStorage.getItem('supabase.auth.token');
          if (storedSession) {
            console.log('🔍 Found session in localStorage during timeout recovery');
            try {
              const parsedSession = JSON.parse(storedSession);
              if (parsedSession?.currentSession?.access_token) {
                console.log('🔍 Valid token found in localStorage, forcing recovery');
                
                // Try to refresh the profile
                refreshProfile().catch(e => console.error('Error refreshing profile during recovery:', e));
                
                // Also attempt to manually refresh the token with Supabase
                supabase.auth.refreshSession().catch(e => {
                  console.warn('⚠️ Token refresh during recovery failed:', e);
                });
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse stored session during recovery:', e);
            }
          }
        } catch (e) {
          console.warn('⚠️ Error accessing localStorage during recovery:', e);
        }
      }
    }, 15000); // Increased to 15 seconds for slower connections

    return () => clearTimeout(timer);
  }, [authInitialized, refreshProfile]);

  const handleSaveApiKey = () => {
    setOpenaiApiKey(tempApiKey);
    if (tempRunwareApiKey.trim()) {
      setRunwareApiKey(tempRunwareApiKey);
    }
    setIsModalOpen(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('Google sign-in error:', error);
        // You could add a toast notification here
      }
    } catch (error) {
      console.error('Google sign-in exception:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      setSignOutLoading(true);
      console.log('🔑 Starting sign out process...');
      
      // First, clear all auth-related storage preemptively
      // This ensures we clean up even if the API call fails
      try {
        console.log('🔑 Preemptively clearing auth storage...');
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            console.log('🔑 Removing localStorage item:', key);
            localStorage.removeItem(key);
          }
        }
        
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            console.log('🔑 Removing sessionStorage item:', key);
            sessionStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error('❌ Storage cleanup failed:', e);
      }
      
      // Call signOut method
      const { error } = await signOut();
      
      if (error) {
        console.error('❌ Sign-out error:', error);
        
        // Force page reload to ensure clean state
        window.location.href = window.location.origin;
        return;
      }
      
      console.log('✅ Successfully signed out');
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        console.log('🔑 Forcing page reload to ensure clean state...');
        window.location.href = window.location.origin;
      }, 500);
    } catch (error) {
      console.error('❌ Sign-out exception:', error);
      
      // Force page reload even on error
      window.location.href = window.location.origin;
    } finally {
      setSignOutLoading(false);
    }
  };

  // Update temp keys when context key changes (on load)
  React.useEffect(() => {
    setTempApiKey(openaiApiKey);
    setTempRunwareApiKey(getRunwareApiKey() || '');
  }, [openaiApiKey]);

  // Get user display information with fallbacks
  const getUserDisplayInfo = () => {
    // Try to get from profile first
    if (profile?.profile_data.displayName && profile.profile_data.displayName !== 'User') {
      return {
        displayName: profile.profile_data.displayName,
        avatar: profile.profile_data.avatar
      };
    }

    // Try to get from user metadata
    const userMetadata = user?.user_metadata || {};
    const identities = user?.identities || [];
    const googleIdentity = identities.find((identity: any) => identity.provider === 'google');
    const googleData = googleIdentity?.identity_data || {};

    const displayName = 
      userMetadata.full_name || 
      userMetadata.name || 
      googleData.full_name ||
      googleData.name ||
      user?.email?.split('@')[0] || 
      'User';

    // Try multiple sources for avatar
    let avatar = 
      userMetadata.avatar_url || 
      userMetadata.picture ||
      googleData.avatar_url ||
      googleData.picture ||
      profile?.profile_data.avatar;

    // Fallback: If no avatar found and we have a Google provider ID, construct Google avatar URL
    if (!avatar && (googleData.provider_id || googleData.sub)) {
      const googleId = googleData.provider_id || googleData.sub;
      avatar = `https://lh3.googleusercontent.com/a/${googleId}`;
      console.log('🔍 Fallback: Constructed Google avatar URL:', avatar);
    }

    return { displayName, avatar };
  };

  const { displayName, avatar } = getUserDisplayInfo();

  // Use authInitialized as a failsafe - if auth hasn't loaded in 5 seconds, allow interaction
  const isAuthLoading = loading && !authInitialized;

  // Check if Runware API key is valid
  const isRunwareApiKeyValid = hasRunwareApiKey();

  // Debug info (can be removed later)
  React.useEffect(() => {
    // Debug logging removed to reduce console noise
  }, [user, profile, displayName, avatar, loading, authInitialized, isAuthLoading])

  return (
    <header className="w-full bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-2 md:p-4 flex flex-row justify-between items-center">
      <div className="flex items-center">
        <Logo 
          size="24px"
          color="#6b7280"
          className="md:w-8 md:h-8 mr-1 md:mr-2"
        />
        <a 
          href="https://iggy.love" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-xs font-medium"
        >
          by iggylove
        </a>
        
        {/* Beta Button */}
        <a 
          href="https://tally.so/r/nWB1ON" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center px-2 py-1 ml-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors text-xs font-medium"
        >
          beta
        </a>
        
        {/* Sync indicator */}
        {isLoadingData && (
          <div className="flex items-center gap-2 ml-3 px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="w-3 h-3 border border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="hidden md:inline">Syncing chats...</span>
          </div>
        )}
        
        {/* Browser reveal button - only show when collapsed */}
        {isBrowserCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleBrowser}
            className="ml-2 h-6 w-6 md:h-8 md:w-8 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            title="Show browser (⌘+B)"
          >
            <PanelLeftOpen className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
        )}
      </div>

      {/* Desktop API Button, Auth and Clear Chat */}
      <div className="hidden md:flex flex-row space-x-2 items-center">
        {/* API Keys Button */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              variant={isApiKeyValid && isRunwareApiKeyValid ? "outline" : "default"}
              className={`flex items-center gap-2 ${
                isApiKeyValid && isRunwareApiKeyValid
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30' 
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              <Key className="h-4 w-4" />
              {isApiKeyValid && isRunwareApiKeyValid ? (
                <>
                  <Check className="h-4 w-4" />
                  API Keys Set
                </>
              ) : (
                'API Keys'
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>API Keys Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* OpenAI API Key */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span className="text-sm font-medium">OpenAI API Key</span>
                </div>
                <Input
                  type="password"
                  placeholder="Your OpenAI API Key"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className={`bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 ${
                    !isApiKeyValid && tempApiKey !== openaiApiKey ? 'border-orange-400 dark:border-orange-500' : ''
                  }`}
                />
                <p className="text-xs text-neutral-500">
                  Required for AI text generation (synths & teams)
                </p>
              </div>
              
              {/* Runware API Key */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span className="text-sm font-medium">Runware API Key</span>
                </div>
                <Input
                  type="password"
                  placeholder="Your Runware API Key"
                  value={tempRunwareApiKey}
                  onChange={(e) => setTempRunwareApiKey(e.target.value)}
                  className={`bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 ${
                    !isRunwareApiKeyValid && tempRunwareApiKey !== (getRunwareApiKey() || '') ? 'border-orange-400 dark:border-orange-500' : ''
                  }`}
                />
                <p className="text-xs text-neutral-500">
                  Required for AI image generation (profile & team photos)
                </p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveApiKey}
                  disabled={tempApiKey === openaiApiKey && tempRunwareApiKey === (getRunwareApiKey() || '')}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isApiKeyValid && isRunwareApiKeyValid ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Authentication section */}
        {!user ? (
          <Button
            onClick={handleGoogleSignIn}
            disabled={isAuthLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 min-w-0">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage 
                  src={avatar} 
                  alt={displayName}
                  onLoad={() => console.log('🖼️ Avatar loaded successfully:', avatar)}
                  onError={(e) => {
                    console.log('❌ Avatar failed to load:', avatar);
                    console.log('❌ Error details:', e);
                    // You could add additional fallback logic here
                  }}
                />
                <AvatarFallback className="bg-blue-500 text-white text-xs">
                  {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap truncate max-w-[150px]" title={displayName}>
                {displayName}
              </span>
            </div>
            <Button
              onClick={handleSignOut}
              disabled={isAuthLoading || signOutLoading}
              variant="outline"
              size="icon"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile API Key Button and Auth */}
      <div className="md:hidden flex items-center space-x-2">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              variant={isApiKeyValid && isRunwareApiKeyValid ? "outline" : "default"}
              size="sm"
              className={`h-6 px-2 text-xs ${
                isApiKeyValid && isRunwareApiKeyValid
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30' 
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              <Key className="h-3 w-3 mr-1" />
              {isApiKeyValid && isRunwareApiKeyValid ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  <span className="hidden xs:inline">API Keys Set</span>
                  <span className="xs:hidden">Set</span>
                </>
              ) : (
                <>
                  <span className="hidden xs:inline">Set API Keys</span>
                  <span className="xs:hidden">API</span>
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* OpenAI API Key */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span className="text-sm font-medium">OpenAI API Key</span>
                </div>
                <Input
                  type="password"
                  placeholder="Your OpenAI API Key"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className={`bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 ${
                    !isApiKeyValid && tempApiKey !== openaiApiKey ? 'border-orange-400 dark:border-orange-500' : ''
                  }`}
                />
              </div>
              
              {/* Runware API Key */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span className="text-sm font-medium">Runware API Key</span>
                </div>
                <Input
                  type="password"
                  placeholder="Your Runware API Key"
                  value={tempRunwareApiKey}
                  onChange={(e) => setTempRunwareApiKey(e.target.value)}
                  className={`bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 ${
                    !isRunwareApiKeyValid && tempRunwareApiKey !== (getRunwareApiKey() || '') ? 'border-orange-400 dark:border-orange-500' : ''
                  }`}
                />
              </div>
              
              {/* Auth section in modal */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-medium">Account</h4>
                {!user ? (
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={isAuthLoading}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in with Google
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 min-w-0">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage 
                          src={avatar} 
                          alt={displayName}
                          onLoad={() => console.log('🖼️ Mobile avatar loaded successfully:', avatar)}
                          onError={(e) => {
                            console.log('❌ Mobile avatar failed to load:', avatar);
                            console.log('❌ Mobile error details:', e);
                          }}
                        />
                        <AvatarFallback className="bg-blue-500 text-white text-xs">
                          {displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap truncate flex-1" title={displayName}>
                        {displayName}
                      </span>
                    </div>
                    <Button
                      onClick={handleSignOut}
                      disabled={isAuthLoading || signOutLoading}
                      variant="outline"
                      className="w-full flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      {signOutLoading ? 'Signing out...' : 'Sign out'}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveApiKey}
                  disabled={tempApiKey === openaiApiKey && tempRunwareApiKey === (getRunwareApiKey() || '')}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isApiKeyValid && isRunwareApiKeyValid ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

    </header>
  );
};

export default Header;