import {json, Link, useInRouterContext, useLoaderData} from "@remix-run/react";
import {LoaderFunctionArgs} from "@remix-run/node";
import {renderToString} from "react-dom/server";
import {
    getServerState,
    InstantSearch,
    InstantSearchServerState,
    InstantSearchSSRProvider,
    usePagination,
    useSortBy
} from "react-instantsearch";
import algoliasearch from "algoliasearch/lite";
// import {buildRoutingConfig} from "~/routingState";
import {history} from "instantsearch.js/es/lib/routers";

const ALGOLIA_APP_ID = "**"
const ALGOLIA_KEY = "**"
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_KEY);

export const shouldRevalidate = () => true;

export async function loader({request, params}: LoaderFunctionArgs) {
    const serverUrl = request.url;

    if (!params.handle)
        throw new Error("e");

    const serverState = await getServerState(
        <SearchMain handle={params.handle} serverUrl={serverUrl}/>,
        {
            renderToString,
        },
    );

    return json({
        serverState,
        serverUrl,
        handle: params.handle
    })
}

export default function SearchHandle() {
    const {serverUrl, serverState, handle} = useLoaderData<typeof loader>();

    return <SearchMain serverUrl={serverUrl} serverState={serverState} handle={handle}/>
}

const SearchMain = ({serverUrl, serverState, handle}: {
    serverUrl: string,
    serverState?: InstantSearchServerState,
    handle: string
}) => {
    return (<InstantSearchSSRProvider {...serverState}>
        <InstantSearch
            key={new URL(serverUrl).pathname}
            future={{
                preserveSharedStateOnUnmount: true,
            }}
            searchClient={client}
            indexName={'products'}
            routing={{
                router: history({
                    getLocation() {
                        if (typeof window === 'undefined') {
                            return new URL(serverUrl) as unknown as Location;
                        }

                        return window.location;
                    },
                    cleanUrlOnDispose: false,
                }),
            }}
            //     routing={buildRoutingConfig({
            //     serverUrl: serverUrl,
            //     indexName: 'products'
            // })}
        >
            <Inside handle={handle}/>
        </InstantSearch>
    </InstantSearchSSRProvider>);
}

const Inside = ({handle}: { handle: string }) => {
    const inRouterContext = useInRouterContext();
    const {refine: refinePage, currentRefinement: currentPage, nbPages} = usePagination();
    // since instant search page index is 0-based we have to add +1 / -1
    const currentPageCorrect = currentPage === 0 ? 1 : currentPage + 1;
    const {refine: refineSort, currentRefinement: currentSort, options} = useSortBy({
        items: [
            {label: 'products', value: 'products'},
            {label: 'products_recently_ordered_count_desc', value: 'products_recently_ordered_count_desc'}
        ]
    });

    return (
        <div className="flex flex-col gap-y-3">
            <div className="bg-red-800">
                <h1>Handle: {handle}</h1>
                {inRouterContext &&
                    <div className="flex flex-col">
                        <Link className="hover:underline" to="/collections/firstHandle">Go First Collection</Link>
                        <Link className="hover:underline" to="/collections/secondHandle">Go Second Collection</Link>
                    </div>}
            </div>

            <div className="bg-green-800">
                <h1>Pagination</h1>
                <div className="flex gap-x-1">
                    {Array.from({length: nbPages}).map((_, page) => (
                        <button className={`${currentPageCorrect === page ? 'text-2xl' : ''} border-none bg-none`}
                                key={page}
                                onClick={() => refinePage(page - 1)}>
                            {page}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-blue-800">
                <h1>Sort</h1>
                <select value={currentSort} onChange={(e) => refineSort(e.target.value)}>
                    {options.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                </select>

                <h1>Navigate to</h1>
                {inRouterContext && <Link to="/">Homepage</Link>}
            </div>
        </div>
    )
}