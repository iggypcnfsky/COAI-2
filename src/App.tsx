import Layout from '@/components/layout/Layout';
import { employees as initialEmployees } from '@/data/employees';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <>
      <Layout 
        employees={initialEmployees} 
        initialMessages={[]} 
      />
      <Toaster />
    </>
  );
}

export default App;