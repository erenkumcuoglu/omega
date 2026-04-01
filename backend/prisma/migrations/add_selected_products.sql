-- CreateTable
CREATE TABLE "selected_products" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "epin_id" TEXT NOT NULL,
    "epin_name" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "purchase_price" DECIMAL(10,4) NOT NULL,
    "selling_price" DECIMAL(10,4) NOT NULL,
    "margin_pct" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "selected_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "selected_products_product_id_key" ON "selected_products"("product_id");
