import React from 'react';
import { LucideIcon } from 'lucide-react';
import { getColorClasses, ColorScheme, colorSchemes } from '../CustomColorScheme';

export type FilterAlignment = 'left' | 'right' | 'center' | 'expanded';

// List Stat interface
export interface ListStat {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: ColorScheme;
  alignment?: FilterAlignment;
  filterRow?: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  border?: boolean;
}

// Helper function to get alignment classes
const getAlignmentClasses = (alignment: FilterAlignment, type: string, expandableCount: number): string => {
  // List stats are always Type-1 (content-based width)
  switch (alignment) {
    case 'left':
      return 'flex-shrink-0';
    case 'right':
      return 'flex-shrink-0 ml-auto';
    case 'center':
      return 'flex-shrink-0 mx-auto';
    case 'expanded':
      return 'flex-grow';
    default:
      return 'flex-shrink-0';
  }
};

// Individual Stat component
export const ListStatItem: React.FC<{
  stat: ListStat;
  expandableCount: number;
}> = ({ stat, expandableCount }) => {
  const alignment = stat.alignment || 'left';
  const alignmentClasses = getAlignmentClasses(alignment, 'stat', expandableCount);
  
  // Use CustomColorScheme for colors without hover effects
  const colorClasses = stat.color ? getColorClasses(stat.color) : 'bg-gray-50 text-gray-600';
  
  // Get border color from text color of the specified color scheme
  const borderColor = stat.border && stat.color ? colorSchemes[stat.color].text.replace('text-', 'border-') : '';
  const borderClass = stat.border ? 'border-2' : '';

  // Create hover styles that maintain the same colors
  const hoverStyles = stat.color ? 
    `hover:${colorSchemes[stat.color].background} hover:${colorSchemes[stat.color].text}` : 
    'hover:bg-gray-50 hover:text-gray-600';

  // Create inline styles for border color to ensure it's applied
  const borderStyle = stat.border ? {
    borderColor: 'currentColor',
    borderWidth: '2px',
    borderStyle: 'solid'
  } : {};

  return (
    <div className={`flex items-center ${alignmentClasses}`}>
      <div
        className={`h-10 px-4 text-sm font-medium rounded-md flex items-center gap-2 ${colorClasses} ${borderClass} ${borderColor} ${hoverStyles}`}
        style={borderStyle}
      >
        {stat.icon && <stat.icon className="w-4 h-4" />}    
        <span className="font-semibold">{stat.value}</span>
        <span className="font-semibold">{stat.label}</span>
      </div>
    </div>
  );
};

// Stats Row component
export const StatsRow: React.FC<{
  stats?: ListStat[];
  expandableCount: number;
  rowType: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  isArtifactOpen?: boolean;
}> = ({ stats, expandableCount, rowType, isArtifactOpen = false }) => {
  // Filter stats based on the current row type
  const filteredStats = stats?.filter(stat => 
    !stat.filterRow || stat.filterRow === rowType
  ) || [];

  if (filteredStats.length === 0) return null;

  // When artifact is open, show labels above stats
  if (isArtifactOpen) {
    return (
      <div className="space-y-1">
        {/* Label above the stats */}
        <div className="text-sm font-medium text-blue-600">
          Statistics
        </div>
        {/* Stats */}
        <div className="flex gap-4 items-center">
          {filteredStats.map(stat => (
            <ListStatItem
              key={stat.id}
              stat={stat}
              expandableCount={expandableCount}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-center">
      {filteredStats.map(stat => (
        <ListStatItem
          key={stat.id}
          stat={stat}
          expandableCount={expandableCount}
        />
      ))}
    </div>
  );
};
