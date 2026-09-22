import React from 'react';
import { LucideIcon } from 'lucide-react';
import { getColorClasses, ColorScheme, colorSchemes, getTextColorClass } from './CustomColorScheme';

export type FilterAlignment = 'left' | 'right' | 'center' | 'expanded';

export interface ActionButtonProps {
  id?: string;
  text: string;
  icon?: LucideIcon;
  color?: ColorScheme;
  onClick: () => void;
  disabled?: boolean;
  border?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost';
  className?: string;
  children?: React.ReactNode;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  id,
  text,
  icon,
  color = 'blue',
  onClick,
  disabled = false,
  border = false,
  size = 'md',
  variant = 'solid',
  className = '',
  children
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base'
  };

  // Variant classes
  const getVariantClasses = () => {
    if (variant === 'outline') {
      return `bg-white border-2 ${getTextColorClass(color)} hover:${colorSchemes[color].background}`;
    }
    if (variant === 'ghost') {
      return `bg-transparent ${getTextColorClass(color)} hover:${colorSchemes[color].background}`;
    }
    // solid variant
    return getColorClasses(color);
  };

  const variantClasses = getVariantClasses();
  const sizeClass = sizeClasses[size];
  
  // Border styling
  const borderStyle = border ? {
    borderColor: 'currentColor',
    borderWidth: '2px',
    borderStyle: 'solid'
  } : {};

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-medium rounded-md flex items-center gap-2 transition-colors
        ${sizeClass}
        ${variantClasses}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={borderStyle}
    >
      {icon && React.createElement(icon, { className: `${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}` })}
      {children || text}
    </button>
  );
};

// Legacy support - keeping the old interface for backward compatibility
export interface ListActionButton {
  id: string;
  text: string;
  icon?: LucideIcon;
  color?: ColorScheme;
  onClick: () => void;
  alignment?: 'left' | 'right' | 'center' | 'expanded';
  disabled?: boolean;
  filterRow?: 'primary' | 'secondary' | 'tertiary';
  border?: boolean;
  type?: 'button' | 'sort'; // Add type property for special button types
}

// Legacy component for backward compatibility
export const ListActionButton: React.FC<{
  action: ListActionButton;
  expandableCount?: number;
}> = ({ action, expandableCount }) => {
  return (
    <ActionButton
      id={action.id}
      text={action.text}
      icon={action.icon}
      color={action.color}
      onClick={action.onClick}
      disabled={action.disabled}
      border={action.border}
    />
  );
};

// Legacy ActionButtonRow component for backward compatibility
export const ActionButtonRow: React.FC<{
  actions?: ListActionButton[];
  expandableCount?: number;
  rowType?: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  isArtifactOpen?: boolean;
}> = ({ actions, expandableCount, rowType, isArtifactOpen = false }) => {
  // Filter action buttons based on the current row type
  const filteredActions = actions?.filter(action => 
    !action.filterRow || action.filterRow === rowType
  ) || [];

  if (filteredActions.length === 0) return null;

  // When artifact is open, show labels above buttons
  if (isArtifactOpen) {
    return (
      <div className="space-y-1">
        {/* Label above the action buttons */}
        <div className="text-sm font-medium text-blue-600">
          Actions
        </div>
        {/* Action buttons */}
        <div className="flex gap-4 items-center">
          {filteredActions.map(action => (
            <ListActionButton
              key={action.id}
              action={action}
              expandableCount={expandableCount}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-center">
      {filteredActions.map(action => (
        <ListActionButton
          key={action.id}
          action={action}
          expandableCount={expandableCount}
        />
      ))}
    </div>
  );
};
