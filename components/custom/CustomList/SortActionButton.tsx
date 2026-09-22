import React, { useState, useRef, useEffect } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { SortField } from './customList';
import { ActionButtonGroup, BaseActionButtonProps, useActionButtonStyles } from './customListActionButton';

export type SortDirection = 'asc' | 'desc';

interface SortActionButtonProps extends BaseActionButtonProps {
  sortFields: SortField[];
  currentSortField: string;
  currentSortDirection: SortDirection;
  onSortChange: (fieldKey: string, direction: SortDirection) => void;
  stackLabelOnTop?: boolean;
}

export const SortActionButton: React.FC<SortActionButtonProps> = ({
  sortFields,
  currentSortField,
  currentSortDirection,
  onSortChange,
  color = 'blueTextWhiteBg',
  border = true,
  stackLabelOnTop = false,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get consistent styling from base component
  const { className, style } = useActionButtonStyles({ color, border, ...props });
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentField = sortFields.find(f => f.key === currentSortField);
  const displayText = currentField ? currentField.label : (sortFields.length > 0 ? sortFields[0].label : 'Sort By');
  
  const handleFieldClick = (fieldKey: string) => {
    if (fieldKey === currentSortField) {
      // Same field clicked - toggle direction
      const newDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(fieldKey, newDirection);
    } else {
      // Different field clicked - use ascending by default
      onSortChange(fieldKey, 'asc');
    }
    // Keep dropdown open - don't call setIsOpen(false)
  };

  return (
    <ActionButtonGroup 
      label="Sort By" 
      showLabel={true}
      color={color}
      border={border}
      stackLabelOnTop={stackLabelOnTop}
    >
      {/* Sort button matching togglebutton styling */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={className}
          style={style}
        >
          {displayText}
          {currentSortDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </button>
        
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-full">
            <div className="py-1">
              {sortFields.map((field) => (
                <button
                  key={field.key}
                  onClick={() => handleFieldClick(field.key)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between whitespace-nowrap ${
                    currentSortField === field.key ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <span>{field.label}</span>
                  {currentSortField === field.key && (
                    currentSortDirection === 'asc' ? (
                      <ArrowUp className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-blue-600" />
                    )
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ActionButtonGroup>
  );
};
