export type translateType = (template: TemplateStringsArray, ...args: (string | number | undefined | null | boolean)[]) => string;
export type translateTypeCreator = (lang: string) => translateType;
