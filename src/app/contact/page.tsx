import type { Metadata } from "next";
import { WardrobeMark } from "@/components/brand";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description: "Message almera on Instagram or WhatsApp about colours, sizing or your order.",
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  { href: "https://www.instagram.com/almera.lk/", icon: InstagramIcon, title: "Instagram", detail: "@almera.lk", body: "Send a DM for photos, videos or sizing help." },
  { href: "https://chat.whatsapp.com/G5xidVIQxc3Cw0bEEpnach", icon: WhatsAppIcon, title: "WhatsApp community", detail: "Join the group", body: "Hear about new drops and restocks before anyone else." },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-24 sm:px-8 sm:pt-14">
      <WardrobeMark className="h-16 w-auto text-gold" />
      <h1 className="display mt-6 text-[3.2rem] sm:text-7xl">
        we’d love to <em className="text-sage-deep">hear from you</em>
      </h1>
      <p className="mt-5 max-w-lg leading-relaxed text-ink/70">
        Questions about a colour, your size or an order? We reply Monday to Saturday, 10 am to 8 pm.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {CHANNELS.map(({ href, icon: Icon, title, detail, body }) => (
          <a key={title} href={href} target="_blank" rel="noreferrer" className="group rounded-[1.5rem] bg-ivory p-6 transition hover:bg-ink hover:text-ivory">
            <Icon className="size-7 text-gold" />
            <p className="mt-6 font-semibold">{title}</p>
            <p className="display mt-1 text-3xl">{detail}</p>
            <p className="mt-3 text-sm leading-relaxed opacity-70">{body}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
