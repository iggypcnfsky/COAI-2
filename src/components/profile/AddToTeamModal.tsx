import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Check, Plus, Users } from 'lucide-react';
import { AIEmployee } from '@/types';
import { useTeams } from '@/hooks/store/useTeams';

interface AddToTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  synth: AIEmployee | null;
  onAddToTeam: (teamId: string, synthId: string) => Promise<void>;
}

const AddToTeamModal: React.FC<AddToTeamModalProps> = ({
  isOpen,
  onClose,
  synth,
  onAddToTeam,
}) => {
  const { teams, isLoading } = useTeams();
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Reset selected teams when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTeams([]);
    }
  }, [isOpen]);

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleAddToSelectedTeams = async () => {
    if (!synth || selectedTeams.length === 0) return;

    setIsAdding(true);
    try {
      // Add synth to all selected teams
      await Promise.all(
        selectedTeams.map(teamId => onAddToTeam(teamId, synth.id))
      );
      
      onClose();
    } catch (error) {
      console.error('Failed to add synth to teams:', error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!synth) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Add {synth.name} to Groups
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-neutral-500">Loading groups...</div>
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-neutral-300 mb-3" />
              <p className="text-neutral-500 mb-2">No groups available</p>
              <p className="text-sm text-neutral-400">Create a group first to add synths to it.</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Select the groups you want to add <strong>{synth.name}</strong> to:
              </div>
              
              <ScrollArea className="flex-1 border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teams.map((team) => {
                    const isSelected = selectedTeams.includes(team.id);
                    return (
                      <Card
                        key={team.id}
                        className={`relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg ${
                          isSelected 
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        onClick={() => handleToggleTeam(team.id)}
                      >
                        {/* Team Image Background */}
                        <div 
                          className="h-40 bg-cover bg-center bg-no-repeat relative"
                          style={{ 
                            backgroundImage: team.team_data.teamImage 
                              ? `url(${team.team_data.teamImage})` 
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          }}
                        >
                          {/* Dark overlay for better text readability */}
                          <div className="absolute inset-0 bg-black/20" />
                          
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                              <Check className="w-5 h-5" />
                            </div>
                          )}
                          
                          {/* Team icon if no image */}
                          {!team.team_data.teamImage && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Users className="h-12 w-12 text-white/80" />
                            </div>
                          )}
                        </div>
                        
                        {/* Team Info */}
                        <div className="p-4">
                          <h4 className="font-medium text-base truncate mb-2">{team.team_data.name}</h4>
                          {team.team_data.description && (
                            <p className="text-sm text-neutral-500 line-clamp-2 mb-3">{team.team_data.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-neutral-400">
                              {team.team_data.teamType === 'custom' ? 'Custom group' : 'Pre-made group'}
                            </span>
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTeam(team.id);
                              }}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Selected
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAdding}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddToSelectedTeams}
            disabled={selectedTeams.length === 0 || isAdding}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAdding ? (
              <>Adding...</>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add to {selectedTeams.length} Group{selectedTeams.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToTeamModal; 