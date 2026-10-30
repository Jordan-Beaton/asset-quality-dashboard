// Builds the A4 Speak Up poster in the browser: drawn at 300 dpi on a canvas,
// with the QR code drawn as crisp squares, then placed on a PDF page.

const WIDTH = 2480;
const HEIGHT = 3508;
const MARGIN = 170;
const FONT = '"Azo Sans", "Segoe UI", Arial, Helvetica, sans-serif';

const BRAND = "#005670";
const ACCENT = "#63B1BC";
const SOFT = "#ECECE7";
const BORDER = "#D0D0CE";
const MUTED = "#53565A";
const INK = "#000000";
const WHITE = "#FFFFFF";
const WARNING = "#FFAD00";

type Context = CanvasRenderingContext2D;
type QrCode = { modules: { size: number; get: (row: number, column: number) => unknown } };

function wrap(context: Context, value: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    const attempt = line ? `${line} ${word}` : word;
    if (line && context.measureText(attempt).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = attempt;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundedRect(context: Context, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

// Draws wrapped text and returns the y position of the line after it.
function paragraph(context: Context, value: string, x: number, y: number, maxWidth: number, size: number, weight: "400" | "700", colour: string, lineHeight = 1.35) {
  context.font = `${weight} ${size}px ${FONT}`;
  context.fillStyle = colour;
  context.textAlign = "left";
  for (const line of wrap(context, value, maxWidth)) {
    context.fillText(line, x, y);
    y += size * lineHeight;
  }
  return y;
}

// The whole poster. It only needs a canvas context, the logo, the QR code and the address, so it can be drawn (and
// checked) anywhere a canvas exists.
export function drawSpeakUpPoster(context: Context, logo: { width: number; height: number }, qr: QrCode, address: string) {
  const textWidth = WIDTH - MARGIN * 2;
  context.textBaseline = "alphabetic";
  context.fillStyle = WHITE;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // header band: the logo, then the name with clear space beneath it so the descender of the "p" never meets the line below
  const bandHeight = 800;
  context.fillStyle = BRAND;
  context.fillRect(0, 0, WIDTH, bandHeight);
  context.fillStyle = ACCENT;
  context.fillRect(0, bandHeight, WIDTH, 24);
  const logoHeight = 210;
  context.drawImage(logo as unknown as CanvasImageSource, MARGIN - 40, 80, logoHeight * (logo.width / logo.height), logoHeight);
  context.textAlign = "left";
  context.fillStyle = WHITE;
  context.font = `700 340px ${FONT}`;
  context.fillText("Speak Up", MARGIN - 8, 570);
  context.fillStyle = SOFT;
  context.font = `400 100px ${FONT}`;
  context.fillText("Raise a concern in confidence", MARGIN, 720);

  // introduction
  let y = 990;
  context.font = `700 96px ${FONT}`;
  context.fillStyle = BRAND;
  context.fillText("See something that is not right?", MARGIN, y);
  y = paragraph(context, "Raise a safety, quality, environmental, legal or integrity concern. You choose whether to give your name. Your report is locked on your phone before it is sent, so only the people who handle reports can read it.", MARGIN, y + 105, textWidth, 66, "400", INK, 1.32);

  // QR code, as large as the page allows, with the call to action directly under it
  const modules = qr.modules.size;
  const unit = Math.floor(1130 / modules);
  const drawn = unit * modules;
  const padding = 100;
  const boxSize = drawn + padding * 2;
  const boxX = (WIDTH - boxSize) / 2;
  const boxY = y + 70;
  context.fillStyle = WHITE;
  context.strokeStyle = BRAND;
  context.lineWidth = 14;
  roundedRect(context, boxX, boxY, boxSize, boxSize, 44);
  context.fill();
  context.stroke();
  context.fillStyle = INK;
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (qr.modules.get(row, column)) context.fillRect(boxX + padding + column * unit, boxY + padding + row * unit, unit, unit);
    }
  }

  y = boxY + boxSize + 115;
  context.textAlign = "center";
  context.fillStyle = BRAND;
  context.font = `700 84px ${FONT}`;
  context.fillText("Scan with your phone camera", WIDTH / 2, y);
  // the address, shrunk to fit if it is long
  let addressSize = 60;
  context.font = `400 ${addressSize}px ${FONT}`;
  while (context.measureText(address).width > textWidth && addressSize > 30) {
    addressSize -= 2;
    context.font = `400 ${addressSize}px ${FONT}`;
  }
  context.fillStyle = MUTED;
  context.fillText(address, WIDTH / 2, y + 86);
  context.textAlign = "left";

  // other routes and safety
  const noteTop = y + 190;
  const noteText = "Other ways to raise a concern: your manager, HR, or the HSE and Quality team. For extra privacy, use mobile data, not company Wi-Fi. If anyone is in danger now, stop work and call 999.";
  context.font = `400 54px ${FONT}`;
  const noteLines = wrap(context, noteText, textWidth - 120);
  const noteHeight = noteLines.length * 54 * 1.38 + 70;
  context.strokeStyle = WARNING;
  context.lineWidth = 10;
  roundedRect(context, MARGIN, noteTop, textWidth, noteHeight, 28);
  context.stroke();
  paragraph(context, noteText, MARGIN + 60, noteTop + 88, textWidth - 120, 54, "400", INK, 1.38);

  return noteTop + noteHeight;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The logo could not be loaded."));
    image.src = source;
  });
}

export async function downloadSpeakUpPoster(address: string) {
  const [{ default: QRCode }, { jsPDF }, logo] = await Promise.all([
    import("qrcode"),
    import("jspdf"),
    loadImage("/enshore-primary-logo-reverse.png"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw the poster.");

  const bottom = drawSpeakUpPoster(context, logo, QRCode.create(address, { errorCorrectionLevel: "M" }), address);
  if (bottom > HEIGHT - 70) throw new Error("The poster text does not fit the page. Use a shorter address.");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
  pdf.save("Enshore-Speak-Up-poster.pdf");
}
