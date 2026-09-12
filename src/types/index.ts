export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_urls: string[];
  is_sold_out: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  phone_number: string | null;
  role: "admin" | "buyer";
  created_at: string;
};

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
};

export type FavoriteItem = {
  id: string;
  product_id: string;
  product: Product;
};
