import {artUrl} from './art-url.js?v=6.0.0';

export const picture=(art,cls='')=>`<img class="${cls}" src="${artUrl(art)}" alt="" draggable="false">`;
export function button(act,text,key='',disabled=false,title='') {return `<button type="button" data-rts-act="${act}"${key?` data-key="${key}"`:''}${disabled?' disabled':''}${title?` title="${title}"`:''}>${text}</button>`;}
