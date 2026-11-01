const KURTI_ROWS = [
  { size: "M", chest: 38, waist: 36, hip: 42 },
  { size: "L", chest: 40, waist: 38, hip: 44 },
  { size: "XL", chest: 42, waist: 40, hip: 48 },
  { size: "XXL", chest: 44, waist: 42, hip: 50 },
];

const PANT_ROWS = [
  { size: "M", waist: "27.6", hip: "34.6", length: "37.4", inseam: "28.0" },
  { size: "L", waist: "28.3", hip: "36.2", length: "38.6", inseam: "28.3" },
  { size: "XL", waist: "29.1", hip: "37.8", length: "38.6", inseam: "28.3" },
  { size: "XXL", waist: "31.5", hip: "42.5", length: "39.4", inseam: "28.3" },
];

const DENIM_ROWS = [
  { size: "26", waist: 26, hip: 36, inseam: 29 },
  { size: "28", waist: 28, hip: 38, inseam: 29 },
  { size: "30", waist: 30, hip: 40, inseam: 30 },
  { size: "32", waist: 32, hip: 42, inseam: 30 },
  { size: "34", waist: 34, hip: 44, inseam: 30 },
];

export function SizeGuideTable({ kind = "standard" }: { kind?: "standard" | "denim" }) {
  if (kind === "denim") {
    return (
      <div className="overflow-x-auto rounded-2xl border border-line bg-ivory">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Denim measurements in inches</caption>
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] tracking-[0.12em] text-ink/55 uppercase">
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Waist</th>
              <th className="px-4 py-3 font-semibold">Hip</th>
              <th className="px-4 py-3 font-semibold">Inseam</th>
            </tr>
          </thead>
          <tbody>
            {DENIM_ROWS.map((r) => (
              <tr key={r.size} className="border-b border-line last:border-0">
                <th className="px-4 py-3 text-left font-semibold">{r.size}</th>
                <td className="px-4 py-3">{r.waist}″</td>
                <td className="px-4 py-3">{r.hip}″</td>
                <td className="px-4 py-3">{r.inseam}″</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 font-semibold">Kurti</h3>
      <div className="overflow-x-auto rounded-2xl border border-line bg-ivory">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Kurti measurements in inches</caption>
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] tracking-[0.12em] text-ink/55 uppercase">
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Chest</th>
              <th className="px-4 py-3 font-semibold">Waist</th>
              <th className="px-4 py-3 font-semibold">Hip</th>
            </tr>
          </thead>
          <tbody>
            {KURTI_ROWS.map((r) => (
              <tr key={r.size} className="border-b border-line last:border-0">
                <th className="px-4 py-3 text-left font-semibold">{r.size}</th>
                <td className="px-4 py-3">{r.chest}″</td>
                <td className="px-4 py-3">{r.waist}″</td>
                <td className="px-4 py-3">{r.hip}″</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 mb-3 font-semibold">Kurti pant</h3>
      <div className="overflow-x-auto rounded-2xl border border-line bg-ivory">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Kurti pant measurements in inches</caption>
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] tracking-[0.12em] text-ink/55 uppercase">
              <th className="px-3 py-3 font-semibold">Size</th>
              <th className="px-3 py-3 font-semibold">Waist</th>
              <th className="px-3 py-3 font-semibold">Hip</th>
              <th className="px-3 py-3 font-semibold">Full length</th>
              <th className="px-3 py-3 font-semibold">Inseam</th>
            </tr>
          </thead>
          <tbody>
            {PANT_ROWS.map((r) => (
              <tr key={r.size} className="border-b border-line last:border-0">
                <th className="px-3 py-3 text-left font-semibold">{r.size}</th>
                <td className="px-3 py-3">{r.waist}″</td>
                <td className="px-3 py-3">{r.hip}″</td>
                <td className="px-3 py-3">{r.length}″</td>
                <td className="px-3 py-3">{r.inseam}″</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink/65">
        All measurements are in inches. If you’re between sizes, choose the larger one. A tailor can take it in, but there’s rarely enough seam to let it out.
      </p>
    </div>
  );
}
