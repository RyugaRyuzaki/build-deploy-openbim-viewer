const isProd = import.meta.env.PROD;
const apiUrlDev: string = import.meta.env.VITE_API_URL_DEV;
const apiUrlProd: string = import.meta.env.VITE_API_URL_PROD;
export const apiUrl: string = isProd ? apiUrlProd : apiUrlDev;
