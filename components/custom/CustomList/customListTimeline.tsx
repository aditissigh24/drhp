import React from 'react';
import { LucideIcon } from 'lucide-react';
import { CustomListItemProps } from './customListItem';

export interface TimelineItemProps extends CustomListItemProps {
  selected?: boolean;
  onClick?: () => void;
  timelineDatetime?: string;
}

export interface CustomListTimelineProps {
  items: TimelineItemProps[];
  className?: string;
  extractTextColorFromTheme?: (themeColor?: string) => string;
  renderListItem?: (item: TimelineItemProps) => React.ReactNode;
  showDatetime?: boolean; // New prop
  showVisuals?: boolean; // New prop
}

const CustomListTimeline: React.FC<CustomListTimelineProps> = ({
  items,
  className = '',
  extractTextColorFromTheme,
  renderListItem,
  showDatetime = true,
  showVisuals = true
}) => {
  // Default text color extraction function if not provided
  const defaultExtractTextColorFromTheme = (themeColor?: string): string => {
    if (!themeColor) return 'text-blue-600';
    
    // If themeColor contains both background and text classes (from getColorClasses)
    if (themeColor.includes(' ')) {
      const classes = themeColor.split(' ');
      // Find the text color class (starts with 'text-')
      const textClass = classes.find(cls => cls.startsWith('text-'));
      return textClass || 'text-blue-600';
    }
    
    // If themeColor is just a text color class
    if (themeColor.startsWith('text-')) {
      return themeColor;
    }
    
    // Fallback to blue
    return 'text-blue-600';
  };

  const getTextColor = extractTextColorFromTheme || defaultExtractTextColorFromTheme;

  return (
    <div className={`space-y-2 relative ${className}`}>
      
      {items.map((item, index) => (
        // If neither datetime nor visuals, render nothing
        (showDatetime || showVisuals) ? (
          <div key={item.itemID} className="flex items-center gap-1">
            {/* Timeline Column */}
            <div className={`flex-shrink-0 w-40 flex${showVisuals ? ' items-center' : ''}`}>
              {/* Date and Time Column */}
              {showDatetime && (
                <div className="flex-shrink-0 w-24 text-center pr-4 -ml-2">
                  <div className="text-xs text-gray-500 font-medium">
                    {item.timelineDatetime 
                      ? new Date(item.timelineDatetime).toLocaleDateString() 
                      : new Date().toLocaleDateString()
                    }
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.timelineDatetime 
                      ? new Date(item.timelineDatetime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) 
                      : new Date().toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                    }
                  </div>
                </div>
              )}
              {/* Timeline Icon Column */}
              {showVisuals && (
                <div className="flex-shrink-0 relative ml-2">
                  <div className="w-8 h-8 bg-white rounded-full border-2 border-gray-300 shadow-sm flex items-center justify-center">
                    {item.timelineIcon ? (
                      React.createElement(item.timelineIcon, { 
                        className: `w-4 h-4 ${getTextColor(item.themeColor)}` 
                      })
                    ) : (
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* List Item Card - Use provided render function or fallback */}
            <div className="flex-1">
              {renderListItem ? renderListItem(item) : null}
            </div>
          </div>
        ) : null
      ))}
    </div>
  );
};

export default CustomListTimeline;
