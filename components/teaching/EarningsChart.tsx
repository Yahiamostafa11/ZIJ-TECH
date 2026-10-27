"use client";

import React, { useState } from "react";

type Point = { label: string; earnings: number; earningsText: string; students: number };

const W = 720;
const H = 250;
const L = 56;
const R = 664;
const T = 24;
const B = 206;

/** Rounds a maximum up to a tidy axis limit (1, 2, 2.5 or 5 × 10ⁿ). */
function niceMax(value: number, minimum: number) {
  const max = Math.max(value, minimum);
  const power = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= max)!;
  return step * power;
}

function smooth(points: [number, number][]) {
  return points.reduce((path, [x, y], index) => {
    if (index === 0) return `M${x},${y}`;
    const [px, py] = points[index - 1];
    const cx = (px + x) / 2;
    return `${path} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
}

/** Monthly earnings (gold, left axis) and students taught (blue, right axis). */
export function EarningsChart({
  points,
  labels,
}: {
  points: Point[];
  labels: { earnings: string; students: string; studentsUnit: string; chart: string };
}) {
  const [active, setActive] = useState(points.length - 1);
  const eMax = niceMax(Math.max(...points.map((point) => point.earnings)), 1000);
  const sMax = niceMax(Math.max(...points.map((point) => point.students)), 10);
  const x = (index: number) => L + ((R - L) * index) / Math.max(points.length - 1, 1);
  const yE = (value: number) => B - ((B - T) * value) / eMax;
  const yS = (value: number) => B - ((B - T) * value) / sMax;

  const earningsPath = smooth(points.map((point, index) => [x(index), yE(point.earnings)]));
  const studentsPath = smooth(points.map((point, index) => [x(index), yS(point.students)]));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const focus = points[active];
  const tipX = Math.min(Math.max(x(active) - 70, L), R - 140);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-2">
          <i className="inline-block h-[3px] w-4 rounded bg-gold-primary" aria-hidden="true" />
          {labels.earnings}
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="inline-block h-[3px] w-4 rounded bg-info" aria-hidden="true" />
          {labels.students}
        </span>
      </div>
      <div className="overflow-x-auto" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.chart} className="block h-auto w-full min-w-[520px]">
          <defs>
            <linearGradient id="earnings-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--gold-primary))" stopOpacity="0.3" />
              <stop offset="1" stopColor="rgb(var(--gold-primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={L} x2={R} y1={B - (B - T) * tick} y2={B - (B - T) * tick} stroke="rgb(var(--gold-primary) / 0.18)" strokeDasharray="3 5" />
              <text x={L - 8} y={B - (B - T) * tick + 4} textAnchor="end" className="fill-text-secondary text-[11px]">
                {eMax * tick >= 1000 ? `${(eMax * tick) / 1000}k` : eMax * tick}
              </text>
              <text x={R + 8} y={B - (B - T) * tick + 4} className="fill-text-secondary text-[11px]">
                {Math.round(sMax * tick)}
              </text>
            </g>
          ))}
          {points.map((point, index) => (
            <text key={point.label} x={x(index)} y={B + 24} textAnchor="middle" className="fill-text-secondary text-[11px]">
              {point.label}
            </text>
          ))}
          <path d={`${earningsPath} L${R},${B} L${L},${B} Z`} fill="url(#earnings-fill)" />
          <path d={earningsPath} fill="none" stroke="rgb(var(--gold-primary))" strokeWidth={3} strokeLinecap="round" />
          <path d={studentsPath} fill="none" stroke="rgb(var(--info))" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={x(active)} x2={x(active)} y1={T} y2={B} stroke="rgb(var(--gold-primary) / 0.35)" />
          {points.map((point, index) => (
            <g key={`p-${point.label}`}>
              <circle cx={x(index)} cy={yE(point.earnings)} r={index === active ? 6 : 4} fill="rgb(var(--gold-primary))" stroke="rgb(var(--bg-card))" strokeWidth={2} />
              <circle cx={x(index)} cy={yS(point.students)} r={3.5} fill="rgb(var(--info))" />
              <rect
                x={x(index) - 40}
                y={T}
                width={80}
                height={B - T}
                fill="transparent"
                tabIndex={0}
                aria-label={`${point.label}: ${point.earningsText}, ${point.students} ${labels.studentsUnit}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                className="cursor-pointer outline-none"
              />
            </g>
          ))}
          <g pointerEvents="none">
            <rect x={tipX} y={T - 18} width={140} height={44} rx={10} fill="rgb(var(--bg-card) / 0.92)" stroke="rgb(var(--gold-primary) / 0.35)" />
            <text x={tipX + 12} y={T} className="fill-text-primary text-[12px] font-bold">
              {focus.earningsText}
            </text>
            <text x={tipX + 12} y={T + 17} className="fill-text-secondary text-[11px]">
              {focus.label} · {focus.students} {labels.studentsUnit}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
