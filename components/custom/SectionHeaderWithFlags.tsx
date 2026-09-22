import { FC, useState, useEffect, ReactNode } from 'react';
import { ChevronDown, ChevronUp, Flag, Plus, CheckCircle, XCircle, Info, AlertTriangle, AlertCircle, Download } from 'lucide-react';
import { BubbleTag } from '@/components/custom/BubbleTag';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { LucideIcon } from 'lucide-react';
// NSE port: the "Add to report" dropdown that used this store is commented out
// upstream (see the {/* showReportButton */} block below), so the store and its
// backend-bound service chain are not carried over.
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColorScheme } from './CustomColorScheme';

// Assessment flag type
type AssessmentFlag = {
  id: string;
  description: string;
  isPositive: boolean;
  category: string;
  rule_type?: string;
  severity?: 'severe' | 'high' | 'medium' | 'low' | 'neutral' | 'good' | 'veryGood';
  redFlag_recipient_id?: string;
}

interface SectionHeaderWithFlagsProps {
  positiveFlags: AssessmentFlag[];
  negativeFlags: AssessmentFlag[];
  neutralFlags?: AssessmentFlag[];
  mildPositiveFlags?: AssessmentFlag[];
  mildNegativeFlags?: AssessmentFlag[];
  extremeNegativeFlags?: AssessmentFlag[];

  title?: string;
  icon?: LucideIcon;
  iconColorClass?: string;
  titleColorClass?: string;
  // onReport?: (reportId?: string, isNewReport?: boolean) => void;
  initialRowLimit?: number;
  flagTypeOrderList?: ('extremeNegative' | 'negative' | 'mildNegative' | 'neutral' | 'mildPositive' | 'positive')[];
  //showReportButton?: boolean;
  allowCollapse?: boolean;
  onDownload?: () => void;
  showDownload?: boolean;
  // Optional custom actions to render on the right side of the header (before collapse chevron)
  rightActions?: ReactNode;
  
  defaultExpanded?: boolean;
  // Toggle bar props (single toggle - for backward compatibility)
  toggleOptions?: string[];
  selectedToggleOption?: string;
  onToggleOptionChange?: (option: string) => void;
  togglePosition?: 'left' | 'right';
  toggleIcons?: Record<string, ReactNode>;
  toggleSize?: 'small' | 'normal';
  // Multiple toggles support
  toggles?: Array<{
    id: string;
    options: string[];
    selectedOption: string;
    onOptionChange: (option: string) => void;
    position?: 'left' | 'right';
    icons?: Record<string, ReactNode>;
    size?: 'small' | 'normal';
  }>;
  // Optional element to render immediately to the right of the title (e.g. a badge)
  titleRightElement?: ReactNode;
  // Optional element to render at the far right of the header (after flags)
  rightElement?: ReactNode;
}

