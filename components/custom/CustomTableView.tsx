import {
  FC,
  ReactNode,
  useState,
  isValidElement,
  useEffect,
  useMemo,
} from "react";
import CustomLoader from "./CustomLoader";
import { CollapseButton } from "./CollapseButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Papa from "papaparse"; // Add this import for CSV parsing
import {
  getTextColorClass,
  colorSchemes,
  ColorScheme,
} from "./CustomColorScheme";

export interface Column {
  key: string;
  header: ReactNode;
  sortable?: boolean;
  width?: string; // Optional width for the column
  minWidth?: string; // Optional minimum width for the column
  maxWidth?: string; // Optional maximum width for the column
  render?: (value: any, row: Record<string, any>) => ReactNode; // Custom render function
  align?: "left" | "center" | "right"; // Text alignment
  verticalAlign?: "top" | "middle" | "bottom"; // Vertical alignment
}

interface SortState {
  column: string | null;
  direction: 'asc' | 'desc' | null;
}

interface CustomTableViewProps {
  title?: string;
  titleNumber?: number;
  columns: Column[];
  data: Record<string, any>[];
  className?: string;
  initialRowLimit?: number;
  isExpanded?: boolean;
  setIsExpanded?: (value: boolean) => void;
  hasTotalRow?: boolean;
  totalableColumns?: string[];
  showCSVExport?: boolean;
  minColumnWidth?: string; // Default minimum width for all columns
  maxColumnWidth?: string; // Default maximum width for all columns
  showCSVPreview?: boolean; // Add a new prop to control CSV preview
  // New toggle props (single toggle - for backward compatibility)
  toggleOptions?: string[];
  selectedToggleOption?: string;
  onToggleOptionChange?: (option: string) => void;
  togglePosition?: "left" | "right";
  toggleIcons?: Record<string, ReactNode>; // Add icons for toggle options
  // Multiple toggles support
  toggles?: Array<{
    id: string;
    options: string[];
    selectedOption: string;
    onOptionChange: (option: string) => void;
    position?: "left" | "right";
    icons?: Record<string, ReactNode>;
  }>;
  // Row selection props
  enableRowSelection?: boolean;
  selectedRows?: Record<string, any>[];
  onSelectedRowsChange?: (selectedRows: Record<string, any>[]) => void;
  rowIdKey?: string; // Key to use for unique row identification, defaults to row index
  // Frozen columns - array of column indices to freeze (defaults to first 2 columns)
  frozenColumnIndices?: number[];
  // Alternating row colors
  enableAlternatingRows?: boolean;
  alternatingRowColor?: ColorScheme; // Color scheme for alternating rows
  // Header and total row background color
  headerAndTotalRowBg?: string; // Optional: Tailwind color class (e.g., 'gray-100', 'gray-150') to slightly darken header and total rows
  // Totals formatting
  totalsFormat?: "currency" | "count" | "number"; // Format for totals: currency (₹), count (comma-separated), or plain number
  totalsLabelKey?: string; // Key in the first column to use for the totals label (defaults to first column key)
  totalsLabel?: string; // Label text for totals row (defaults to 'Total')
  // Percentage columns
  percentageColumns?: string[]; // Columns to show percentage breakdown (as % of column total)
  // Column color shading
  columnColorShading?: Array<{
    columnKey: string;
    minColor: string; // Tailwind color class (e.g., 'white', 'blue-50')
    maxColor: string; // Tailwind color class (e.g., 'blue-100', 'blue-200')
  }>;
  // Row click handler
  onRowClick?: (row: Record<string, any>) => void;
  // Custom row className
  rowClassName?: string;
  // Optional ref from parent to trigger CSV download programmatically.
  downloadCsvRef?: React.MutableRefObject<(() => void) | null>;
  exportRef?: React.MutableRefObject<(() => void) | null>;
  titleRightContent?: ReactNode;
  titleIcon?: ReactNode;
  hoverBgColor?: string; // Optional: Tailwind color class (e.g., 'blue-100', 'gray-50')
  isLoading?: boolean;
  headerBgColor?: string;
  alternateRowBgColor?: string;
  fixedFirstColumn?: boolean;
  fixedColumnsCount?: number;
}

