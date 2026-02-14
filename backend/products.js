let products = []; // Replace with DB later

const createProduct = (req, res) => {
  const { supplierId, name, sku, price, stock } = req.body;
  const product = { id: Date.now(), supplierId, name, sku, price, stock };
  products.push(product);
  res.json({ message: "Product added", product });
};

const getProductsBySupplier = (req, res) => {
  const supplierId = parseInt(req.params.supplierId);
  res.json(products.filter(p => p.supplierId === supplierId));
};

module.exports = { createProduct, getProductsBySupplier };
