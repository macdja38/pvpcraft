declare module "i10010n" {
  export function init(options: { db: Record<string, unknown>, defaultLocale: string, logger: (errorType: string, data: { template: string[] } & Record<string, unknown>, message: string) => void, addTemplateData: (any: any) => void });
  export function i10010n(language: string): (template: TemplateStringsArray, ...args: (string | number | undefined | null | boolean)[]) => string;


  export const ErrorTypes = {
    MISSING_TEMPLATE_DATA: "Missing template data",
    MISSING_LOCALE_DATA: "Missing locale data",
    MISSING_DB: "Missing DB",
    MISSING_LOCALE: "Missing Locale",
    USER_FUNCTION_FAILED: "User function failed"
  };

  export const ErrorType = ErrorTypes.MISSING_TEMPLATE_DATA | ErrorTypes.MISSING_LOCALE_DATA | ErrorTypes.MISSING_DB | ErrorTypes.MISSING_LOCALE | ErrorTypes.USER_FUNCTION_FAILED;
}
