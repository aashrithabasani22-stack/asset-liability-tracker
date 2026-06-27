import CrudPage from "../components/CrudPage";

const fields = [
  { name: "address", label: "Address" },
  { name: "property_type", label: "Type" },
  { name: "current_value", label: "Current Value", type: "number" },
  { name: "owner_name", label: "Owner", required: false },
];

export default function Properties() {
  return <CrudPage title="Real Estate" endpoint="/properties" fields={fields} assetType="property" />;
}
