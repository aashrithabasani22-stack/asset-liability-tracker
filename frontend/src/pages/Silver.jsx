import CrudPage from "../components/CrudPage";

const fields = [
  { name: "article_name", label: "Article" },
  { name: "weight_grams", label: "Weight (g)", type: "number" },
  { name: "purity_percent", label: "Purity (%)", type: "number" },
  { name: "owner_name", label: "Owner", required: false },
];

export default function Silver() {
  return <CrudPage title="Silver Assets" endpoint="/silver" fields={fields} assetType="silver" />;
}
