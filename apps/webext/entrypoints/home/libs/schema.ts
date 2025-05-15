export namespace Xero {
  export type Tenant = { tenantId: string; tenantName: string };

  export type Contact = {
    ContactID: string;
    ContactNumber?: string;
    ContactStatus: string;
    Name: string;
    EmailAddress: string;
  };

  export type ContactGroup = {
    ContactGroupID: string;
    Name: string;
    Status: string;
    HasValidationErrors: false;
    Contacts: Contact[];
  };

  export type Paginated = {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      itemCount: number;
    };
  };
}

export namespace Mahi {
  export type Contact = {
    "Billable Status": string;
    "Account Name": string;
    "Start Date": string;
    "Contact First Name": string;
    "Contact Last Name": string;
    "Date of Birth": string;
    "Role Name": string;
    "Special Billing Comments": string;
    "Note 1": string;
    "Note 2": string;
    "Family Contact First Name": string;
    "Family Contact Last Name": string;
    "Family Contact Email Address": string;
    "Fees Charged to": string;
    "National Database Number": string;
  };
}