export const SectionHeaderWithFlags: FC<SectionHeaderWithFlagsProps> = ({
  positiveFlags = [],
  negativeFlags = [],
  neutralFlags = [],
  mildPositiveFlags = [],
  mildNegativeFlags = [],

  title = "Flags",
  icon: Icon,
  iconColorClass = "text-gray-500",
  titleColorClass = "text-gray-900",
  //onReport,
  initialRowLimit = 5,
  flagTypeOrderList = ['extremeNegative', 'negative', 'mildNegative', 'neutral', 'mildPositive', 'positive'],
  //showReportButton = true,
  allowCollapse = true,
  extremeNegativeFlags = [],
  onDownload,
  showDownload = false,
  rightActions,

  defaultExpanded = false,
  // Toggle bar props (single toggle - for backward compatibility)
  toggleOptions,
  selectedToggleOption,
  onToggleOptionChange,
  togglePosition = 'right',
  toggleIcons,
  toggleSize = 'normal',
  // Multiple toggles support
  toggles,
  titleRightElement,
  rightElement,
}) => {
  // Create flag arrays with their type identifiers
  const flagArrays = {
    extremeNegative: extremeNegativeFlags,
    negative: negativeFlags,
    mildNegative: mildNegativeFlags,
    neutral: neutralFlags,
    mildPositive: mildPositiveFlags,
    positive: positiveFlags
  };

  // Order flags according to flagTypeOrderList
  const allFlags = flagTypeOrderList.flatMap(flagType => flagArrays[flagType] || []);
  
  const [isExpanded, setIsExpanded] = useState(
    allowCollapse && (defaultExpanded || allFlags.length > 0)
  );
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  // const { reports } = useReportStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Update isExpanded when flags change or defaultExpanded is set
  useEffect(() => {
    if (!allowCollapse) {
      // When collapse is disabled, don't show the flags section
      setIsExpanded(false);
    } else if (defaultExpanded) {
      setIsExpanded(true);
    } else {
      setIsExpanded(allFlags.length > 0 && allowCollapse);
    }
  }, [allFlags.length, allowCollapse, defaultExpanded]);

  const toggleExpand = () => {
    if (allowCollapse) {
      setIsExpanded(!isExpanded);
    }
  };

  const toggleContentExpand = () => {
    setIsContentExpanded(!isContentExpanded);
  };

  // Handle report selection
  // const handleReportSelect = (reportId?: string) => {
  //   if (onReport) {
  //     if (reportId) {
  //       onReport(reportId, false);
  //     } else {
  //       onReport(undefined, true);
  //     }
  //   }
  //   setIsDropdownOpen(false);
  // };

  // Helper function to truncate description to 50-60 words
  const truncateDescription = (description: string) => {
    if (!description) return '';
    const words = description.split(' ');
    if (words.length <= 60) {
      return description;
    }
    // Find a good breaking point between 50-60 words
    const truncatedWords = words.slice(0, 55);
    return truncatedWords.join(' ') + '...';
  };

  // Helper function to render description with bold redFlag and normal reasoning
  const renderDescription = (description: string) => {
    if (!description) return null;
    // Check if description follows pattern "REDFLAG. REASONING"
    // Split on first period followed by space
    const periodSpaceIndex = description.indexOf('. ');
    if (periodSpaceIndex !== -1) {
      const redFlag = description.substring(0, periodSpaceIndex);
      const reasoning = description.substring(periodSpaceIndex + 2);
      
      return (
        <>
          <span className="font-bold">{redFlag}.</span>
          <span> {reasoning}</span>
        </>
      );
    }
    // If pattern doesn't match, render normally
    return <>{description}</>;
  };

  // Show all rows if content expanded, otherwise limit to initialRowLimit
  const visibleFlags = isContentExpanded ? allFlags : allFlags.slice(0, initialRowLimit);
  const hasMoreRows = allFlags.length > initialRowLimit;

  return (
    <div className="w-full overflow-hidden transition-all duration-200">
      <div 
        className={`flex items-center justify-between py-2 border-b border-gray-200 ${allowCollapse ? 'cursor-pointer' : ''}`}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className={cn("h-5 w-5", iconColorClass)} />}
          <span className={cn("text-lg font-semibold", titleColorClass)}>{title}</span>
          {titleRightElement ? (
            <span className="ml-3 flex items-center" onClick={(e) => e.stopPropagation()}>
              {titleRightElement}
            </span>
          ) : null}
          {showDownload && onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Download CSV"
            >
              <Download className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {flagTypeOrderList.map(flagType => {
            const flagConfig = {
               extremeNegative: { flags: extremeNegativeFlags, label: "Severe", color: "red" as ColorScheme, icon: <XCircle className="h-4 w-4" /> },
               negative: { flags: negativeFlags, label: "High", color: "orange" as ColorScheme, icon: <XCircle className="h-4 w-4" /> },
               mildNegative: { flags: mildNegativeFlags, label: "Medium", color: "yellow" as ColorScheme, icon: <AlertTriangle className="h-4 w-4" /> },
               neutral: { flags: neutralFlags, label: neutralFlags.some(f => f.severity === 'low') ? "Low" : "Neutral", color: "blue" as ColorScheme, icon: <Info className="h-4 w-4" /> },
               mildPositive: { flags: mildPositiveFlags, label: "Good", color: "green" as ColorScheme, icon: <CheckCircle className="h-4 w-4" /> },
               positive: { flags: positiveFlags, label: "Very Good", color: "green" as ColorScheme, icon: <CheckCircle className="h-4 w-4" /> }
            }[flagType];

            return flagConfig.flags.length > 0 ? (
              <BubbleTag
                key={flagType}
                text={flagConfig.label}
                color={flagConfig.color}
                hasOutsideIcon={true}
                hasInsideNumber={true}
                number={flagConfig.flags.length}
                icon={flagConfig.icon}
              />
            ) : null;
          })}
        </div>
        <div className="flex items-center gap-4 ml-4">
          {/* Toggle Bar(s) */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Multiple toggles support */}
            {toggles && toggles.length > 0 ? (
              toggles.map((toggle) => (
                <div
                  key={toggle.id}
                  className={`flex bg-gray-100 rounded-lg ${(toggle.size || toggleSize) === 'small' ? 'p-0.5' : 'p-1'}`}
                >
                  {toggle.options.map((option) => (
                    <button
                      key={option}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle.onOptionChange(option);
                      }}
                      className={`${(toggle.size || toggleSize) === 'small' ? 'px-3 py-1.5 text-sm rounded-md' : 'px-4 py-2 text-sm rounded-md'} font-medium transition-colors flex items-center gap-1.5 ${
                        toggle.selectedOption === option
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {toggle.icons && toggle.icons[option] && (
                        <span className="flex-shrink-0">{toggle.icons[option]}</span>
                      )}
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              /* Single toggle (backward compatibility) */
              toggleOptions && toggleOptions.length > 0 && (
                <div 
                  className={`flex bg-gray-100 rounded-lg ${toggleSize === 'small' ? 'p-0.5' : 'p-1'}`}
                >
                  {toggleOptions.map((option) => (
                    <button
                      key={option}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleOptionChange?.(option);
                      }}
                      className={`${toggleSize === 'small' ? 'px-3 py-1.5 text-sm rounded-md' : 'px-4 py-2 text-sm rounded-md'} font-medium transition-colors flex items-center gap-1.5 ${
                        selectedToggleOption === option
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {toggleIcons && toggleIcons[option] && (
                        <span className="flex-shrink-0">{toggleIcons[option]}</span>
                      )}
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
          {/* Render any custom right-side actions passed by the caller. Callers should stopPropagation on clicks if they don't want to toggle collapse. */}
          {rightActions}
          {rightElement && (
            <div className="flex items-center ml-4" onClick={(e) => e.stopPropagation()}>
              {rightElement}
            </div>
          )}
          {/* {showReportButton && (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(!isDropdownOpen);
              }}>
                <button 
                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                  title="Add to report"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-xs">Report</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={(e) => {
                e.preventDefault();
              }}>
                {reports.map(report => (
                  <DropdownMenuItem key={report.id} onClick={(e) => {
                    e.stopPropagation();
                    handleReportSelect(report.id);
                  }}>
                    {report.report_title}
                  </DropdownMenuItem>
                ))}
                {reports.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleReportSelect();
                }}>
                  Create New Report...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )} */}
          {allowCollapse && (isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#f9f7f0]"
          >
            <div className="p-2">
              {allFlags.length === 0 ? (
                <div className="text-gray-500 text-center py-3 px-4 text-sm">No flags detected.</div>
              ) : (
                <>
                  <table className="w-full table-auto">
                    <tbody>
                      {visibleFlags.map((flag, index) => (
                        <tr key={`${flag.id}-${index}`} className="border-b border-gray-200/30 last:border-b-0">
                          <td className="py-2 px-2 align-middle w-fit whitespace-nowrap">
                            <div className="flex justify-end">
                              <BubbleTag
                                text={
                                  flag.severity === 'severe' ? "Severe" :
                                  flag.severity === 'high' ? "High" :
                                  flag.severity === 'medium' ? "Medium" :
                                  flag.severity === 'low' ? "Low" :
                                  flag.severity === 'good' ? "Good" :
                                  flag.severity === 'veryGood' ? "Very Good" : "Neutral"
                                }
                                color={
                                  flag.severity === 'severe' ? "red" :
                                  flag.severity === 'high' ? "orange" :
                                  flag.severity === 'medium' ? "yellow" :
                                  flag.severity === 'low' ? "blue" :
                                  flag.severity === 'good' ? "green" :
                                  flag.severity === 'veryGood' ? "green" : "gray"
                                }
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-left text-sm text-gray-600 max-w-0 w-full">
                            <div className="truncate" title={flag.description}>
                              {renderDescription(flag.description)}
                            </div>
                          </td>
                          <td className="py-2 px-2 align-middle w-fit whitespace-nowrap">
                            <div className="flex justify-end">
                              <BubbleTag
                                text={flag.category}
                                color="blue"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Show more/less button */}
                  {hasMoreRows && (
                    <div className="flex justify-center mt-1">
                      <button
                        onClick={toggleContentExpand}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-md hover:bg-gray-100"
                      >
                        {isContentExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            <span>See less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            <span>See more</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SectionHeaderWithFlags;
