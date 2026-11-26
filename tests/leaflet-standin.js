// tiny Leaflet stand-in for tests: renders markers into the map div so they can be counted
(function(){
function layer(o){return Object.assign({addTo(m){this._m=m;(m._c||m).appendChild?.(this._el());return this},bindTooltip(){return this},bindPopup(){return this},on(){return this},setLatLngs(p){this.pts=p;return this},setLatLng(){return this},setStyle(){return this},remove(){this._e?.remove()},_el(){return this._e||(this._e=document.createElement('div'))}},o)}
window.L={map(el,o){const c=typeof el==='string'?document.getElementById(el):el;const m={_c:c,setView(){return m},fitBounds(){m.fitted=true;return m},invalidateSize(){},closePopup(){},removeLayer(l){l.remove?.()},on(){return m},addLayer(l){l.addTo(m)}};window.__map=m;return m},
 tileLayer(){return layer({})},layerGroup(){const g=layer({clearLayers(){this._el().innerHTML=''}});g._c=g._el();return g},
 polyline(p){return layer({pts:p})},circleMarker(){return layer({})},
 marker(ll,o){const l=layer({});if(o?.icon?.html){l._el().innerHTML=o.icon.html}return l},
 divIcon(o){return o},latLngBounds(p){return p},
 DomUtil:{create(t,c){const d=document.createElement(t);d.className=c||'';return d}},DomEvent:{disableClickPropagation(){}},
 Control:{extend(proto){return function(o){this.options=o;this.addTo=m=>{this._c=proto.onAdd.call(this,m);m._c.appendChild(this._c);return this};this.getContainer=()=>this._c}}}};
})();
