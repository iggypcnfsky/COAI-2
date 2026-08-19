import React, { useState } from 'react';
import { Trash2, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIEmployee } from '@/types';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { modelLabel } from '@/components/ModelSelect';

interface CustomSynthCardProps {
  employee: AIEmployee;
  onClick: (employee: AIEmployee) => void;
  onQuickAdd: (employee: AIEmployee) => void;
  onDelete?: (employeeId: string) => void;
  onUpdateSynth?: (updatedSynth: AIEmployee) => void;
}

const CustomSynthCard: React.FC<CustomSynthCardProps> = ({
  employee,
  onClick,
  onQuickAdd,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const modelName = employee.baseModel ? modelLabel(employee.baseModel) : null;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(employee));
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);

    const dragElement = document.createElement('div');
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    dragElement.style.width = '240px';
    dragElement.style.height = '48px';
    dragElement.style.background = 'white';
    dragElement.style.border = '1px solid #e5e5e5';
    dragElement.style.borderRadius = '8px';
    dragElement.style.color = '#171717';
    dragElement.style.display = 'flex';
    dragElement.style.alignItems = 'center';
    dragElement.style.gap = '10px';
    dragElement.style.padding = '0 10px';
    dragElement.style.fontSize = '13px';
    dragElement.style.fontWeight = '600';
    dragElement.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
    dragElement.innerHTML = `
      <div style="width:32px;height:32px;border-radius:9999px;background:url(${employee.profileImage}) center/cover #e5e5e5;flex-shrink:0;"></div>
      <div style="min-width:0;flex:1;">
        <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${employee.name}</div>
        <div style="font-size:11px;opacity:0.65;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${employee.role}${modelName ? ` · ${modelName}` : ''}</div>
      </div>
    `;

    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, 24, 24);

    setTimeout(() => {
      document.body.removeChild(dragElement);
    }, 100);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd(employee);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(employee.id);
    }
  };

  return (
    <div
      className={`group flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/70 ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={() => onClick(employee)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative shrink-0">
        <PersonAvatar
          name={employee.name}
          src={employee.profileImage}
          className="h-10 w-10"
        />
        {employee.isLoadingImage && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate leading-tight">
          {employee.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
          <span>{employee.role}</span>
          {modelName && (
            <>
              <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">·</span>
              <span>{modelName}</span>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            onClick={handleDelete}
            title="Delete synth"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          onClick={handleQuickAdd}
          title="Add to chat"
        >
          <PlusCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default CustomSynthCard;
