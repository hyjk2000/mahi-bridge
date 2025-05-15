import parse from "csv-simple-parser";

const loadCsv = <T extends Record<string, string>>(csvStr: string) => parse(csvStr, { header: true }) as T[];

export { loadCsv };
