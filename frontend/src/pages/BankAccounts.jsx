import CrudPage from "../components/CrudPage";

const fields = [
  { name: "bank_name", label: "Bank Name" },
  { name: "account_number", label: "Account Number", required: false },
  { name: "account_type", label: "Type (Savings / Current / Salary)", required: false },
  { name: "balance", label: "Balance (₹)", type: "number" },
  { name: "owner_name", label: "Owner", required: false },
];

export default function BankAccounts() {
  return <CrudPage title="Bank Accounts" endpoint="/bank-accounts" fields={fields} assetType="bank" />;
}
