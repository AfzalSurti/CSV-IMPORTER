declare module "papaparse";
declare module "multer";

declare global {
  namespace Express {
    interface Request {
      file?: {
        buffer: Buffer;
        [key: string]: unknown;
      };
    }
  }
}
