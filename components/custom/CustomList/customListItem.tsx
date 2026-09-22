import React from 'react';
import { LucideIcon } from 'lucide-react';
import { getColorClasses, getTextColorClass } from '@/components/custom/CustomColorScheme';

export interface ListItemField {
  key: string;
  label?: string;
  value: string | number | string[];
  type?: 'text' | 'email' | 'phone' | 'tags' | 'link';
  icon?: LucideIcon;
  className?: string;
}

export interface CustomListItemProps {
  itemID: string;
  datetime?: string;
  title?: string | React.ReactNode;
  titleIcon?: LucideIcon | React.ReactNode | ((props?: any) => React.ReactNode);
  subtitle?: string;
  type?: string;
  mainContent?: React.ReactNode;
  bottomLeftContent?: React.ReactNode;
  bottomRightContent?: React.ReactNode;
  topRightContent?: React.ReactNode;
  leftMainIcon?: LucideIcon | React.ReactNode | ((props?: any) => React.ReactNode);
  rightMainIcon?: LucideIcon;
  themeColor?: string;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  originalData?: any;
  timelineIcon?: LucideIcon;
  isArtifactOpen?: boolean;
  moveRightContentToLeftOnArtifactOpen?: boolean;
}

const CustomListItem: React.FC<CustomListItemProps> = ({
  itemID,
  datetime,
  title,
  titleIcon: TitleIcon,
  subtitle,
  mainContent,
  bottomLeftContent,
  bottomRightContent,
  topRightContent,
  leftMainIcon: LeftMainIcon,
  rightMainIcon: RightMainIcon,
  themeColor,
  className = '',
  onClick,
  selected = false,
  disabled = false,
  isArtifactOpen = false,
  moveRightContentToLeftOnArtifactOpen = true
}) => {
  // Extract text color from themeColor if it contains both background and text classes
  const getTextColorFromTheme = (themeColor?: string) => {
    if (!themeColor) return getTextColorClass('blue');

    // If themeColor contains both background and text classes (from getColorClasses)
    if (themeColor.includes(' ')) {
      const classes = themeColor.split(' ');
      // Find the text color class (starts with 'text-')
      const textClass = classes.find(cls => cls.startsWith('text-'));
      return textClass || getTextColorClass('blue');
    }

    // If themeColor is just a text color class
    if (themeColor.startsWith('text-')) {
      return themeColor;
    }

    // Fallback to blue
    return getTextColorClass('blue');
  };

  const iconAndTitleColor = getTextColorFromTheme(themeColor);

  // Determine if we should move right content to left
  const shouldMoveRightContent = isArtifactOpen && moveRightContentToLeftOnArtifactOpen;

  return (
    <div
      className={`
        border border-gray-200 rounded-2xl p-2 hover:shadow-md transition-all duration-200
        ${(selected && isArtifactOpen) ? 'shadow-md' : ''}
        ${selected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/10' : ''}
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${onClick ? 'hover:border-gray-300' : ''}
        ${className}
      `}
      onClick={disabled ? undefined : onClick}
    >
      <div className="flex items-stretch gap-4">
        {/* Left narrow column */}
        {LeftMainIcon && (
          <div className="flex items-center justify-center flex-shrink-0 border-r border-gray-200 pr-2">
            {typeof LeftMainIcon === 'function'
              ? LeftMainIcon({ className: `w-6 h-6 ${iconAndTitleColor}` })
              : React.isValidElement(LeftMainIcon)
                ? LeftMainIcon
                : React.createElement(LeftMainIcon as any, { className: `w-6 h-6 ${iconAndTitleColor}` })}
          </div>
        )}

        {/* Center expanded column */}
        <div className={`flex-1 min-w-0${!LeftMainIcon ? ' pl-2' : ''}${!RightMainIcon ? ' pr-2' : ''}`}>
          {/* Top Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              {TitleIcon && (
                typeof TitleIcon === 'function'
                  ? TitleIcon({ className: `w-5 h-5 mt-0.5 flex-shrink-0 ${iconAndTitleColor}` })
                  : React.isValidElement(TitleIcon)
                    ? React.cloneElement(TitleIcon as React.ReactElement<{ className?: string }>, {
                      className: `${(TitleIcon as any).props?.className || ''} w-5 h-5 mt-0.5 flex-shrink-0 ${iconAndTitleColor}`.trim()
                    })
                    : React.createElement(TitleIcon as any, { className: `w-5 h-5 mt-0.5 flex-shrink-0 ${iconAndTitleColor}` })
              )}
              {title && (
                <div className="min-w-0 flex-1">
                  {typeof title === 'string' ? (
                    <h3 className={`text-base font-semibold ${iconAndTitleColor} truncate`}>
                      {title}
                    </h3>
                  ) : (
                    // Don't apply iconAndTitleColor to React components to preserve custom styling
                    title
                  )}
                </div>
              )}
            </div>
            {topRightContent && !shouldMoveRightContent && (
              <div className="flex-shrink-0 ml-2">
                {topRightContent}
              </div>
            )}
          </div>

          {/* Subtitle Row */}
          {subtitle && (
            <p className="text-sm text-gray-500 truncate mb-1 italic">
              {subtitle}
            </p>
          )}

          {/* Middle Content Row */}
          {mainContent && (
            <div className={`${!title && !subtitle ? 'py-2' : 'pt-2'} ${(bottomLeftContent || bottomRightContent) ? 'pb-4' : ''}`}>
              {mainContent}
            </div>
          )}

          {/* Bottom Row */}
          <div className={`flex ${shouldMoveRightContent ? 'flex-col gap-2' : 'flex-row items-center justify-between'}`}>
            {bottomLeftContent && (
              <div className="flex-1 min-w-0">
                {bottomLeftContent}
              </div>
            )}

            {/* Conditional Rendering of Right Content */}
            {shouldMoveRightContent ? (
              <div className="flex flex-col gap-2 mt-1">
                {topRightContent && (
                  <div className="flex justify-start">
                    {topRightContent}
                  </div>
                )}
                {bottomRightContent && (
                  <div className="flex justify-start">
                    {bottomRightContent}
                  </div>
                )}
              </div>
            ) : (
              bottomRightContent && (
                <div className="flex-shrink-0 ml-4">
                  {bottomRightContent}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right narrow column */}
        {RightMainIcon && (
          <div className="flex items-center justify-center flex-shrink-0 border-l border-gray-200 pl-2">
            {typeof RightMainIcon === 'function'
              ? RightMainIcon({ className: `w-6 h-6 ${iconAndTitleColor}` })
              : React.isValidElement(RightMainIcon)
                ? RightMainIcon
                : React.createElement(RightMainIcon as any, { className: `w-6 h-6 ${iconAndTitleColor}` })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomListItem;
