import { FC, useState, useMemo } from 'react';
import { KeyMetric } from '@/app/types';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { LucideIcon, Check, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { StatCard } from '@/components/custom/StatCard';
import { getTextColorClass, ColorScheme } from '@/components/custom/CustomColorScheme';

interface SimpleMetric {
  label: string;
  value: string | number;
  icon: string;
  colorScheme?: ColorScheme;
  cardThemeColor?: ColorScheme;
  onClick?: () => void;
  active?: boolean;
}

interface CustomListKeyMetricsProps {
  keyMetricList?: {
    key_metrics: Array<SimpleMetric | KeyMetric>;
  };
  hardcodedMetrics?: Array<SimpleMetric | KeyMetric>;
  filteredData?: any[];
  calculateMetricsFromData?: (data: any[]) => Array<SimpleMetric | KeyMetric>;
  showCollapse?: boolean;
  showHeader?: boolean;
  title?: string;
  selectionMode?: boolean;
  selectedMetrics?: Set<number>;
  onSelectionChange?: (selected: boolean, metric: SimpleMetric | KeyMetric, index: number) => void;
  onToggleSelectionMode?: () => void;
  className?: string;
  gridCols?: number;
  animationDuration?: number;
}

const ITEMS_PER_ROW = 4;

export const CustomListKeyMetrics: FC<CustomListKeyMetricsProps> = ({
  keyMetricList,
  hardcodedMetrics,
  filteredData,
  calculateMetricsFromData,
  showCollapse = true,
  showHeader = false,
  title,
  selectionMode = false,
  selectedMetrics = new Set(),
  onSelectionChange,
  onToggleSelectionMode,
  className = '',
  gridCols,
  animationDuration = 0.05,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const dynamicMetrics = useMemo(() => {
    if (calculateMetricsFromData && filteredData) {
      return calculateMetricsFromData(filteredData);
    }
    return null;
  }, [calculateMetricsFromData, filteredData]);

  const metrics = dynamicMetrics || keyMetricList?.key_metrics || hardcodedMetrics || [];

  // Capped at 6 to match `gridColsMap` below: at 4 a five-metric row wrapped as
  // four plus a lone card, which reads as a second group rather than one row.
  const displayCols = gridCols ?? Math.min(metrics.length, 6);
  const gridColsMap: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  };
  const colsClass = gridColsMap[displayCols] || 'lg:grid-cols-4';

  if (metrics.length === 0) return null;

  const hasMore = showCollapse && metrics.length > ITEMS_PER_ROW;
  const visibleMetrics = hasMore && !isExpanded ? metrics.slice(0, ITEMS_PER_ROW) : metrics;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: animationDuration },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: animationDuration },
    },
  };

  const renderMetric = (metric: SimpleMetric | KeyMetric, index: number) => {
    const simpleMetric = metric as SimpleMetric;

    let iconName = simpleMetric?.icon;
    if (iconName?.includes('<')) {
      const iconMatch = iconName.match(/<(\w+)/);
      iconName = iconMatch ? iconMatch[1] : 'TrendingUp';
    }

    const IconComponent = iconName
      ? (LucideIcons[iconName as keyof typeof LucideIcons] as LucideIcon)
      : LucideIcons.Activity;

    let colorScheme: ColorScheme = 'blue';
    if (simpleMetric?.colorScheme) {
      colorScheme = simpleMetric.colorScheme;
    } else {
      const colorMatch = simpleMetric?.icon?.match(/text-(\w+)-\d+/);
      if (colorMatch) {
        colorScheme = (colorMatch[1] as ColorScheme) || 'blue';
      }
    }

    const textColorClass = getTextColorClass(colorScheme);

    return (
      <motion.div
        key={index}
        variants={itemVariants}
        className={`relative ${simpleMetric?.onClick ? 'cursor-pointer' : ''} ${simpleMetric?.active ? 'ring-2 ring-offset-1 ring-blue-500 rounded-xl' : ''}`}
        onClick={simpleMetric?.onClick}
      >
        {selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectionChange?.(!selectedMetrics.has(index), simpleMetric, index);
            }}
            className={`absolute -top-2 -right-2 z-10 p-1.5 rounded-full transition-colors duration-200 ${
              selectedMetrics.has(index)
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {selectedMetrics.has(index) ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        <div
          className={`transition-opacity duration-200 ${
            selectionMode && !selectedMetrics.has(index) ? 'opacity-50' : 'opacity-100'
          }`}
        >
          <StatCard
            title={simpleMetric?.label || 'N/A'}
            value={simpleMetric?.value?.toString() || '0'}
            icon={<IconComponent className={`h-5 w-5 ${textColorClass}`} />}
            cardThemeColor={simpleMetric?.cardThemeColor}
          />
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {(showHeader || title) && (
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            {title && (
              <h3 className="text-base font-semibold text-gray-700">{title}</h3>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {selectionMode && selectedMetrics.size > 0 && (
              <span className="text-sm text-gray-500">
                ({selectedMetrics.size} selected)
              </span>
            )}
            {onToggleSelectionMode && (
              <button
                onClick={onToggleSelectionMode}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <span>{selectionMode ? 'Cancel' : 'Select Metrics'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <motion.div variants={containerVariants}>
        <motion.div
          initial="hidden"
          animate="visible"
          className={`grid grid-cols-1 md:grid-cols-2 ${colsClass} gap-4`}
        >
          {visibleMetrics.map((metric, index) => renderMetric(metric, index))}
        </motion.div>

        {hasMore && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-4 py-1.5 rounded-full border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show {metrics.length - ITEMS_PER_ROW} more
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default CustomListKeyMetrics;