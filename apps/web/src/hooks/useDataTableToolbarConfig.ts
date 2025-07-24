import type { FacetedFilterConfig, SearchInputConfig } from '@/types';

export default function useDataTableToolbarConfig() {
        // Helper function to create search config
        const createSearchConfig = (
                columnKey: string,
                placeholder?: string,
                className?: string
        ): SearchInputConfig => ({
                columnKey,
                placeholder,
                className,
        });

        // Helper function to create faceted filter config
        const createFacetedFilter = (
                columnKey: string,
                title: string,
                options: FacetedFilterConfig['options']
        ): FacetedFilterConfig => ({
                columnKey,
                title,
                options,
        });

        return {
                createSearchConfig,
                createFacetedFilter,
        };
}
