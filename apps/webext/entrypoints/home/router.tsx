import {
	createHashRouter,
	isRouteErrorResponse,
	useRouteError,
} from "react-router";

export default createHashRouter([
	{
		lazy: () => import("./routes/layout"),
		children: [
			{
				index: true,
				lazy: () => import("./routes/import-data"),
			},
		],
		HydrateFallback,
		ErrorBoundary,
	},
	{
		path: "oauth-xero",
		lazy: () => import("./routes/oauth-xero"),
		HydrateFallback,
		ErrorBoundary,
	},
	{
		path: "sign-out",
		lazy: () => import("./routes/sign-out"),
		HydrateFallback,
		ErrorBoundary,
	},
]);

function HydrateFallback() {
	return (
		<div className="flex min-h-svh items-center justify-center p-6">
			Loading...
		</div>
	);
}

function ErrorBoundary() {
	const error = useRouteError();

	if (isRouteErrorResponse(error)) {
		return (
			<div className="p-6" role="alert">
				<h1 className="text-2xl font-semibold">
					{error.status} {error.statusText}
				</h1>
				<p>{error.data}</p>
			</div>
		);
	}

	if (error instanceof Error) {
		return (
			<div className="p-6" role="alert">
				<h1 className="text-2xl font-semibold">Error</h1>
				<p>{error.message}</p>
				{error.stack && <pre>{error.stack}</pre>}
			</div>
		);
	}

	return (
		<div className="p-6">
			<h1 className="text-2xl font-semibold">Unknown Error</h1>
		</div>
	);
}
