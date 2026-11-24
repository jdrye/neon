// Each workshop has one speciality. Only an assigned team earns its location bonuses.
export const WORKSHOPS = {
  solar: { resource: 'energy', terrain: 'crystal', partners: ['habitat', 'residence'] },
  wind: { resource: 'energy', terrain: 'shore', partners: ['solar'] },
  pump: { resource: 'water', terrain: 'shore', partners: ['greenhouse', 'hydroponics'] },
  greenhouse: { resource: 'bio', terrain: 'water', partners: ['pump'] },
  hydroponics: { resource: 'bio', terrain: 'water', partners: ['pump'] },
  mine: { resource: 'ore', terrain: 'ore', partners: ['solar', 'wind'] },
  quarry: { resource: 'ore', terrain: 'ore', partners: ['mine'] },
  synthesizer: { resource: 'crystal', terrain: 'crystal', partners: ['mine', 'quarry'] },
  observatory: { resource: 'crystal', terrain: 'crystal', partners: ['laboratory'] },
};
export const TERRAIN_LABELS = { shore: 'Rivage', water: 'Source ou étang', ore: 'Gisement de minerai', crystal: 'Gisement de cristaux' };
const offsets = [[1,0],[-1,0],[0,1],[0,-1]];
const geographies = new WeakMap();
export function worksites(tiles, buildings, decisions, moving = null) {
  let geography = geographies.get(tiles);
  if (!geography) {
    const byId = new Map(tiles.map(t => [t.id, t]));
    geography = new Map(tiles.map(tile => [tile.id, offsets.map(([dx, dy]) => byId.get(`${tile.x + dx},${tile.y + dy}`))]));
    geographies.set(tiles, geography);
  }
  const bySite = new Map(buildings.filter(b => b.id !== moving).map(b => [b.id, b.type]));
  return (type, id) => {
    const workshop = WORKSHOPS[type], around = geography.get(id);
    if (!workshop || !around) return null;
    const terrain = around.some(t => workshop.terrain === 'shore' ? !t || t.terrain === 'water' : t?.node === workshop.terrain || (workshop.terrain === 'water' && t?.terrain === 'water'));
    const partner = around.some(t => t && workshop.partners.includes(bySite.get(t.id)));
    const base = decisions.includes('hearth') ? 2 : 1;
    const landBonus = decisions.includes('ecology') ? 4 : 2;
    return { resource: workshop.resource, terrain, partner, base, landBonus, total: base + Number(terrain) * landBonus + Number(partner) * 2 };
  };
}
