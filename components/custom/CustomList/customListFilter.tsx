import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Search, X, LucideIcon } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select2";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomListItemProps } from "./customListItem";
import { CollapseButton } from "../CollapseButton";
import {
  getColorClasses,
  ColorScheme,
  colorSchemes,
} from "../CustomColorScheme";
import {
  ListActionButton,
  FilterAlignment,
  ActionButtonRow,
} from "../ActionButton";
import { ListStat, StatsRow } from "./customListStats";
import { getTextColorClass } from "@/components/custom/CustomColorScheme";
import { useArtifactStore } from "@/app/store/artifact/artifactStore";

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export type FilterGroupType =
  | "togglebuttons"
  | "togglebar"
  | "multiselect"
  | "searchbar"
  | "dateselect"
  | "timeselect";

export interface BaseFilterGroup {
  id: string;
  label: string;
  type: FilterGroupType;
  options: FilterOption[];
  selectedValues: string[];
  onFilterChange: (values: string[]) => void;
  filterFunction?: (
    item: CustomListItemProps,
    selectedValues: string[]
  ) => boolean;
  /** If true, treat this multiselect as a single-select dropdown (only one value allowed) */
  singleSelect?: boolean;
  showLabel?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  fromDateTime?: string;
  toDateTime?: string;
  onDateTimeChange?: (from: string, to: string) => void;
  alignment?: FilterAlignment;
  actionButtons?: ListActionButton[];
  actionElements?: React.ReactNode; // Custom React elements for actions (pooled to the RIGHT)
  trailingElement?: React.ReactNode; // Custom element rendered INLINE after this group's controls (left side)
  listStats?: ListStat[];
  disabled?: boolean;
  value?: string[];
  showAllOption?: boolean; // New property to control "All" option visibility
  maxButtonWidth?: string; // New property to control max width of buttons
  /** If true, show the "(Select All)" option in multiselect dropdowns. Defaults to true. */
  showSelectAll?: boolean;
}

// Legacy support types
export interface FilterGroup extends BaseFilterGroup {
  onToggleChange: (values: string[]) => void;
}

export interface PrimaryFilterGroup extends BaseFilterGroup {}

export interface SecondaryFilterGroup extends BaseFilterGroup {}

export interface TertiaryFilterGroup extends BaseFilterGroup {}

export interface QuaternaryFilterGroup extends BaseFilterGroup {}

export interface FilterGroupsState {
  primary?: BaseFilterGroup[];
  secondary?: BaseFilterGroup[];
  tertiary?: BaseFilterGroup[];
  quaternary?: BaseFilterGroup[];
  actionButtons?: ListActionButton[];
  listStats?: ListStat[];
}

export interface FilterState {
  primarySelected: Record<string, string[]>;
  secondarySelected: Record<string, string[]>;
  tertiarySelected: Record<string, string[]>;
  quaternarySelected: Record<string, string[]>;
  searchbarQueries: Record<string, string>;
  datetimeRanges: Record<string, { from: string; to: string }>;
}

export interface FilterProps {
  filterGroups: FilterGroupsState;
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  toggleSpecs?: Record<string, Record<string, string[]>>;
  getAllowedOptions?: (
    groupId: string,
    allOptions: FilterOption[]
  ) => FilterOption[];
  showFilterToggle?: boolean;
  filterTitle?: string; // New prop for filter title
  showToggleOptionCounts?: boolean; // New prop to show counts in toggle options
  filteredItems?: CustomListItemProps[]; // Items to calculate counts from
  // Removed sortActionButton prop - now handled via action buttons
  /** Force inline (collapsed-style) layout even when artifact is open */
  forceInlineLayout?: boolean;
}

