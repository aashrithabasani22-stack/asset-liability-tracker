import CrudPage from "../components/CrudPage";

const fields = [
  { name: "name", label: "Asset Name" },
  { name: "category", label: "Category", required: false },
  { name: "current_value", label: "Current Value (₹)", type: "number" },
  { name: "purchase_price", label: "Purchase Price (₹)", type: "number", required: false },
  { name: "notes", label: "Notes", required: false },
  { name: "owner_name", label: "Owner", required: false },
];

export default function OtherAssets() {
  return <CrudPage title="Other Assets" endpoint="/other-assets" fields={fields} assetType="other" />;
}
