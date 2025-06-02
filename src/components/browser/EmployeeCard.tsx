import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AIEmployee } from '@/types';

interface EmployeeCardProps {
  employee: AIEmployee;
  onClick: (employee: AIEmployee) => void;
  onQuickAdd: (employee: AIEmployee) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onClick, onQuickAdd }) => {
  const [isDragging, setIsDragging] = React.useState(false);


  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(employee));
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
    
    // Create a custom drag image that looks like a mini employee card
    const dragElement = document.createElement('div');
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    dragElement.style.width = '200px';
    dragElement.style.height = '120px';
    dragElement.style.background = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${employee.profileImage})`;
    dragElement.style.backgroundSize = 'cover';
    dragElement.style.backgroundPosition = 'center';
    dragElement.style.borderRadius = '8px';
    dragElement.style.color = 'white';
    dragElement.style.display = 'flex';
    dragElement.style.flexDirection = 'column';
    dragElement.style.justifyContent = 'flex-end';
    dragElement.style.padding = '12px';
    dragElement.style.fontSize = '14px';
    dragElement.style.fontWeight = '600';
    dragElement.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
    dragElement.innerHTML = `
      <div style="margin-bottom: 4px;">${employee.name}</div>
      <div style="font-size: 12px; opacity: 0.9; font-weight: 400; display: inline-block; padding: 4px 8px; background: rgba(0,0,0,0.6); border-radius: 4px;">${employee.role}</div>
    `;
    
    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, 100, 60);
    
    // Remove the element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragElement);
    }, 100);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };



  return (
    <Card 
      className={`group relative overflow-hidden h-56 cursor-pointer transition-all duration-300 hover:shadow-xl ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
      onClick={() => onClick(employee)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Full background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${employee.profileImage})` }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
      </div>
      
      {/* Content overlay */}
      <div className="relative h-full flex flex-col justify-between p-3 text-white z-20">
        {/* Top section with name and action buttons */}
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg leading-tight text-white drop-shadow-lg">
            {employee.name}
          </h3>
          <div className="flex gap-2 relative z-10">
            <Button 
              size="icon" 
              variant="secondary"
              className="h-8 w-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(employee);
              }}
            >
              <PlusCircle className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
        
        {/* Bottom section with role */}
        <div className="flex justify-start">
          <span className="inline-block text-xs text-white font-medium px-2 py-1 bg-black/60 backdrop-blur-md rounded-md">
            {employee.role}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default EmployeeCard;