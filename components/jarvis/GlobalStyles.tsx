"use client";

import { C } from "@/lib/jarvis-design";

export function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { height: 100%; overflow: hidden; background: ${C.bg}; }
      ::-webkit-scrollbar { width: 3px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${C.dim}; border-radius: 2px; }
      .orb  { font-family: 'Orbitron', monospace; }
      .raj  { font-family: 'Rajdhani', sans-serif; }
      .mono { font-family: 'Share Tech Mono', monospace; }

      @keyframes rotateRing    { to { transform: rotate(360deg); } }
      @keyframes rotateCCW     { to { transform: rotate(-360deg); } }
      @keyframes scanArc       { to { transform: rotate(360deg); } }
      @keyframes glowBreathe   { 0%,100%{opacity:.45;} 50%{opacity:.9;} }
      @keyframes irisPulse     { 0%,100%{transform:scale(1);} 50%{transform:scale(1.055);} }
      @keyframes pupilScan     {
        0%  {transform:translate(0px,0px);}
        12% {transform:translate(13px,-9px);}
        25% {transform:translate(-11px,-13px);}
        37% {transform:translate(-15px,5px);}
        50% {transform:translate(5px,15px);}
        63% {transform:translate(15px,3px);}
        75% {transform:translate(-4px,-11px);}
        87% {transform:translate(9px,7px);}
        100%{transform:translate(0px,0px);}
      }
      @keyframes ringPulse     { 0%,100%{opacity:.25;} 50%{opacity:.75;} }
      @keyframes fadeUp        { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
      @keyframes slideIn       { from{opacity:0;transform:translateX(20px);} to{opacity:1;transform:translateX(0);} }
      @keyframes dotBlink      { 0%,89%,100%{opacity:1;} 90%{opacity:.15;} }
      @keyframes statusFlash   { 0%,100%{opacity:1;} 50%{opacity:.3;} }
      @keyframes dotPulse      { 0%,100%{opacity:.25;transform:scale(.8);} 50%{opacity:1;transform:scale(1.3);} }
      @keyframes scanLine      { 0%{top:0%;opacity:.7;} 100%{top:100%;opacity:0;} }
      @keyframes ambientGrid   { 0%,100%{opacity:.04;} 50%{opacity:.08;} }
    `}</style>
  );
}
