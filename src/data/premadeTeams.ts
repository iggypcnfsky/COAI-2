import { AIEmployee } from '@/types';

export interface PremadeTeam {
  id: string;
  name: string;
  description: string;
  icon: string;
  employeeIds: string[];
  color: string;
  backgroundImage: string;
}

export const premadeTeams: PremadeTeam[] = [
  {
    id: 'marketing-agency',
    name: 'Marketing Agency',
    description: 'Full-service marketing team for growth and brand building',
    icon: '📈',
    employeeIds: ['3', '15', '11', '23', '8', '20', '6', '18'], // Sarah & Jake (Marketing), Nina & Carlos (Brand), Ryan & Aria (Data), Marcus & Olivia (Revenue)
    color: 'bg-blue-500',
    backgroundImage: '/images/teams/backgrounds/marketing.jpeg'
  },
  {
    id: 'pr-agency',
    name: 'PR Agency',
    description: 'Public relations and communications specialists',
    icon: '📢',
    employeeIds: ['37', '38', '39', '40', '11', '23', '10', '22', '33', '34'], // Harper (Communications), Sterling (Media Relations), Phoenix (Crisis), Sage (Public Affairs), Nina & Carlos (Brand), James & Grace (Customer), Echo & Compass (Community)
    color: 'bg-purple-500',
    backgroundImage: '/images/teams/backgrounds/pr.jpeg'
  },
  {
    id: 'film-studio',
    name: 'Film Studio',
    description: 'Creative production team for video and multimedia content',
    icon: '🎬',
    employeeIds: ['25', '26', '35', '36', '5', '17', '11', '23', '1', '13', '7', '19'], // Luna & Phoenix (Video), Pixel & Canvas (Creative), Emma & Tyler (Design), Nina & Carlos (Brand), Maya & Michael (Product), Lisa & Daniel (Operations)
    color: 'bg-red-500',
    backgroundImage: '/images/teams/backgrounds/film.jpeg'
  },
  {
    id: 'law-firm',
    name: 'Law Firm',
    description: 'Legal expertise for business compliance and strategy',
    icon: '⚖️',
    employeeIds: ['9', '21', '4', '16', '12', '24'], // Sophia & Nathan (Legal), David & Rachel (Finance), Kevin & Samantha (Partnerships)
    color: 'bg-gray-600',
    backgroundImage: '/images/teams/backgrounds/law.jpeg'
  },
  {
    id: 'design-agency',
    name: 'Design Agency',
    description: 'Creative design and user experience specialists',
    icon: '🎨',
    employeeIds: ['5', '17', '35', '36', '11', '23', '1', '13'], // Emma & Tyler (Design), Pixel & Canvas (Creative), Nina & Carlos (Brand), Maya & Michael (Product)
    color: 'bg-pink-500',
    backgroundImage: '/images/teams/backgrounds/design.jpeg'
  },
  {
    id: 'startup-studio',
    name: 'Startup Studio',
    description: 'Complete startup building and scaling team',
    icon: '🚀',
    employeeIds: ['1', '13', '2', '14', '3', '15', '4', '16', '5', '17', '7', '19', '8', '20'], // Maya & Michael (Product), Alex & Zoe (Tech), Sarah & Jake (Marketing), David & Rachel (Finance), Emma & Tyler (Design), Lisa & Daniel (Operations), Ryan & Aria (Data)
    color: 'bg-green-500',
    backgroundImage: '/images/teams/backgrounds/startup.jpeg'
  }
];

export const getTeamEmployees = (team: PremadeTeam, allEmployees: AIEmployee[]): AIEmployee[] => {
  return team.employeeIds
    .map(id => allEmployees.find(emp => emp.id === id))
    .filter((emp): emp is AIEmployee => emp !== undefined);
}; 