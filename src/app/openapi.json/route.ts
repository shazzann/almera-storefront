import { NextResponse } from "next/server";
import {
  SITE_DESCRIPTION_DEFAULT,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
} from "@/lib/seo/config";

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: `${SITE_NAME} Public Storefront & Agent API`,
      version: "1.0.0",
      description: SITE_DESCRIPTION_DEFAULT,
      contact: {
        name: SITE_NAME,
        email: SUPPORT_EMAIL,
        url: `${SITE_URL}/contact`,
      },
    },
    servers: [
      {
        url: SITE_URL,
        description: "Production Storefront",
      },
    ],
    paths: {
      "/api/public/store-info": {
        get: {
          operationId: "getStoreInfo",
          summary: "Get store metadata, delivery fees, payment rules, and return policy",
          responses: {
            "200": {
              description: "Store configuration and policies",
            },
          },
        },
      },
      "/api/public/categories": {
        get: {
          operationId: "listCategories",
          summary: "List active product categories and subcategories",
          responses: {
            "200": {
              description: "Array of active categories",
            },
          },
        },
      },
      "/api/public/brands": {
        get: {
          operationId: "listBrands",
          summary: "List supported brands",
          responses: {
            "200": {
              description: "Array of brands",
            },
          },
        },
      },
      "/api/public/products": {
        get: {
          operationId: "listProducts",
          summary: "List active products with optional filtering",
          parameters: [
            {
              name: "category",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filter by category slug (e.g. lawns, occasion, pakistani)",
            },
            {
              name: "q",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Search term across name, fabric, colour, and description",
            },
            {
              name: "in_stock",
              in: "query",
              required: false,
              schema: { type: "boolean" },
              description: "Only return products currently in stock",
            },
          ],
          responses: {
            "200": {
              description: "Filtered product list with LKR prices and stock",
            },
          },
        },
      },
      "/api/public/products/{slug}": {
        get: {
          operationId: "getProductBySlug",
          summary: "Get a single product by slug with variant stock and policies",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Product detail",
            },
            "404": {
              description: "Product not found",
            },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      "Content-Type": "application/openapi+json; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

