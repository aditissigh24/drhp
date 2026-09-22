import React from "react";
import { CustomListItemProps } from "./customListItem";
import { BubbleTag } from "@/components/custom/BubbleTag";

export interface TimelineItemProps extends CustomListItemProps {
  selected?: boolean;
  onClick?: () => void;
}

export interface BoldColumnBorder {
  column: string;
  side: "left" | "right";
}

export interface LedgerColumn {
  id: string;
  label: string;
  width: string;
  alignment: "left" | "center" | "right";
  renderValue: (item: TimelineItemProps) => React.ReactNode;
  showTotal?: boolean;
  calculateTotal?: (items: TimelineItemProps[]) => number;
  totalLabel?: (total: number) => string; // Custom label function for totals
}

export interface CustomListLedgerProps {
  items: TimelineItemProps[];
  columns: LedgerColumn[];
  className?: string;
  extractTextColorFromTheme?: (themeColor?: string) => string;
  showHeader?: boolean;
  showTotals?: boolean;
  hideLeftColumn?: boolean; // If true, do not reserve left space for list item card
  rowDivider?: boolean; // If true, render a dividing line after every row
  totalsItems?: TimelineItemProps[]; // Separate items for totals calculation
  boldColumnBorders?: BoldColumnBorder[]; // New prop for bold borders
}

