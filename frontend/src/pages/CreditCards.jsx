import CrudPage from "../components/CrudPage";

const fields = [
  { name: "bank_name", label: "Bank / Issuer" },
  { name: "card_name", label: "Card Name", required: false },
  { name: "credit_limit", label: "Credit Limit (₹)", type: "number" },
  { name: "outstanding_amount", label: "Amount to Pay (₹)", type: "number" },
  { name: "due_date", label: "Due Date (YYYY-MM-DD)", required: false },
  { name: "owner_name", label: "Owner", required: false },
];

export default function CreditCards() {
  return <CrudPage title="Credit Cards" endpoint="/credit-cards" fields={fields} assetType="cc" />;
}
