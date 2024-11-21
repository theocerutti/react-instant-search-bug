import {json, Link} from "@remix-run/react";
import {LoaderFunctionArgs} from "@remix-run/node";

export async function loader({}: LoaderFunctionArgs) {
    return json({})
}

export default function Index() {
    return (
        <div>
            <h1>Homepage</h1>
            <Link to="/collections/firstHandle">Go to collection first</Link>
        </div>
    );
}
