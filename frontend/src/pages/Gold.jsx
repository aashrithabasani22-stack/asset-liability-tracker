import CrudPage from "../components/CrudPage";

const fields = [
  { name: "article_name", label: "Article" },
  { name: "weight_grams", label: "Weight (g)", type: "number" },
  { name: "purity_karat", label: "Purity (karat)", type: "number" },
  { name: "owner_name", label: "Owner", required: false },
];

export default function Gold() {
  return <CrudPage title="Gold Assets" endpoint="/gold" fields={fields} assetType="gold" />;
}
