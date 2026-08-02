import { ModelsScreen } from "@/features/models/models-screen";
import { fetchFreeModelCatalog } from "@/infrastructure/fetch-model-catalog";
import { defaultModelSelection } from "@/infrastructure/model-catalog";

export default async function ModelsPage() {
  const catalog = await fetchFreeModelCatalog();

  return (
    <ModelsScreen
      catalog={catalog}
      defaultSelection={catalog ? defaultModelSelection(catalog) : []}
    />
  );
}