// Helper function to format datetime for datetime-local input
const formatDateTimeForInput = (dateTimeString: string): string => {
  if (!dateTimeString) return "";
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper function to format date for date input (YYYY-MM-DD)
const formatDateForInput = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Helper function to get default alignment based on filter type
const getDefaultAlignment = (type: FilterGroupType): FilterAlignment => {
  switch (type) {
    case "togglebuttons":
    case "togglebar":
      return "left";
    case "searchbar":
    case "multiselect":
    case "dateselect":
    case "timeselect":
      return "expanded";
    default:
      return "left";
  }
};

// Helper function to determine if a filter type is Type-1 (content-based width)
const isType1Filter = (type: FilterGroupType): boolean => {
  return type === "togglebuttons" || type === "togglebar";
};

// Helper function to determine if a filter type is Type-2 (expanded width)
const isType2Filter = (type: FilterGroupType): boolean => {
  return (
    type === "multiselect" || type === "searchbar" || type === "timeselect"
  );
};

// Helper function to get alignment classes
const getAlignmentClasses = (
  alignment: FilterAlignment,
  type: FilterGroupType,
  expandableCount: number
): string => {
  // For Type-2 filters, always use expanded alignment
  if (isType2Filter(type)) {
    return "flex-grow";
  }

  // For Type-1 filters, respect the alignment setting
  switch (alignment) {
    case "left":
      return "flex-shrink-0";
    case "right":
      return "flex-shrink-0 ml-auto";
    case "center":
      return "flex-shrink-0 mx-auto";
    case "expanded":
      return "flex-grow";
    default:
      return "flex-shrink-0";
  }
};

// Helper function to get flex basis for expanded items
const getFlexBasis = (
  alignment: FilterAlignment,
  type: FilterGroupType,
  expandableCount: number
): string => {
  // For Type-2 filters, always divide remaining space equally
  if (isType2Filter(type)) {
    return expandableCount > 0 ? `${100 / expandableCount}%` : "auto";
  }

  // For Type-1 filters, use content-based width unless explicitly expanded
  if (alignment === "expanded") {
    return expandableCount > 0 ? `${100 / expandableCount}%` : "auto";
  }
  return "auto";
};

// Helper function to get selected values for a filter group
const getSelectedValues = (
  groupId: string,
  filterState: FilterState,
  isPrimary: boolean
): string[] => {
  if (isPrimary) {
    return filterState.primarySelected[groupId] || [];
  }
  return (
    filterState.secondarySelected[groupId] ||
    filterState.tertiarySelected[groupId] ||
    filterState.quaternarySelected[groupId] ||
    []
  );
};

// Helper function to set selected values for a filter group
const setSelectedValues = (
  groupId: string,
  newValues: string[],
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>,
  isPrimary: boolean
) => {
  if (isPrimary) {
    setFilterState((prev) => ({
      ...prev,
      primarySelected: { ...prev.primarySelected, [groupId]: newValues },
    }));
  } else {
    setFilterState((prev) => ({
      ...prev,
      secondarySelected: { ...prev.secondarySelected, [groupId]: newValues },
      tertiarySelected: { ...prev.tertiarySelected, [groupId]: newValues },
      quaternarySelected: { ...prev.quaternarySelected, [groupId]: newValues },
    }));
  }
};

// Helper function to apply filters to items
const applyFilterGroup = (
  items: CustomListItemProps[],
  group: BaseFilterGroup,
  filterState: FilterState,
  isPrimary: boolean
): CustomListItemProps[] => {
  const {
    searchbarQueries,
    datetimeRanges,
    primarySelected,
    secondarySelected,
    tertiarySelected,
    quaternarySelected,
  } = filterState;

  if (group.type === "searchbar") {
    const query = searchbarQueries[group.id] || "";
    if (query.trim() && group.filterFunction) {
      return items.filter((item) => group.filterFunction!(item, [query]));
    }
  } else if (group.type === "timeselect" || group.type === "dateselect") {
    const range = datetimeRanges[group.id] || { from: "", to: "" };
    if ((range.from || range.to) && group.filterFunction) {
      return items.filter((item) =>
        group.filterFunction!(item, [range.from, range.to])
      );
    }
  } else {
    const selectedValues = isPrimary
      ? primarySelected[group.id] || []
      : secondarySelected[group.id] ||
        tertiarySelected[group.id] ||
        quaternarySelected[group.id] ||
        [];
    if (selectedValues.length > 0 && group.filterFunction) {
      return items.filter((item) =>
        group.filterFunction!(item, selectedValues)
      );
    }
  }

  return items;
};

// Helper function to calculate counts for toggle options
const calculateToggleOptionCounts = (
  group: BaseFilterGroup,
  filteredItems: CustomListItemProps[],
  filterState: FilterState,
  isPrimary: boolean
): Record<string, number> => {
  if (!group.filterFunction || !filteredItems) return {};

  const counts: Record<string, number> = {};

  // For each option, calculate how many items would match if only this option was selected
  group.options.forEach((option) => {
    const itemsMatchingOption = filteredItems.filter((item) => {
      // Test if this item would match when only this option is selected
      return group.filterFunction!(item, [option.value]);
    });
    counts[option.value] = itemsMatchingOption.length;
  });

  return counts;
};

// Individual filter component
const FilterGroup: React.FC<{
  group: BaseFilterGroup;
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  getAllowedOptions?: (
    groupId: string,
    allOptions: FilterOption[]
  ) => FilterOption[];
  expandableCount: number;
  isPrimary?: boolean;
  showToggleOptionCounts?: boolean;
  filteredItems?: CustomListItemProps[];
}> = ({
  group,
  filterState,
  setFilterState,
  getAllowedOptions,
  expandableCount,
  isPrimary = false,
  showToggleOptionCounts = false,
  filteredItems,
}) => {
  const { searchbarQueries, datetimeRanges } = filterState;

  // Sync external datetime values with internal state
  useEffect(() => {
    if ((group.type === "timeselect" || group.type === "dateselect") && group.fromDateTime && group.toDateTime) {
      setFilterState((prev) => ({
        ...prev,
        datetimeRanges: {
          ...prev.datetimeRanges,
          [group.id]: { from: group.fromDateTime!, to: group.toDateTime! },
        },
      }));
    }
  }, [
    group.fromDateTime,
    group.toDateTime,
    group.id,
    group.type,
    setFilterState,
  ]);

  // Get alignment (use default if not specified)
  const alignment = group.alignment || getDefaultAlignment(group.type);
  const alignmentClasses = getAlignmentClasses(
    alignment,
    group.type,
    expandableCount
  );
  const flexBasis = getFlexBasis(alignment, group.type, expandableCount);

  // Get selected values and setter
  const selectedValues = getSelectedValues(group.id, filterState, isPrimary);
  const setSelectedState = (newValues: string[]) =>
    setSelectedValues(group.id, newValues, setFilterState, isPrimary);

  // Calculate option counts if enabled
  const optionCounts =
    showToggleOptionCounts &&
    (group.type === "togglebuttons" ||
      group.type === "togglebar" ||
      group.type === "multiselect") &&
    filteredItems
      ? calculateToggleOptionCounts(
          group,
          filteredItems,
          filterState,
          isPrimary
        )
      : {};

  if (group.type === "searchbar") {
    return (
      <div
        className={`flex items-center gap-3 ${alignmentClasses}`}
        style={{
          minWidth: 120,
          flexBasis,
          flexGrow: isType2Filter(group.type) ? 1 : 0,
        }}
      >
        {group.showLabel !== false && (
          <span className="text-sm font-medium text-blue-600 whitespace-nowrap">
            {group.label}
          </span>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={group.searchPlaceholder || group.label}
            value={searchbarQueries[group.id] || ""}
            onChange={(e) => {
              const query = e.target.value;
              setFilterState((prev) => ({
                ...prev,
                searchbarQueries: {
                  ...prev.searchbarQueries,
                  [group.id]: query,
                },
              }));
              group.onSearchChange?.(query);
            }}
            className="pl-8 pr-8 w-full h-10 border-gray-300 bg-inherit shadow"
          />
          {(searchbarQueries[group.id] || "") && (
            <button
              onClick={() => {
                setFilterState((prev) => ({
                  ...prev,
                  searchbarQueries: {
                    ...prev.searchbarQueries,
                    [group.id]: "",
                  },
                }));
                group.onSearchChange?.("");
              }}
              className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (group.type === "timeselect" || group.type === "dateselect") {
    const isDateOnly = group.type === "dateselect";
    // Use external datetime values if provided, otherwise use internal state
    const externalRange =
      group.fromDateTime && group.toDateTime
        ? { from: group.fromDateTime, to: group.toDateTime }
        : null;
    const internalRange = datetimeRanges[group.id] || { from: "", to: "" };
    const range = externalRange || internalRange;

    return (
      <div
        className={`flex items-center gap-3 ${isDateOnly ? "flex-initial" : alignmentClasses}`}
        style={{
          minWidth: isDateOnly ? "auto" : 200,
          flexBasis: isDateOnly ? "auto" : flexBasis,
          flexGrow: isDateOnly ? 0 : (isType2Filter(group.type) ? 1 : 0),
        }}
      >
        {group.showLabel !== false && (
          <span className="text-sm font-medium text-blue-600 whitespace-nowrap">
            {group.label}
          </span>
        )}
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1">
            <Input
              type={isDateOnly ? "date" : "datetime-local"}
              placeholder="From"
              value={isDateOnly ? formatDateForInput(range.from) : formatDateTimeForInput(range.from)}
              onChange={(e) => {
                let value = e.target.value;
                if (value && !value.includes("T")) {
                  value = value + "T00:00";
                }
                const newRange = { ...range, from: value };
                if (isDateOnly && value) {
                   // Ensure it's just the date
                   newRange.from = value.split('T')[0];
                }

                // Update internal state
                setFilterState((prev) => ({
                  ...prev,
                  datetimeRanges: {
                    ...prev.datetimeRanges,
                    [group.id]: newRange,
                  },
                }));

                // Call external callback if provided
                group.onDateTimeChange?.(newRange.from, newRange.to);
              }}
              className={`w-36 h-10 border-gray-300 bg-inherit shadow text-sm uppercase ${getTextColorClass(
                "blue"
              )}`}
            />
          </div>
          <span className="text-sm text-gray-500">to</span>
          <div className="flex-1">
            <Input
              type={isDateOnly ? "date" : "datetime-local"}
              placeholder="To"
              value={isDateOnly ? formatDateForInput(range.to) : formatDateTimeForInput(range.to)}
              onChange={(e) => {
                let value = e.target.value;
                if (value && !value.includes("T")) {
                  value = value + "T23:59";
                }
                const newRange = { ...range, to: value };
                if (isDateOnly && value) {
                   newRange.to = value.split('T')[0];
                }

                // Update internal state
                setFilterState((prev) => ({
                  ...prev,
                  datetimeRanges: {
                    ...prev.datetimeRanges,
                    [group.id]: newRange,
                  },
                }));

                // Call external callback if provided
                group.onDateTimeChange?.(newRange.from, newRange.to);
              }}
              className={`w-36 h-10 border-gray-300 bg-inherit shadow text-sm uppercase ${getTextColorClass(
                "blue"
              )}`}
            />
          </div>
        </div>
      </div>
    );
  }

  if (group.type === "togglebuttons") {
    // Primary filters always show all options, secondary/tertiary filters use getAllowedOptions
    const allowedOptions = isPrimary
      ? group.options
      : getAllowedOptions
      ? getAllowedOptions(group.id, group.options)
      : group.options;

    return (
      <div
        className={`flex items-center gap-3 ${alignmentClasses}`}
        style={{ minWidth: "fit-content" }}
      >
        {group.showLabel !== false && (
          <span className="text-sm font-semibold text-blue-600 whitespace-nowrap">
            {group.label}
          </span>
        )}
        <div className="flex items-center gap-0.5 bg-slate-100/60 p-1 rounded-xl border border-slate-200/50 shadow-sm">
          {allowedOptions.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => {
                  const newValues = group.singleSelect
                    ? isSelected
                      ? []
                      : [option.value]
                    : isSelected
                    ? selectedValues.filter((v) => v !== option.value)
                    : [...selectedValues, option.value];
                  setSelectedState(newValues);
                  group.onFilterChange(newValues);
                }}
                className={`px-3.5 h-8 text-[13px] font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 min-w-0 ${
                  isSelected
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/40 border-transparent"
                }`}
                style={{ maxWidth: group.maxButtonWidth || "none" }}
              >
                {option.icon && (
                  <option.icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-blue-500" : "text-slate-400"}`} />
                )}
                <span className="truncate">{option.label}</span>
                {showToggleOptionCounts &&
                  optionCounts[option.value] !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full min-w-[18px] text-center ${
                        isSelected
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {optionCounts[option.value]}
                    </span>
                  )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (group.type === "togglebar") {
    const allowedOptions = isPrimary
      ? group.options
      : getAllowedOptions
      ? getAllowedOptions(group.id, group.options)
      : group.options;

    // Add "All" option at the beginning only if showAllOption is not explicitly set to false
    const shouldShowAllOption = group.showAllOption !== false; // Default to true if not specified
    const allOption = { value: "__all__", label: "All", icon: undefined };
    const optionsWithAll = shouldShowAllOption
      ? [allOption, ...allowedOptions]
      : allowedOptions;

    // Auto-select first option if no option is selected and "All" option is disabled
    React.useEffect(() => {
      if (
        !shouldShowAllOption &&
        selectedValues.length === 0 &&
        allowedOptions.length > 0
      ) {
        const firstOptionValue = allowedOptions[0].value;
        setSelectedState([firstOptionValue]);
        group.onFilterChange([firstOptionValue]);
      }
    }, [
      shouldShowAllOption,
      selectedValues.length,
      allowedOptions.length,
      group.onFilterChange,
    ]);

    return (
      <div
        className={`flex items-center gap-3 ${alignmentClasses}`}
        style={{ minWidth: "fit-content" }}
      >
        {group.showLabel !== false && (
          <span className="text-sm font-medium text-blue-600 whitespace-nowrap">
            {group.label}
          </span>
        )}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {optionsWithAll.map((option) => {
            const isSelected =
              option.value === "__all__"
                ? selectedValues.length === 0
                : selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => {
                  if (option.value === "__all__") {
                    // Select "All" - clear all selections
                    const newValues: string[] = [];
                    setSelectedState(newValues);
                    group.onFilterChange(newValues);
                  } else {
                    // Single select: replace current selection with the clicked option
                    const newValues = isSelected ? [] : [option.value];
                    setSelectedState(newValues);
                    group.onFilterChange(newValues);
                  }
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 min-w-0 ${
                  isSelected
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                style={{ maxWidth: group.maxButtonWidth || "none" }}
              >
                {option.icon && (
                  <option.icon className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{option.label}</span>
                {showToggleOptionCounts &&
                  option.value !== "__all__" &&
                  optionCounts[option.value] !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 text-xs rounded-full min-w-[20px] text-center ${
                        isSelected
                          ? "bg-blue-200 text-blue-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {optionCounts[option.value]}
                    </span>
                  )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (group.type === "multiselect") {
    const allowedOptions = isPrimary
      ? group.options
      : getAllowedOptions
      ? getAllowedOptions(group.id, group.options)
      : group.options;

    return (
      <div
        className={`flex items-center gap-3 ${alignmentClasses}`}
        style={{
          minWidth: 150,
          flexBasis,
          flexGrow: isType2Filter(group.type) ? 1 : 0,
        }}
      >
        {group.showLabel !== false && (
          <span className="text-sm font-medium text-blue-600 whitespace-nowrap">
            {group.label}
          </span>
        )}
        <MultiSelect
          options={allowedOptions}
          onValueChange={(newValues) => {
            // If the group requests singleSelect behavior, coerce to the last selected value
            const coerced =
              group.singleSelect && newValues.length > 1
                ? [newValues[newValues.length - 1]]
                : newValues;
            setSelectedState(coerced);
            group.onFilterChange(coerced);
          }}
          value={selectedValues}
          placeholder={group.label}
          className="w-full border-gray-300 bg-inherit shadow"
          disabled={group.disabled}
          optionCounts={showToggleOptionCounts ? optionCounts : undefined}
          // If singleSelect, limit maxCount to 1 for compact display
          maxCount={group.singleSelect ? 1 : undefined}
          compactSummary={!isPrimary}
          showSelectAll={group.showSelectAll !== false}
        />
      </div>
    );
  }

  return null;
};

// Filter row component
const FilterRow: React.FC<{
  groups: BaseFilterGroup[];
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  getAllowedOptions?: (
    groupId: string,
    allOptions: FilterOption[]
  ) => FilterOption[];
  isPrimary?: boolean;
  isTertiary?: boolean;
  isQuaternary?: boolean;
  showToggleOptionCounts?: boolean;
  filteredItems?: CustomListItemProps[];
  forceInlineLayout?: boolean;
}> = ({
  groups,
  filterState,
  setFilterState,
  getAllowedOptions,
  isPrimary = false,
  isTertiary = false,
  isQuaternary = false,
  showToggleOptionCounts = false,
  filteredItems,
  forceInlineLayout = false,
}) => {
  const { isCollapsed } = useArtifactStore();
  const shouldUseExpandedLayout = !forceInlineLayout && !isCollapsed;

  // Count Type-2 filters for equal space distribution
  const type2Count = groups.filter((g) => isType2Filter(g.type)).length;

  // Determine row type for action buttons and stats
  const rowType = isPrimary
    ? "primary"
    : isTertiary
    ? "tertiary"
    : isQuaternary
    ? "quaternary"
    : "secondary";

  // Collect all stats, action buttons, and action elements from all groups
  const allStats: ListStat[] = [];
  const allActionButtons: ListActionButton[] = [];
  const allActionElements: React.ReactNode[] = [];

  groups.forEach((group) => {
    if (group.listStats) {
      allStats.push(...group.listStats);
    }
    if (group.actionButtons) {
      allActionButtons.push(...group.actionButtons);
    }
    if (group.actionElements) {
      allActionElements.push(group.actionElements);
    }
  });

  // Only render stats/action buttons container if there are items to display
  const hasStatsOrActions =
    allStats.length > 0 ||
    allActionButtons.length > 0 ||
    allActionElements.length > 0;

  // Always use flex-1 for filter groups container if there are Type-2 filters, regardless of stats/actions
  const shouldUseFlex1 = hasStatsOrActions || type2Count > 0;

  // When artifact is open (not collapsed) and inline layout is not forced, show each filter in its own row
  if (shouldUseExpandedLayout) {
    return (
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            {/* Label above the filter controls */}
            {group.showLabel !== false && (
              <div className="text-sm font-medium text-blue-600">
                {group.label}
              </div>
            )}
            {/* Filter controls */}
            <div className="flex gap-4 w-full items-center">
              <div className="flex-1">
                <FilterGroup
                  group={{ ...group, showLabel: false }} // Hide label since we're showing it above
                  filterState={filterState}
                  setFilterState={setFilterState}
                  getAllowedOptions={getAllowedOptions}
                  expandableCount={1} // Each filter gets its own row
                  isPrimary={isPrimary}
                  showToggleOptionCounts={showToggleOptionCounts}
                  filteredItems={filteredItems}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Stats and Action Buttons on separate row when expanded */}
        {hasStatsOrActions && (
          <div className="flex gap-4 items-center">
            {allStats.length > 0 && (
              <StatsRow
                stats={allStats}
                expandableCount={type2Count}
                rowType={rowType}
                isArtifactOpen={shouldUseExpandedLayout}
              />
            )}
            {allActionButtons.length > 0 && (
              <ActionButtonRow
                actions={allActionButtons}
                expandableCount={type2Count}
                rowType={rowType}
                isArtifactOpen={shouldUseExpandedLayout}
              />
            )}
            {allActionElements.map((element, index) => (
              <div key={index}>{element}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // When artifact is collapsed, use original single row layout
  return (
    <div className="flex gap-4 w-full items-center">
      {/* Filter Groups */}
      <div
        className={`flex gap-4 items-center ${shouldUseFlex1 ? "flex-1" : ""}`}
      >
        {groups.map((group) => (
          <FilterGroup
            key={group.id}
            group={group}
            filterState={filterState}
            setFilterState={setFilterState}
            getAllowedOptions={getAllowedOptions}
            expandableCount={type2Count}
            isPrimary={isPrimary}
            showToggleOptionCounts={showToggleOptionCounts}
            filteredItems={filteredItems}
          />
        ))}
      </div>

      {/* Stats and Action Buttons positioned at row level - only render if there are items */}
      {hasStatsOrActions && (
        <div className="flex gap-4 items-center">
          {allStats.length > 0 && (
            <StatsRow
              stats={allStats}
              expandableCount={type2Count}
              rowType={rowType}
            />
          )}
          {allActionButtons.length > 0 && (
            <ActionButtonRow
              actions={allActionButtons}
              expandableCount={type2Count}
              rowType={rowType}
            />
          )}
          {allActionElements.map((element, index) => (
            <div key={index}>{element}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main filter component
const CustomListFilter: React.FC<FilterProps> = ({
  filterGroups,
  filterState,
  setFilterState,
  toggleSpecs,
  getAllowedOptions,
  showFilterToggle = false,
  filterTitle,
  showToggleOptionCounts = false,
  filteredItems,
  // Removed sortActionButton param
  forceInlineLayout = false,
}) => {
  const { isCollapsed } = useArtifactStore();
  const useInlineLayout = isCollapsed || forceInlineLayout;
  const { primary, secondary, tertiary, quaternary } = filterGroups;

  // State to control filter group visibility
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Check if we have secondary, tertiary, or quaternary filters
  const hasSecondaryOrTertiaryOrQuaternary =
    (secondary && secondary.length > 0) ||
    (tertiary && tertiary.length > 0) ||
    (quaternary && quaternary.length > 0);

  // Show all filters if expanded, if no secondary/tertiary/quaternary filters exist, or if showFilterToggle is false
  const shouldShowAllFilters =
    isFilterExpanded ||
    !hasSecondaryOrTertiaryOrQuaternary ||
    !showFilterToggle;

  // When artifact is open (not collapsed) and inline layout is not forced, each filter category gets its own dedicated section
  if (!useInlineLayout) {
    return (
      <div className="space-y-4">
        {/* Filter Title - Show above primary filters */}
        {filterTitle && (
          <div>
            <h3 className="text-base font-semibold text-gray-700">
              {filterTitle}
            </h3>
          </div>
        )}

        {/* Primary Filter Section - Always visible */}
        {primary && primary.length > 0 && (
          <FilterRow
            groups={primary}
            filterState={filterState}
            setFilterState={setFilterState}
            getAllowedOptions={getAllowedOptions}
            isPrimary={true}
            showToggleOptionCounts={showToggleOptionCounts}
            filteredItems={filteredItems}
            forceInlineLayout={forceInlineLayout}
          />
        )}

        {/* Secondary Filter Section */}
        {secondary && secondary.length > 0 && shouldShowAllFilters && (
          <FilterRow
            groups={secondary}
            filterState={filterState}
            setFilterState={setFilterState}
            getAllowedOptions={getAllowedOptions}
            isPrimary={false}
            showToggleOptionCounts={showToggleOptionCounts}
            filteredItems={filteredItems}
            forceInlineLayout={forceInlineLayout}
          />
        )}

        {/* Tertiary Filter Section */}
        {tertiary && tertiary.length > 0 && shouldShowAllFilters && (
          <FilterRow
            groups={tertiary}
            filterState={filterState}
            setFilterState={setFilterState}
            getAllowedOptions={getAllowedOptions}
            isPrimary={false}
            isTertiary={true}
            showToggleOptionCounts={showToggleOptionCounts}
            filteredItems={filteredItems}
            forceInlineLayout={forceInlineLayout}
          />
        )}

        {/* Quaternary Filter Section */}
        {quaternary && quaternary.length > 0 && shouldShowAllFilters && (
          <FilterRow
            groups={quaternary}
            filterState={filterState}
            setFilterState={setFilterState}
            getAllowedOptions={getAllowedOptions}
            isPrimary={false}
            isQuaternary={true}
            showToggleOptionCounts={showToggleOptionCounts}
            filteredItems={filteredItems}
            forceInlineLayout={forceInlineLayout}
          />
        )}

        {/* Show More Button - Only show if we have secondary, tertiary, or quaternary filters AND showFilterToggle is true */}
        {hasSecondaryOrTertiaryOrQuaternary && showFilterToggle && (
          <div className="flex justify-center">
            <CollapseButton
              isExpanded={isFilterExpanded}
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              collapsedText="More Settings"
              expandedText="Less Settings"
            />
          </div>
        )}
      </div>
    );
  }

  // When artifact is collapsed or inline layout is forced, use compact layout
  return (
    <div className="space-y-4">
      {/* Filter Title - Show above primary filters */}
      {filterTitle && (
        <div>
          <h3 className="text-base font-semibold text-gray-700">
            {filterTitle}
          </h3>
        </div>
      )}

      {/* Primary Filter Row - Always visible */}
      {primary && primary.length > 0 && (
        <FilterRow
          groups={primary}
          filterState={filterState}
          setFilterState={setFilterState}
          getAllowedOptions={getAllowedOptions}
          isPrimary={true}
          showToggleOptionCounts={showToggleOptionCounts}
          filteredItems={filteredItems}
          forceInlineLayout={forceInlineLayout}
        />
      )}

      {/* Secondary, Tertiary, and Quaternary Filter Rows - Only visible when expanded or if no secondary/tertiary/quaternary filters */}
      {shouldShowAllFilters && (
        <>
          {/* Secondary Filter Row */}
          {secondary && secondary.length > 0 && (
            <FilterRow
              groups={secondary}
              filterState={filterState}
              setFilterState={setFilterState}
              getAllowedOptions={getAllowedOptions}
              isPrimary={false}
              showToggleOptionCounts={showToggleOptionCounts}
              filteredItems={filteredItems}
          forceInlineLayout={forceInlineLayout}
            />
          )}

          {/* Tertiary Filter Row */}
          {tertiary && tertiary.length > 0 && (
            <FilterRow
              groups={tertiary}
              filterState={filterState}
              setFilterState={setFilterState}
              getAllowedOptions={getAllowedOptions}
              isPrimary={false}
              isTertiary={true}
              showToggleOptionCounts={showToggleOptionCounts}
              filteredItems={filteredItems}
          forceInlineLayout={forceInlineLayout}
            />
          )}

          {/* Quaternary Filter Row */}
          {quaternary && quaternary.length > 0 && (
            <FilterRow
              groups={quaternary}
              filterState={filterState}
              setFilterState={setFilterState}
              getAllowedOptions={getAllowedOptions}
              isPrimary={false}
              isQuaternary={true}
              showToggleOptionCounts={showToggleOptionCounts}
              filteredItems={filteredItems}
          forceInlineLayout={forceInlineLayout}
            />
          )}
        </>
      )}

      {/* Show More Button - Only show if we have secondary, tertiary, or quaternary filters AND showFilterToggle is true */}
      {hasSecondaryOrTertiaryOrQuaternary && showFilterToggle && (
        <div className="flex justify-center">
          <CollapseButton
            isExpanded={isFilterExpanded}
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            collapsedText="More Settings"
            expandedText="Less Settings"
          />
        </div>
      )}
    </div>
  );
};

// Hook for managing filter state
export const useFilterState = (filterGroups: FilterGroupsState) => {
  const [filterState, setFilterState] = useState<FilterState>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const defaultFrom = `2020-01-01T00:00`;
    const defaultTo = `${year}-${month}-${day}T23:59`;

    const initial: FilterState = {
      primarySelected: {},
      secondarySelected: {},
      tertiarySelected: {},
      quaternarySelected: {},
      searchbarQueries: {},
      datetimeRanges: {},
    };

    // Helper function to initialize filter groups
    const initializeFilterGroups = (
      groups: BaseFilterGroup[] | undefined,
      isPrimary: boolean
    ) => {
      if (!groups) return;

      groups.forEach((g: BaseFilterGroup) => {
        if (g.type === "searchbar") initial.searchbarQueries[g.id] = "";
        if (g.type === "timeselect")
          initial.datetimeRanges[g.id] = { from: defaultFrom, to: defaultTo };
        // Normalize initial selectedValues: treat 'all' or '__all__' as no explicit selection (empty array)
        const rawSelected = g.selectedValues || [];
        const hasAllToken = rawSelected.some(
          (v) => v === "all" || v === "__all__"
        );
        const normalized = hasAllToken ? [] : rawSelected;

        if (isPrimary) {
          initial.primarySelected[g.id] = normalized;
        } else {
          initial.secondarySelected[g.id] = normalized;
          initial.tertiarySelected[g.id] = normalized;
          initial.quaternarySelected[g.id] = normalized;
        }
      });
    };

    // Initialize all filter groups
    initializeFilterGroups(filterGroups.primary, true);
    initializeFilterGroups(filterGroups.secondary, false);
    initializeFilterGroups(filterGroups.tertiary, false);
    initializeFilterGroups(filterGroups.quaternary, false);

    return initial;
  });

  return { filterState, setFilterState };
};

// Hook for filtering logic
export const useFilteredItems = (
  items: CustomListItemProps[],
  filterGroups: FilterGroupsState,
  filterState: FilterState
) => {
  return useMemo(() => {
    let filtered = items;
    const { primary, secondary, tertiary, quaternary } = filterGroups;

    // Helper function to apply filter groups
    const applyFilterGroups = (
      groups: BaseFilterGroup[] | undefined,
      isPrimary: boolean
    ) => {
      if (!groups) return;

      groups.forEach((group) => {
        filtered = applyFilterGroup(filtered, group, filterState, isPrimary);
      });
    };

    // Apply filters in order: primary, secondary, tertiary, quaternary
    applyFilterGroups(primary, true);
    applyFilterGroups(secondary, false);
    applyFilterGroups(tertiary, false);
    applyFilterGroups(quaternary, false);

    return filtered;
  }, [items, filterGroups, filterState]);
};

export default CustomListFilter;
