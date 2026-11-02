import { useId } from "react";
import type { GameId } from "./game-catalog";

// Each cover is original vector artwork layered over the shared anime scenery.
// Numbers and marks are illustrative; all controls and game text remain HTML.
export function GameCover({ game }: { game: GameId }) {
  const uid = "cover" + useId().replace(/[^a-zA-Z0-9]/g, ""),
    metal = `url(#${uid}metal)`,
    glass = `url(#${uid}glass)`,
    lime = `url(#${uid}lime)`;
  const crystal = (x: number, y: number, colour: string, key: number) => (
    <g key={key} transform={`translate(${x} ${y})`}>
      <path
        d="M0 -49L31 -25 25 20 0 49 -25 20 -31 -25Z"
        fill={colour}
        stroke="#e6f0ff"
        strokeOpacity=".4"
        strokeWidth="2"
      />
      <path
        d="M0 -49L-13 -19 0 27 13 -19ZM-31 -25L-13 -19M31 -25L13 -19M0 27V49"
        fill="#ffffff22"
        stroke="#18283b88"
        strokeWidth="2"
      />
    </g>
  );
  return (
    <svg
      className={`game-cover cover-${game}`}
      viewBox="0 0 600 340"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}metal`} x1="0" y1="0" x2=".9" y2="1">
          <stop stopColor="#eff3f3" />
          <stop offset=".2" stopColor="#9aaec3" />
          <stop offset=".5" stopColor="#33455b" />
          <stop offset=".8" stopColor="#192637" />
          <stop offset="1" stopColor="#8194a9" />
        </linearGradient>
        <linearGradient id={`${uid}glass`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#71839e" stopOpacity=".8" />
          <stop offset=".5" stopColor="#182738" stopOpacity=".95" />
          <stop offset="1" stopColor="#0a111d" />
        </linearGradient>
        <linearGradient id={`${uid}lime`} x1="0" y1="0" x2=".7" y2="1">
          <stop stopColor="#efffc5" />
          <stop offset="1" stopColor="#a7d865" />
        </linearGradient>
        <radialGradient id={`${uid}orb`} cx=".3" cy=".25">
          <stop stopColor="#acbdce" />
          <stop offset=".3" stopColor="#425b74" />
          <stop offset=".7" stopColor="#1d2c3f" />
          <stop offset="1" stopColor="#080f19" />
        </radialGradient>
        <filter
          id={`${uid}shadow`}
          x="-40%"
          y="-40%"
          width="180%"
          height="200%"
        >
          <feDropShadow
            dx="0"
            dy="14"
            stdDeviation="12"
            floodColor="#02060d"
            floodOpacity=".8"
          />
        </filter>
      </defs>
      <ellipse cx="325" cy="274" rx="170" ry="24" fill="#050b15" opacity=".7" />
      <g className="cover-object" filter={`url(#${uid}shadow)`}>
        {game === "number" && (
          <g transform="translate(315 156) rotate(-8)">
            <rect
              x="-160"
              y="-91"
              width="320"
              height="175"
              rx="16"
              fill={metal}
            />
            <rect
              x="-150"
              y="-81"
              width="300"
              height="155"
              rx="10"
              fill="#111c2b"
              stroke="#8397af"
            />
            {["3", "9", "0"].map((n, i) => (
              <g key={n} transform={`translate(${-135 + i * 93} -65)`}>
                <rect
                  width="84"
                  height="125"
                  rx="8"
                  fill={i === 1 ? "#293d34" : glass}
                  stroke={i === 1 ? "#c8f36b" : "#60738e"}
                />
                <path d="M8 62H76" stroke="#091320" strokeWidth="2" />
                <text
                  x="42"
                  y="92"
                  textAnchor="middle"
                  fill={i === 1 ? "#d9f9a3" : "#e9eff8"}
                  fontSize="82"
                  fontFamily="monospace"
                >
                  {n}
                </text>
              </g>
            ))}
            <path
              d="M-116 -108l16 -14 16 14M85 101l16 14 16 -14"
              fill="none"
              stroke="#d8f6ab"
              strokeWidth="4"
            />
          </g>
        )}
        {game === "timer" && (
          <g transform="translate(320 165) rotate(13)">
            <rect x="-17" y="-121" width="34" height="26" rx="5" fill={metal} />
            <path
              d="M-28 -124H28"
              stroke="#c4d0de"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path d="M73 -83l20 -16" stroke="#94a8bf" strokeWidth="15" />
            <circle r="100" fill={metal} />
            <circle r="87" fill="#111e2e" stroke="#b6c6d8" strokeWidth="2" />
            {Array.from({ length: 24 }, (_, i) => (
              <path
                key={i}
                d={`M0 -${i % 6 === 0 ? 65 : 72}V-79`}
                transform={`rotate(${i * 15})`}
                stroke={i % 6 === 0 ? "#d5f1a2" : "#8092aa"}
                strokeWidth={i % 6 === 0 ? 4 : 2}
              />
            ))}
            <path
              d="M0 15V-59M0 0L38 20"
              stroke="#d7f4a8"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle r="8" fill="#dff6b9" />
            <rect x="-39" y="30" width="78" height="23" rx="4" fill="#273a31" />
            <text
              x="0"
              y="47"
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="15"
              fill="#deefc1"
            >
              10.000
            </text>
          </g>
        )}
        {game === "answer" && (
          <g>
            <g transform="translate(140 70) rotate(-9 110 80)">
              <path
                d="M0 18Q0 0 18 0H210Q228 0 228 18V123Q228 140 210 140H68L25 175V140H18Q0 140 0 123Z"
                fill={glass}
                stroke="#8ea5be"
                strokeWidth="3"
              />
              <path
                d="M38 35H173M38 54H150"
                stroke="#a8bacf"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path d="M113 73l21 24-21 24-21-24z" fill="#d8efac" />
            </g>
            <g transform="translate(291 121) rotate(8 100 70)">
              <path
                d="M0 16Q0 0 16 0H186Q202 0 202 16V108Q202 124 186 124H160L184 157 124 124H16Q0 124 0 108Z"
                fill="#26392f"
                stroke="#cbe6a4"
                strokeWidth="3"
              />
              <path
                d="M34 30H161M34 48H136"
                stroke="#c2d9a3"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path d="M102 65l18 20-18 21-18-21z" fill={lime} />
            </g>
          </g>
        )}
        {game === "imposter" && (
          <g>
            {[-1, 0, 1].map((n, i) => (
              <g
                key={n}
                transform={`translate(${315 + n * 104} ${153 + Math.abs(n) * 13}) rotate(${n * 13})`}
              >
                <rect
                  x="-59"
                  y="-91"
                  width="118"
                  height="186"
                  rx="12"
                  fill={n === 0 ? "#342a3c" : glass}
                  stroke={n === 0 ? "#e8b5c9" : "#8296ae"}
                  strokeWidth="3"
                />
                <circle
                  cy="-24"
                  r="27"
                  fill={n === 0 ? "#a386a7" : "#a8bacd"}
                />
                <path
                  d="M-41 54c0-49 82-49 82 0"
                  fill={n === 0 ? "#6e526e" : "#546c83"}
                />
                {n === 0 && <path d="M-37 -30H37V-13H-37Z" fill="#171a29" />}
                <path
                  d="M-29 73H29"
                  stroke={n === 0 ? "#f0b8cd" : "#c5d5e7"}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </g>
        )}
        {game === "chess" && (
          <g>
            <g transform="translate(135 210) rotate(-8)">
              {Array.from({ length: 16 }, (_, i) => (
                <rect
                  key={i}
                  x={(i % 4) * 82}
                  y={Math.floor(i / 4) * 16}
                  width="82"
                  height="18"
                  fill={(i + Math.floor(i / 4)) % 2 ? "#8298ac" : "#243449"}
                />
              ))}
              <path d="M0 67H328V80H0Z" fill="#101c2a" stroke="#8294ac" />
            </g>
            <g transform="translate(274 153)">
              <path
                d="M-11 -111H11V-94H29V-75H11V-57H-11V-75H-29V-94H-11Z"
                fill="#e9eedf"
              />
              <path
                d="M-42 -34c0-40 84-40 84 0l-24 43 23 52H-41l23-52Z"
                fill="#e9eedf"
                stroke="#6a7c8e"
                strokeWidth="3"
              />
              <path d="M-46 60H46l13 22H-59Z" fill={metal} />
            </g>
            <g transform="translate(403 177)">
              <path
                d="M-39 61l9-47-28-6 18-39L12-75l8 24c38 14 42 55 27 112Z"
                fill="#233749"
                stroke="#abc3d5"
                strokeWidth="3"
              />
              <circle cx="-1" cy="-25" r="4" fill="#d6f4a5" />
              <path d="M-44 62H48l10 17H-55Z" fill={metal} />
            </g>
          </g>
        )}
        {game === "prism" && (
          <g>
            <path
              d="M120 224L330 174 521 226 314 285Z"
              fill={glass}
              stroke="#8394ac"
              strokeWidth="2"
            />
            {["#88caff", "#8fe1b8", "#ffa7b9", "#f2e398"].map((c, i) =>
              crystal(181 + i * 88, 155 + (i % 2 ? -13 : 10), c, i),
            )}
            <path
              d="M144 247l173 23 169-29"
              stroke="#d3e9b1"
              opacity=".6"
              fill="none"
              strokeWidth="2"
            />
          </g>
        )}
        {game === "poison" && (
          <g transform="translate(320 166) rotate(-8)">
            <rect
              x="-184"
              y="-90"
              width="368"
              height="187"
              rx="20"
              fill={metal}
            />
            <rect
              x="-174"
              y="-80"
              width="348"
              height="167"
              rx="14"
              fill="#152233"
            />
            {Array.from({ length: 10 }, (_, i) => {
              const x = -137 + (i % 5) * 69,
                y = -40 + Math.floor(i / 5) * 82,
                poison = [1, 4, 7].includes(i);
              return (
                <g key={i} transform={`translate(${x} ${y})`}>
                  <circle
                    r="28"
                    fill={poison ? "#573449" : "#2a354f"}
                    stroke={poison ? "#df9db9" : "#6d7b9f"}
                  />
                  <path
                    d="M14 -16c-18 2-21 24-3 32C-13 28-29 1-12-14c8-7 19-8 26-2Z"
                    fill={poison ? "#e8adc7" : "#c2b8e5"}
                  />
                </g>
              );
            })}
          </g>
        )}
        {game === "memory" && (
          <g>
            <g transform="translate(145 67) rotate(-5 160 90)">
              <rect
                width="336"
                height="183"
                rx="15"
                fill={glass}
                stroke="#8aa5bf"
                strokeWidth="3"
              />
              {["#88caff", "#f2e398", "#ffa7b9", "#8fe1b8"].map((c, i) => (
                <g key={c}>
                  <rect
                    x={15 + i * 80}
                    y="16"
                    width="66"
                    height="118"
                    rx="7"
                    fill="#17283a"
                    stroke="#65809a"
                  />
                  {crystal(48 + i * 80, 76, c, i)}
                  <text
                    x={48 + i * 80}
                    y="161"
                    textAnchor="middle"
                    fontFamily="monospace"
                    fontSize="18"
                    fill="#d8e8f6"
                  >
                    {i + 1}
                  </text>
                </g>
              ))}
            </g>
            <circle
              cx="454"
              cy="243"
              r="37"
              fill="#24392e"
              stroke="#d4edae"
              strokeWidth="3"
            />
            <path
              d="M454 216v27l17 10"
              stroke="#d4edae"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M107 198c-22-62 0-127 46-156"
              stroke="#b2cda1"
              strokeDasharray="7 7"
              fill="none"
              strokeWidth="2"
            />
          </g>
        )}
        {game === "fuse" && (
          <g transform="translate(323 176) rotate(-13)">
            <path
              d="M12 -87c30-76 70-25 83-79"
              stroke="#9db78a"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M95 -186v15M111 -176l-11 11M75 -175l13 9M110 -149l-13-7"
              stroke="#e2fbb6"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <rect x="-21" y="-106" width="46" height="31" rx="5" fill={metal} />
            <circle
              r="91"
              fill={`url(#${uid}orb)`}
              stroke="#7d91a8"
              strokeWidth="2"
            />
            <ellipse
              cx="-24"
              cy="-34"
              rx="28"
              ry="18"
              fill="#e3f4ff"
              opacity=".13"
              transform="rotate(-25)"
            />
            <path d="M-25 37H28" stroke="#b9ce9b" strokeWidth="4" />
            <circle
              r="104"
              fill="none"
              stroke="#b4d18e"
              opacity=".7"
              strokeWidth="2"
              strokeDasharray="220 440"
              transform="rotate(-55)"
            />
          </g>
        )}
      </g>
    </svg>
  );
}
