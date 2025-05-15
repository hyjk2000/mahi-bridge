import {
  type ActionFunction,
  Form,
  type LoaderFunction,
  type MetaFunction,
  redirect,
  useNavigation,
} from "react-router";
import { getTokens, persistedAuthorize } from "../libs/xero-auth";

function OAuthXero() {
  const navigation = useNavigation();

  return (
    <div className="flex flex-col items-center-safe justify-center min-h-svh p-6 space-y-4">
      <div className="flex items-center gap-2">
        <img src="/icon/96.png" className="size-12" alt="Mahi Bridge Logo" />
        <h1 className="text-2xl font-semibold">Mahi Bridge</h1>
      </div>
      <Form method="post">
        <button
          type="submit"
          disabled={navigation.state !== "idle"}
          aria-busy={navigation.state !== "idle"}
          className="text-lg bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 py-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Connect to Xero
        </button>
      </Form>
    </div>
  );
}

const meta: MetaFunction = () => [
  {
    title: "Connect to Xero | Mahi Bridge",
  },
];

const loader: LoaderFunction = async () => {
  const tokens = await getTokens();
  if (tokens?.access_token) return redirect("/");
};

const action: ActionFunction = async () => {
  await persistedAuthorize();
  return redirect("/");
};

export { action, OAuthXero as Component, loader, meta };
