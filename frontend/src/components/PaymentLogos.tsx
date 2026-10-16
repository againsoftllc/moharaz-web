import Image from "next/image";

/* [file, alt, intrinsic width at 96px height] — logos live in /public/payments */
const LOGOS: [string, string, number][] = [
  ["bkash", "bKash", 151],
  ["nagad", "Nagad", 220],
  ["rocket", "Rocket", 152],
  ["visa", "VISA", 296],
  ["mastercard", "Mastercard", 155],
  ["amex", "American Express", 96],
  ["dbbl", "DBBL Nexus", 157],
];

export default function PaymentLogos() {
  return (
    <div className="pays">
      {LOGOS.map(([f, alt, w]) => (
        <i key={f} title={alt}><Image src={`/payments/${f}.png`} alt={alt} width={w} height={96} /></i>
      ))}
    </div>
  );
}
