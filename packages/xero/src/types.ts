export namespace Xero {
  export type Tenant = { tenantId: string; tenantName: string };

  export type Contact = {
    ContactID: string;
    ContactStatus: string;
    Name: string;
    EmailAddress: string;
  };

  export type NewContact = {
    Name: string;
    AccountNumber: string;
    FirstName: string;
    LastName: string;
    EmailAddress: string;
    SalesTrackingCategories: Array<{
      TrackingCategoryName: string;
      TrackingOptionName: string;
    }>;
    PaymentTerms: {
      Sales: {
        Type: "DAYSAFTERBILLDATE" | "DAYSAFTERBILLMONTH" | "OFCURRENTMONTH" | "OFFOLLOWINGMONTH";
        Day: number;
      };
    };
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
