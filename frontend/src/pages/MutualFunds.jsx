import CrudPage from "../components/CrudPage";

const fields = [
  { name: "fund_name", label: "Fund / Stock Name" },
  { name: "asset_subtype", label: "Type (MF / Stock / ETF)", required: false },
  { name: "units", label: "Units", type: "number" },
  { name: "nav_per_unit", label: "NAV / Price per Unit (₹)", type: "number" },
  { name: "current_value", label: "Current Value (₹)", type: "number" },
  { name: "owner_name", label: "Owner", required: false },
];

export default function MutualFunds() {
  return <CrudPage title="Mutual Funds & Stocks" endpoint="/mutual-funds" fields={fields} assetType="mf" />;
}
