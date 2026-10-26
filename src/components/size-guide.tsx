const ROWS = [
  { size: "XS", chest: 34, waist: 28, hip: 36, length: 40 },
  { size: "S", chest: 36, waist: 30, hip: 38, length: 41 },
  { size: "M", chest: 38, waist: 32, hip: 40, length: 41 },
  { size: "L", chest: 41, waist: 35, hip: 43, length: 42 },
  { size: "XL", chest: 44, waist: 38, hip: 46, length: 42 },
];

export function SizeGuideTable() {
  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-ivory">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Body measurements in inches</caption>
          <thead>
            <tr className="border-b border-line text-left text-[0.7rem] tracking-[0.12em] text-ink/55 uppercase">
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Chest</th>
              <th className="px-4 py-3 font-semibold">Waist</th>
              <th className="px-4 py-3 font-semibold">Hip</th>
              <th className="px-4 py-3 font-semibold">Shirt length</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.size} className="border-b border-line last:border-0">
                <th className="px-4 py-3 text-left font-semibold">{r.size}</th>
                <td className="px-4 py-3">{r.chest}″</td>
                <td className="px-4 py-3">{r.waist}″</td>
                <td className="px-4 py-3">{r.hip}″</td>
                <td className="px-4 py-3">{r.length}″</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink/65">
        Measurements are of your body, in inches. If you’re between sizes, choose the larger one. A tailor can take it in, but there’s rarely enough seam to let it out.
      </p>
    </div>
  );
}
