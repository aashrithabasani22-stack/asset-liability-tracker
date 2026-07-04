import CrudPage from "../components/CrudPage";

const fields = [
  { name: "bank_name", label: "Bank" },
  { name: "principal_amount", label: "Principal (₹)", type: "number" },
  { name: "interest_rate", label: "Interest Rate (%)", type: "number" },
  { name: "start_date", label: "Start Date (YYYY-MM-DD)", required: false },
  { name: "maturity_date", label: "Maturity Date (YYYY-MM-DD)", required: false },
  { name: "maturity_value", label: "Maturity Value (₹)", type: "number" },
  { name: "owner_name", label: "Owner", required: false },
];

export default function FixedDeposits() {
  return <CrudPage title="Fixed Deposits" endpoint="/fixed-deposits" fields={fields} assetType="fd" />;
}
