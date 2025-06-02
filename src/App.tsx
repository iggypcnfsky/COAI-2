import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { initializeAppData } from '@/lib/services';

function App() {
  // Initialize app data on component mount
  useEffect(() => {
    // Fetch public synths and teams from Supabase
    initializeAppData().catch(error => {
      console.error('Failed to initialize app data:', error);
    });
  }, []);

  return (
    <>
      <Layout 
        initialMessages={[]} 
      />
      <Toaster />
    </>
  );
}

export default App;