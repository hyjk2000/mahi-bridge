import {
	Link,
	type LoaderFunction,
	type MetaFunction,
	Outlet,
	redirect,
	useLoaderData,
} from "react-router";
import { getTokens } from "../libs/xero-auth";
import { decodeJwt } from "jose";
import { pick, piped } from "remeda";

function Layout() {
	const { name } = useLoaderData<{ name: string }>();

	return (
		<div className="flex flex-col items-center-safe justify-start min-h-svh p-6">
			<header className="mb-6 flex self-stretch items-center-safe justify-between">
				<h1 className="text-2xl font-semibold">Mahi Bridge</h1>
				<p className="text-sm">
					Welcome, {name}! &nbsp;
					<Link
						to="/sign-out"
						className="underline text-blue-600 hover:text-blue-500"
					>
						Sign out
					</Link>
				</p>
			</header>
			<Outlet />
		</div>
	);
}

const meta: MetaFunction = () => [
	{
		title: "Mahi Bridge",
		description: "A bridge between Mahi Tahi & Xero.",
	},
];

const loader: LoaderFunction = async () => {
	const tokens = await getTokens();
	if (tokens?.id_token) {
		return piped(decodeJwt<{ name: string }>, pick(["name"]))(tokens.id_token);
	}
	return redirect("/oauth-xero");
};

export { Layout as Component, loader, meta };
