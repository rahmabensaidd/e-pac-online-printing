export type ProductCategory = 'marketing' | 'business' | 'packaging' | 'photo' | 'custom';

export interface Product {
  id: number;
  name: string;
  category: ProductCategory;
  price: number;
  image: string;       // used as CSS background (gradient)
  description: string;
  specs: string[];
}
