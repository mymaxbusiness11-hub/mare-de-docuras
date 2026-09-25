async function deleteProduct(product: Product) {
  const confirmed = window.confirm(
    `Excluir "${product.name}"?\n\nEssa ação excluirá o produto e todos os sabores/adicionais vinculados a ele.`
  );

  if (!confirmed) return;

  setError("");
  setLoadingProducts(true);

  const { error: optionsError } = await supabase
    .from("product_options")
    .delete()
    .eq("product_id", product.id);

  if (optionsError) {
    console.error(optionsError);
    setError("Não foi possível excluir os sabores e adicionais do produto.");
    setLoadingProducts(false);
    return;
  }

  const { error: productError } = await supabase
    .from("products")
    .delete()
    .eq("id", product.id);

  if (productError) {
    console.error(productError);
    setError("Não foi possível excluir o produto.");
    setLoadingProducts(false);
    return;
  }

  setProducts((currentProducts) =>
    currentProducts.filter(
      (currentProduct) => currentProduct.id !== product.id
    )
  );

  if (editingProduct?.id === product.id) {
    setEditingProduct(null);
    setCreatingProduct(false);
    setProductOptions([]);
  }

  setLoadingProducts(false);
}
