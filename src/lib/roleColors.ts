export interface RoleColorInfo {
  color: string;
  bgColor: string;
  display: string;
}

export const getRoleInfo = (role: string): RoleColorInfo => {
  if (!role) {
    return {
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      bgColor: 'bg-gray-500/10 dark:bg-gray-400/10',
      display: 'Unknown Role'
    };
  }
  
  switch (role.toLowerCase()) {
    case 'chief product officer':
      return {
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        bgColor: 'bg-purple-500/10 dark:bg-purple-400/10',
        display: 'CPO'
      };
    case 'chief technology officer':
      return {
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        bgColor: 'bg-blue-500/10 dark:bg-blue-400/10',
        display: 'CTO'
      };
    case 'chief marketing officer':
      return {
        color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
        bgColor: 'bg-pink-500/10 dark:bg-pink-400/10',
        display: 'CMO'
      };
    case 'chief financial officer':
      return {
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        bgColor: 'bg-green-500/10 dark:bg-green-400/10',
        display: 'CFO'
      };
    case 'chief design officer':
      return {
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        bgColor: 'bg-orange-500/10 dark:bg-orange-400/10',
        display: 'CDO'
      };
    case 'chief revenue officer':
      return {
        color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
        bgColor: 'bg-indigo-500/10 dark:bg-indigo-400/10',
        display: 'CRO'
      };
    case 'chief operations officer':
      return {
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        bgColor: 'bg-yellow-500/10 dark:bg-yellow-400/10',
        display: 'COO'
      };
    case 'chief data officer':
      return {
        color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
        bgColor: 'bg-cyan-500/10 dark:bg-cyan-400/10',
        display: 'CDO'
      };
    case 'chief legal officer':
      return {
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        bgColor: 'bg-red-500/10 dark:bg-red-400/10',
        display: 'CLO'
      };
    case 'chief customer officer':
      return {
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        bgColor: 'bg-emerald-500/10 dark:bg-emerald-400/10',
        display: 'CCO'
      };
    case 'chief brand officer':
      return {
        color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
        bgColor: 'bg-violet-500/10 dark:bg-violet-400/10',
        display: 'CBO'
      };
    case 'chief partnership officer':
      return {
        color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
        bgColor: 'bg-teal-500/10 dark:bg-teal-400/10',
        display: 'CPO'
      };
    // Legacy role mappings for backward compatibility
    case 'ceo':
    case 'chief executive officer':
      return {
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        bgColor: 'bg-purple-500/10 dark:bg-purple-400/10',
        display: 'CEO'
      };
    case 'cto':
      return {
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        bgColor: 'bg-blue-500/10 dark:bg-blue-400/10',
        display: 'CTO'
      };
    case 'designer':
    case 'ui/ux designer':
      return {
        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        bgColor: 'bg-orange-500/10 dark:bg-orange-400/10',
        display: role
      };
    case 'developer':
    case 'software engineer':
    case 'frontend developer':
    case 'backend developer':
      return {
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        bgColor: 'bg-green-500/10 dark:bg-green-400/10',
        display: role
      };
    case 'product manager':
      return {
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        bgColor: 'bg-purple-500/10 dark:bg-purple-400/10',
        display: role
      };
    case 'data scientist':
    case 'analyst':
      return {
        color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
        bgColor: 'bg-cyan-500/10 dark:bg-cyan-400/10',
        display: role
      };
    case 'marketing':
    case 'marketing specialist':
      return {
        color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
        bgColor: 'bg-pink-500/10 dark:bg-pink-400/10',
        display: role
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
        bgColor: 'bg-gray-500/10 dark:bg-gray-400/10',
        display: role
      };
  }
};

export const getRoleTeamBadgeColor = (role: string): string => {
  if (!role) {
    return 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700';
  }
  
  switch (role.toLowerCase()) {
    case 'chief product officer':
      return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30';
    case 'chief technology officer':
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30';
    case 'chief marketing officer':
      return 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 hover:bg-pink-100 dark:hover:bg-pink-900/30';
    case 'chief financial officer':
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30';
    case 'chief design officer':
      return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30';
    case 'chief revenue officer':
      return 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30';
    case 'chief operations officer':
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30';
    case 'chief data officer':
      return 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/30';
    case 'chief legal officer':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30';
    case 'chief customer officer':
      return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30';
    case 'chief brand officer':
      return 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/30';
    case 'chief partnership officer':
      return 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/30';
    default:
      return 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700';
  }
}; 