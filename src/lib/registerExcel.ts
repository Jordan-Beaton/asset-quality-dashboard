// Turns the rows a register is showing into an Excel file. Browser only: the xlsx library loads when the button is pressed,
// so the register pages stay light.

export type RegisterExcelColumn<Row> = {
  header: string;
  width: number;
  value: (row: Row) => string | number | null | undefined;
};

export async function downloadRegisterExcel<Row>({
  fileName,
  sheetName,
  title,
  filters,
  columns,
  rows,
}: {
  fileName: string;
  sheetName: string;
  title: string;
  filters: string[];
  columns: Array<RegisterExcelColumn<Row>>;
  rows: Row[];
}) {
  const XLSX = await import("xlsx");
  const generated = new Date().toLocaleString("en-GB");
  const sheet = XLSX.utils.aoa_to_sheet([
    [title],
    [`Generated ${generated} · ${rows.length} record${rows.length === 1 ? "" : "s"}`],
    [filters.length ? `Filters: ${filters.join(" · ")}` : "Filters: none"],
    [],
    columns.map((column) => column.header),
    ...rows.map((row) => columns.map((column) => column.value(row) ?? "")),
  ]);
  sheet["!cols"] = columns.map((column) => ({ wch: column.width }));
  // Keep the column headings visible, and let the register be filtered straight away.
  sheet["!freeze"] = { xSplit: 0, ySplit: 5 };
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 4, c: 0 }, e: { r: 4 + rows.length, c: columns.length - 1 } }) };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(book, fileName);
}

export function excelDateStamp() {
  return new Date().toISOString().slice(0, 10);
}
