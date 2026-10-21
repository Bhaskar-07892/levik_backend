import type { ProductBo } from '../bo/product.bo.js';
import type { ProductDao } from '../dao/product.dao.js';
import type { AppProductResponseDto, ProductResponseDto } from '../dto/product.response.dto.js';
import { imageLink } from '../../uploads/file-url.js';

export const ProductMapper = {
  toBo: (d: ProductDao): ProductBo => ({
    id: d.id,
    name: d.name,
    modelCode: d.modelCode,
    category: d.category,
    description: d.description,
    dimensions: d.dimensions,
    features: d.features,
    imageUrl: d.imageUrl,
    sku: d.sku,
    barcode: d.barcode,
    mrp: d.mrp,
    plumberPoints: d.plumberPoints,
    isActive: d.isActive,
    rewardEligible: d.rewardEligible,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }),
  toDto: (b: ProductBo): ProductResponseDto => ({
    ...b,
    dimensions: b.dimensions ?? undefined,
    imageUrl: imageLink(b.imageUrl),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }),
  toAppDto: (b: ProductBo): AppProductResponseDto => ({
    id: b.id,
    name: b.name,
    modelCode: b.modelCode,
    category: b.category,
    description: b.description,
    dimensions: b.dimensions ?? undefined,
    features: b.features,
    imageUrl: imageLink(b.imageUrl),
    scanPoints: b.rewardEligible ? b.plumberPoints : 0,
  }),
};
