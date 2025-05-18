import { createWriteStream } from "node:fs";
import { createXeroAPIClient } from "@mahibridge/xero";
import Fuse from "fuse.js";
import { map, pick, pipe, piped, reduce } from "remeda";
import { loadCsv, outputCsv } from "./libs/csv";
import type { Mahi } from "./libs/types.ts";
import { persistedAuthorize } from "./libs/xero-auth";

const xeroClient = createXeroAPIClient(await persistedAuthorize().then(({ access_token }) => access_token));

const toFile = piped((path: string) => new URL(path, import.meta.url).pathname, createWriteStream);

const xeroContactGroups = await xeroClient.getContactGroups();

outputCsv(toFile("data/xero-contact-groups.csv"), xeroContactGroups);

const xeroContacts = await xeroClient.getContacts();
const xeroContactsFuse = new Fuse(xeroContacts, {
  keys: ["Name"],
  threshold: 0.1,
  includeScore: true,
});

outputCsv(toFile("data/xero-contacts.csv"), xeroContacts);

const mahiMembers = pipe(
  await loadCsv<Mahi.Contact>("data/mahi-contacts.csv", {
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
    ]),
  ),
);

console.log("Mahi members: ", mahiMembers.length);

const missingContacts = pipe(
  mahiMembers,
  reduce(
    (acc, member) =>
      xeroContactsFuse.search(`${member["Contact First Name"]} ${member["Contact Last Name"]}`).length > 0 ||
      xeroContacts.find(({ EmailAddress }) => EmailAddress === member["Family Contact Email Address"])
        ? acc
        : [...acc, member],
    [] as typeof mahiMembers,
  ),
);

console.log("Missing Xero contacts: ", missingContacts.length);
outputCsv(toFile("data/missing-contacts.csv"), missingContacts);

const updatingContacts = pipe(
  mahiMembers,
  reduce(
    (acc, member) => {
      const contacts = xeroContactsFuse.search(`${member["Contact First Name"]} ${member["Contact Last Name"]}`);
      if (contacts.length === 1 && contacts[0].item.EmailAddress !== member["Family Contact Email Address"]) {
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
      }
      return acc;
    },
    [] as Array<{ ContactID: string; AccountNumber: string }>,
  ),
);
console.log("Updating Xero contacts (email mismatch): ", updatingContacts.length);
outputCsv(toFile("data/updating-contacts.csv"), updatingContacts);
