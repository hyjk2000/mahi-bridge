import { decodeJwt } from "jose";
import { Link, type MetaFunction, Outlet, redirect, useLoaderData } from "react-router";
import { pick, piped } from "remeda";
import { getTokens } from "../libs/xero-auth";

function Layout() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-center-safe justify-start min-h-svh p-6">
      <header className="mb-6 flex self-stretch items-center-safe justify-between">
        <div className="flex items-center gap-2">
          <img src="/icon/96.png" className="size-12" alt="Mahi Bridge Logo" />
          <h1 className="text-2xl font-semibold">Mahi Bridge</h1>
        </div>
        <p className="text-sm">
          Welcome, {data?.name} &nbsp;
          <Link to="/sign-out" className="underline text-blue-600 hover:text-blue-500">
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

const loader = async () => {
  const tokens = await getTokens();
  if (tokens?.id_token) {
    return piped(decodeJwt<{ name: string }>, pick(["name"]))(tokens.id_token);
  }
};

export { Layout as Component, loader, meta };
