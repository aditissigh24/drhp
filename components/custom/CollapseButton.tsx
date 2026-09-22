import { FC } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from "@/lib/utils";

interface CollapseButtonProps {
  isExpanded: boolean;
  onClick: () => void;
  className?: string;
  expandedText?: string;
  collapsedText?: string;
}

export const CollapseButton: FC<CollapseButtonProps> = ({
  isExpanded,
  onClick,
  className,
  expandedText = "Show Less",
  collapsedText = "Show More"
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors",
        "px-3 py-1.5 rounded-md hover:bg-gray-100",
        className
      )}
    >
      {isExpanded ? (
        <>
          <ChevronUp className="h-4 w-4" />
          {expandedText}
        </>
      ) : (
        <>
          <ChevronDown className="h-4 w-4" />
          {collapsedText}
        </>
      )}
    </button>
  );
}; 