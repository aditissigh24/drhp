import React from 'react';
import { ColorScheme, getColorClasses, getTextColorClass } from './CustomColorScheme';

/**
 * CustomLoader - A reusable loading component with multiple animation types
 * 
 * @example
 * // Basic usage
 * <CustomLoader loading={true} />
 * 
 * // With custom specs
 * <CustomLoader 
 *   loading={isLoading}
 *   specs={{
 *     type: 'spinner',
 *     size: 'lg',
 *     color: 'blue',
 *     text: 'Loading data...'
 *   }}
 * >
 *   <YourContent />
 * </CustomLoader>
 * 
 * // Available types: 'spinner', 'dots', 'bars', 'pulse'
 * // Available sizes: 'sm', 'md', 'lg', 'xl'
 * // Available colors: All ColorScheme values from CustomColorScheme
 */

export interface LoaderSpecs {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: ColorScheme;
  type?: 'spinner' | 'dots' | 'bars' | 'pulse';
  text?: string;
  textColor?: ColorScheme;
  className?: string;
}

interface CustomLoaderProps {
  loading?: boolean;
  specs?: LoaderSpecs;
  children?: React.ReactNode;
}

const CustomLoader: React.FC<CustomLoaderProps> = ({ 
  loading = false, 
  specs = {}, 
  children 
}) => {
  const size = specs.size || 'md';
  const color = specs.color || 'blue';
  const type = specs.type || 'spinner';
  const text = specs.text;
  const textColor = specs.textColor || color;
  const customClassName = specs.className || '';

  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = getColorClasses(color);
  const textColorClass = getTextColorClass(textColor);

  const renderLoaderContent = () => {
    switch (type) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${sizes[size]} rounded-full ${colorClasses} animate-pulse`}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1.4s'
                }}
              />
            ))}
          </div>
        );
      
      case 'bars':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2 ${colorClasses} animate-pulse`}
                style={{
                  height: size === 'sm' ? '16px' : size === 'md' ? '24px' : size === 'lg' ? '32px' : '48px',
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1.2s'
                }}
              />
            ))}
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizes[size]} rounded-full ${colorClasses} animate-pulse`} />
        );
      
      case 'spinner':
      default:
        return (
          <div className={`${sizes[size]} border-2 border-gray-300 border-t-2 border-t-current rounded-full animate-spin ${colorClasses.replace('bg-', 'border-')}`} />
        );
    }
  };

  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 space-y-3 ${customClassName}`}>
      {renderLoaderContent()}
      {text && (
        <p className={`text-sm font-medium ${textColorClass}`}>
          {text}
        </p>
      )}
    </div>
  );
};

export default CustomLoader;

// Backward compatibility export
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeMap = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const
  };
  
  return (
    <CustomLoader 
      loading={true}
      specs={{
        type: 'spinner',
        size: sizeMap[size],
        color: 'blue'
      }}
    />
  );
};
