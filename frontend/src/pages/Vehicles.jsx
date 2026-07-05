import CrudPage from "../components/CrudPage";

const fields = [
  { name: "name", label: "Vehicle Name" },
  { name: "vehicle_type", label: "Type (Car / Bike / etc)", required: false },
  { name: "registration_number", label: "Reg. Number", required: false },
  { name: "current_value", label: "Current Value (₹)", type: "number" },
  { name: "purchase_price", label: "Purchase Price (₹)", type: "number", required: false },
  { name: "owner_name", label: "Owner", required: false },
];

export default function Vehicles() {
  return <CrudPage title="Vehicles" endpoint="/vehicles" fields={fields} assetType="vehicle" />;
}
