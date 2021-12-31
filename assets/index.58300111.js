import{d as b,t as tt,o as m,c as y,F as L,r as j,u as F,n as I,a as E,b as N,e as A,f as M,g as G,w as ot,h as R,i as bt,j as $t,k as yt,l as nt,m as et,p as w,q as Mt,s as wt,v as Ct,x as kt,y as At,z as Bt,A as qt}from"./vendor.b242c844.js";const Pt=function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const r of e)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&s(c)}).observe(document,{childList:!0,subtree:!0});function o(e){const r={};return e.integrity&&(r.integrity=e.integrity),e.referrerpolicy&&(r.referrerPolicy=e.referrerpolicy),e.crossorigin==="use-credentials"?r.credentials="include":e.crossorigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(e){if(e.ep)return;e.ep=!0;const r=o(e);fetch(e.href,r)}};Pt();const St={class:"side"},Et=["onClick"],Rt=b({props:{catalogList:null,current:null},emits:["change"],setup(n,{emit:t}){const s=tt(n).catalogList,e=r=>{t("change",r)};return(r,c)=>(m(),y("div",St,[(m(!0),y(L,null,j(F(s),({label:a,value:u})=>(m(),y("div",{key:u,class:I({"side-content":!0,"side-content-active":n.current===u}),onClick:i=>e(u)},E(a),11,Et))),128))]))}});const Tt={class:"color-wrap"},Lt=A("p",null,"\u8FD9\u4E2A\u662F\u4EC0\u4E48\u5462",-1),Gt=[Lt],Dt=b({setup(n){return N(()=>{}),(t,o)=>(m(),y("div",Tt,Gt))}});class ${constructor(t=[0,0,0],o=1){if(this._rgb=[0,0,0],this._alpha=0,Array.isArray(t))this._rgb=t;else{const s=t.match(/^#/g)?t.slice(1):t,e=[],r=s.length>=6?s.match(/.{2}/g):s.split("");r==null||r.forEach((c,a)=>{const u=parseInt(s.length>=6?c:c+c,16);a<3?e.push(u):this._alpha=u/255}),this._rgb=e}this._alpha=this._alpha||(typeof o=="number"?o:1)}rgb(){return this._rgb}rgba(){const{0:t,1:o,2:s}=this.rgb();return{r:t,g:o,b:s,a:this.alpha()}}alpha(){return this._alpha}toRGB(){return this.toHex(this._rgb)}toRGBA(){return this.toHex(this._rgb.concat([this._alpha*255]))}toHex(t=this._rgb){const o=[];return t.forEach(s=>{const e=Math.min(Math.max(Math.round(s),0),255);o.push(e.toString(16).padStart(2,"0"))}),`#${o.join("").toLowerCase()}`}toHSL(){const{0:t,1:o,2:s}=this._rgb,e=Math.max(t,o,s),r=Math.min(t,o,s),c=(e+r)/2/255,a=e-r;let u=0,i=0;if(e===r)i=0,u=0;else switch(u=c>.5?a/(2*255-e-r):a/(e+r),e){case t:i=(o-s)/a*60;break;case o:i=(s-t)/a*60+120;break;case s:i=(t-o)/a*60+240;break}return i<0&&(i+=360),{h:Math.round(i),s:u,l:Math.ceil(c*1e3)/1e3,a:this._alpha}}toHSV(){const{0:t,1:o,2:s}=this._rgb,e=Math.max(t,o,s),r=Math.min(t,o,s),c=Math.ceil(e/255*1e3)/1e3,a=e-r,u=e===0?0:a/e;let i=0;if(e===r)i=0;else switch(e){case t:i=(o-s)/a*60;break;case o:i=(s-t)/a*60+120;break;case s:i=(t-o)/a*60+240;break}return i<0&&(i+=360),{h:Math.round(i),s:u,v:c,a:this._alpha}}toCMYK(){const{0:t,1:o,2:s}=this._rgb,e=Math.max(t,o,s)/255;if(e===0)return{c:0,m:0,y:0,k:1};const r=1-e,c=(e-t/255)/e,a=(e-o/255)/e,u=(e-s/255)/e;return{c,m:a,y:u,k:r}}}const Ht={class:"color-detail"},Wt={class:"color-detail-table"},jt={class:"color-detail-title"},It={class:"color-detail-code"},Nt=b({props:{color:null},setup(n){const o=tt(n).color,s=M(()=>o.value.toHex().toUpperCase()),e=M(()=>o.value.rgb().join(", ")),r=M(()=>{const _=[];return o.value.rgb().forEach(l=>{const p=Math.round(l*100/255);_.push(`${p}%`)}),_.join(", ")}),c=M(()=>{const{h:_,s:l,l:p}=o.value.toHSL();return[_,`${l*100}%`,`${p*100}`].join(", ")}),a=M(()=>{const{h:_,s:l,v:p}=o.value.toHSV();return[`${_}\xB0`,`${l*100}`,`${p*100}`].join(", ")}),u=M(()=>{const{c:_,m:l,y:p,k:f}=o.value.toCMYK();return`${_*100}, ${l*100}, ${p*100}, ${f}`}),i=M(()=>[{label:"Hex triplet",code:s.value},{label:"RGB Decimal",code:`rgb(${e.value})`},{label:"RGB Percent",code:`rgb(${r.value})`},{label:"CMYK",code:u.value},{label:"HSL",code:`hsl(${c.value})`},{label:"HSV(or HSB)",code:a.value}]);return(_,l)=>(m(),y("div",Ht,[A("table",Wt,[A("tbody",null,[(m(!0),y(L,null,j(F(i),({label:p,code:f},v)=>(m(),y("tr",{key:v},[A("th",jt,E(p),1),A("td",It,[A("code",null,E(f),1)])]))),128))])])]))}});const Ot={class:"color-list"},Ut={class:"color-list-wrap"},Vt=["onClick"],Yt=b({props:{colors:null,color:null},setup(n){const t=n,o=G(t.color),s=e=>{o.value=e};return ot(()=>t.color,e=>{o.value=e},{deep:!0}),(e,r)=>(m(),y("div",Ot,[R(Nt,{color:o.value},null,8,["color"]),A("div",Ut,[(m(!0),y(L,null,j(n.colors,(c,a)=>(m(),y("div",{key:a,class:I({"color-cell":!0,"color-cell-active":n.color.toHex()===c.toHex()}),style:bt({backgroundColor:c.toRGB()}),onClick:u=>s(c)},E(c.toRGB().toUpperCase()),15,Vt))),128))])]))}}),Kt=(n,t,o)=>{const e=`image/${["jpeg","jpg"].includes(t)?"jpeg":"png"}`,r=n.toDataURL(e),c=document.createElement("a");c.setAttribute("download",o),c.setAttribute("href",r),c.setAttribute("target","_blank"),c.click()};const zt=b({props:{label:{type:String,default:"\u63D0\u4EA4"},disabled:{type:Boolean,default:!1}},setup(n){return(t,o)=>(m(),y("button",{class:I(["color-button",{disabled:n.disabled}])},[$t(t.$slots,"default",{},()=>[yt(E(n.label),1)])],2))}});const Jt={class:"base-canvas"},C=b({props:{beforeConvert:{type:Function,default:()=>{}},convert:{type:Function,default:()=>{}},afterConvert:{type:Function,default:()=>{}},colors:{type:Array,default:()=>[]}},setup(n){const t=n;nt(f=>({"2c62de1a":a}));const o=G(null),{width:s,height:e}=et("rank");let r=document.createElement("canvas");const c=390,a=`${c}px`,u=G(new $),i=()=>{r=o.value,r.width=s-c,r.height=e;const f=r.getContext("2d");t.beforeConvert(f),t.convert(f),t.afterConvert(f)},_=f=>{const v=W=>W.toString(16).padStart(2,"0"),{0:k,1:B,2:S,3:P}=f.data;return`#${v(k)}${v(B)}${v(S)}${v(P)}`.toUpperCase()},l=f=>{const{offsetX:v,offsetY:k}=f;if(v<0||k<0)return;const S=r.getContext("2d").getImageData(v,k,1,1),P=_(S);u.value=new $(P),navigator.clipboard.writeText(P)},p=()=>{Kt(r,"png","nannn")};return N(()=>{i()}),(f,v)=>(m(),y("div",Jt,[A("canvas",{class:"base-canvas-center",ref_key:"canvasRef",ref:o,onClick:l},null,512),R(Yt,{colors:n.colors,color:u.value},null,8,["colors","color"]),R(F(zt),{class:"download",u:"primary",label:"\u4E0B\u8F7D",onClick:p})]))}}),D=120,q=100,Xt=(n,t,o)=>[{x:q+D/2,y:q,color:n},{x:q,y:q+Math.sqrt(3)*D/2,color:t},{x:q+D,y:q+Math.sqrt(3)*D/2,color:o}],st=(n,t,o,s)=>{Xt(n,t,o).forEach(({x:r,y:c,color:a})=>{s.beginPath(),s.arc(r,c,q,0,2*Math.PI),s.fillStyle=a,s.fill()})},rt="#FF0000",ct="#00FF00",at="#0000FF",Qt="#ffff00",Zt="#00ffff",xt="#ff00ff",to="#FFFFFF",oo=[rt,Qt,ct,Zt,at,xt,to],no=oo.map(n=>new $(n)),eo=n=>{n.globalCompositeOperation="screen",st(rt,ct,at,n)},so=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(eo),colors:F(no)},null,8,["convert","colors"]))}}),lt="#FF0000",ut="#00FF00",it="#0000FF",ro="#ffff00",co="#00ffff",ao="#ff00ff",lo="#FFFFFF",uo=[lt,ro,ut,co,it,ao,lo],io=uo.map(n=>new $(n)),ho=n=>{const{width:t,height:o}=et("rank");n.globalCompositeOperation="difference",st(lt,ut,it,n),n.beginPath(),n.fillStyle="white",n.fillRect(0,0,t,o)},fo=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(ho),colors:F(io)},null,8,["convert","colors"]))}});const po=20,_o=200,mo=10,O=(n,t=1,o,s)=>{var l,p;if(!n.length||t<1)return;const e=(l=s==null?void 0:s.width)!=null?l:po,r=(p=s==null?void 0:s.minr)!=null?p:_o,c=r+e*t+mo,a=c,u=2*Math.PI/n.length,i=(Math.PI+u)/2;o.lineWidth=e;const _=f=>{n.forEach((v,k)=>{const B=k*u-i,S=B+u,P=1-.1*(f-1),W=r+e*(t-f),vt=new $(v.rgb(),P);o.beginPath(),o.strokeStyle=vt.toRGBA(),o.arc(c,a,W,B,S),o.stroke(),o.closePath()})};for(let f=1;f<=t;f++)_(f)},Fo=["#FF0000","#FF8000","#FFFF00","#80FF00","#00FF00","#00FF80","#00FFFF","#0080FF","#0000FF","#8000FF","#FF00FF","#FF0080"],ht=Fo.map(n=>new $(n)),go=n=>{O(ht,1,n,{minr:200,width:40})},vo=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(go),colors:F(ht)},null,8,["convert","colors"]))}}),U=(n,t,o=.5)=>{const{r:s,g:e,b:r,a:c}=n.rgba(),{r:a,g:u,b:i,a:_}=t.rgba(),l=o*2-1,p=c-_,f=((l*p==-1?l:(l+p)/(1+l*p))+1)/2,v=1-f,k=[Math.round(s*f+a*v),Math.round(e*f+u*v),Math.round(r*f+i*v)],B=c*o+_*(1-o);return new $(k,B)},V=(n,t=1,o=U)=>{const s=n.length;if(t<1||s<2)return n;const e=.5,r=[];return n.forEach((c,a)=>{r.push(c);const u=a+1<s?a+1:0;if(u!==a-1){const i=o(c,n[u],e);r.push(i)}}),t--,t?V(r,t,o):r},bo=(n,t,o)=>$o(n,t,o,1),$o=(n,t,o,s)=>{let e=0,r=0,c=0;if(t===0)e=o,r=o,c=o;else{const a=o<.5?o*(1+t):o+t-o*t,u=2*o-a,i=n/360,_=l=>{l<0?l=l+1:l>1&&(l=l-1);let p=0;return l<1/6?p=u+(a-u)*6*l:l<1/2?p=a:l<2/3?p=u+(a-u)*6*(2/3-l):p=u,p};e=_(i+1/3),r=_(i),c=_(i-1/3)}return new $([e*255,r*255,c*255],s)},yo="#FF0000",Mo="#00FF00",wo="#0000FF",Co="#ffff00",ko="#00ffff",Ao="#ff00ff",Bo=[yo,Co,Mo,ko,wo,Ao],qo=Bo.map(n=>new $(n)),ft=V(qo,3,U),Po=n=>{O(ft,1,n,{minr:200,width:40})},So=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(Po),colors:F(ft)},null,8,["convert","colors"]))}}),Eo="#FF0000",Ro="#00FF00",To="#0000FF",Lo="#ffff00",Go="#00ffff",Do="#ff00ff",Ho=[Eo,Lo,Ro,Go,To,Do],Wo=Ho.map(n=>new $(n)),pt=V(Wo,4,U),jo=n=>{O(pt,10,n,{minr:160,width:20})},Io=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(jo),colors:F(pt)},null,8,["convert","colors"]))}}),No=["#FFFF00","#FFAA00","#FF8000","#FF5500","#FF0000","#FF0080","#FF00FF","#8080FF","#0080FF","#00FFFF","#00FF00","#80FF00"],T=No.map(n=>new $(n)),Y=40,K=200,Oo=10,d=K+Y+Oo,g=d,z=2*Math.PI/T.length,h=K-Y/2,Uo=(n,t)=>{const o=(Math.PI+z)/2;t.lineWidth=Y,n.forEach((s,e)=>{const r=e*z-o,c=r+z;t.beginPath(),t.strokeStyle=s.toRGBA(),t.arc(d,g,K,r,c),t.stroke(),t.closePath()})},Vo=(n,t)=>{const[o,s,e]=n;t.lineWidth=1,t.beginPath(),t.fillStyle=o.toRGBA(),t.moveTo(d,g),t.lineTo(d-h*Math.sqrt(3)/4,g-h/4),t.lineTo(d,g-h),t.lineTo(d+h*Math.sqrt(3)/4,g-h/4),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.moveTo(d,g),t.lineTo(d+h*Math.sqrt(3)/4,g-h/4),t.lineTo(d+h*Math.sqrt(3)/2,g+h/2),t.lineTo(d,g+h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=e.toRGBA(),t.moveTo(d,g),t.lineTo(d-h*Math.sqrt(3)/4,g-h/4),t.lineTo(d-h*Math.sqrt(3)/2,g+h/2),t.lineTo(d,g+h/2),t.fill(),t.closePath()},Yo=(n,t)=>{const[o,s,e]=n;t.lineWidth=1,t.beginPath(),t.fillStyle=o.toRGBA(),t.lineTo(d,g-h),t.lineTo(d+h*Math.sqrt(3)/2,g+h/2),t.lineTo(d+h*Math.sqrt(3)/2,g-h/2),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=s.toRGBA(),t.lineTo(d+h*Math.sqrt(3)/2,g+h/2),t.lineTo(d-h*Math.sqrt(3)/2,g+h/2),t.lineTo(d,g+h),t.fill(),t.closePath(),t.beginPath(),t.fillStyle=e.toRGBA(),t.lineTo(d-h*Math.sqrt(3)/2,g+h/2),t.lineTo(d,g-h),t.lineTo(d-h*Math.sqrt(3)/2,g-h/2),t.fill(),t.closePath()},Ko=n=>{Uo(T,n),Vo(T.filter((t,o)=>[0,4,8].includes(o)),n),Yo(T.filter((t,o)=>[2,6,10].includes(o)),n)},zo=b({setup(n){return(t,o)=>(m(),w(C,{class:"itten",convert:F(Ko),colors:F(T)},null,8,["convert","colors"]))}}),Jo=(n,t,o)=>[{x:n+o/2,y:t-o*Math.sqrt(3)/2},{x:n+o,y:t},{x:n+o/2,y:t+o*Math.sqrt(3)/2},{x:n-o/2,y:t+o*Math.sqrt(3)/2},{x:n-o,y:t},{x:n-o/2,y:t-o*Math.sqrt(3)/2}],Xo=(n,t,o,s=1)=>{if(s===0)return[{x:n,y:t}];const e=[],r=[],c=[],a=[],u=[],i=[];for(let l=1;l<=s;l++)e.push({x:n+l*o*3/2,y:t-s*o*Math.sqrt(3)+l*o*Math.sqrt(3)/2}),r.push({x:n+s*o*3/2,y:t+s*o*Math.sqrt(3)/2-(s-l)*o*Math.sqrt(3)}),c.push({x:n+(s-l)*o*3/2,y:t+s*o*Math.sqrt(3)-(s-l)*o*Math.sqrt(3)/2}),a.push({x:n-l*o*3/2,y:t+s*o*Math.sqrt(3)-l*o*Math.sqrt(3)/2}),u.push({x:n-s*o*3/2,y:t+s*o*Math.sqrt(3)/2-l*o*Math.sqrt(3)}),i.push({x:n-(s-l)*o*3/2,y:t-s*o*Math.sqrt(3)+(s-l)*o*Math.sqrt(3)/2});return e.concat(r,c,a,u,i)},J=(n,t,o,s=1)=>{let e=[];for(let r=0;r<=s;r++){const c=Xo(n,t,o,r);e=e.concat(c)}return e},X=(n,t,o,s,e)=>{const r=Jo(n,t,o);e.beginPath(),r.forEach(({x:c,y:a},u)=>{u===0?e.moveTo(c,a):e.lineTo(c,a)}),e.fillStyle=s.toRGBA(),e.fill(),e.closePath()},Q=(n=1)=>new Array(n).fill("").map((s,e)=>(e+1)*6).reduce((s,e)=>s+e,1),Qo=(n,t,o,s=1,e,r)=>{J(n,t,o,s).forEach(({x:a,y:u},i)=>{const _="#"+Math.floor(Math.random()*16777215).toString(16),l=e[i]||new $(_);X(a,u,o,l,r)})},Zo=(n,t,o,s=1,e)=>{const r=(s+1)*o*Math.sqrt(3);e.beginPath(),[{x:n+r*Math.sqrt(3)/2,y:t-r/2},{x:n+r*Math.sqrt(3)/2,y:t+r/2},{x:n,y:t+r},{x:n-r*Math.sqrt(3)/2,y:t+r/2},{x:n-r*Math.sqrt(3)/2,y:t-r/2},{x:n,y:t-r}].forEach(({x:a,y:u},i)=>{i===0?e.moveTo(a,u):e.lineTo(a,u)}),e.fillStyle="#000000",e.fill(),e.closePath()},xo=(n,t,o=1,s)=>{const e=(1+o*Math.sqrt(3))*t+t,r=e;Zo(e,r,t,o,s),J(e,r,t,o).forEach(({x:a,y:u},i)=>{X(a,u,t,n[i],s)})},_t=8,tn=Q(_t);let H=[];for(let n=0;n<tn;n++){const t=Math.floor(Math.random()*4095);H.push(t)}H=H.sort((n,t)=>t-n);const dt=H.map(n=>new $(`#${n.toString(16).padStart(3,"0")}`)),on=n=>{xo(dt,25,_t,n)},nn=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(on),colors:F(dt)},null,8,["convert","colors"]))}}),en=n=>{const t=[];for(let o=1;o<=n;o++)t.push(o);return t},sn=(n,t)=>{const o=en(n),s=[];let e=1;for(;o.length>0;){const r=[];for(let c=0;c<Math.min(e,t)&&o.length!==0;c++){const a=Math.floor(Math.random()*o.length);r.push(o[a]-1),o.splice(a,1)}s.push(r),e++}return s},rn=(n,t,o,s,e)=>{s.forEach(({x:r,y:c})=>{const a="#"+Math.floor(Math.random()*16777215).toString(16);mt.push(new $(a)),X(r,c,o,new $(a),e)})},mt=[],Z=10,cn=Q(Z),an=sn(cn,6),ln=100,un=n=>{const t=20,o=(1+Z*Math.sqrt(3))*t+t,s=o,e=J(o,s,t,Z);an.forEach((r,c)=>{setTimeout(()=>{const a=r.map(u=>e[u]);rn(o,s,t,a,n)},c*ln)})},hn=b({setup(n){const t=M(()=>mt);return(o,s)=>(m(),w(C,{convert:F(un),colors:F(t)},null,8,["convert","colors"]))}}),fn=(n,t,o=1,s)=>{const e=(1+o*Math.sqrt(3))*t+t;Qo(e,e,t,o,n,s)},x=[],Ft=15,pn=Q(Ft);for(let n=0;n<pn;n++)x.push(bo(n,1,.5));const _n=n=>{fn(x,10,Ft,n)},dn=b({setup(n){return(t,o)=>(m(),w(C,{convert:F(_n),colors:F(x)},null,8,["convert","colors"]))}}),gt=[{path:"/",name:"home",label:"\u8272\u5F69\u7684\u4E16\u754C",component:Dt},{path:"/rgb",name:"rgb",label:"\u5149\u7684\u4E09\u539F\u8272\uFF08RGB\u6A21\u578B\uFF09",component:so},{path:"/cmyk",name:"cmyk",label:"\u5370\u5237\u56DB\u8272\uFF08CMYK\u6A21\u578B\uFF09",component:fo},{path:"/twelve",name:"twelve",label:"\u5341\u4E8C\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:vo},{path:"/fortyeight",name:"fortyeight",label:"\u56DB\u5341\u516B\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:So},{path:"/ninetysix",name:"ninetysix",label:"\u4E5D\u5341\u516D\u8272\u73AF\uFF08RGB\u6A21\u578B\uFF09",component:Io},{path:"/itten",name:"itten",label:"\u4F0A\u767B\u5341\u4E8C\u8272\u73AF\uFF08RYB\u6A21\u578B\uFF09",component:zo},{path:"/palette",name:"palette",label:"\u8C03\u8272\u677F",component:nn},{path:"/random",name:"random",label:"\u563F\uFF0C\u52A8\u8D77\u6765",component:hn},{path:"/progress",name:"progress",label:"\u6E10\u8FDB\u5F0F\u7684\u8C03\u8272\u677F",component:dn}],mn=gt.map(({label:n,name:t})=>({label:n,value:t.toUpperCase()})),Fn=Mt({history:wt(),routes:gt});const gn=b({setup(n){nt(l=>({de4ac442:a,e3b8717e:i}));const t=Ct(),o=kt(),s=G("HOME"),e=l=>{s.value=l,t.push({name:l.toLowerCase()})},r=M(()=>o.name||"home");ot(r,l=>{s.value=l.toUpperCase()});const c=180,a=`${c}px`,u=10,i=`${u}px`,_=()=>{const l=document.getElementById("app"),{width:p,height:f}=l.getBoundingClientRect();Bt("rank",{width:p-c-2*u,height:f-2*u})};return N(()=>{_()}),(l,p)=>{const f=At("router-view");return m(),y(L,null,[R(Rt,{current:s.value,"catalog-list":F(mn),onChange:e},null,8,["current","catalog-list"]),R(f,{class:"container"})],64)}}});qt(gn).use(Fn).mount("#app");
