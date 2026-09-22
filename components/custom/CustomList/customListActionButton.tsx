import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { getColorClasses, ColorScheme } from '@/components/custom/CustomColorScheme';

export interface BaseActionButtonProps {
  color?: ColorScheme;
  border?: boolean;
  showLabel?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface CustomListActionButtonProps extends BaseActionButtonProps {
  onClick: () => void;
  title?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  label?: string;
  loadingText?: string;
}

export interface ActionButtonGroupProps extends BaseActionButtonProps {
  label?: string;
  children: ReactNode;
  className?: string;
  /**
   * When true, places the label above the buttons (used when artifact is open)
   */
  stackLabelOnTop?: boolean;
}

/**
 * Base action button component for CustomList filter groups
 * Provides consistent styling and behavior for all action buttons
 */
export const CustomListActionButton: React.FC<CustomListActionButtonProps> = ({
  onClick,
  title,
  icon: Icon,
  children,
  color = 'blueTextWhiteBg',
  border = true,
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  className = '',
  style = {},
  ...props
}) => {
  // Get color classes and border styling
  const colorClasses = getColorClasses(color);
  const borderStyle = border ? {
    borderColor: 'currentColor',
    borderWidth: '2px',
    borderStyle: 'solid'
  } : {};

  // Handle disabled state
  const disabledClasses = disabled || loading 
    ? 'text-gray-400 border-gray-300 cursor-not-allowed bg-gray-50' 
    : '';

  const finalClassName = `px-3 h-10 text-sm font-medium rounded-md border transition-colors flex items-center gap-2 ${
    disabled || loading ? disabledClasses : colorClasses
  } ${className}`;

  const finalStyle = { 
    minWidth: 'fit-content', 
    ...borderStyle, 
    ...style 
  };

  return (
    <button
      onClick={disabled || loading ? undefined : onClick}
      className={finalClassName}
      style={finalStyle}
      title={title}
      disabled={disabled || loading}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {loading ? loadingText : children}
    </button>
  );
};

/**
 * Wrapper component for action button groups with optional labels
 * Provides consistent spacing and layout for multiple action buttons
 */
export const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  label,
  children,
  showLabel = false,
  className = '',
  stackLabelOnTop = false,
  ...props
}) => {
  return (
    <div className={`${stackLabelOnTop ? 'flex flex-col gap-1 items-start' : 'flex items-center gap-3'} ${className}`}>
      {/* Blue label matching togglebutton style - only show if showLabel is true and label exists */}
      {showLabel && label && (
        <span className="text-sm font-medium text-blue-600 whitespace-nowrap">
          {label}
        </span>
      )}
      
      {/* Action buttons container */}
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
};

/**
 * Hook to get consistent action button styling props
 * Useful for components that need to apply the same styling patterns
 */
export const useActionButtonStyles = (props: BaseActionButtonProps) => {
  const {
    color = 'blueTextWhiteBg',
    border = true,
    disabled = false
  } = props;

  const colorClasses = getColorClasses(color);
  const borderStyle = border ? {
    borderColor: 'currentColor',
    borderWidth: '2px',
    borderStyle: 'solid'
  } : {};

  const disabledClasses = disabled 
    ? 'text-gray-400 border-gray-300 cursor-not-allowed bg-gray-50' 
    : '';

  const className = `px-3 h-10 text-sm font-medium rounded-md border transition-colors flex items-center gap-2 ${
    disabled ? disabledClasses : colorClasses
  }`;

  const style = { 
    minWidth: 'fit-content', 
    ...borderStyle 
  };

  return { className, style, disabled };
};

export default CustomListActionButton;

/**
 * Example usage of the base CustomListActionButton:
 * 
 * // Simple action button
 * <CustomListActionButton
 *   onClick={handleClick}
 *   icon={Plus}
 *   color="blueTextWhiteBg"
 *   border={true}
 * >
 *   Add Item
 * </CustomListActionButton>
 * 
 * // Action button with loading state
 * <CustomListActionButton
 *   onClick={handleSubmit}
 *   icon={Send}
 *   loading={isSubmitting}
 *   loadingText="Submitting..."
 *   disabled={!isValid}
 * >
 *   Submit
 * </CustomListActionButton>
 * 
 * // Action button group with label
 * <ActionButtonGroup label="Actions" showLabel={true}>
 *   <CustomListActionButton onClick={handleEdit} icon={Edit}>
 *     Edit
 *   </CustomListActionButton>
 *   <CustomListActionButton onClick={handleDelete} icon={Trash} color="redTextWhiteBg">
 *     Delete
 *   </CustomListActionButton>
 * </ActionButtonGroup>
 * 
 * // Creating a custom action button component that extends the base
 * interface MyCustomActionButtonProps extends BaseActionButtonProps {
 *   onCustomAction: () => void;
 *   customProp: string;
 * }
 * 
 * const MyCustomActionButton: React.FC<MyCustomActionButtonProps> = ({
 *   onCustomAction,
 *   customProp,
 *   ...baseProps
 * }) => {
 *   return (
 *     <ActionButtonGroup label="Custom" showLabel={baseProps.showLabel}>
 *       <CustomListActionButton
 *         onClick={onCustomAction}
 *         icon={Star}
 *         title={`Custom action: ${customProp}`}
 *         {...baseProps}
 *       >
 *         {customProp}
 *       </CustomListActionButton>
 *     </ActionButtonGroup>
 *   );
 * };
 */
