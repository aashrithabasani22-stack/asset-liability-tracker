import CrudPage from "../components/CrudPage";

const fields = [
  { name: "bank_name", label: "Lender Bank" },
  { name: "loan_type", label: "Loan Type" },
  { name: "principal_amount", label: "Principal Amount", type: "number" },
  { name: "remaining_balance", label: "Remaining Balance", type: "number" },
  { name: "monthly_payment", label: "Monthly EMI", type: "number" },
  { name: "payment_bank", label: "Paid From (Bank/Account)", required: false },
  { name: "next_due_date", label: "Next EMI Due Date (YYYY-MM-DD)", required: false },
];

export default function Loans() {
  return <CrudPage title="Loans" endpoint="/loans" fields={fields} assetType="loan" />;
}
