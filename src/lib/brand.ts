/**
 * Which logo this deployment shows (sidebar and browser tab). Set per server with
 * NEXT_PUBLIC_BRAND ("rx" or "techindia"); read at build time. Defaults to rx.
 */
export type BrandId = "rx" | "techindia";

export interface Brand {
  id: BrandId;
  /** Image under /public, shown as it is. */
  logo: string;
  /** Natural size of that image, so it keeps its shape. */
  width: number;
  height: number;
}

const BRANDS: Record<BrandId, Brand> = {
  rx: { id: "rx", logo: "/brand/rx/logo.png", width: 1024, height: 1024 },
  techindia: { id: "techindia", logo: "/brand/techindia/logo.png", width: 507, height: 361 },
};

export const BRAND: Brand =
  process.env.NEXT_PUBLIC_BRAND?.trim().toLowerCase() === "techindia"
    ? BRANDS.techindia
    : BRANDS.rx;
