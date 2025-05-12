type Tenant = { tenantId: string; tenantName: string };

type Contact = {
  ContactID: string;
  ContactNumber?: string;
  ContactStatus: string;
  Name: string;
  EmailAddress: string;
};

type ContactGroup = {
  ContactGroupID: string;
  Name: string;
  Status: string;
  HasValidationErrors: false;
  Contacts: Contact[];
};

type Paginated = {
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    itemCount: number;
  };
};

export type { Tenant, Contact, ContactGroup, Paginated };
