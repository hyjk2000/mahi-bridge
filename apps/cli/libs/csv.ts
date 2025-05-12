import * as csv from "fast-csv";

function loadCsv<T>(filePath: string, options?: csv.ParserOptionsArgs) {
  const rows: T[] = [];

  return new Promise<T[]>((resolve, reject) => {
    csv
      .parseFile(filePath, options)
      .on("error", (error) => reject(error))
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
}

function outputCsv(writableStream: NodeJS.WritableStream, rows: any[]) {
  const csvStream = csv.format({ headers: true });
  csvStream.pipe(writableStream);
  for (const row of rows) {
    csvStream.write(row);
  }
  csvStream.end();
}

export { loadCsv, outputCsv };