// Sort button component
const SortButton: FC<{
  sortState: SortState;
  columnKey: string;
  onClick: () => void;
}> = ({ sortState, columnKey, onClick }) => {
  const isActive = sortState.column === columnKey;
  const direction = sortState.direction;

  return (
    <button
      onClick={onClick}
      className="ml-1 p-1 rounded hover:bg-gray-100 transition-colors"
      title={direction === 'asc' ? 'Sort ascending' : direction === 'desc' ? 'Sort descending' : 'Sort'}
    >
      <svg
        className={`w-3 h-3 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {direction === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : direction === 'desc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 5 5-5" />
        )}
      </svg>
    </button>
  );
};

export const CustomTableView: FC<CustomTableViewProps> = ({
  title,
  titleNumber,
  columns,
  data,
  className = "",
  initialRowLimit = 3,
  isExpanded = false,
  setIsExpanded,
  hasTotalRow = false,
  totalableColumns = [],
  showCSVExport = false,
  minColumnWidth,
  maxColumnWidth,
  showCSVPreview = false, // Add a new prop to control CSV preview
  // New toggle props (single toggle - for backward compatibility)
  toggleOptions,
  selectedToggleOption,
  onToggleOptionChange,
  togglePosition,
  toggleIcons,
  // Multiple toggles support
  toggles,
  // Ref to expose the downloadCSV function to parent components
  downloadCsvRef,
  exportRef,
  // Row selection props
  enableRowSelection = false,
  selectedRows = [],
  onSelectedRowsChange,
  rowIdKey,
  // Frozen columns
  frozenColumnIndices,
  // Alternating row colors
  enableAlternatingRows = false,
  alternatingRowColor = "gray",
  // Header and total row background color
  headerAndTotalRowBg,
  // Totals formatting
  totalsFormat = "number",
  totalsLabelKey,
  totalsLabel = "Total",
  // Percentage columns
  percentageColumns = [],
  // Column color shading
  columnColorShading = [],
  // Row click handler
  onRowClick,
  // Custom row className
  rowClassName,
  titleRightContent,
  titleIcon,
  hoverBgColor,
  isLoading = false,
  headerBgColor,
  alternateRowBgColor,
  fixedFirstColumn = false,
  fixedColumnsCount,
}) => {
  // Helper function to get header/total row background class
  const getHeaderBgClass = () => {
    if (headerBgColor) return headerBgColor;
    if (!headerAndTotalRowBg) return "bg-gray-50";
    // Map common Tailwind gray shades - using full class names for Tailwind to detect them
    const colorMap: Record<string, string> = {
      "gray-100": "bg-gray-100",
      "gray-150": "bg-gray-150",
      "gray-200": "bg-gray-200",
      "gray-300": "bg-gray-300",
      "slate-100": "bg-slate-100",
      "slate-200": "bg-slate-200",
      "zinc-100": "bg-zinc-100",
      "zinc-200": "bg-zinc-200",
      "blue-50": "bg-blue-50",
      "blue-100": "bg-blue-100",
    };
    return colorMap[headerAndTotalRowBg] || "bg-gray-50";
  };

  const headerBgClass = getHeaderBgClass();
  // If no external control is provided, manage state internally
  const [isExpandedInternal, setIsExpandedInternal] = useState(false);
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [selectedRowsInternal, setSelectedRowsInternal] = useState<Record<string, any>[]>([]);

  // Use either external or internal state
  const expanded = setIsExpanded ? isExpanded : isExpandedInternal;
  const toggleExpanded = () => {
    if (setIsExpanded) {
      setIsExpanded(!isExpanded);
    } else {
      setIsExpandedInternal(!isExpandedInternal);
    }
  };

  // Use either external or internal selected rows state
  const currentSelectedRows = onSelectedRowsChange ? selectedRows : selectedRowsInternal;
  const setSelectedRows = (rows: Record<string, any>[]) => {
    if (onSelectedRowsChange) {
      onSelectedRowsChange(rows);
    } else {
      setSelectedRowsInternal(rows);
    }
  };

  // Function to get unique identifier for a row
  const getRowId = (row: Record<string, any>, index: number) => {
    if (rowIdKey && row[rowIdKey] !== undefined) {
      return String(row[rowIdKey]);
    }
    return String(index);
  };

  // Check if a row is selected
  const isRowSelected = (row: Record<string, any>, index: number) => {
    const rowId = getRowId(row, index);
    return currentSelectedRows.some(selectedRow =>
      getRowId(selectedRow, currentSelectedRows.indexOf(selectedRow)) === rowId
    );
  };

  // Toggle row selection
  const toggleRowSelection = (row: Record<string, any>, index: number) => {
    const rowId = getRowId(row, index);
    const isSelected = isRowSelected(row, index);

    if (isSelected) {
      // Remove from selection
      setSelectedRows(currentSelectedRows.filter(selectedRow =>
        getRowId(selectedRow, currentSelectedRows.indexOf(selectedRow)) !== rowId
      ));
    } else {
      // Add to selection
      setSelectedRows([...currentSelectedRows, row]);
    }
  };

  // Check if all visible rows are selected
  const areAllVisibleRowsSelected = () => {
    if (visibleData.length === 0) return false;
    return visibleData.every((row, index) => isRowSelected(row, index));
  };

  // Toggle all visible rows selection
  const toggleAllRowsSelection = () => {
    if (areAllVisibleRowsSelected()) {
      // Deselect all visible rows
      const visibleRowIds = visibleData.map((row, index) => getRowId(row, index));
      setSelectedRows(currentSelectedRows.filter(selectedRow =>
        !visibleRowIds.includes(getRowId(selectedRow, currentSelectedRows.indexOf(selectedRow)))
      ));
    } else {
      // Select all visible rows that aren't already selected
      const newSelections = visibleData.filter((row, index) => !isRowSelected(row, index));
      setSelectedRows([...currentSelectedRows, ...newSelections]);
    }
  };

  // Handle sort click
  const handleSort = (columnKey: string) => {
    setSortState((prev) => {
      if (prev.column === columnKey) {
        // Cycle through: asc -> desc -> null
        if (prev.direction === 'asc') return { column: columnKey, direction: 'desc' };
        if (prev.direction === 'desc') return { column: null, direction: null };
      }
      return { column: columnKey, direction: 'asc' };
    });
  };

  // Sort data based on sort state
  const sortedData = [...data].sort((a, b) => {
    if (!sortState.column || !sortState.direction) return 0;
    
    const aValue = a[sortState.column];
    const bValue = b[sortState.column];
    
    if (aValue === bValue) return 0;

    // Helper for null/undefined/NA
    const isEmpty = (v: any) => v === null || v === undefined || v === "" || v === "N/A" || v === "—";
    if (isEmpty(aValue) && !isEmpty(bValue)) return 1;
    if (!isEmpty(aValue) && isEmpty(bValue)) return -1;

    // Try numeric comparison if it looks like currency or number
    const isNumeric = (v: any) => typeof v === 'number' || (typeof v === 'string' && /^[₹$€£\s,]*\d+(\.\d+)?[₹$€£\s,]*$/.test(v));
    
    if (isNumeric(aValue) && isNumeric(bValue)) {
      const aNum = parseCellValue(aValue);
      const bNum = parseCellValue(bValue);
      const cmp = aNum - bNum;
      return sortState.direction === 'asc' ? cmp : -cmp;
    }

    // Try date comparison
    const aDate = Date.parse(String(aValue));
    const bDate = Date.parse(String(bValue));
    
    // Only use date comparison if it's a valid date and NOT just a simple number
    if (!isNaN(aDate) && !isNaN(bDate) && isNaN(Number(String(aValue).trim()))) {
      const cmp = aDate - bDate;
      return sortState.direction === 'asc' ? cmp : -cmp;
    }
    
    // Fallback to string comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    const comparison = aStr < bStr ? -1 : 1;
    return sortState.direction === 'asc' ? comparison : -comparison;
  });

  // Show all rows if expanded, otherwise limit to initialRowLimit
  const visibleData = expanded ? sortedData : sortedData.slice(0, initialRowLimit);
  const hasMoreRows = data.length > initialRowLimit;

  // Calculate totals for specified columns
  const calculateTotals = () => {
    const totals: Record<string, string | number> = {};

    // If no totalableColumns specified but hasTotalRow is true, use all numeric columns
    const columnsToTotal =
      totalableColumns.length > 0
        ? totalableColumns
        : columns.map((col) => col.key);

    columnsToTotal.forEach((columnKey) => {
      const sum = data.reduce((acc, row) => {
        const cellValue = row[columnKey];

        // Handle different types of values
        if (typeof cellValue === "number") {
          return acc + cellValue;
        }

        if (typeof cellValue === "string") {
          // Remove currency symbols, commas, and text, then parse
          const cleanValue = cellValue
            .replace(/[₹$€£,]/g, "") // Remove currency symbols and commas
            .replace(/\s+/g, "") // Remove spaces
            .replace(/[^\d.-]/g, ""); // Keep only digits, dots, and minus signs

          const parsedValue = parseFloat(cleanValue);
          return acc + (isNaN(parsedValue) ? 0 : parsedValue);
        }

        // For React elements or other types, skip
        return acc;
      }, 0);

      // Format the total based on totalsFormat prop
      if (totalsFormat === "currency") {
        totals[columnKey] =
          "₹" + sum.toLocaleString("en-IN", { maximumFractionDigits: 0 });
      } else if (totalsFormat === "count") {
        totals[columnKey] = sum.toLocaleString();
      } else {
        totals[columnKey] = sum;
      }
    });

    // Set the label for the totals row
    const labelKey = totalsLabelKey || columns[0]?.key;
    if (labelKey) {
      totals[labelKey] = totalsLabel;
    }

    return totals;
  };

  // Get totals if needed
  const totals = hasTotalRow ? calculateTotals() : null;

  // Helper function to parse cell value to number
  const parseCellValue = (cellValue: any): number => {
    if (typeof cellValue === "number") {
      return cellValue;
    }

    if (typeof cellValue === "string") {
      // Remove currency symbols, commas, and text, then parse
      const cleanValue = cellValue
        .replace(/[₹$€£,]/g, "") // Remove currency symbols and commas
        .replace(/\s+/g, "") // Remove spaces
        .replace(/[^\d.-]/g, ""); // Keep only digits, dots, and minus signs

      const parsedValue = parseFloat(cleanValue);
      return isNaN(parsedValue) ? 0 : parsedValue;
    }

    return 0;
  };

  // Calculate column totals for percentage columns and color shading columns
  const calculateColumnTotals = useMemo(() => {
    const columnTotals: Record<string, number> = {};

    // Get all columns that need totals (percentage columns + color shading columns)
    const columnsNeedingTotals = new Set([
      ...percentageColumns,
      ...columnColorShading.map((config) => config.columnKey),
    ]);

    columnsNeedingTotals.forEach((columnKey) => {
      columnTotals[columnKey] = data.reduce((sum, row) => {
        return sum + parseCellValue(row[columnKey]);
      }, 0);
    });

    return columnTotals;
  }, [data, percentageColumns, columnColorShading]);

  // Helper function to calculate and format percentage
  const getPercentage = (cellValue: any, columnKey: string): string => {
    if (!percentageColumns.includes(columnKey)) {
      return "";
    }

    const columnTotal = calculateColumnTotals[columnKey];
    if (columnTotal === 0) {
      return " (0%)";
    }

    const cellNum = parseCellValue(cellValue);
    const percentage = (cellNum / columnTotal) * 100;

    // Format to 1 decimal place, but show as integer if whole number
    const formatted =
      percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(1);

    return ` (${formatted}%)`;
  };

  // Helper function to get percentage value (0-100) for color shading
  const getPercentageValue = (cellValue: any, columnKey: string): number => {
    const columnTotal = calculateColumnTotals[columnKey];
    if (!columnTotal || columnTotal === 0) {
      return 0;
    }

    const cellNum = parseCellValue(cellValue);
    const percentage = (cellNum / columnTotal) * 100;

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, percentage));
  };

  // Tailwind color to RGB mapping
  const tailwindColorToRgb = (colorClass: string): [number, number, number] => {
    // Handle common colors
    const colorMap: Record<string, [number, number, number]> = {
      white: [255, 255, 255],
      "blue-50": [239, 246, 255],
      "blue-100": [219, 234, 254],
      "blue-200": [191, 219, 254],
      "blue-300": [147, 197, 253],
      "blue-400": [96, 165, 250],
      "blue-500": [59, 130, 246],
      "gray-50": [249, 250, 251],
      "gray-100": [243, 244, 246],
      "gray-200": [229, 231, 235],
      "red-50": [254, 242, 242],
      "red-100": [254, 226, 226],
      "green-50": [240, 253, 244],
      "green-100": [220, 252, 231],
      "slate-50": [248, 250, 252],
      "slate-100": [241, 245, 249],
      "slate-200": [226, 232, 240],
    };

    // Check if it's a direct match
    if (colorMap[colorClass]) {
      return colorMap[colorClass];
    }

    // Try to parse pattern like "blue-100"
    const match = colorClass.match(/^(\w+)-(\d+)$/);
    if (match) {
      const [, baseColor, shade] = match;
      const key = `${baseColor}-${shade}`;
      if (colorMap[key]) {
        return colorMap[key];
      }
    }

    // Default to white if color not found
    return [255, 255, 255];
  };

  // Tailwind color to HEX mapping
  const tailwindColorToHex = (colorClass: string): string => {
    const colorMap: Record<string, string> = {
      white: "#ffffff",
      "blue-50": "#eff6ff",
      "blue-100": "#dbeafe",
      "blue-200": "#bfdbfe",
      "gray-50": "#f9fafb",
      "gray-100": "#f3f4f6",
      "gray-200": "#e5e7eb",
      "slate-50": "#f8fafc",
      "slate-100": "#f1f5f9",
      "red-50": "#fef2f2",
      "green-50": "#f0fdf4",
    };
    return colorMap[colorClass] || "#ffffff";
  };

  // Interpolate between two RGB colors
  const interpolateColor = (
    color1: [number, number, number],
    color2: [number, number, number],
    factor: number
  ): string => {
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * factor);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * factor);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Get background color for a cell based on column color shading
  const getCellBackgroundColor = (
    cellValue: any,
    columnKey: string
  ): string | undefined => {
    const colorConfig = columnColorShading.find(
      (config) => config.columnKey === columnKey
    );
    if (!colorConfig) {
      return undefined;
    }

    const percentage = getPercentageValue(cellValue, columnKey);
    // Convert percentage to factor between 0 and 1
    const factor = percentage / 100;

    const minRgb = tailwindColorToRgb(colorConfig.minColor);
    const maxRgb = tailwindColorToRgb(colorConfig.maxColor);

    return interpolateColor(minRgb, maxRgb, factor);
  };

  // Default column widths based on typical content
  const getColumnWidth = (column: Column, index: number) => {
    // First priority: column-specific width
    if (column.width) return column.width;
    
    // Default widths based on column type
    if (column.key === 'page_no' || column.key.includes('page')) return '80px';
    if (column.key === 'section_of_offer_document' || column.key.includes('section')) return '200px';
    
    // For longer text columns, give more space
    if (
      column.key.includes('text') || 
      column.key.includes('excerpt') || 
      column.key.includes('description') || 
      column.key.includes('information') ||
      column.key.includes('issues') ||
      column.key.includes('reason')
    ) {
      return '250px';
    }
    
    // Default width
    return '150px';
  };

  // Get column min width
  const getColumnMinWidth = (column: Column) => {
    // First priority: column-specific min width
    if (column.minWidth) return column.minWidth;
    // Second priority: table-level min width
    if (minColumnWidth) return minColumnWidth;
    // Default: no min-width
    return undefined;
  };

  // Get column max width
  const getColumnMaxWidth = (column: Column) => {
    // First priority: column-specific max width
    if (column.maxWidth) return column.maxWidth;
    // Second priority: table-level max width
    if (maxColumnWidth) return maxColumnWidth;
    // Default: no max-width
    return undefined;
  };

  // Get sticky positioning for fixed columns
  const getStickyStyle = (
    column: Column,
    index: number,
    isHeaderCell: boolean = false,
    rowBgColor?: string
  ) => {
    // Determine which columns should be frozen
    const numFixed = fixedColumnsCount ?? (fixedFirstColumn ? 1 : 0);
    const isFixed = 
      index < numFixed || 
      (column as any)?.fixed === "left" || 
      (frozenColumnIndices && frozenColumnIndices.includes(index)) ||
      (!frozenColumnIndices && !fixedFirstColumn && !fixedColumnsCount && index < 2);
      
    if (!isFixed) return {};

    // Calculate left offset based on column widths before this column
    let leftOffset = enableRowSelection ? 48 : 0;
    for (let i = 0; i < index; i++) {
      // Use minWidth as the actual width for sticky positioning
      leftOffset += parseInt(getColumnMinWidth(columns[i]) || "150") || 150;
    }

    // Determine background color - must be solid to hide scrolling content behind it
    let bgColor = rowBgColor || "#ffffff"; // Use row background or white (default row background)
    if (isHeaderCell) {
      bgColor = headerAndTotalRowBg ? (tailwindColorToRgb(headerAndTotalRowBg).join(',') === '255,255,255' ? '#ffffff' : '#f3f4f6') : "#f9fafb";
      // Simplified: If custom header bg exists, use it mapping or default to current gray
      bgColor = headerBgClass === "bg-gray-50" ? "#f9fafb" : 
                headerBgClass === "bg-gray-100" ? "#f3f4f6" :
                headerBgClass === "bg-gray-200" ? "#e5e7eb" :
                headerBgClass === "bg-blue-50" ? "#eff6ff" :
                headerBgClass === "bg-blue-100" ? "#dbeafe" : "#f9fafb";
    }

    return {
      position: "sticky" as const,
      left: `${leftOffset}px`,
      zIndex: isHeaderCell ? 5 : 1, // Stay below sidebar (z-10) but above other table content
      backgroundColor: bgColor, // Solid background to hide scrolling columns
    };
  };

  // Function to convert data to CSV
  const convertToCSV = () => {
    // Extract headers from columns
    const headers = columns.map(column => {
      // Convert ReactNode headers to string if possible
      if (typeof column.header === 'string') {
        return column.header;
      } else {
        return column.key; // Fallback to key if header is a complex ReactNode
      }
    });
    
    // Create CSV header row
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    const allData = hasTotalRow ? [...sortedData, totals] : sortedData;
    
    allData.forEach(row => {
      const csvRow = columns.map(column => {
        let cellValue = row?.[column.key];
        
        // Handle different value types
        if (cellValue === null || cellValue === undefined) {
          return '';
        }
        
        if (typeof cellValue === 'object' && isValidElement(cellValue)) {
          // Try to extract text content from React elements
          return ''; // This is simplified - extracting text from React elements is complex
        }
        
        // Convert to string and escape quotes
        const stringValue = String(cellValue).replace(/"/g, '""');
        
        // Wrap in quotes if contains comma, newline or quotes
        return /[,\n"]/.test(stringValue) ? `"${stringValue}"` : stringValue;
      }).join(',');
      
      csvContent += csvRow + '\n';
    });
    
    return csvContent;
  };
  
  // New state for CSV preview
  const [csvPreviewData, setCsvPreviewData] = useState<any[] | null>(null);

  // Modify downloadCSV to optionally parse and set preview data
  const downloadCSV = () => {
    const csvContent = convertToCSV();
    
    // Parse CSV for preview if showCSVPreview is true
    if (showCSVPreview) {
      Papa.parse(csvContent, {
        header: true,
        complete: (results) => {
          setCsvPreviewData(results.data);
        }
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv` : 'table_data.csv';
    
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Expose downloadCSV to parent via ref if provided
  useEffect(() => {
    if (downloadCsvRef) {
      downloadCsvRef.current = downloadCSV;
    }
    if (exportRef) {
      exportRef.current = downloadCSV;
    }
    return () => {
      if (downloadCsvRef) downloadCsvRef.current = null;
      if (exportRef) exportRef.current = null;
    };
  }, [downloadCsvRef, exportRef, data, columns, showCSVPreview]);

  const hasHeader = !!(
    title || 
    (toggles && toggles.length > 0) || 
    (toggleOptions && toggleOptions.length > 0)
  );

  return (
    <div className={`relative ${className} ${title ? 'pt-2' : ''}`}>
      {hasHeader && (
        <div className="flex justify-between items-center mb-2">
          {title && (
            <div className="flex items-center gap-4">
              <h3 className="text-md font-semibold flex items-center gap-2">
                {titleIcon && <span className="flex-shrink-0">{titleIcon}</span>}
                {title}
                {titleRightContent}
              </h3>
              {enableRowSelection && currentSelectedRows.length > 0 && (
                <span className="text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded">
                  {currentSelectedRows.length} row
                  {currentSelectedRows.length !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
          )}

          {/* Toggle Bar(s) */}
          <div className="flex items-center gap-2">
            {/* Multiple toggles support */}
            {toggles && toggles.length > 0
              ? toggles.map((toggle) => (
                  <div
                    key={toggle.id}
                    className={`flex bg-gray-100 rounded-lg p-1 ${
                      toggle.position === "right" ? "ml-auto" : ""
                    }`}
                  >
                    {toggle.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => toggle.onOptionChange(option)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                          toggle.selectedOption === option
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {toggle.icons && toggle.icons[option] && (
                          <span className="flex-shrink-0">
                            {toggle.icons[option]}
                          </span>
                        )}
                        <span>{option}</span>
                      </button>
                    ))}
                  </div>
                ))
              : /* Single toggle (backward compatibility) */
                toggleOptions &&
                toggleOptions.length > 0 && (
                  <div
                    className={`flex bg-gray-100 rounded-lg p-1 ${
                      togglePosition === "right" ? "ml-auto" : ""
                    }`}
                  >
                    {toggleOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => onToggleOptionChange?.(option)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                          selectedToggleOption === option
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {toggleIcons && toggleIcons[option] && (
                          <span className="flex-shrink-0">
                            {toggleIcons[option]}
                          </span>
                        )}
                        <span>{option}</span>
                      </button>
                    ))}
                  </div>
                )}
          </div>
        </div>
      )}
      
      <div className="w-full" style={{ maxWidth: "100%" }}>
        <div className="border rounded-md overflow-hidden shadow-sm w-full">
          <div className="overflow-x-auto w-full">
            <table
              className="divide-y divide-gray-200 min-w-full"
              style={{
                width: "100%",
                tableLayout: "fixed",
                boxSizing: "border-box",
              }}
            >
              <thead
                className="bg-gray-50"
                style={{ position: "sticky", top: 0, zIndex: 5 }}
              >
                <tr>
                  {enableRowSelection && (
                    <th className={`px-4 py-3 text-left w-12 ${headerBgClass}`} style={{ position: "sticky", left: 0, zIndex: 6 }}>
                      <input
                        type="checkbox"
                        checked={areAllVisibleRowsSelected()}
                        onChange={toggleAllRowsSelection}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Select all visible rows"
                      />
                    </th>
                  )}
                  {columns.map((column, index) => {
                    const align = column.align || "left";
                    const isRightAligned = align === "right";
                    const stickyStyle = getStickyStyle(column, index, true);
                    return (
                      <th
                        key={`${column.key}-${index}`}
                        className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${headerBgClass}`}
                        style={{
                          width: getColumnWidth(column, index),
                          minWidth: getColumnMinWidth(column),
                          maxWidth: getColumnMaxWidth(column),
                          textAlign: align,
                          verticalAlign: column.verticalAlign || "top",
                          ...stickyStyle,
                        }}
                      >
                        <div
                          className={`flex items-center gap-1 ${
                            isRightAligned
                              ? "justify-end"
                              : align === "center"
                              ? "justify-center"
                              : "justify-start"
                          }`}
                        >
                          {isRightAligned && column.sortable !== false && (
                            <SortButton
                              sortState={sortState}
                              columnKey={column.key}
                              onClick={() => handleSort(column.key)}
                            />
                          )}
                          {column.header}
                          {!isRightAligned && column.sortable !== false && (
                            <SortButton
                              sortState={sortState}
                              columnKey={column.key}
                              onClick={() => handleSort(column.key)}
                            />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleData.length > 0 ? (
                  <>
                    {visibleData.map((row, rowIndex) => {
                      const isEven = rowIndex % 2 === 0;
                      const isTotalRow =
                        row.rowLabel === "Total" ||
                        row.Metric === "Total" ||
                        row.Status === "Total";
                      const getRowBackgroundClass = () => {
                        if (isTotalRow) {
                          return headerBgClass;
                        }
                        if (isRowSelected(row, rowIndex)) {
                          return "bg-blue-50 hover:bg-blue-100";
                        }
                        
                        const hoverClass = hoverBgColor
                          ? (hoverBgColor.startsWith("hover:") ? hoverBgColor : `hover:bg-${hoverBgColor}`)
                          : "hover:bg-gray-50";

                        if (enableAlternatingRows || alternateRowBgColor) {
                          // Use subtle colors: bg-gray-50/alternateRowBgColor for odd rows, white for even rows
                          const bgClass = alternateRowBgColor || "bg-gray-50";
                          return isEven
                            ? `bg-white ${hoverClass}`
                            : `${bgClass} ${hoverClass}`;
                        }
                        return hoverClass;
                      };

                      // Get specific hover class for sticky cells
                      const getStickyHoverClass = () => {
                        if (isTotalRow) return "";
                        return ""; // We'll use CSS variables instead
                      };

                      const rowBgHex = isRowSelected(row, rowIndex)
                        ? "#eff6ff"
                        : (enableAlternatingRows || alternateRowBgColor) && !isEven
                        ? (alternateRowBgColor ? tailwindColorToHex(alternateRowBgColor) : "#f9fafb")
                        : "#ffffff";

                      const rawHoverColor = hoverBgColor
                        ? (hoverBgColor.startsWith("hover:") ? hoverBgColor.replace("hover:bg-", "") : hoverBgColor)
                        : "gray-50";
                      const rowHoverHex = tailwindColorToHex(rawHoverColor);

                      return (
                        <tr
                          key={rowIndex}
                          className={`group transition-colors duration-150 ease-in-out ${getRowBackgroundClass()} ${
                            rowClassName || ""
                          } ${
                            onRowClick && !isTotalRow ? "cursor-pointer" : ""
                          }`}
                          style={
                            {
                              "--row-bg": rowBgHex,
                              "--row-hover-bg": rowHoverHex,
                            } as React.CSSProperties
                          }
                          onMouseEnter={(e) => {
                            if (!isTotalRow) e.currentTarget.style.setProperty('--sticky-cell-bg', 'var(--row-hover-bg)');
                          }}
                          onMouseLeave={(e) => {
                            if (!isTotalRow) e.currentTarget.style.removeProperty('--sticky-cell-bg');
                          }}
                          onClick={(e) => {
                            if (onRowClick && !isTotalRow) {
                              // Don't trigger row click if clicking in selection cell
                              if ((e.target as HTMLElement).closest('.selection-cell')) {
                                return;
                              }
                              onRowClick(row);
                            }
                          }}
                        >
                          {enableRowSelection && (
                            <td
                              className={`px-4 py-3 w-12 selection-cell ${
                                isTotalRow ? headerBgClass : getStickyHoverClass()
                              }`}
                              style={{ 
                                position: "sticky", 
                                left: 0, 
                                zIndex: 2,
                                backgroundColor: isTotalRow ? undefined : "var(--sticky-cell-bg, var(--row-bg))"
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isRowSelected(row, rowIndex)}
                                onChange={() =>
                                  toggleRowSelection(row, rowIndex)
                                }
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          )}
                          {columns.map((column, index) => {
                            const isTotalRow =
                              row.rowLabel === "Total" ||
                              row.Metric === "Total" ||
                              row.Status === "Total";
                            const showPercentage =
                              percentageColumns.includes(column.key) &&
                              !isTotalRow;
                            const cellValue = row[column.key];
                            const percentageText = showPercentage
                              ? getPercentage(cellValue, column.key)
                              : "";

                            // Get background color for column shading (only for non-total rows)
                            const cellBgColor = !isTotalRow
                              ? getCellBackgroundColor(cellValue, column.key)
                              : undefined;

                            const stickyStyle = getStickyStyle(
                              column,
                              index,
                              false,
                              "VAR_BG" // Placeholder handled below
                            );

                            const finalStickyStyle = { ...stickyStyle };
                            if (finalStickyStyle.backgroundColor) {
                                finalStickyStyle.backgroundColor = isTotalRow ? finalStickyStyle.backgroundColor : "var(--sticky-cell-bg, var(--row-bg))";
                            }

                            return (
                              <td
                                key={`${rowIndex}-${column.key}-${index}`}
                                className={`px-4 py-3 text-sm break-words ${
                                  isTotalRow
                                    ? `font-semibold text-gray-900 ${headerBgClass}`
                                    : `text-gray-700 ${getStickyHoverClass()}`
                                }`}
                                style={{
                                  width: getColumnWidth(column, index),
                                  minWidth: getColumnMinWidth(column),
                                  maxWidth: getColumnMaxWidth(column),
                                  textAlign: column.align || "left",
                                  verticalAlign: column.verticalAlign || "middle",
                                  backgroundColor: cellBgColor || finalStickyStyle.backgroundColor,
                                  ...finalStickyStyle,
                                }}
                              >
                                <div
                                  className={`flex flex-col ${
                                    (column.align || "left") === "right"
                                      ? "items-end"
                                      : column.align === "center"
                                      ? "items-center"
                                      : "items-start"
                                  }`}
                                >
                                  {column.render ? (
                                    column.render(cellValue, row)
                                  ) : (
                                    <span>{cellValue}</span>
                                  )}
                                  {showPercentage && (
                                    <span className="text-gray-500 text-xs mt-0.5">
                                      {percentageText}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {hasTotalRow && (
                      <tr className={headerBgClass}>
                        {enableRowSelection && (
                          <td
                            className={`px-4 py-3 w-12 ${headerBgClass}`}
                            style={{ position: "sticky", left: 0, zIndex: 2, backgroundColor: "#f9fafb" }}
                          ></td>
                        )}
                        {columns.map((column, index) => {
                          const shouldShowTotal =
                            totalableColumns.length === 0 ||
                            totalableColumns.includes(column.key);
                          const isPercentageColumn = percentageColumns.includes(
                            column.key
                          );
                          const isLabelColumn =
                            column.key === (totalsLabelKey || columns[0]?.key);

                          const stickyStyle = getStickyStyle(
                            column,
                            index,
                            false,
                            "#f9fafb"
                          );

                          return (
                            <td
                              key={`total-${index}-${column.key}`}
                              className={`px-4 py-3 text-sm font-semibold text-gray-900 break-words ${headerBgClass}`}
                              style={{
                                width: getColumnWidth(column, index),
                                minWidth: getColumnMinWidth(column),
                                maxWidth: getColumnMaxWidth(column),
                                textAlign: column.align || "left",
                                verticalAlign: column.verticalAlign || "middle",
                                ...stickyStyle,
                              }}
                            >
                              {shouldShowTotal && totals ? (
                                isLabelColumn ? (
                                  totalsLabel
                                ) : (
                                  <>
                                    {column.render
                                      ? column.render(
                                          totals[column.key],
                                          totals
                                        )
                                      : totals[column.key] ?? ""}
                                    {isPercentageColumn && (
                                      <span className="text-gray-500 text-xs ml-1">
                                        {" "}
                                        (100%)
                                      </span>
                                    )}
                                  </>
                                )
                              ) : (
                                ""
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td 
                      colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                      className="px-4 py-4 text-sm text-center text-gray-500"
                    >
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {hasMoreRows && (
        <div className="flex justify-between items-center mt-2">
          <div className="flex-1">
            {enableRowSelection && currentSelectedRows.length > 0 && (
              <button
                onClick={() => setSelectedRows([])}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Clear selection
              </button>
            )}
          </div>
          <CollapseButton 
            isExpanded={expanded} 
            onClick={toggleExpanded} 
          />
          <div className="flex-1 flex justify-end">
            {showCSVExport && data.length > 0 && (
              <button 
                onClick={downloadCSV}
                className={`flex items-center px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ${getTextColorClass('blue')}`}
                title="Export as CSV"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* CSV Export Button - Show when no more rows button */}
      {!hasMoreRows && showCSVExport && data.length > 0 && (
        <div className="flex justify-between items-center mt-2">
          <div className="flex-1">
            {enableRowSelection && currentSelectedRows.length > 0 && (
              <button
                onClick={() => setSelectedRows([])}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Clear selection
              </button>
            )}
          </div>
          <div className="flex justify-end">
            <button
              onClick={downloadCSV}
              className="flex items-center px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              title="Export as CSV"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV
            </button>
          </div>
        </div>
      )}

      {/* CSV Preview Section */}
      {showCSVPreview && csvPreviewData && csvPreviewData.length > 0 && (
        <div className="mt-4 border rounded-md overflow-auto max-h-[300px]">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {Object.keys(csvPreviewData[0]).map((header) => (
                  <th key={header} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvPreviewData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {Object.values(row).map((value, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      className="px-4 py-2 text-sm text-gray-700 border-b"
                    >
                      {String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isLoading && (
        <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl min-h-[200px]">
          <CustomLoader loading={true} specs={{ size: 'lg', color: 'blue', text: 'Loading data...' }} />
        </div>
      )}
    </div>
  );
};
