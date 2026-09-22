import { FC, useMemo } from 'react';
import { CustomTableView } from '@/components/custom/CustomTableView';
import { motion } from 'framer-motion';
import { getTextColorClass } from '@/components/custom/CustomColorScheme';

interface TabularStatsColumn {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  render?: (value: any, row: Record<string, any>) => React.ReactNode;
}

interface CustomListTabularStatsProps {
  filteredData?: any[];
  config?: {
    title?: string;
    columns: TabularStatsColumn[];
    calculateStatsFromData: (data: any[]) => Record<string, any>[];
    showCSVExport?: boolean;
    initialRowLimit?: number;
    hasTotalRow?: boolean;
    totalableColumns?: string[];
    className?: string;
  };
  showTabularStats?: boolean;
  className?: string;
}

export const CustomListTabularStats: FC<CustomListTabularStatsProps> = ({
  filteredData = [],
  config,
  showTabularStats = false,
  className = ''
}) => {
  // Calculate stats from filtered data
  const tabularStatsData = useMemo(() => {
    if (!config?.calculateStatsFromData || filteredData.length === 0) {
      return [];
    }
    return config.calculateStatsFromData(filteredData);
  }, [config, filteredData]);

  // Don't render if not enabled or no data
  if (!showTabularStats || !config || tabularStatsData.length === 0) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {config.title && (
        <div className="pt-4">
          <h3 className="text-base font-semibold text-gray-700">
            {config.title}
          </h3>
        </div>
      )}
      <div className="mt-2">
        <CustomTableView
          title={undefined} // Don't use CustomTableView's built-in title since we're handling it above
          columns={config.columns}
          data={tabularStatsData}
          className={config.className}
          initialRowLimit={config.initialRowLimit !== undefined ? config.initialRowLimit : 1}
          hasTotalRow={config.hasTotalRow || false}
          totalableColumns={config.totalableColumns || []}
          showCSVExport={config.showCSVExport || true}
        />
      </div>
    </motion.div>
  );
};

export default CustomListTabularStats;
