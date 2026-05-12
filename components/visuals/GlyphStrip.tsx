import React from "react";
import Image from "next/image";

export function GlyphStrip() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-16 overflow-hidden border-y border-border-subtle/70 bg-bg-secondary/85">
      <div
        className="flex h-full w-[200%] items-center opacity-85"
        style={{ animation: "glyph-marquee 32s linear infinite" }}
        aria-hidden="true"
      >
        <Image
          src="/svgs/final-glyph-strip.svg"
          alt=""
          width={1600}
          height={64}
          className="asset-gold-screen h-12 w-1/2 shrink-0 object-cover px-4"
        />
        <Image
          src="/svgs/final-glyph-strip.svg"
          alt=""
          width={1600}
          height={64}
          className="asset-gold-screen h-12 w-1/2 shrink-0 object-cover px-4"
        />
      </div>
    </div>
  );
}
