import Fuse from "fuse.js";
import ky from "ky";
import { createWriteStream } from "node:fs";
import { map, pick, pipe, piped, prop, reduce, tap } from "remeda";
import { loadCsv, outputCsv } from "./libs/csv.ts";
import type { MahiContact } from "./libs/mahi-schemas.ts";
import { persistedAuthorize } from "./libs/xero-auth.ts";
import type {
  Contact,
  ContactGroup,
  Paginated,
  Tenant,
} from "./libs/xero-schemas.ts";

const toFile = piped(
  (path: string) => new URL(path, import.meta.url).pathname,
  createWriteStream
);

const restClient = ky.extend({
  prefixUrl: "https://api.xero.com",
  hooks: {
    beforeRequest: [
      async (request) => {
        const { access_token } = await persistedAuthorize();
        request.headers.set("Authorization", `Bearer ${access_token}`);
      },
    ],
  },
});

const [tenant] = await restClient.get<Tenant[]>("connections").json();

console.log("Xero Tenant: ", tenant);

const { ContactGroups: xeroContactGroups } = await restClient
  .get<{ ContactGroups: ContactGroup[] }>("api.xro/2.0/ContactGroups", {
    headers: {
      "Xero-tenant-id": tenant.tenantId,
    },
    searchParams: {
      Statuses: "ACTIVE",
    },
  })
  .json();

outputCsv(toFile("data/xero-contact-groups.csv"), xeroContactGroups);

const xeroContacts = pipe(
  await restClient
    .get<Paginated & { Contacts: Contact[] }>(`api.xro/2.0/Contacts`, {
      headers: {
        "Xero-tenant-id": tenant.tenantId,
      },
      searchParams: {
        Statuses: "ACTIVE",
        SummaryOnly: "True",
        PageSize: 1_000,
        Page: 1,
      },
    })
    .json(),
  tap(({ pagination }) => console.log("Xero contacts page: ", pagination)),
  prop("Contacts")
);
const xeroContactsFuse = new Fuse(xeroContacts, {
  keys: ["Name"],
  threshold: 0.1,
  includeScore: true,
});

outputCsv(toFile("data/xero-contacts.csv"), xeroContacts);

const mahiMembers = pipe(
  await loadCsv<MahiContact>("data/mahi-contacts.csv", {
    headers: true,
  }),
  // filter((row) => /(Kea|Cub|Scout)\ Youth/.test(row["Role Name"])),
  map(
    pick([
      "Role Name",
      "Contact First Name",
      "Contact Last Name",
      "National Database Number",
      "Family Contact First Name",
      "Family Contact Last Name",
      "Family Contact Email Address",
      "Start Date",
      "Billable Status",
      "Special Billing Comments",
    ])
  )
);

console.log("Mahi members: ", mahiMembers.length);

const missingContacts = pipe(
  mahiMembers,
  reduce(
    (acc, member) =>
      xeroContactsFuse.search(
        `${member["Contact First Name"]} ${member["Contact Last Name"]}`
      ).length > 0 ||
      xeroContacts.find(
        ({ EmailAddress }) =>
          EmailAddress === member["Family Contact Email Address"]
      )
        ? acc
        : [...acc, member],
    [] as typeof mahiMembers
  )
);

console.log("Missing Xero contacts: ", missingContacts.length);
outputCsv(toFile("data/missing-contacts.csv"), missingContacts);

const updatingContacts = pipe(
  mahiMembers,
  reduce((acc, member) => {
    const contacts = xeroContactsFuse.search(
      `${member["Contact First Name"]} ${member["Contact Last Name"]}`
    );
    if (
      contacts.length === 1 &&
      contacts[0].item.EmailAddress !== member["Family Contact Email Address"]
    ) {
      const { ContactID, Name, EmailAddress } = contacts[0].item;
      return [
        ...acc,
        {
          ContactID,
          AccountNumber: member["National Database Number"],
          Name,
          MahiName: `${member["Contact First Name"]} ${member["Contact Last Name"]}`,
          MahiRole: member["Role Name"],
          EmailAddress,
          MahiEmail: member["Family Contact Email Address"],
        },
      ];
    } else {
      return acc;
    }
  }, [] as Array<{ ContactID: string; AccountNumber: string }>)
);
console.log(
  "Updating Xero contacts (email mismatch): ",
  updatingContacts.length
);
outputCsv(toFile("data/updating-contacts.csv"), updatingContacts);
