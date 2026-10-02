import colorName from "color-name";

export default function colorStringToHex(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  const rgb = colorName[normalized as keyof typeof colorName];

  if (!rgb) {
    return "#FFFFFF00";
  }

  return `#${rgb
    .map(((channel: number) => channel.toString(16).padStart(2, "0"))).join("")}`;
}