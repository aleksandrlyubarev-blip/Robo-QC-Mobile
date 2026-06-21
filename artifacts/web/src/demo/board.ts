import type { BBox2D } from "../api/types";

/** Logical pixel size of the synthetic board image used in demo mode. */
export const BOARD_IMAGE_SIZE: [number, number] = [1280, 960];

export interface BoardSlot {
  componentId: string;
  label: string;
  bbox: BBox2D;
}

/**
 * Fixed component layout on the synthetic board. Detection overlays in demo
 * mode reference these coordinates so the boxes frame real drawn components.
 */
export const BOARD_SLOTS: BoardSlot[] = [
  { componentId: "osfp-cage-1", label: "OSFP Cage A1", bbox: { x: 96, y: 150, width: 300, height: 130 } },
  { componentId: "osfp-cage-2", label: "OSFP Cage A2", bbox: { x: 96, y: 320, width: 300, height: 130 } },
  { componentId: "heatsink-asic", label: "ASIC Heatsink", bbox: { x: 520, y: 210, width: 320, height: 320 } },
  { componentId: "conn-j1", label: "Power Conn J1", bbox: { x: 940, y: 150, width: 200, height: 460 } },
  { componentId: "screw-tl", label: "Mount Screw TL", bbox: { x: 60, y: 60, width: 72, height: 72 } },
  { componentId: "screw-br", label: "Mount Screw BR", bbox: { x: 1150, y: 830, width: 72, height: 72 } },
  { componentId: "press-fit-p3", label: "Press-fit P3", bbox: { x: 540, y: 640, width: 360, height: 90 } },
];

function rect(b: BBox2D, fill: string, extra = ""): string {
  return `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="6" fill="${fill}" ${extra}/>`;
}

/**
 * Build a PCB-looking SVG as a data URL. Deterministic per seed so each demo
 * inspection renders a stable image.
 */
export function boardImageDataUrl(seed = 0): string {
  const [w, h] = BOARD_IMAGE_SIZE;
  const traces: string[] = [];
  for (let i = 0; i < 40; i++) {
    const y = ((i * 53 + seed * 17) % (h - 40)) + 20;
    const x1 = (i * 71 + seed * 11) % (w / 2);
    const x2 = x1 + 200 + ((i * 37) % 400);
    traces.push(
      `<path d="M${x1} ${y} H${x2}" stroke="#1f7a4d" stroke-width="2" opacity="0.5"/>`,
    );
  }
  const pads: string[] = [];
  for (let i = 0; i < 60; i++) {
    const x = (i * 97 + seed * 13) % w;
    const y = (i * 131 + seed * 29) % h;
    pads.push(`<circle cx="${x}" cy="${y}" r="3" fill="#caa46a" opacity="0.6"/>`);
  }

  const components = BOARD_SLOTS.map((s) => {
    const isScrew = s.componentId.startsWith("screw");
    if (isScrew) {
      const cx = s.bbox.x + s.bbox.width / 2;
      const cy = s.bbox.y + s.bbox.height / 2;
      const r = s.bbox.width / 2;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#9aa7b4"/><circle cx="${cx}" cy="${cy}" r="${r * 0.45}" fill="#56616e"/>`;
    }
    if (s.componentId.startsWith("heatsink")) {
      const fins = [];
      for (let f = 0; f < 7; f++) {
        fins.push(
          rect(
            { x: s.bbox.x + 12 + f * ((s.bbox.width - 24) / 7), y: s.bbox.y + 12, width: 22, height: s.bbox.height - 24 },
            "#7d8893",
          ),
        );
      }
      return `${rect(s.bbox, "#5b6670")}${fins.join("")}`;
    }
    if (s.componentId.startsWith("osfp")) {
      return `${rect(s.bbox, "#2b2f36")}${rect({ x: s.bbox.x + 14, y: s.bbox.y + 18, width: s.bbox.width - 28, height: s.bbox.height - 36 }, "#3a3f47")}`;
    }
    if (s.componentId.startsWith("conn")) {
      return `${rect(s.bbox, "#1c2127")}${rect({ x: s.bbox.x + 12, y: s.bbox.y + 12, width: s.bbox.width - 24, height: s.bbox.height - 24 }, "#0f1318")}`;
    }
    // press-fit header: a strip of pins
    const pins = [];
    const cols = 18;
    for (let c = 0; c < cols; c++) {
      pins.push(
        `<circle cx="${s.bbox.x + 18 + c * ((s.bbox.width - 36) / cols)}" cy="${s.bbox.y + s.bbox.height / 2}" r="6" fill="#d8b878"/>`,
      );
    }
    return `${rect(s.bbox, "#23282f")}${pins.join("")}`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#0c3d28"/>
    <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="14" fill="none" stroke="#176b45" stroke-width="3"/>
    ${traces.join("")}
    ${pads.join("")}
    ${components}
    <text x="24" y="${h - 22}" fill="#8fd9b6" font-family="monospace" font-size="22" opacity="0.7">NEURON-VISION · SYNTHETIC AOI FRAME</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
