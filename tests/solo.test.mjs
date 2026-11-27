import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign,tickCampaign} from '../src/campaign.js?v=8.3.0';
import {readCampaign} from '../src/campaign-save.js?v=8.3.0';
import {atlas,buildReason,construct,makeBuilding,ready,unitsOf} from '../src/strategy-engine.js?v=8.3.0';
import {launchRover} from '../src/campaign-rover.js?v=8.3.0';

test('la colonie libre récolte, bâtit et explore au-delà du délai des raids et reprend sans Cendre',()=>{
  for(const size of [27,85]){
    const s=createCampaign(93,'delta','solo',size),normal=createCampaign(93,'delta','even',size);
    for(const [key,n] of Object.entries(normal.teams[0].bank))assert.equal(s.teams[0].bank[key],2*n);
    assert.equal(s.campaign.trade.posts.length,2);
    assert.equal(ready(normal,1,'forum').length,1);
    const site=atlas(s).cells.find(t=>!buildReason(s,0,'hangar',t.cell));
    assert.ok(construct(s,0,[unitsOf(s,0,'worker').at(-1).id],'hangar',site.cell).ok);
    for(let i=0;i<180;i++)tickCampaign(s);
    assert.ok(launchRover(s,'flora').ok);
    const resumed=readCampaign(JSON.stringify(s));assert.ok(resumed);
    const spireSite=atlas(resumed).cells.find(t=>!buildReason(resumed,0,'house',t.cell));
    const monument=makeBuilding(resumed,0,'spire',spireSite.cell,true);
    for(let i=0;i<1800;i++)tickCampaign(resumed);
    assert.equal(monument.hold,0);
    assert.equal(resumed.level,'solo');assert.equal(resumed.result,null);
    assert.equal(resumed.ai.lastRaid,0);assert.equal(resumed.campaign.siege,null);assert.equal(resumed.campaign.peace,null);
    assert.ok(resumed.campaign.deliveries>0);assert.ok(resumed.campaign.specimens.includes('flora'));
    assert.ok(![...resumed.units,...resumed.buildings].some(e=>e.side===1));
    assert.ok(readCampaign(JSON.stringify(resumed)));
    normal.level='solo';assert.equal(readCampaign(JSON.stringify(normal)),null);
  }
});
