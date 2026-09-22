import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LucideIcon, Search, FilterX, X } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomListItem, { CustomListItemProps } from './customListItem';
import CustomListTimeline, { CustomListTimelineProps } from './customListTimeline';
import CustomListLedger, { LedgerColumn } from './customListLedger';
import { MultiSelect } from '@/components/ui/multi-select2';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { CollapseButton } from '../CollapseButton';
import CustomListFilter, {
  FilterOption,
  FilterGroup,
  FilterGroupType,
  PrimaryFilterGroup,
  SecondaryFilterGroup,
  TertiaryFilterGroup,
  QuaternaryFilterGroup,
  FilterGroupsState,
  FilterState,
  useFilterState,
  useFilteredItems
} from './customListFilter';
import { ListActionButton } from '../ActionButton';
import { ListStat } from './customListStats';
import { BubbleTag } from '@/components/custom/BubbleTag';
import CustomListKeyMetrics from './customListKeyMetrics';
import CustomListTabularStats from './customListTabularStats';
import { SortActionButton, SortDirection } from './SortActionButton';
// NSE port: DownloadActionButton was imported here but never rendered — the two
// call sites below are comments noting the CSV export moved into the filter
// groups. Dropping the dead import also drops exceljs, xlsx and axios, which
// it pulled in transitively via app/utils/excelExport.
import { KeyMetric } from '@/app/types';
import { ColorScheme } from '@/components/custom/CustomColorScheme';
import CustomLoader, { LoaderSpecs } from '../CustomLoader';
import { useArtifactStore } from '@/app/store/artifact/artifactStore';

interface SimpleMetric {
  label: string;
  value: string | number;
  icon: string;
  colorScheme?: ColorScheme; // New optional color scheme prop
}

interface TabularStatsConfig {
  title?: string;
  columns: {
    key: string;
    header: string;
    sortable?: boolean;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    render?: (value: any, row: Record<string, any>) => React.ReactNode;
  }[];
  calculateStatsFromData: (data: any[]) => Record<string, any>[];
  showCSVExport?: boolean;
  initialRowLimit?: number;
  hasTotalRow?: boolean;
  totalableColumns?: string[];
  className?: string;
}



export interface SortField {
  key: string;
  label: string;
  sortFunction?: (a: CustomListItemProps, b: CustomListItemProps) => number;
}

export type { SortDirection };

export interface CustomListProps {
  items: CustomListItemProps[];
  themeColor?: string;
  emptyState?: {
    icon?: LucideIcon;
    title: string;
    description: string;
  };
  className?: string;
  onItemClick?: (item: CustomListItemProps) => void;
  selectedItemId?: string;
  loading?: boolean;
  enableSearch?: boolean;
  enableMultiSelect?: boolean;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  filterPlaceholder?: string;
  onFilterChange?: (filteredItems: CustomListItemProps[]) => void;
  searchFields?: (keyof CustomListItemProps)[];
  customFilterFunction?: (item: CustomListItemProps, selectedFilters: string[]) => boolean;
  initialRowLimit?: number;
  isExpanded?: boolean;
  setIsExpanded?: (value: boolean) => void;
  primaryFilterGroup?: PrimaryFilterGroup[];
  secondaryFilterGroups?: SecondaryFilterGroup[];
  tertiaryFilterGroups?: TertiaryFilterGroup[];
  quaternaryFilterGroups?: QuaternaryFilterGroup[];
  toggleSpecs?: Record<string, Record<string, string[]>>;
  filterGroups?: FilterGroup[];
  showTimeline?: boolean;
  showTimelineDatetime?: boolean; // New prop
  showTimelineVisuals?: boolean; // New prop
  showLedgerColumns?: boolean;
  ledgerColumns?: LedgerColumn[];
  showAlternatingBg?: boolean; // Add this prop
  showItemSpacing?: boolean; // Add this prop
  showFilterToggle?: boolean; // Add this prop to control filter toggle visibility
  disableInternalSorting?: boolean; // Add this prop to disable internal sorting
  hideEmptyState?: boolean; // If true, do not render the empty state
  boldColumnBorders?: { column: string; side: 'left' | 'right' }[]; // Add this prop for bold column borders
  timelineColumnHeader?: string; // Optional header for timeline column
  listColumnHeader?: string; // Optional header for list items column
  secondListColumnHeader?: string; // Optional header for right-aligned second list column
  // KeyMetrics props
  keyMetricList?: {
    key_metrics: Array<SimpleMetric | KeyMetric>;
  };
  hardcodedMetrics?: Array<SimpleMetric | KeyMetric>;
  calculateMetricsFromData?: (data: any[]) => Array<SimpleMetric | KeyMetric>; // New prop for dynamic calculation
  showKeyMetrics?: boolean;
  showKeyMetricsCollapse?: boolean;
  showKeyMetricsHeader?: boolean;
  keyMetricsTitle?: string; // New prop for KeyMetrics title
  keyMetricsSelectionMode?: boolean;
  selectedKeyMetrics?: Set<number>;
  onKeyMetricsSelectionChange?: (selected: boolean, metric: SimpleMetric | KeyMetric, index: number) => void;
  onToggleKeyMetricsSelectionMode?: () => void;
  // TabularStats props
  tabularStatsConfig?: TabularStatsConfig;
  showTabularStats?: boolean;
  // Filter props
  filterTitle?: string; // New prop for filter title
  showToggleOptionCounts?: boolean; // New prop to show counts in toggle options
  // List props
  listTitle?: string | React.ReactNode; // Updated to accept React components
  showCSVExport?: boolean; // New prop for CSV export
  // Loader props
  loaderSpecs?: LoaderSpecs; // New prop for customizing loader appearance
  // Animation props
  animationDuration?: number; // New prop for controlling animation speed (in seconds)
  // Layout props
  moveRightContentToLeftOnArtifactOpen?: boolean; // If true, moves topRightContent & bottomRightContent below bottomLeftContent when artifact is open (default: true)
  // Sort props - removed, now handled via action buttons in filter groups
  filterFooter?: React.ReactNode; 
  customListRenderer?: (filteredItems: any[]) => React.ReactNode; 
}

