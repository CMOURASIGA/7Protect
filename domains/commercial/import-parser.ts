import { unzipSync, strFromU8 } from "fflate";

export const IMPORT_RULE_VERSION = "v2-spec07-1";
export type RawCell = { value: string; kind: "text" | "number" | "formula" | "error"; formula?: string; cached?: string; style?: number };
export type SourceRow = { sheet: string; row: number; cells: Record<string, RawCell> };
export type ParsedImport = { rows: SourceRow[]; benchmark: Record<string, [number, number, number, number, number]>; warnings: string[]; date1904: boolean };
const decode = (s: string) => s.replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).replace(/&(?:amp|lt|gt|quot|apos);/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" })[m] || m);
const attr = (tag: string, name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1];
const text = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");
const zipPath = (path: string) => { const segments: string[] = []; for (const part of path.split("/")) { if (part === "..") segments.pop(); else if (part && part !== ".") segments.push(part); } return segments.join("/"); };
export function excelDate(serial: number, date1904 = false): string | null {
  if (!Number.isInteger(serial) || serial < (date1904 ? 0 : 1) || serial > 2958465 || (!date1904 && serial === 60)) return null;
  const date = new Date(Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) + serial * 86400000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
export function parseCommercialWorkbook(bytes: Uint8Array): ParsedImport {
  if (bytes.length > 15_000_000) throw new Error("Arquivo maior que o limite de 15 MB.");
  let archive: Record<string, Uint8Array>;
  try { archive = unzipSync(bytes, { filter: (file) => /^(xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/sheet\d+\.xml)|\[Content_Types\]\.xml)$/.test(file.name) && file.originalSize < 30_000_000 }); }
  catch { throw new Error("Arquivo XLSM inválido ou corrompido."); }
  const xml = (path: string) => archive[path] ? strFromU8(archive[path]) : "";
  const book = xml("xl/workbook.xml"); if (!book || !xml("[Content_Types].xml")) throw new Error("Arquivo XLSM/XLSX inválido.");
  const date1904 = /<workbookPr\b[^>]*date1904="(?:1|true)"/.test(book);
  const relationships = new Map([...xml("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b([^>]*?)\/?\s*>/g)].map((m) => [attr(m[1], "Id"), attr(m[1], "Target")]));
  const sheets = new Map([...book.matchAll(/<sheet\b([^>]*?)\/?\s*>/g)].map((m) => [decode(attr(m[1], "name") || ""), relationships.get(attr(m[1], "r:id"))]));
  for (const required of ["Mercado Base", "HOT40", "Indicadores", "Matriz"]) if (!sheets.get(required)) throw new Error(`Aba obrigatória ausente: ${required}.`);
  const strings = [...xml("xl/sharedStrings.xml").matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((m) => text(m[1]));
  const read = (name: string, first: number, last: number, columns: Set<string>): SourceRow[] => {
    const target = sheets.get(name)!;
    const source = xml(target!.startsWith("/") ? target!.slice(1) : zipPath(`xl/${target}`));
    if (!source) throw new Error(`Não foi possível ler a aba ${name}.`);
    const result: SourceRow[] = [];
    for (const match of source.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const row = Number(attr(match[1], "r")); if (row < first || row > last) continue;
      const cells: Record<string, RawCell> = {};
      for (const cell of match[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const column = /^[A-Z]+/.exec(attr(cell[1], "r") || "")?.[0]; if (!column || !columns.has(column)) continue;
        const body = cell[2] || ""; const formula = /<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/.exec(body)?.[1]; const cached = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(body)?.[1];
        const type = attr(cell[1], "t"); const value = type === "inlineStr" ? text(body) : type === "s" ? (strings[Number(cached)] ?? "") : decode(cached || "");
        cells[column] = { value, kind: formula !== undefined ? "formula" : type === "e" ? "error" : type === "n" || (!type && cached !== undefined) ? "number" : "text", formula: formula ? decode(formula) : undefined, cached: formula !== undefined ? value : undefined, style: Number(attr(cell[1], "s") || 0) };
      }
      result.push({ sheet: name, row, cells });
    }
    return result;
  };
  const market = read("Mercado Base", 6, 1000, new Set("BCDEFGHIJKLMNO".split("")));
  const headers = { B: "Nome", D: "Fontes de Prospecção", M: "Virou HOT40?", N: "Data de origem" };
  const header = market.find((r) => r.row === 6);
  for (const [col, name] of Object.entries(headers)) if (!header?.cells[col]?.value.replace(/\s+/g, " ").includes(name)) throw new Error(`Estrutura desconhecida em Mercado Base!${col}6.`);
  const rows = market.filter((r) => r.row > 6 && Object.entries(r.cells).some(([col, c]) => col !== "O" && c.value && c.kind !== "formula"));
  const indicator = read("Indicadores", 14, 20, new Set("BDEFGH".split("")));
  const benchmark: ParsedImport["benchmark"] = {};
  for (const row of indicator) {
    const values = "DEFGH".split("").map((c) => Number(row.cells[c]?.value));
    if (row.cells.B?.value && values.every((v, i) => Number.isSafeInteger(v) && v >= 0 && row.cells["DEFGH"[i]]?.kind === "number")) benchmark[row.cells.B.value] = values as [number, number, number, number, number];
  }
  const hot = read("HOT40", 8, 8, new Set(["B"]));
  return { rows, benchmark, date1904, warnings: ["Histórico da aba HOT40 bloqueado: linhas e datas não têm Contact verificável.", ...(hot[0]?.cells.B?.cached === "#VALUE!" ? ["HOT40!B8 possui cache #VALUE!."] : [])] };
}
