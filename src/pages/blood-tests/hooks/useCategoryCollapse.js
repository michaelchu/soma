import { useState, useCallback } from 'react';
import { CATEGORY_INFO } from '../constants/categories';

/**
 * Custom hook for managing category collapse state
 */
export function useCategoryCollapse() {
  // Track which categories are collapsed (default all expanded)
  const [collapsedCategories, setCollapsedCategories] = useState({});
  // Track which categories have their charts expanded (default all collapsed)
  const [expandedChartCategories, setExpandedChartCategories] = useState({});

  const toggleCategory = useCallback((category) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const toggleCategoryCharts = useCallback((category) => {
    setExpandedChartCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const toggleAllCategories = useCallback(() => {
    const allExpanded = Object.values(collapsedCategories).every((v) => !v);
    const newState = {};
    Object.keys(CATEGORY_INFO).forEach((key) => {
      newState[key] = allExpanded; // collapse all if all expanded, expand all otherwise
    });
    setCollapsedCategories(newState);
  }, [collapsedCategories]);

  const isCategoryCollapsed = useCallback(
    (category) => collapsedCategories[category] ?? false,
    [collapsedCategories]
  );

  const areCategoryChartsExpanded = useCallback(
    (category) => expandedChartCategories[category] ?? false,
    [expandedChartCategories]
  );

  const areAllExpanded = Object.values(collapsedCategories).every((v) => !v);

  return {
    toggleCategory,
    toggleCategoryCharts,
    toggleAllCategories,
    isCategoryCollapsed,
    areCategoryChartsExpanded,
    areAllExpanded,
  };
}
