// The same specimen silhouettes identify a destination in the field book and on the map.
const symbols = {
  flora: '<path d="M-7 7Q-12-5 8-9Q12 6-4 7M-8 10 5-5M-3 4-4-1M1 0 5 0"/>',
  strata: '<path d="m-10-2 10-6 10 6L0 4Zm1 5 9 5 9-5M-9 7l9 5 9-5"/>',
  prism: '<path d="m0-11 8 7-2 10-6 5-6-5-2-10Zm0 0L-3-2 0 11 4-3Zm-8 7 5 2 7-1 4-1"/>',
};

export function specimenMark(key) {
  return `<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${symbols[key]}</g>`;
}

export function roverSymbol() {
  return `<g stroke-linejoin="round">
    <ellipse cy="6" rx="15" ry="5" fill="#102c3a" opacity=".45"/>
    <g fill="#213746" stroke="#88a7b3" stroke-width="1.5"><circle cx="-9" cy="4" r="4"/><circle cx="2" cy="8" r="4"/><circle cx="11" cy="3" r="4"/></g>
    <path d="m-14-4 13 6 15-7v7L0 9-14 2Z" fill="#668a95" stroke="#29485c"/>
    <path d="m-14-4 12-6 16 5L0 2Z" fill="#ffe1a4"/><path d="m-6-6 1-7 8 1 4 8-7 3Z" fill="#e8f2e4"/>
    <path d="m0-11 3 .4 3 5-6 2Z" fill="#397082"/><path d="M-9-6v-11" stroke="#e3f1e9" stroke-width="1.5"/>
    <circle cx="-9" cy="-18" r="2" fill="#ffb56e"/><path d="m8 1 4-2" stroke="#b0ffed" stroke-width="2.5"/>
  </g>`;
}

const landscapes = {
  flora: {
    sky: '#143f51', horizon: '#b0cbb0', far: '#557f7d', near: '#376a66', front: '#214f4c', light: '#c9f3be',
    subject: `<g fill="#255954"><path d="m308 124 24-66 23 66Zm41-4 30-87 28 87Zm33 10 27-74 26 74Z"/></g>
      <g fill="#163e3c"><path d="m328 143 30-96 27 96Zm65 3 38-113 35 113Zm54-5 24-68 26 68Z"/></g>
      <g fill="#91c7a4"><path d="m339 101 19-54-8 44Zm70-8 22-60-8 49Z"/></g>
      <path d="M204 150q54-35 98-16t104-7q-38 20-79 12t-83 17Z" fill="#a6cbb5" opacity=".72"/>`,
  },
  strata: {
    sky: '#6c515e', horizon: '#e8b989', far: '#a57570', near: '#925c54', front: '#603e44', light: '#ffe1a2',
    subject: `<path d="m268 131 28-15 17-48 13-4 9-23 49 2 10 20 14 4 9 45 30 19Z" fill="#9e6956"/>
      <path d="m335 41 49 2 10 20-42 5-26-4Z" fill="#e7a777"/><path d="m352 68 42-5 14 4 9 45-60 17Z" fill="#784c4f"/>
      <path d="m310 77 42-2 56-6m-104 25 48-4 58-8m-111 24 53-4 60-10" fill="none" stroke="#deb18a" stroke-width="3" opacity=".65"/>
      <path d="m396 141 26-18 12-40 35-2 9 11 13 39 24 13Z" fill="#ab715a"/><path d="m434 83 35-2 9 11-29 6-19-4Z" fill="#e2a478"/>`,
  },
  prism: {
    sky: '#302e55', horizon: '#baaac4', far: '#776b94', near: '#5d587e', front: '#393951', light: '#ead5ff',
    subject: `<g stroke="#c4b5ed" stroke-linejoin="round">
      <path d="m311 131-12-46 8-23 18 13 12 50-11 13Z" fill="#9482ba"/><path d="m307 62 6 26 13 50-3-55Z" fill="#dcc9f2"/>
      <path d="m339 127 8-63 25-37 14 44-16 57-16 10Z" fill="#a79ace"/><path d="m372 27-10 51-8 60 18-57Z" fill="#ece0ff"/><path d="m372 27 14 44-14 10-10-3Z" fill="#ccbce8"/>
      <path d="m379 136 30-48 25-10-4 29-34 34Z" fill="#9183b6"/><path d="m434 78-19 23-19 40 5-27Z" fill="#d7c1f2"/>
      </g><path d="m379 51 4-8 3 8 8 3-8 3-3 8-4-8-8-3Z" fill="#fff4dd"/>`,
  },
};

export function surveyLandscape(key) {
  const p = landscapes[key];
  return `<svg class="survey-landscape" viewBox="0 0 500 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="survey-sky" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${p.sky}"/><stop offset="1" stop-color="${p.horizon}"/></linearGradient></defs>
    <path fill="url(#survey-sky)" d="M0 0h500v160H0z"/>
    <g fill="${p.light}"><circle cx="272" cy="54" r="17"/><circle cx="297" cy="36" r="5" opacity=".8"/></g>
    <path d="m0 103 61-27 28 9 45-30 51 37 35-12 35 12 59-37 55 21 43-22 88 32v74H0Z" fill="${p.far}"/>
    <path d="m0 111 56-10 46 8 46-21 57 20 72-14 54 20 43-14 64 10 62-9v59H0Z" fill="${p.near}"/>
    <path d="M0 135q85-27 160-12t120-1q63-13 115 1t105-6v43H0Z" fill="${p.front}"/>
    ${p.subject}<path d="M0 151q80-13 140-4t116 3q75-10 127-2t117-8v20H0Z" fill="${p.front}"/>
  </svg>`;
}
