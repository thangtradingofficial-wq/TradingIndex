import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const flagsDir = path.join(ROOT, 'assets', 'flags');
if (!fs.existsSync(flagsDir)) fs.mkdirSync(flagsDir, { recursive: true });

const flags = {
  vn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
<rect width="900" height="600" fill="#da251d"/>
<polygon points="450,150 491,277 625,277 516,356 558,483 450,404 342,483 384,356 275,277 409,277" fill="#ff0"/>
</svg>`,

  eu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 810 540">
<rect width="810" height="540" fill="#039"/>
<g fill="#fc0" transform="matrix(30 0 0 30 405 270)">
<g id="s"><polygon id="o" points="0,-1 0.588,0.809 -0.951,-0.309 0.951,-0.309 -0.588,0.809" /><use href="#o" transform="scale(-1,1)"/></g>
<use href="#s" transform="rotate(30) translate(0, -6)"/>
<use href="#s" transform="rotate(60) translate(0, -6)"/>
<use href="#s" transform="rotate(90) translate(0, -6)"/>
<use href="#s" transform="rotate(120) translate(0, -6)"/>
<use href="#s" transform="rotate(150) translate(0, -6)"/>
<use href="#s" transform="rotate(180) translate(0, -6)"/>
<use href="#s" transform="rotate(210) translate(0, -6)"/>
<use href="#s" transform="rotate(240) translate(0, -6)"/>
<use href="#s" transform="rotate(270) translate(0, -6)"/>
<use href="#s" transform="rotate(300) translate(0, -6)"/>
<use href="#s" transform="rotate(330) translate(0, -6)"/>
<use href="#s" transform="rotate(0) translate(0, -6)"/>
</g>
</svg>`,

  jp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
<rect width="900" height="600" fill="#fff"/>
<circle cx="450" cy="300" r="180" fill="#bc002d"/>
</svg>`,

  ch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" fill="#d52b1e"/>
<path d="M13,6 h6 v7 h7 v6 h-7 v7 h-6 v-7 h-7 v-6 h7 z" fill="#fff"/>
</svg>`,

  gb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30">
<clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
<clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
<g clip-path="url(#s)">
<path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
<path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>
<path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#t)" stroke="#c8102e" stroke-width="4"/>
<path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/>
<path d="M30,0 v30 M0,15 h60" stroke="#c8102e" stroke-width="6"/>
</g>
</svg>`,

  ca: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500">
<rect width="1000" height="500" fill="#ff0000"/>
<rect x="250" width="500" height="500" fill="#ffffff"/>
<path d="M 500,105 L 522,190 L 585,145 L 575,215 L 640,240 L 595,290 L 610,315 L 525,320 L 512,395 L 488,395 L 475,320 L 390,315 L 405,290 L 360,240 L 425,215 L 415,145 L 478,190 Z" fill="#ff0000"/>
</svg>`,

  cn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
<rect width="900" height="600" fill="#de2910"/>
<polygon points="150,50 181,145 281,145 200,204 231,299 150,240 69,299 100,204 19,145 119,145" fill="#ffde00"/>
<polygon points="300,40 309,69 339,69 315,86 324,115 300,97 276,115 285,86 261,69 291,69" fill="#ffde00" transform="rotate(23 300 80)"/>
<polygon points="360,100 369,129 399,129 375,146 384,175 360,157 336,175 345,146 321,129 351,129" fill="#ffde00" transform="rotate(45 360 140)"/>
<polygon points="360,200 369,229 399,229 375,246 384,275 360,257 336,275 345,246 321,229 351,229" fill="#ffde00" transform="rotate(67 360 240)"/>
<polygon points="300,260 309,289 339,289 315,306 324,335 300,317 276,335 285,306 261,289 291,289" fill="#ffde00" transform="rotate(89 300 300)"/>
</svg>`,

  au: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640">
<rect width="1280" height="640" fill="#012169"/>
<path d="M0,0 v320 h640 v-320 z" fill="#012169"/>
<path d="M0,0 L640,320 M640,0 L0,320" stroke="#fff" stroke-width="64"/>
<path d="M0,0 L640,320 M640,0 L0,320" stroke="#c8102e" stroke-width="42"/>
<path d="M320,0 v320 M0,160 h640" stroke="#fff" stroke-width="106"/>
<path d="M320,0 v320 M0,160 h640" stroke="#c8102e" stroke-width="64"/>
<g fill="#fff">
<circle cx="320" cy="480" r="60"/>
<circle cx="960" cy="500" r="30"/>
<circle cx="880" cy="360" r="30"/>
<circle cx="960" cy="180" r="30"/>
<circle cx="1040" cy="300" r="30"/>
<circle cx="1000" cy="390" r="18"/>
</g>
</svg>`,

  nz: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600">
<rect width="1200" height="600" fill="#012169"/>
<path d="M0,0 v300 h600 v-300 z" fill="#012169"/>
<path d="M0,0 L600,300 M600,0 L0,300" stroke="#fff" stroke-width="60"/>
<path d="M0,0 L600,300 M600,0 L0,300" stroke="#c8102e" stroke-width="40"/>
<path d="M300,0 v300 M0,150 h600" stroke="#fff" stroke-width="100"/>
<path d="M300,0 v300 M0,150 h600" stroke="#c8102e" stroke-width="60"/>
<g fill="#c8102e" stroke="#fff" stroke-width="6">
<circle cx="900" cy="150" r="28"/>
<circle cx="800" cy="320" r="24"/>
<circle cx="900" cy="480" r="28"/>
<circle cx="1000" cy="270" r="24"/>
</g>
</svg>`
};

for (const [code, svg] of Object.entries(flags)) {
  fs.writeFileSync(path.join(flagsDir, `${code}.svg`), svg.trim(), 'utf-8');
  console.log(`✓ Generated flag: assets/flags/${code}.svg`);
}
