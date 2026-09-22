/**
 * Central Stock Configuration for Enterprise Stock Intelligence Platform.
 * Single source of truth for all supported NSE equities across the frontend.
 */

export interface StockConfig {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  enabled: boolean;
}

export const SUPPORTED_STOCKS: StockConfig[] = [
  {
    symbol: "TCS.NS",
    companyName: "Tata Consultancy Services Ltd.",
    exchange: "NSE",
    sector: "Information Technology",
    enabled: true,
  },
  {
    symbol: "INFY.NS",
    companyName: "Infosys Ltd.",
    exchange: "NSE",
    sector: "Information Technology",
    enabled: true,
  },
  {
    symbol: "RELIANCE.NS",
    companyName: "Reliance Industries Ltd.",
    exchange: "NSE",
    sector: "Energy & Conglomerate",
    enabled: true,
  },
  {
    symbol: "HDFCBANK.NS",
    companyName: "HDFC Bank Ltd.",
    exchange: "NSE",
    sector: "Financial Services",
    enabled: true,
  },
  {
    symbol: "ICICIBANK.NS",
    companyName: "ICICI Bank Ltd.",
    exchange: "NSE",
    sector: "Financial Services",
    enabled: true,
  },
  {
    symbol: "SBIN.NS",
    companyName: "State Bank of India",
    exchange: "NSE",
    sector: "Financial Services",
    enabled: true,
  },
  {
    symbol: "LT.NS",
    companyName: "Larsen & Toubro Ltd.",
    exchange: "NSE",
    sector: "Industrial",
    enabled: true,
  },
  {
    symbol: "ITC.NS",
    companyName: "ITC Ltd.",
    exchange: "NSE",
    sector: "FMCG",
    enabled: true,
  },
  {
    symbol: "BHARTIARTL.NS",
    companyName: "Bharti Airtel Ltd.",
    exchange: "NSE",
    sector: "Technology / Telecom",
    enabled: true,
  },
  {
    symbol: "AXISBANK.NS",
    companyName: "Axis Bank Ltd.",
    exchange: "NSE",
    sector: "Financial Services",
    enabled: true,
  },
  {
    symbol: "KOTAKBANK.NS",
    companyName: "Kotak Mahindra Bank Ltd.",
    exchange: "NSE",
    sector: "Financial Services",
    enabled: true,
  },
  {
    symbol: "HINDUNILVR.NS",
    companyName: "Hindustan Unilever Ltd.",
    exchange: "NSE",
    sector: "FMCG",
    enabled: true,
  },
  {
    symbol: "MARUTI.NS",
    companyName: "Maruti Suzuki India Ltd.",
    exchange: "NSE",
    sector: "Automobile",
    enabled: true,
  },
  {
    symbol: "SUNPHARMA.NS",
    companyName: "Sun Pharmaceutical Industries Ltd.",
    exchange: "NSE",
    sector: "Pharmaceutical",
    enabled: true,
  },
];

export const COMPANY_NAMES: Record<string, string> = SUPPORTED_STOCKS.reduce(
  (acc, stock) => {
    acc[stock.symbol] = stock.companyName;
    return acc;
  },
  {} as Record<string, string>
);

export const SUPPORTED_SYMBOLS: string[] = SUPPORTED_STOCKS.map((s) => s.symbol);

export const POPULAR_SYMBOLS: string[] = [
  "TCS.NS",
  "RELIANCE.NS",
  "INFY.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "SBIN.NS",
  "LT.NS",
  "ITC.NS",
  "BHARTIARTL.NS",
  "AXISBANK.NS",
  "KOTAKBANK.NS",
  "HINDUNILVR.NS",
  "MARUTI.NS",
  "SUNPHARMA.NS",
];

export const STOCKS_BY_SECTOR: Record<string, StockConfig[]> = SUPPORTED_STOCKS.reduce(
  (acc, stock) => {
    if (!acc[stock.sector]) {
      acc[stock.sector] = [];
    }
    acc[stock.sector].push(stock);
    return acc;
  },
  {} as Record<string, StockConfig[]>
);

/**
 * Fetch dynamic list of supported stocks from backend, with static fallback.
 */
export async function fetchSupportedStocks(): Promise<StockConfig[]> {
  try {
    const res = await fetch("/api/stocks/");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          symbol: item.symbol,
          companyName: item.company_name,
          exchange: item.exchange || "NSE",
          sector: item.sector || "Equities",
          enabled: item.is_active ?? true,
        }));
      }
    }
  } catch {
    // Silent fallback to static catalog
  }
  return SUPPORTED_STOCKS;
}

