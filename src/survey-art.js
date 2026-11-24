import { artUrl } from './art-url.js?v=5.0.0';
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
  return `<image href="${artUrl('rover')}" x="-19" y="-27" width="38" height="35" preserveAspectRatio="xMidYMax meet"/>`;
}

export function surveyLandscape(key) {
  return `<img class="survey-landscape" src="${artUrl('site-' + key)}" alt="">`;
}
