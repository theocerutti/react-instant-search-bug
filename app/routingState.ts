import type {InstantSearchOptions, UiState} from 'instantsearch.js';
import {history} from 'instantsearch.js/es/lib/routers';

const DEFAULT_ITEMS_PER_PAGE_FILTER = 'products';

export type RouteState = {
    itemsPerPage?: number;
    query?: string;
    sort?: string;
    page?: number;
    // Other filters with the format below also belong here
    // [named_filter: ]: string;
    // For example
    // 'options.size': 'XS,SM'
};

export type UIState = {
    hitsPerPage?: number;
    page?: number;
    configure?: {
        analyticsTags?: string[]; // ['all', 'desktop']
        attributesToRetrieve?: string[]; // ['*'],
        distinct?: boolean;
        facetingAfterDistinct?: boolean;
        filters?: string; // "tags:WOMENS AND any_variant_inventory_available:true",
        maxValuesPerFacet?: number;
        personalizationImpact?: number;
        query?: string;
        ruleContexts?: string[]; // ['all'],
    };
    refinementList: {
        [filters: string]: string[];
        // Example below
        // 'named_tags.fabric'?: string[],
        // product_type?: string[],
        // tags?: string[],
    };
    sortBy?: string;
};

type RoutingConfig = {
    indexName: string;
    serverUrl: string;
};

const getRefinementListFromRouteState = (
    route: RouteState,
): UiState['index']['refinementList'] => {
    let refinementList = undefined;
    try {
        refinementList = Object.fromEntries(
            Object.entries(route).filter(
                ([key,]) =>
                    !['itemsPerPage', 'query', 'sort', 'page'].includes(key),
            ),
        );
        refinementList = Object.entries(refinementList)
            .map(([key, value]) => {
                if (typeof value === 'string' && value.includes(',')) {
                    return {[key]: value.split(',')};
                }
                if (typeof value === 'number') {
                    return {[key]: [value.toString()]};
                }

                return {[key]: [value]};
            })
            .reduce((acc, curr) => ({...acc, ...curr}), {});
    } catch (error) {
        console.error('Error on parsing search route state:', error);
    }

    return refinementList as UiState['index']['refinementList'];
};

export const buildRoutingConfig = ({
                                       indexName,
                                       serverUrl,
                                   }: RoutingConfig): InstantSearchOptions<UiState, RouteState>['routing'] => ({
    stateMapping: {
        routeToState: (route) => {
            const refinementList = getRefinementListFromRouteState(route);

            const uiState: UIState | undefined = {
                hitsPerPage: route.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE_FILTER,
                page: route.page ?? 1,
                sortBy:
                    route.sort ??
                    indexName ??
                    'products',
                configure: {
                    query: route.query,
                },
                ...(refinementList && Object.keys(refinementList).length > 0
                    ? {refinementList}
                    : {}),
            } as UIState;

            const finalUIState = {
                [indexName]: uiState,
            };

            return finalUIState as UiState;
        },
        stateToRoute: (fullUIState): RouteState => {
            const uiState = fullUIState[indexName];
            if (!uiState) {
                return {};
            }

            let routeState: RouteState = {};

            if (
                uiState.sortBy &&
                uiState.sortBy !== 'products'
            ) {
                routeState.sort = uiState.sortBy;
            }

            if (
                uiState.hitsPerPage &&
                uiState.hitsPerPage !== 60
            ) {
                routeState.itemsPerPage = uiState.hitsPerPage;
            }

            if (uiState.page && uiState.page !== 1) {
                routeState.page = uiState.page;
            }

            if (uiState.configure?.query) {
                routeState.query = uiState.configure.query;
            }

            if (
                uiState.refinementList &&
                Object.keys(uiState.refinementList).length > 0
            ) {
                routeState = {
                    ...routeState,
                    ...uiState.refinementList,
                };
            }

            return routeState;
        },
    },
    router: history({
        getLocation() {
            if (typeof window === 'undefined') {
                return new URL(serverUrl) as unknown as Location;
            }

            return window.location;
        },
        createURL({routeState, location, qsModule}) {
            if (!routeState) {
                return `${location.origin}${location.pathname}`;
            }

            const queryString = qsModule.stringify(routeState, {
                addQueryPrefix: true,
                arrayFormat: 'comma',
            });

            return `${location.origin}${location.pathname}${queryString}`;
        },
        parseURL({location, qsModule}): RouteState {
            const parsedURL = qsModule.parse(location.search, {
                ignoreQueryPrefix: true,
                parseArrays: true,
            });
            return parsedURL;
        },
        cleanUrlOnDispose: false,
    }),
});
