import { FC, ReactNode } from 'react';
import { cn } from "@/lib/utils";
import { getColorClasses, getColorClassesWithHover, getBorderColorClass, getHoverClasses, getTextColorClass, ColorScheme } from './CustomColorScheme';

type TailwindWidthClass =
  | 'w-12'
  | 'w-14'
  | 'w-16'
  | 'w-20'
  | 'w-24'
  | 'w-28'
  | 'w-32'
  | 'w-36'
  | 'w-40'
  | 'w-44'
  | 'w-48'
  | 'w-56'
  | 'w-64'
  | 'w-72'
  | 'w-80'
  | 'w-96'
  | 'w-auto'
  | 'w-full'
  | 'w-fit'
  | 'w-min'
  | 'w-max';

interface BubbleTagProps {
  hasInsideNumber?: boolean;
  hasOutsideIcon?: boolean;
  hasInsideIcon?: boolean;
  icon?: ReactNode;
  iconAfter?: ReactNode;
  number?: number;
  text: string;
  color: ColorScheme;
  onHover?: boolean;
  withBorder?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  /**
   * Forces the inner tag to have a specific width.
   * Can be a Tailwind class (e.g. 'w-24'), a number (px), or a CSS width string.
   */
  fixedWidth?: TailwindWidthClass | number | string;
  noBackground?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const BubbleTag: FC<BubbleTagProps> = ({
  hasInsideNumber = false,
  hasOutsideIcon = false,
  hasInsideIcon = false,
  icon,
  iconAfter,
  number,
  text,
  color,
  onHover = false,
  withBorder = false,
  onClick,
  clickable = false,
  fixedWidth,
  noBackground = false,
  className,
  size = 'sm',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if ((clickable || onClick) && onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  const isTailwindWidth = typeof fixedWidth === 'string' && fixedWidth.startsWith('w-');
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {hasOutsideIcon && icon && (
        <span className={cn("flex-shrink-0", `text-${color}-700`)}>{icon}</span>
      )}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded font-medium",
          size === 'md' ? "px-2.5 py-1 text-sm font-semibold" : "px-2 py-0.5 text-xs",
          noBackground 
            ? getTextColorClass(color) 
            : (onHover || clickable ? getColorClassesWithHover(color) : getColorClasses(color)),
          withBorder ? `border ${getBorderColorClass(color)}` : "",
          clickable || onClick ? "cursor-pointer" : "",
          "min-w-0",
          isTailwindWidth ? `${fixedWidth} justify-center truncate` : "justify-center truncate",
          className
        )}
        style={
          fixedWidth && !isTailwindWidth
            ? { 
                width: typeof fixedWidth === 'number' ? `${fixedWidth}px` : fixedWidth,
                minWidth: typeof fixedWidth === 'number' ? `${fixedWidth}px` : fixedWidth,
                maxWidth: typeof fixedWidth === 'number' ? `${fixedWidth}px` : fixedWidth,
              }
            : undefined
        }
        onClick={handleClick}
        title={text}
      >
        {hasInsideIcon && icon && (
          <span className="flex-shrink-0">{icon}</span>
        )}
        {hasInsideNumber && number !== undefined && (
          <span>{number}</span>
        )}
        <span className={cn("truncate max-w-full flex items-center gap-1", isTailwindWidth || fixedWidth ? "text-center justify-center" : "")}>
          <span>{text}</span>
          {iconAfter && <span className="flex-shrink-0">{iconAfter}</span>}
        </span>
      </span>
    </div>
  );
};
