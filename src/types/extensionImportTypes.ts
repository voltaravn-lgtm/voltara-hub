export interface ExtensionVariant {
  name: string;
  options: string[];
}

export interface ExtensionSeller {
  name?: string;
  shopUrl?: string;
}

export interface ExtensionSpecification {
  name: string;
  value: string;
}

export interface ExtensionProductImportRequest {
  source: "shopee";
  sourceUrl: string;
  externalProductId?: string;
  name: string;
  sku?: string;
  price?: number;
  originalPrice?: number;
  description?: string;
  images: string[];
  category?: string;
  variants?: ExtensionVariant[];
  specifications?: ExtensionSpecification[];
  seller?: ExtensionSeller;
  importedAt: string;
  weight?: number;
}

export interface ExtensionProductPending extends ExtensionProductImportRequest {
  id: string;
  status: 'pending_review' | 'imported' | 'rejected';
}

export interface ExtensionConnectionConfig {
  isConnected: boolean;
  token: string | null;
  extensionName: string;
  lastConnectedAt: string | null;
  productsSentCount: number;
}