const CustomListLedger: React.FC<CustomListLedgerProps> = ({
  items,
  columns,
  className = "",
  extractTextColorFromTheme,
  showHeader = true,
  showTotals = false,
  hideLeftColumn = false,
  rowDivider = true,
  totalsItems,
  boldColumnBorders = [],
}) => {
  // Default text color extraction function if not provided
  const defaultExtractTextColorFromTheme = (themeColor?: string): string => {
    if (!themeColor) return "text-blue-600";

    // If themeColor contains both background and text classes (from getColorClasses)
    if (themeColor.includes(" ")) {
      const classes = themeColor.split(" ");
      // Find the text color class (starts with 'text-')
      const textClass = classes.find((cls) => cls.startsWith("text-"));
      return textClass || "text-blue-600";
    }

    // If themeColor is just a text color class
    if (themeColor.startsWith("text-")) {
      return themeColor;
    }

    // Fallback to blue
    return "text-blue-600";
  };

  const getTextColor =
    extractTextColorFromTheme || defaultExtractTextColorFromTheme;

  const getAlignmentClass = (alignment: "left" | "center" | "right") => {
    switch (alignment) {
      case "left":
        return "justify-start";
      case "center":
        return "justify-center";
      case "right":
        return "justify-end";
      default:
        return "justify-start";
    }
  };

  // Helper function to check if a column should have bold border
  const shouldHaveBoldBorder = (columnId: string, side: "left" | "right") => {
    return boldColumnBorders.some(
      (border) => border.column === columnId && border.side === side
    );
  };

  // Helper function to get border classes for a column
  const getColumnBorderClasses = (columnId: string) => {
    const leftBold = shouldHaveBoldBorder(columnId, "left");
    const rightBold = shouldHaveBoldBorder(columnId, "right");

    let borderClasses = "";
    if (leftBold) borderClasses += "border-l-2 border-l-gray-300 ";
    if (rightBold) borderClasses += "border-r-2 border-r-gray-300 ";

    return borderClasses;
  };

  return (
    <div className={`relative space-y-2 ${className}`}>
      {/* vertical divider removed - no continuous vertical line after amount column */}

      {/* Totals Row - Shown separately above headers (hidden unless showTotals=true) */}
      {showTotals && showHeader && !hideLeftColumn && (
        <div className="flex items-center min-h-[48px] border-b border-gray-200">
          <div className="flex-1">
            {/* List Item Space - Takes remaining space */}
          </div>
          <div className="flex-shrink-0 flex items-center py-3">
            {columns.map((column) => (
              <div
                key={`total-${column.id}`}
                className={`flex-shrink-0 ${
                  column.width
                } px-3 flex ${getAlignmentClass(
                  column.alignment
                )} ${getColumnBorderClasses(column.id)}`}
              >
                {column.showTotal && column.calculateTotal ? (
                  <span
                    className={`text-sm font-semibold ${(() => {
                      const total =
                        (totalsItems || items).length > 0
                          ? column.calculateTotal(totalsItems || items)
                          : 0;
                      if (column.id === "outflow") {
                        return "text-red-600";
                      } else if (column.id === "inflow") {
                        return "text-green-600";
                      } else if (
                        column.id === "debit" ||
                        column.id === "credit"
                      ) {
                        return total > 0
                          ? "text-green-600"
                          : total < 0
                          ? "text-red-600"
                          : "text-gray-700";
                      } else {
                        return "text-gray-700";
                      }
                    })()}`}
                  >
                    {(() => {
                      const total =
                        (totalsItems || items).length > 0
                          ? column.calculateTotal(totalsItems || items)
                          : 0;
                      if (column.totalLabel) {
                        return column.totalLabel(total);
                      } else if (column.id === "outflow") {
                        return total > 0 ? `(₹${total.toLocaleString()})` : "-";
                      } else if (column.id === "inflow") {
                        return total > 0 ? `₹${total.toLocaleString()}` : "-";
                      } else {
                        return total.toLocaleString();
                      }
                    })()}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-gray-400">-</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Headers Row - Below totals */}
      {showHeader &&
        (!hideLeftColumn ? (
          <div className="flex items-center min-h-[48px] border-b border-gray-200">
            <div className="flex-1">
              {/* List Item Space - Takes remaining space */}
            </div>
            <div className="flex-shrink-0 flex items-center">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className={`flex-shrink-0 ${
                    column.width
                  } px-3 py-3 flex ${getAlignmentClass(
                    column.alignment
                  )} ${getColumnBorderClasses(column.id)}`}
                >
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {column.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center min-h-[48px] border-b border-gray-200">
            {columns.map((column) => (
              <div
                key={`header-${column.id}`}
                className={`flex ${
                  column.width
                } px-3 py-3 items-center ${getAlignmentClass(
                  column.alignment
                )} ${getColumnBorderClasses(column.id)}`}
              >
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {column.label}
                </span>
              </div>
            ))}
          </div>
        ))}

      {items.map((item, index) => {
        const bgClass = index % 2 === 1 ? "bg-white" : "bg-gray-50";
        if (!hideLeftColumn) {
          return (
            <div
              key={`${item.itemID}-${index}`}
              className={`flex items-stretch gap-4 min-h-[48px] ${
                rowDivider ? "border-b border-gray-200" : ""
              } ${bgClass}`}
            >
              {/* List Item Space - Takes remaining space */}
              <div className="flex-1 min-w-0">
                {/* This space is reserved for the list item from CustomList */}
              </div>
              {/* Ledger Values - Right side with modular column widths */}
              <div className="flex-shrink-0 flex items-stretch h-full">
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className={`flex-shrink-0 ${
                      column.width
                    } px-3 py-5 flex ${getAlignmentClass(
                      column.alignment
                    )} ${getColumnBorderClasses(
                      column.id
                    )} h-full items-center`}
                  >
                    {column.renderValue(item)}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // When left column is hidden, render a single full-width row of columns
        return (
          <div
            key={`${item.itemID}-${index}`}
            className={`flex items-center h-full ${
              rowDivider ? "border-b border-gray-200" : ""
            } ${bgClass}`}
          >
            {columns.map((column) => (
              <div
                key={column.id}
                className={`flex ${
                  column.width
                } px-3 py-4 items-center ${getAlignmentClass(
                  column.alignment
                )} ${getColumnBorderClasses(column.id)}`}
              >
                {column.renderValue(item)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default CustomListLedger;