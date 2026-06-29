// Tiny duration parser: "15m" -> 900000, "7d" -> 604800000, "1h", "30s".
// Falls back to treating a bare number as milliseconds.
const UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

export default function ms(value) {
  if (typeof value === 'number') return value;
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(String(value).trim());
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const n = Number(match[1]);
  const unit = match[2];
  return unit ? n * UNITS[unit] : n;
}
