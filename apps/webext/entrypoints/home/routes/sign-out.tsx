import { type LoaderFunction, redirect } from "react-router";
import { clearTokens } from "../libs/xero-auth";

const loader: LoaderFunction = async () => {
  await clearTokens();
  return redirect("/oauth-xero");
};

export { loader };
