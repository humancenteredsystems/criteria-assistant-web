// Represents a text item extracted from a PDF page, including its content and positional data.
export interface TextItem {
  str: string;    // actual text content
  x: number;      // x-coordinate on the page
  y: number;      // y-coordinate on the page
  width: number;  // width of the text item
  height: number; // height of the text item
}
