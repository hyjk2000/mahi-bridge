import kyOrig, { type KyInstance } from "ky";
import type { Xero } from "./types";

class XeroAPI {
  private _client: Promise<KyInstance>;
  private _tenant?: Xero.Tenant;

  constructor(accessToken: string, ky: KyInstance = kyOrig) {
    this._client = Promise.resolve(
      ky.extend({
        prefixUrl: "https://api.xero.com",
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
  }

  public withDefaultTenant() {
    this._client = (async () => {
      const client = await this._client;
      const [tenant] = await client.get<Xero.Tenant[]>("connections").json();
      this._tenant = tenant;
      return client.extend({
        headers: { "Xero-tenant-id": tenant.tenantId },
      });
    })();
    return this;
  }

  public get tenant() {
    return this._tenant;
  }

  public async getContactGroups(searchParams: Record<string, string | number | boolean> = { Status: "ACTIVE" }) {
    const client = await this._client;
    const { ContactGroups: contactGroups } = await client
      .get<{ ContactGroups: Xero.ContactGroup[] }>("api.xro/2.0/ContactGroups", { searchParams })
      .json();
    return contactGroups;
  }

  public async getContacts(
    searchParams: Record<string, string | number | boolean> = {
      Status: "ACTIVE",
      SummaryOnly: true,
      PageSize: 1_000,
    },
  ) {
    const client = await this._client;
    const contacts: Xero.Contact[] = [];
    let page = 0;
    let pageCount = 1;
    do {
      const pageData = await client
        .get<Xero.Paginated & { Contacts: Xero.Contact[] }>("api.xro/2.0/Contacts", {
          searchParams: { ...searchParams, Page: ++page },
        })
        .json();
      pageCount = pageData.pagination.pageCount;
      contacts.push(...pageData.Contacts);
    } while (page < pageCount);
    return contacts;
  }

  public async createContacts(contacts: Xero.NewContact[]) {
    const client = await this._client;
    await client.put("api.xro/2.0/Contacts", { json: { contacts } });
  }
}

const createXeroAPIClient = (accessToken: string, ky?: KyInstance) => new XeroAPI(accessToken, ky).withDefaultTenant();

export default XeroAPI;
export { createXeroAPIClient };
