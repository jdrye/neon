import { RESOURCES, affordable, has } from './engine.js?v=4.2.0';
import { SURVEYS, surveyProgress } from './survey.js?v=4.2.0';
import { specimenMark, surveyLandscape } from './survey-art.js?v=4.2.0';

function manifest(resources) {
  return Object.entries(resources).map(([key, amount]) => {
    const resource = RESOURCES[key];
    return `<span class="manifest-item"><b style="color:${resource.color}" aria-hidden="true">${resource.icon}</b> ${resource.name} ×${amount}</span>`;
  }).join('');
}

function expeditionControls(state, key) {
  const { active, completed } = state.survey;
  if (completed.includes(key)) {
    if (completed.length === Object.keys(SURVEYS).length && !has(state, 'observatory')) {
      return '<p>Collection complète. Les plans de l’observatoire des aurores sont disponibles.</p><button class="primary" data-survey-project="observatory">Construire l’observatoire</button>';
    }
    return '';
  }
  if (active?.site === key) {
    return '<div class="rover-progress"><span id="rover-phase"></span><progress id="rover-progress" max="1" value="0" aria-label="Trajet aller-retour du rover"></progress></div><button class="primary" id="survey-claim">Récupérer le spécimen</button>';
  }
  if (active) {
    return `<p>Le rover est en mission sur le site « ${SURVEYS[active.site].name} ».</p><button data-survey-select="${active.site}">Suivre la mission en cours</button>`;
  }
  if (!has(state, 'hangar')) {
    return '<p>Construisez le hangar pour préparer le premier départ.</p><button class="primary" data-survey-project="hangar">Construire le hangar</button>';
  }
  return '<p id="provisions-needed"></p><button class="primary" id="survey-start">Envoyer le rover</button>';
}

export function surveyPanel(state, key) {
  const survey = SURVEYS[key], { completed, active } = state.survey;
  const done = completed.includes(key);
  const choices = Object.entries(SURVEYS).map(([id, site]) => {
    const status = completed.includes(id) ? ' · spécimen rapporté' : active?.site === id ? ' · mission en cours' : '';
    return `<button data-survey-select="${id}" aria-pressed="${id === key}" aria-label="${site.name}${status}" style="--site-color:${site.color}">
      <svg viewBox="-15 -15 30 30" aria-hidden="true">${specimenMark(id)}</svg>
      <span>${site.name}${completed.includes(id) ? ' ✓' : ''}</span></button>`;
  }).join('');
  return `<div class="survey-panel" data-site="${key}" style="--site-color:${survey.color}">
    <h2>Carnet d’exploration</h2>
    <p class="survey-count">${completed.length} / ${Object.keys(SURVEYS).length} spécimens rapportés</p>
    <nav class="survey-choices" aria-label="Sites d’exploration">${choices}</nav>
    <div class="survey-cover">${surveyLandscape(key)}<div><span>${done ? 'Spécimen rapporté' : 'Spécimen recherché'}</span><h3>${survey.specimen}</h3></div></div>
    <p class="field-note">${done ? survey.report : survey.brief}</p>
    <div class="survey-manifest">
      ${done ? '' : `<div><h4>Provisions pour ${survey.duration / 1000} s</h4>${manifest(survey.cost)}</div>`}
      <div><h4>${done ? 'Matériaux rapportés' : 'Cargaison au retour'}</h4>${manifest(survey.reward)}</div>
    </div>
    <div class="survey-actions">${expeditionControls(state, key)}<button id="survey-locate">Voir le site sur la carte</button></div>
  </div>`;
}

export function updateSurveyPanel(panel, state, now) {
  const key = panel.dataset.site, survey = SURVEYS[key];
  const start = panel.querySelector('#survey-start');
  if (start) {
    start.disabled = !affordable(state, survey.cost);
    const needed = panel.querySelector('#provisions-needed');
    needed.hidden = !start.disabled;
    needed.textContent = start.disabled ? 'Provisions manquantes : ' + Object.entries(survey.cost)
      .filter(([k, n]) => state.resources[k] < n)
      .map(([k, n]) => `${RESOURCES[k].name} ×${n - state.resources[k]}`).join(' · ') : '';
  }
  const claim = panel.querySelector('#survey-claim');
  if (claim && state.survey.active) {
    const progress = surveyProgress(state.survey.active, now);
    const remaining = Math.ceil((1 - progress) * survey.duration / 1000);
    panel.querySelector('#rover-progress').value = progress;
    panel.querySelector('#rover-phase').textContent = remaining
      ? `${progress < .5 ? 'Vers le site' : 'Retour au camp'} · ${remaining} s avant l’arrivée`
      : 'Rover de retour au camp';
    claim.disabled = progress < 1;
  }
}
