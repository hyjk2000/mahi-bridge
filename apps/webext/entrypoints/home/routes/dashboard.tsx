import Fuse from "fuse.js";
import ky from "ky";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataGrid } from "react-data-grid";
import { type MetaFunction, redirect, useLoaderData } from "react-router";
import { pick, reduce } from "remeda";
import { loadCsv } from "../libs/csv";
import type { Mahi, Xero } from "../libs/schema";
import { getTokens } from "../libs/xero-auth";

function Dashboard() {
  const { tenant, xeroContacts } = useLoaderData<typeof loader>();

  const csvInputRef = useRef<HTMLInputElement>(null);

  const [mahiContacts, setMahiContacts] = useState<Mahi.Contact[]>([]);

  useEffect(() => {
    const elem = csvInputRef.current;
    if (!elem) return;

    const handleChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (!target.files?.length) return;

      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvData = e.target?.result;
        if (!csvData) return;

        const data = loadCsv<Mahi.Contact>(csvData as string);
        setMahiContacts(data);
      };
      reader.readAsText(file);
    };
    elem.addEventListener("change", handleChange);

    return () => elem.removeEventListener("change", handleChange);
  }, []);

  const xeroContactsFuse = useMemo(
    () =>
      new Fuse(xeroContacts, {
        keys: ["Name"],
        threshold: 0.1,
        includeScore: true,
        shouldSort: true,
      }),
    [xeroContacts],
  );

  const newMahiContacts = useMemo(
    () =>
      reduce(
        mahiContacts,
        (acc, member) =>
          xeroContactsFuse.search(`${member["Contact First Name"]} ${member["Contact Last Name"]}`).length > 0 ||
          xeroContacts.find(({ EmailAddress }) => EmailAddress === member["Family Contact Email Address"])
            ? acc
            : [...acc, member],
        [] as Mahi.Contact[],
      ),
    [mahiContacts, xeroContactsFuse, xeroContacts],
  );

  const outdatedXeroContacts = useMemo(
    () =>
      reduce(
        mahiContacts,
        (acc, member) => {
          const contacts = xeroContactsFuse.search(`${member["Contact First Name"]} ${member["Contact Last Name"]}`);
          if (contacts.length === 1 && contacts[0].item.EmailAddress !== member["Family Contact Email Address"]) {
            return [
              ...acc,
              {
                ...pick(contacts[0].item, ["ContactID", "Name", "EmailAddress"]),
                ...pick(member, [
                  "Contact First Name",
                  "Contact Last Name",
                  "Family Contact Email Address",
                  "Family Contact First Name",
                  "Family Contact Last Name",
                ]),
              },
            ];
          }
          return acc;
        },
        [] as Array<Record<string, string>>,
      ),
    [mahiContacts, xeroContactsFuse],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-16">
        <section>
          <h2 className="my-4 text-lg font-semibold">Xero</h2>
          <dl className="[&>dt:not(:first-child)]:mt-4 [&>dt]:font-semibold">
            <dt>Organisation</dt>
            <dd>{tenant.tenantName}</dd>
            <dt>Contacts</dt>
            <dd>{xeroContacts.length}</dd>
          </dl>
        </section>
        <section>
          <h2 className="my-4 text-lg font-semibold">Mahi Tahi</h2>
          <label htmlFor="mahi-csv-input" className="block my-1 font-semibold">
            Upload Treasurer Report
          </label>
          <input
            id="mahi-csv-input"
            type="file"
            accept=".csv"
            className="border-4 border-dashed border-gray-200 hover:bg-gray-200 rounded px-2 py-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            ref={csvInputRef}
          />
        </section>
      </div>
      {newMahiContacts.length > 0 && (
        <div className="mt-8 self-stretch">
          <h3 className="my-2 font-semibold">New Members</h3>
          <DataGrid
            className="rdg-light"
            columns={[
              { key: "National Database Number", name: "#" },
              { key: "Role Name", name: "Role" },
              { key: "Contact First Name", name: "FName" },
              { key: "Contact Last Name", name: "LName" },
              { key: "Family Contact First Name", name: "FC FName" },
              { key: "Family Contact Last Name", name: "FC LName" },
              { key: "Family Contact Email Address", name: "FC Email" },
              { key: "Start Date", name: "Start Date" },
              { key: "Billable Status", name: "Billable" },
              { key: "Special Billing Comments", name: "Billing Comments" },
            ]}
            rows={newMahiContacts}
            rowKeyGetter={(r) => r["National Database Number"]}
            defaultColumnOptions={{ resizable: true }}
          />
        </div>
      )}
      {outdatedXeroContacts.length > 0 && (
        <div className="mt-8 self-stretch">
          <h3 className="my-2 font-semibold">Outdated Contacts</h3>
          <DataGrid
            className="rdg-light"
            columns={[
              {
                name: "Xero",
                children: [
                  { key: "ContactID", name: "#" },
                  { key: "Name", name: "Name" },
                  { key: "EmailAddress", name: "Email" },
                  { key: "Contact First Name", name: "Mahi FName" },
                ],
              },
              {
                name: "Mahi Tahi",
                children: [
                  { key: "Contact Last Name", name: "LName" },
                  { key: "Family Contact Email Address", name: "Email" },
                  { key: "Family Contact First Name", name: "FC FName" },
                  { key: "Family Contact Last Name", name: "FC LName" },
                ],
              },
            ]}
            rows={outdatedXeroContacts}
            rowKeyGetter={(r) => r.ContactID}
            defaultColumnOptions={{ resizable: true }}
          />
        </div>
      )}
    </>
  );
}

const meta: MetaFunction = () => [
  {
    title: "Dashboard | Mahi Bridge",
  },
];

const loader = async () => {
  const tokens = await getTokens();
  if (!tokens) return redirect("/oauth-xero");

  let restClient = ky.extend({
    prefixUrl: "https://api.xero.com",
    hooks: {
      beforeRequest: [
        async (request) => {
          request.headers.set("Authorization", `Bearer ${tokens.access_token}`);
        },
      ],
    },
  });

  const [tenant] = await restClient.get<Xero.Tenant[]>("connections").json();
  restClient = restClient.extend({
    headers: { "Xero-tenant-id": tenant.tenantId },
  });

  const [xeroContactGroups, xeroContacts] = await Promise.all([
    restClient
      .get<{ ContactGroups: Xero.ContactGroup[] }>("api.xro/2.0/ContactGroups", {
        searchParams: {
          Statuses: "ACTIVE",
        },
      })
      .json()
      .then((data) => data.ContactGroups),
    restClient
      .get<Xero.Paginated & { Contacts: Xero.Contact[] }>("api.xro/2.0/Contacts", {
        searchParams: {
          Statuses: "ACTIVE",
          SummaryOnly: "True",
          PageSize: 1_000,
          Page: 1,
        },
      })
      .json()
      .then((data) => data.Contacts),
  ]);

  return {
    tenant,
    xeroContactGroups,
    xeroContacts,
  };
};

export { Dashboard as Component, loader, meta };
