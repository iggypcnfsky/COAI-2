import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Check, X, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Team } from '@/types';

interface YourTeamsSectionProps {
  teams: Team[];
  activeThreadId: string | null;
  onSelectTeam: (teamId: string) => void;
  onEditTeamName: (teamId: string, newName: string) => void;
  onCreateChat: () => void;
  onDeleteTeam: (teamId: string) => void;
}

const YourTeamsSection: React.FC<YourTeamsSectionProps> = ({
  teams,
  activeThreadId,
  onSelectTeam,
  onEditTeamName,
  onCreateChat,
  onDeleteTeam,
}) => {
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleStartEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setEditingName(team.name);
  };

  const handleSaveEdit = () => {
    if (editingTeamId && editingName.trim()) {
      onEditTeamName(editingTeamId, editingName.trim());
    }
    setEditingTeamId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingTeamId(null);
    setEditingName('');
  };

  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (teamToDelete) {
      onDeleteTeam(teamToDelete.id);
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTeamToDelete(null);
  };

  // Find the active team
  const activeTeam = teams.find(team => team.id === activeThreadId);

  if (teams.length === 0) {
    return (
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto font-medium hover:bg-transparent">
                  <div className="flex items-center gap-1">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <h3 className="text-xs md:text-sm font-medium">
                      Chats
                      <span className="hidden md:inline"> ({teams.length})</span>
                    </h3>
                    <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400 ml-2">Press 1-9 to switch</span>
                  </div>
                </Button>
              </CollapsibleTrigger>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCreateChat}
                  className="h-7 rounded-full px-2 text-xs"
                >
                  <Plus className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Create Chat</span>
                </Button>
              </div>
            </div>
            <CollapsibleContent>
              <p className="text-xs text-neutral-500">No chats yet. Create your first chat!</p>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800">
      <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto font-medium hover:bg-transparent">
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <h3 className="text-xs md:text-sm font-medium">
                    Chats
                    <span className="hidden md:inline"> ({teams.length})</span>
                  </h3>
                  {isCollapsed && activeTeam && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-full">
                      <div className="flex -space-x-1">
                        {activeTeam.members.slice(0, 2).map((member, index) => (
                          <img
                            key={member.id}
                            src={member.profileImage}
                            alt={member.name}
                            className="w-4 h-4 rounded-full object-cover border border-white dark:border-neutral-800"
                            style={{ zIndex: activeTeam.members.length - index }}
                          />
                        ))}
                        {activeTeam.members.length > 2 && (
                          <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-600 border border-white dark:border-neutral-800 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
                              +{activeTeam.members.length - 2}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {activeTeam.name}
                      </span>
                    </div>
                  )}
                  <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400 ml-2">Press 1-9 to switch</span>
                </div>
              </Button>
            </CollapsibleTrigger>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={onCreateChat}
                className="h-7 rounded-full px-2 text-xs"
              >
                <Plus className="h-3 w-3 md:mr-1" />
                <span className="hidden md:inline">Create Chat</span>
              </Button>
            </div>
          </div>
          <CollapsibleContent>
            <ScrollArea className="max-h-[120px]">
              <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                {teams.map((team, index) => (
                  <ChatChip
                    key={team.id}
                    team={team}
                    isActive={team.id === activeThreadId}
                    isEditing={editingTeamId === team.id}
                    editingName={editingName}
                    keyboardNumber={index < 9 ? index + 1 : undefined}
                    onSelect={() => onSelectTeam(team.id)}
                    onStartEdit={() => handleStartEdit(team)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onEditingNameChange={setEditingName}
                    onDeleteClick={() => handleDeleteClick(team)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the chat "{teamToDelete?.name}"? This action cannot be undone and all chat messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface ChatChipProps {
  team: Team;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  keyboardNumber?: number;
  onSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingNameChange: (name: string) => void;
  onDeleteClick: () => void;
}

const ChatChip: React.FC<ChatChipProps> = ({
  team,
  isActive,
  isEditing,
  editingName,
  keyboardNumber,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditingNameChange,
  onDeleteClick,
}) => {
  return (
    <div
      className={`group flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 cursor-pointer transition-colors flex-shrink-0 ${
        isActive
          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
          : 'bg-white border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700'
      }`}
      onClick={!isEditing ? onSelect : undefined}
      title={keyboardNumber ? `${team.name} (Press ${keyboardNumber})` : team.name}
    >
      {/* Member Profile Pictures */}
      <div className="flex -space-x-1">
        {team.members.slice(0, 3).map((member, index) => (
          <img
            key={member.id}
            src={member.profileImage}
            alt={member.name}
            className="w-6 h-6 rounded-full object-cover border-2 border-white dark:border-neutral-800"
            style={{ zIndex: team.members.length - index }}
          />
        ))}
        {team.members.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-600 border-2 border-white dark:border-neutral-800 flex items-center justify-center">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              +{team.members.length - 3}
            </span>
          </div>
        )}
      </div>

      {/* Team Name */}
      {isEditing ? (
        <div className="flex items-center gap-1">
          <Input
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            className="h-6 text-xs px-2 min-w-16 w-auto"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={onSaveEdit}
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={onCancelEdit}
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium">{team.name}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 md:opacity-0 md:group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick();
            }}
          >
            <X className="h-3 w-3 text-red-600 dark:text-red-400" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default YourTeamsSection; 