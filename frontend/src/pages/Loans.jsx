import CrudPage from "../components/CrudPage";

const fields = [
  { name: "bank_name", label: "Bank / Lender" },
  { name: "loan_type", label: "Loan Type" },
  { name: "principal_amount", label: "Principal Amount", type: "number" },
  { name: "remaining_balance", label: "Remaining Balance", type: "number" },
  { name: "monthly_payment", label: "Monthly Payment", type: "number" },
];

export default function Loans() {
  return <CrudPage title="Loans" endpoint="/loans" fields={fields} assetType="loan" />;
}