const CustomList: React.FC<CustomListProps> = ({
  items,
  themeColor,
  emptyState,
  className = '',
  onItemClick,
  selectedItemId,
  loading = false,
  enableSearch = false,
  enableMultiSelect = false,
  searchPlaceholder = "Search items...",
  filterOptions = [],
  filterPlaceholder = "Filter items...",
  onFilterChange,
  searchFields = ['title', 'subtitle'],
  customFilterFunction,
  initialRowLimit = 5,
  isExpanded = false,
  setIsExpanded,
  primaryFilterGroup,
  secondaryFilterGroups,
  tertiaryFilterGroups,
  quaternaryFilterGroups,
  toggleSpecs,
  filterGroups = [],
  showTimeline = false,
  showTimelineDatetime = true, // Default true
  showTimelineVisuals = true, // Default true
  showLedgerColumns = false,
  ledgerColumns,
  showAlternatingBg = false, // Default to false
  showItemSpacing = true, // Default to true
  showFilterToggle = false, // Default to false
  disableInternalSorting = false, // Default to false
  hideEmptyState = false, // Default to false
  boldColumnBorders = [], // Default to empty array
  timelineColumnHeader, // Optional header for timeline column
  listColumnHeader, // Optional header for list items column
  secondListColumnHeader, // Optional header for right-aligned second list column
  // KeyMetrics props
  keyMetricList,
  hardcodedMetrics,
  calculateMetricsFromData,
  showKeyMetrics = false,
  showKeyMetricsCollapse = true,
  showKeyMetricsHeader = false,
  keyMetricsTitle,
  keyMetricsSelectionMode = false,
  selectedKeyMetrics = new Set(),
  onKeyMetricsSelectionChange,
  onToggleKeyMetricsSelectionMode,
  // TabularStats props
  tabularStatsConfig,
  showTabularStats = false,
  filterTitle,
  showToggleOptionCounts = false, // Default to false
  listTitle,
  showCSVExport = false, // Default to false
  // Loader props
  loaderSpecs, // Default to undefined
  // Animation props
  animationDuration = 0.1, // Default to 0.1s for normal speed
  // Layout props
  moveRightContentToLeftOnArtifactOpen = true, // Default to true
  // Sort props removed
  filterFooter,
  customListRenderer,
}) => {

  const { isCollapsed } = useArtifactStore();

  const [selectedItem, setSelectedItem] = useState<string | null>(selectedItemId || null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Animation variants
  // Avoid rendering items with opacity:0 or translated positions which can
  // cause them to occupy space but remain invisible. Keep subtle staggered
  // transitions but render visible styles for both states.
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: animationDuration * 0.5 // Half of the main duration for stagger
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: animationDuration
      }
    }
  };

  const filterVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: animationDuration
      }
    }
  };

  // If no external control is provided, manage state internally
  const [isExpandedInternal, setIsExpandedInternal] = useState(false);
  
  // Use either external or internal state
  const expanded = setIsExpanded ? isExpanded : isExpandedInternal;
  const toggleExpanded = () => {
    if (setIsExpanded) {
      setIsExpanded(!isExpanded);
    } else {
      setIsExpandedInternal(!isExpandedInternal);
    }
  };

  // Convert to new filter structure
  const filterGroupsState = useMemo<FilterGroupsState>(() => ({
    primary: primaryFilterGroup,
    secondary: secondaryFilterGroups,
    tertiary: tertiaryFilterGroups,
    quaternary: quaternaryFilterGroups,
    actionButtons: [],
    listStats: []
  }), [primaryFilterGroup, secondaryFilterGroups, tertiaryFilterGroups, quaternaryFilterGroups]);

  // Use the new filter hooks
  const { filterState, setFilterState } = useFilterState(filterGroupsState);

  // Sync external filter changes with internal filter state
  useEffect(() => {
    const newFilterState = { ...filterState };
    let hasChanges = false;

    // Sync primary filters
    primaryFilterGroup?.forEach(group => {
      if (JSON.stringify(filterState.primarySelected[group.id]) !== JSON.stringify(group.selectedValues)) {
        newFilterState.primarySelected[group.id] = group.selectedValues || [];
        hasChanges = true;
      }
    });

    // Sync secondary filters
    secondaryFilterGroups?.forEach(group => {
      if (JSON.stringify(filterState.secondarySelected[group.id]) !== JSON.stringify(group.selectedValues)) {
        newFilterState.secondarySelected[group.id] = group.selectedValues || [];
        hasChanges = true;
      }
    });

    // Sync tertiary filters
    tertiaryFilterGroups?.forEach(group => {
      if (group.type === 'searchbar') {
        const searchValue = group.selectedValues?.[0] || '';
        if (filterState.searchbarQueries[group.id] !== searchValue) {
          newFilterState.searchbarQueries[group.id] = searchValue;
          hasChanges = true;
        }
      } else {
        if (JSON.stringify(filterState.tertiarySelected[group.id]) !== JSON.stringify(group.selectedValues)) {
          newFilterState.tertiarySelected[group.id] = group.selectedValues || [];
          hasChanges = true;
        }
      }
    });

    // Sync quaternary filters
    quaternaryFilterGroups?.forEach(group => {
      if (JSON.stringify(filterState.quaternarySelected[group.id]) !== JSON.stringify(group.selectedValues)) {
        newFilterState.quaternarySelected[group.id] = group.selectedValues || [];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setFilterState(newFilterState);
    }
  }, [primaryFilterGroup, secondaryFilterGroups, tertiaryFilterGroups, quaternaryFilterGroups, setFilterState]);
  
  // Effect to clear invalid secondary/tertiary selections when primary changes
  useEffect(() => {
    if (!toggleSpecs || !Object.values(filterState.primarySelected).some(arr => arr.length > 0)) return;
    
    const newSecondarySelected = { ...filterState.secondarySelected };
    const newTertiarySelected = { ...filterState.tertiarySelected };
    const newQuaternarySelected = { ...filterState.quaternarySelected };
    let hasChanges = false;
    
    // Check secondary filters
    secondaryFilterGroups?.forEach(group => {
      const currentSelected = newSecondarySelected[group.id] || [];
      const allowedValues = new Set<string>();
      
      Object.values(filterState.primarySelected).forEach(primaryValues => {
        primaryValues.forEach(primaryVal => {
          const allowedForPrimary = toggleSpecs[primaryVal]?.[group.id];
          if (allowedForPrimary) allowedForPrimary.forEach(v => allowedValues.add(v));
        });
      });
      
      // Remove selections that are no longer allowed
      const validSelections = currentSelected.filter(val => allowedValues.has(val));
      if (validSelections.length !== currentSelected.length) {
        newSecondarySelected[group.id] = validSelections;
        hasChanges = true;
      }
    });
    
    // Check tertiary filters
    tertiaryFilterGroups?.forEach(group => {
      const currentSelected = newTertiarySelected[group.id] || [];
      const allowedValues = new Set<string>();
      
      Object.values(filterState.primarySelected).forEach(primaryValues => {
        primaryValues.forEach(primaryVal => {
          const allowedForPrimary = toggleSpecs[primaryVal]?.[group.id];
          if (allowedForPrimary) allowedForPrimary.forEach(v => allowedValues.add(v));
        });
      });
      
      // Remove selections that are no longer allowed
      const validSelections = currentSelected.filter(val => allowedValues.has(val));
      if (validSelections.length !== currentSelected.length) {
        newTertiarySelected[group.id] = validSelections;
        hasChanges = true;
      }
    });

    // Check quaternary filters
    quaternaryFilterGroups?.forEach(group => {
      const currentSelected = newQuaternarySelected[group.id] || [];
      const allowedValues = new Set<string>();
      
      Object.values(filterState.primarySelected).forEach(primaryValues => {
        primaryValues.forEach(primaryVal => {
          const allowedForPrimary = toggleSpecs[primaryVal]?.[group.id];
          if (allowedForPrimary) allowedForPrimary.forEach(v => allowedValues.add(v));
        });
      });
      
      // Remove selections that are no longer allowed
      const validSelections = currentSelected.filter(val => allowedValues.has(val));
      if (validSelections.length !== currentSelected.length) {
        newQuaternarySelected[group.id] = validSelections;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setFilterState(prev => ({
        ...prev,
        secondarySelected: newSecondarySelected,
        tertiarySelected: newTertiarySelected,
        quaternarySelected: newQuaternarySelected
      }));
    }
  }, [filterState.primarySelected, toggleSpecs, secondaryFilterGroups, tertiaryFilterGroups, quaternaryFilterGroups, setFilterState]);

  // Compute allowed options for secondary filters based on primary selection and toggleSpecs
  const getAllowedSecondaryOptions = useCallback((groupId: string, allOptions: FilterOption[]): FilterOption[] => {
    if (!toggleSpecs || !primaryFilterGroup || !Object.values(filterState.primarySelected).some(arr => arr.length > 0)) return allOptions;
    
    // Collect allowed values for this secondary group from all selected in primary
    let allowed = new Set<string>();
    Object.values(filterState.primarySelected).forEach(primaryValues => {
      primaryValues.forEach(val => {
        const allowedForPrimary = toggleSpecs[val]?.[groupId];
        if (allowedForPrimary) allowedForPrimary.forEach(v => allowed.add(v));
      });
    });
    
    // If nothing found in toggleSpecs, show all options
    if (allowed.size === 0) return allOptions;
    
    // Show a superset: include all options that are either:
    // 1. In the allowed values from toggleSpecs, OR
    // 2. Already selected in the current filter group
    const currentSelected = filterState.secondarySelected[groupId] || filterState.tertiarySelected[groupId] || filterState.quaternarySelected[groupId] || [];
    
    return allOptions.filter(opt => 
      allowed.has(opt.value) || currentSelected.includes(opt.value)
    );
  }, [toggleSpecs, primaryFilterGroup, filterState.primarySelected, filterState.secondarySelected, filterState.tertiarySelected, filterState.quaternarySelected]);

  // Get filtered items using the new hook
  const filteredItems = useFilteredItems(items, filterGroupsState, filterState);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        setSelectedItem(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleItemClick = (item: CustomListItemProps) => {
    setSelectedItem(item.itemID);
    onItemClick?.(item);
  };

  const itemMatchesSearch = useCallback((item: CustomListItemProps, query: string): boolean => {
    if (!query.trim()) return true;
    
    const searchLower = query.toLowerCase();
    
    for (const field of searchFields) {
      const value = item[field];
      if (value) {
        if (field === 'mainContent' && React.isValidElement(value)) {
          // Extract text content from React nodes
          const textContent = extractTextFromReactNode(value);
          if (textContent.toLowerCase().includes(searchLower)) {
            return true;
          }
        } else if (typeof value === 'string' || typeof value === 'number') {
          if (String(value).toLowerCase().includes(searchLower)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, [searchFields]);

  // Helper function to extract text color from themeColor string
  const extractTextColorFromTheme = (themeColor?: string): string => {
    if (!themeColor) return 'text-blue-600';
    
    // If themeColor contains both background and text classes (from getColorClasses)
    if (themeColor.includes(' ')) {
      const classes = themeColor.split(' ');
      // Find the text color class (starts with 'text-')
      const textClass = classes.find(cls => cls.startsWith('text-'));
      return textClass || 'text-blue-600';
    }
    
    // If themeColor is just a text color class
    if (themeColor.startsWith('text-')) {
      return themeColor;
    }
    
    // Fallback to blue
    return 'text-blue-600';
  };

  // Function to extract text content from React nodes
  const extractTextFromReactNode = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractTextFromReactNode).join(' ');
    if (React.isValidElement(node)) {
      // React 19 types default element props to `unknown`, so `.children` has
      // to be reached through an explicit shape rather than read directly.
      const { children } = node.props as { children?: React.ReactNode };
      return extractTextFromReactNode(children);
    }
    return '';
  };

  // Apply additional filters (legacy support)
  const finalFilteredItems = useMemo(() => {
    let filtered = filteredItems;
    
    if (enableMultiSelect && selectedFilters.length > 0) {
      filtered = filtered.filter(item => {
        if (customFilterFunction) {
          return customFilterFunction(item, selectedFilters);
        }
        return selectedFilters.some(filter => {
          const titleText = extractTextFromReactNode(item.title);
          const subtitleText = extractTextFromReactNode(item.subtitle);
          return titleText.toLowerCase().includes(filter.toLowerCase()) ||
                 subtitleText.toLowerCase().includes(filter.toLowerCase()) ||
                 false;
        });
      });
    }
    
    if (enableSearch && searchQuery) {
      filtered = filtered.filter(item => itemMatchesSearch(item, searchQuery));
    }
    
    // Legacy filterGroups support
    if (!primaryFilterGroup && !secondaryFilterGroups && !tertiaryFilterGroups && !quaternaryFilterGroups && filterGroups.length > 0) {
      filtered = filtered.filter(item => {
        return filterGroups.every(group => {
          if (group.selectedValues.length === 0) return true;
          if (group.filterFunction) return group.filterFunction(item, group.selectedValues);
          return true;
        });
      });
    }
    
    // Sort items (only if internal sorting is not disabled)
    if (!disableInternalSorting) {
      // Default sorting behavior
      filtered.sort((a, b) => {
        const aOrgType = a.originalData?.orgType || a.type || '';
        const bOrgType = b.originalData?.orgType || b.type || '';
        if (aOrgType !== bOrgType) return aOrgType.localeCompare(bOrgType);
        if (enableMultiSelect && selectedFilters.length > 0) {
          const aMatchesFilter = selectedFilters.some(filter => aOrgType.toLowerCase().includes(filter.toLowerCase()));
          const bMatchesFilter = selectedFilters.some(filter => bOrgType.toLowerCase().includes(filter.toLowerCase()));
          if (aMatchesFilter && !bMatchesFilter) return -1;
          if (!aMatchesFilter && bMatchesFilter) return 1;
        }
        const aTitle = extractTextFromReactNode(a.title);
        const bTitle = extractTextFromReactNode(b.title);
        return aTitle.localeCompare(bTitle);
      });
    }
    
    return filtered;
  }, [filteredItems, selectedFilters, searchQuery, enableMultiSelect, enableSearch, itemMatchesSearch, customFilterFunction, filterGroups, primaryFilterGroup, secondaryFilterGroups, tertiaryFilterGroups, quaternaryFilterGroups, disableInternalSorting]);

  // Call onFilterChange in useEffect to avoid setState during render
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(finalFilteredItems);
    }
  }, [finalFilteredItems, onFilterChange]);

  // Show all items if expanded, otherwise limit to initialRowLimit
  const visibleItems = expanded ? finalFilteredItems : finalFilteredItems.slice(0, initialRowLimit);
  const hasMoreItems = finalFilteredItems.length > initialRowLimit;

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <motion.div
      ref={listRef}
      className={`space-y-4 pl-0 ml-0 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Legacy search and multiselect support */}
      {(enableMultiSelect || enableSearch) && (
        <motion.div
          className="flex items-center gap-4"
          variants={filterVariants}
        >
          {/* MultiSelect */}
          {enableMultiSelect && filterOptions.length > 0 && (
            <MultiSelect
              options={filterOptions}
              onValueChange={setSelectedFilters}
              value={selectedFilters}
              placeholder={filterPlaceholder}
              className="w-1/3 border-gray-300 bg-inherit shadow"
            />
          )}
          {/* SearchBar */}
          {enableSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 w-full h-10 border-gray-300 bg-inherit shadow"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* New filter component */}
      {(primaryFilterGroup || secondaryFilterGroups || tertiaryFilterGroups || quaternaryFilterGroups) && (
        <motion.div variants={filterVariants} className="mb-4">
          <CustomListFilter
            filterGroups={filterGroupsState}
            filterState={filterState}
            setFilterState={setFilterState}
            toggleSpecs={toggleSpecs}
            getAllowedOptions={getAllowedSecondaryOptions}
            showFilterToggle={showFilterToggle}
            filterTitle={filterTitle}
            showToggleOptionCounts={showToggleOptionCounts}
            // Pass the original unfiltered items so toggle option counts represent totals
            filteredItems={items}
          />
          {/* optional footer rendered below the filter row (e.g. summary box) */}
          {filterFooter && (
            <motion.div variants={filterVariants} className="mt-3">
              {filterFooter}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Legacy filterGroups UI */}
      {!primaryFilterGroup && !secondaryFilterGroups && !tertiaryFilterGroups && !quaternaryFilterGroups && filterGroups.length > 0 && (
        <motion.div
          className="space-y-4"
          variants={filterVariants}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-4">
              {filterGroups.map((group) => (
                <div key={group.id} className="flex items-center gap-3">
                  {group.showLabel !== false && (
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                      {group.label}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    {group.options.map((option: FilterOption) => {
                      const isSelected = group.selectedValues.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            const newValues = isSelected
                              ? group.selectedValues.filter((v: string) => v !== option.value)
                              : [...group.selectedValues, option.value];
                            group.onToggleChange(newValues);
                          }}
                          className={`px-3 h-10 text-sm font-medium rounded-md border transition-colors flex items-center gap-2 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {option.icon && <option.icon className="w-4 h-4" />}
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* KeyMetrics component - show below filters */}
      {showKeyMetrics && (
        <motion.div variants={filterVariants} className="mb-0">
                     <CustomListKeyMetrics
             keyMetricList={keyMetricList}
             hardcodedMetrics={hardcodedMetrics}
             filteredData={finalFilteredItems}
             calculateMetricsFromData={calculateMetricsFromData} // This will be passed from parent components
             showCollapse={showKeyMetricsCollapse}
             showHeader={showKeyMetricsHeader}
             selectionMode={keyMetricsSelectionMode}
             selectedMetrics={selectedKeyMetrics}
             onSelectionChange={onKeyMetricsSelectionChange}
             onToggleSelectionMode={onToggleKeyMetricsSelectionMode}
             title={keyMetricsTitle}
             className="space-y-1"
             animationDuration={animationDuration}
           />
        </motion.div>
      )}

      {/* Tabular Stats component - show below KeyMetrics */}
      {showTabularStats && tabularStatsConfig && (
        <motion.div variants={filterVariants} className={showLedgerColumns ? 'mb-6' : ''}>
          <CustomListTabularStats
            filteredData={finalFilteredItems}
            config={tabularStatsConfig}
            showTabularStats={showTabularStats}
          />
        </motion.div>
      )}

      <CustomLoader 
        loading={loading}
        specs={loaderSpecs}
      />

      {!loading && (
        <>
          {/* List Title - show above the list (always show when provided) */}
          {listTitle && (
            <motion.div variants={filterVariants} className="-mb-2 -mt-2">
              {typeof listTitle === 'string' ? (
                <h3 className="text-base font-semibold text-gray-700 mb-0 mt-0">
                  {listTitle}
                </h3>
              ) : (
                <div className="text-base font-semibold text-gray-700 mb-0 mt-0">
                  {listTitle}
                </div>
              )}
            </motion.div>
          )}

          {finalFilteredItems.length > 0 ? (
            customListRenderer ? (
              customListRenderer(finalFilteredItems)
            ) : (
              <motion.div
                className={`${showItemSpacing ? 'space-y-2' : ''} relative ${listTitle ? 'mt-3' : ''}`}
                variants={containerVariants}
              >
  
                  {/* Vertical Timeline String - only show if timeline is enabled */}
                  {showTimeline && showTimelineVisuals && (
                    <div 
                      className={`absolute left-0 top-0 bottom-0 ${showTimelineDatetime && showTimelineVisuals ? 'w-32' : showTimelineDatetime ? 'w-24' : 'w-8'} flex flex-col items-center`}
                      style={{
                      '--date-column-width': showTimelineDatetime ? '5rem' : '0rem', // w-20 = 5rem
                      '--date-column-padding': showTimelineDatetime ? '0.5rem' : '0rem', // pr-2 = 0.5rem  
                      '--icon-half-size': '1rem', // w-8 = 2rem, so half is 1rem
                      '--icon-center-offset': 'calc(var(--date-column-width) + 0.875rem)' // Fine-tuned for perfect center
                    } as React.CSSProperties}
                  >
                    <div 
                      className="absolute top-4 bottom-0 w-0.5 bg-gray-300"
                      style={{
                        left: showTimelineDatetime ? 'var(--icon-center-offset)' : '1rem' // 1rem = left-4
                      }}
                    ></div>
                  </div>
                )}

                {/* Totals Row */}
                {(timelineColumnHeader || listColumnHeader || secondListColumnHeader || showLedgerColumns) && (
                  <>
                    <motion.div
                      className={`flex items-center min-h-[48px]  ${showTabularStats && tabularStatsConfig ? 'pt-6' : ''}`}
                      variants={itemVariants}
                    >
                      {/* Timeline Column Total */}
                      {showTimeline && (
                        <div className="w-40 flex-shrink-0 flex items-center">
                          <span className="text-sm font-medium text-gray-700 pl-3">
                            {/* Leave empty for timeline total */}
                          </span>
                        </div>
                      )}

                      {/* List Column Total */}
                      {(listColumnHeader || secondListColumnHeader) && (
                        <div className="flex-grow flex items-center justify-between min-w-0 pr-6">
                           <span className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-4">
                             {listColumnHeader || ""}
                           </span>
                           <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                             {secondListColumnHeader || ""}
                           </span>
                        </div>
                      )}

                      {/* Ledger Columns Header */}
                      {showLedgerColumns && ledgerColumns && (
                        <div className="flex-items-center">
                          {/* Ledger Totals */}
                          <div className="flex-shrink-0 flex items-center py-3">
                            {ledgerColumns.map((column) => (
                              <div 
                                key={`total-${column.id}`}
                                className={`flex-shrink-0 ${column.width} px-3 flex items-center ${
                                  column.alignment === 'left' ? 'justify-start' : 
                                  column.alignment === 'right' ? 'justify-end' : 'justify-center'
                                }`}
                              >
                                {column.showTotal && column.calculateTotal ? (
                                  <span className={`text-sm font-semibold ${
                                    (() => {
                                      const total = finalFilteredItems.length > 0 ? column.calculateTotal(finalFilteredItems) : 0;
                                      if (column.id === 'outflow') {
                                        return 'text-red-600';
                                      } else if (column.id === 'inflow') {
                                        return 'text-green-600';
                                      } else if (column.id === 'debit' || column.id === 'credit') {
                                        return total > 0 ? 'text-green-600' : total < 0 ? 'text-red-600' : 'text-gray-700';
                                      } else {
                                        return 'text-gray-700';
                                      }
                                    })()
                                  }`}>
                                    {(() => {
                                      const total = finalFilteredItems.length > 0 ? column.calculateTotal(finalFilteredItems) : 0;
                                      if (column.totalLabel) {
                                        return column.totalLabel(total);
                                      } else if (column.id === 'outflow') {
                                        return total > 0 ? `(₹${total.toLocaleString()})` : '-';
                                      } else if (column.id === 'inflow') {
                                        return total > 0 ? `₹${total.toLocaleString()}` : '-';
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
                    </motion.div>

                  {/* Headers Row */}
                  <motion.div
                    className="flex items-center min-h-[48px] border-b border-gray-200"
                    variants={itemVariants}
                  >
                    {/* Timeline Column Header */}
                    {showTimeline && (
                      <div className="w-40 flex-shrink-0 flex items-center">
                        {timelineColumnHeader && (
                          <span className="text-xs font-medium text-gray-500 uppercase pl-3">
                            {timelineColumnHeader}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* List Items Header */}
                    <div className="flex-1 flex items-center">
                      {listColumnHeader && (
                        <span className="text-xs font-medium text-gray-500 uppercase pl-3">
                          {listColumnHeader}
                        </span>
                      )}
                    </div>
                    
                  {/* Second List Column Header - right aligned */}
                  {secondListColumnHeader && (
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {secondListColumnHeader}
                      </span>
                    </div>
                  )}
                  
                    {/* Ledger Headers */}
                    {showLedgerColumns && (
                      <div className="flex-shrink-0 flex items-center">
                        <CustomListLedger
                          items={[]}
                          columns={ledgerColumns || []}
                          showHeader={true}
                          showTotals={false}
                          className="!space-y-0 !mt-0"
                          boldColumnBorders={boldColumnBorders}
                        />
                      </div>
                    )}
                  </motion.div>
                </>
              )}

              {visibleItems.map((item, index) => (
                <motion.div
                  key={`${item.itemID}-${index}`}
                  className={`flex items-center gap-1 h-fit ${showAlternatingBg ? (index % 2 === 0 ? 'bg-gray-100' : 'bg-white') : ''}`}
                  variants={itemVariants}
                >
                  {/* Timeline Column - left side */}
                  {showTimeline && (showTimelineDatetime || showTimelineVisuals) && (
                    showTimelineVisuals ? (
                      <div className={`flex-shrink-0 ${showTimelineDatetime && showTimelineVisuals ? 'w-32' : showTimelineDatetime ? 'w-24' : 'w-8'}`}>
                        <CustomListTimeline
                          items={[{
                            ...item,
                            selected: selectedItem === item.itemID,
                            onClick: () => handleItemClick(item)
                          }]}
                          extractTextColorFromTheme={extractTextColorFromTheme}
                          renderListItem={() => null}
                          className="!space-y-0"
                          showDatetime={showTimelineDatetime}
                          showVisuals={showTimelineVisuals}
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-24">
                        <CustomListTimeline
                          items={[{
                            ...item,
                            selected: selectedItem === item.itemID,
                            onClick: () => handleItemClick(item)
                          }]}
                          extractTextColorFromTheme={extractTextColorFromTheme}
                          renderListItem={() => null}
                          className="!space-y-0"
                          showDatetime={showTimelineDatetime}
                          showVisuals={showTimelineVisuals}
                        />
                      </div>
                    )
                  )}

                  {/* List Item Card - middle, takes remaining space */}
                  <div className="flex-1 min-w-0">
                    <CustomListItem
                      {...item}
                      selected={selectedItem === item.itemID}
                      onClick={() => handleItemClick(item)}
                      isArtifactOpen={!isCollapsed}
                      moveRightContentToLeftOnArtifactOpen={moveRightContentToLeftOnArtifactOpen}
                    />
                  </div>

                  {/* Ledger Values - right side */}
                  {showLedgerColumns && (
                    <div className="flex-shrink-0">
                      <CustomListLedger
                        items={[{
                          ...item,
                          selected: selectedItem === item.itemID,
                          onClick: () => handleItemClick(item)
                        }]}
                        columns={ledgerColumns || []}
                        extractTextColorFromTheme={extractTextColorFromTheme}
                        showHeader={false}
                        className="!space-y-0"
                        boldColumnBorders={boldColumnBorders}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
              </motion.div>
            )
          ) : (
            !hideEmptyState && (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: animationDuration * 2 }}
              >
                {emptyState?.icon && (
                  <emptyState.icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                )}
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {emptyState?.title || 'No items found'}
                </h3>
                <p className="text-gray-500">
                  {(selectedFilters.length > 0 || searchQuery ||
                    (primaryFilterGroup && Object.values(filterState.primarySelected).some(arr => arr.length > 0)) ||
                    (secondaryFilterGroups && (Object.values(filterState.secondarySelected).some(arr => arr.length > 0) || Object.values(filterState.searchbarQueries).some(query => query.trim()))) ||
                    (tertiaryFilterGroups && (Object.values(filterState.tertiarySelected).some(arr => arr.length > 0) || Object.values(filterState.searchbarQueries).some(query => query.trim()))) ||
                    (quaternaryFilterGroups && (Object.values(filterState.quaternarySelected).some(arr => arr.length > 0) || Object.values(filterState.searchbarQueries).some(query => query.trim()))) ||
                    filterGroups.some(group => group.selectedValues.length > 0))
                    ? 'Try changing your filters or search query'
                    : emptyState?.description || 'No items available.'
                  }
                </p>
              </motion.div>
            )
          )}
          {hasMoreItems && (
            <motion.div
              className="flex justify-between items-center mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: animationDuration * 3 }}
            >
              <div className="flex-1">
                {/* Left side - can be used for other controls */}
              </div>
              <CollapseButton
                isExpanded={expanded}
                onClick={toggleExpanded}
              />
              <div className="flex-1 flex justify-end">
                {/* CSV export now handled by DownloadActionButton in filter groups */}
              </div>
            </motion.div>
          )}
          
          {/* CSV export now handled by DownloadActionButton in filter groups */}
        </>
      )}
    </motion.div>
  );
};

export default CustomList;