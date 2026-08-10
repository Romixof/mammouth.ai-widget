// ==UserScript==
// @name         Mammouth AI - Quota Tracker
// @version      14.22
// @description  Quota Tracker pour mammouth.ai — suivi du quota (fenêtre glissante 3h), quota par modèle, simulateur de récupération.
// @author       Romixo
// @match        *://*.mammouth.ai/*
// @match        *://mammouth.ai/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Romixof/mammouth.ai-widget/main/mammouth-plugin.user.js
// @downloadURL  https://raw.githubusercontent.com/Romixof/mammouth.ai-widget/main/mammouth-plugin.user.js
// @license      MIT
// ==/UserScript==

/*
 * Mammouth AI - Quota Tracker
 * Copyright (c) 2026 Romixo
 * Licensed under the MIT License
 */

(function () {
    'use strict';

    /* ================= STYLES ================= */
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes mw-shimmer { 0% { left: -150%; } 100% { left: 150%; } }
        @keyframes mw-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.55; transform:scale(0.97); } }
        @keyframes mw-bounce-in { 0% { transform:scale(0.85); opacity:0; } 55% { transform:scale(1.04); opacity:1; } 100% { transform:scale(1); opacity:1; } }
        @keyframes mw-spin { to { transform: rotate(360deg); } }
        @keyframes mw-fade-rise { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        @keyframes mw-fade-in { from { opacity:0; } to { opacity:1; } }
        @keyframes mw-badge-in { from { opacity:0; transform: translateY(-3px) scale(0.85); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes mw-pop { 0% { transform: scale(1); } 40% { transform: scale(1.14); } 100% { transform: scale(1); } }
        @keyframes mw-glow-critical { 0%,100% { box-shadow: 0 10px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 rgba(255,71,87,0); } 50% { box-shadow: 0 10px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 30px rgba(255,71,87,0.6); } }
        @keyframes mw-ring { 0% { transform: scale(0.7); opacity: 0.7; } 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes mw-flash-green { 0%,100% { background: rgba(255,255,255,0.04); } 50% { background: rgba(46,213,115,0.18); } }
        @keyframes mw-mini-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }

        #mammouth-widget {
            position: fixed; bottom: 30px; right: 30px; width: 300px;
            max-width: calc(100vw - 40px); max-height: calc(100vh - 40px);
            background: rgba(15,15,20,0.9);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1);
            color: #f0f0f0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            z-index: 999999; overflow: hidden;
            transition: width 0.4s cubic-bezier(0.34,1.56,0.64,1), height 0.4s cubic-bezier(0.34,1.56,0.64,1), border-radius 0.4s ease, background 0.25s ease, box-shadow 0.3s ease, transform 0.2s ease;
            animation: mw-bounce-in 0.55s cubic-bezier(0.34,1.56,0.64,1);
        }
        #mammouth-widget.mw-critical { animation: mw-glow-critical 2.2s ease-in-out infinite; }
        #mammouth-widget.mw-dragging {
            transition: none !important; transform: none !important;
            backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
            background: rgba(15,15,20,0.98) !important;
            cursor: grabbing; user-select: none;
            box-shadow: 0 20px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.1) !important;
        }
        #mammouth-widget.minimized { width: 64px; height: 64px; border-radius: 50%; }
        #mammouth-widget.minimized #mw-body,
        #mammouth-widget.minimized #mw-header { display: none; }
        #mammouth-widget.minimized #mw-mini { display: flex; animation: mw-fade-in 0.35s ease; }
        #mammouth-widget.minimized.mw-critical #mw-mini-time { color: #ff6b6b; }
        #mammouth-widget.minimized:not(.mw-dragging):hover { transform: scale(1.1); }
        #mammouth-widget.minimized.mw-critical #mw-mini { animation: mw-mini-pulse 1.6s ease-in-out infinite; }

        #mw-mini {
            display: none; position: absolute; inset: 0;
            align-items: center; justify-content: center; cursor: grab;
        }
        #mw-mini:active { cursor: grabbing; }
        #mw-mini svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
        #mw-mini-ring { transition: stroke-dashoffset 0.7s cubic-bezier(0.34,1.56,0.64,1), stroke 0.45s ease; }
        #mw-mini-time {
            position: relative; z-index: 1; font-size: 12px; font-weight: 800;
            color: #f0f0f0; letter-spacing: -0.3px; transition: color 0.4s ease; line-height: 1;
        }

        #mw-header {
            position: sticky; top: 0; z-index: 10;
            display: flex; justify-content: space-between; align-items: center;
            padding: 14px 16px; cursor: grab; border-bottom: 1px solid rgba(255,255,255,0.06);
            background: rgba(15,15,20,0.95);
            backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        }
        #mw-header:active { cursor: grabbing; }
        #mw-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; letter-spacing: -0.2px; }
        #mw-header-btns { display: flex; gap: 4px; }
        .mw-btn-icon {
            background: rgba(255,255,255,0.06); border: none; color: #999;
            width: 24px; height: 24px; border-radius: 7px; cursor: pointer;
            font-size: 13px; line-height: 1; display: flex; align-items: center; justify-content: center;
            transition: background 0.2s, color 0.2s, transform 0.15s;
        }
        .mw-btn-icon:hover { background: rgba(255,255,255,0.14); color: #fff; transform: translateY(-1px); }
        .mw-btn-icon:active { transform: scale(0.92); }

        #mw-body { padding: 16px; }
        .mw-card {
            background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
            border-radius: 14px; padding: 14px; margin-bottom: 14px;
            animation: mw-fade-rise 0.55s cubic-bezier(0.34,1.56,0.64,1) both;
            transition: background 0.25s, border-color 0.25s;
        }
        .mw-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
        .mw-card.mw-flash { animation: mw-flash-green 0.7s ease; }

        .mw-label {
            display: flex; justify-content: space-between; align-items: center;
            font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
            color: #888; margin-bottom: 8px;
        }
        .mw-big-text { font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 6px; transition: color 0.45s ease; display: inline-block; }
        .mw-big-text.mw-pop { animation: mw-pop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        .mw-sub-text { font-size: 11px; color: #999; transition: color 0.3s; }
        .mw-pulse-text { animation: mw-pulse 1.2s infinite; }

        .mw-progress-bar {
            width: 100%; height: 8px; background: rgba(255,255,255,0.08);
            border-radius: 4px; overflow: hidden; margin-top: 10px; position: relative;
        }
        .mw-progress-fill {
            height: 100%; border-radius: 4px;
            transition: width 0.7s cubic-bezier(0.34,1.56,0.64,1), background 0.4s;
            position: relative; overflow: hidden;
        }
        .mw-progress-fill::after {
            content: ''; position: absolute; top: 0; left: -150%; width: 50%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
            animation: mw-shimmer 2.2s infinite;
        }
        .fill-gradient-coral { background: linear-gradient(90deg, #ff6b6b, #ff8e53); }
        .fill-gradient-violet { background: linear-gradient(90deg, #6c5ce7, #a29bfe); }
        .fill-gradient-amber { background: linear-gradient(90deg, #ffa502, #ff7f50); }
        .fill-gradient-green { background: linear-gradient(90deg, #2ed573, #7bed9f); }

        .mw-btn {
            width: 100%; padding: 11px; border-radius: 11px; border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05); color: #f0f0f0; font-size: 12px; font-weight: 700;
            cursor: pointer; margin-bottom: 8px; transition: background 0.2s, transform 0.15s, border-color 0.2s;
            font-family: inherit;
        }
        .mw-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
        .mw-btn:active { transform: scale(0.98); }
        .mw-btn-primary { background: rgba(108,92,231,0.25); border-color: rgba(108,92,231,0.5); }
        .mw-btn-primary:hover { background: rgba(108,92,231,0.4); }
        .mw-btn-danger { background: rgba(255,71,87,0.15); border-color: rgba(255,71,87,0.35); }
        .mw-btn-danger:hover { background: rgba(255,71,87,0.28); }

        #mw-settings {
            max-height: 0; overflow: hidden; transition: max-height 0.35s ease, padding 0.3s ease;
            padding: 0; border-top: 1px solid transparent;
        }
        #mw-settings.open { max-height: 620px; padding-top: 12px; border-top-color: rgba(255,255,255,0.07); }
        .mw-setting-row {
            display: flex; align-items: center; gap: 8px; justify-content: space-between;
            padding: 6px 0; font-size: 11px; color: #aaa;
        }
        .mw-setting-row label { flex: 1; }
        .mw-btn-sm {
            background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
            color: #ddd; padding: 4px 9px; border-radius: 7px; font-size: 10px; font-weight: 700;
            cursor: pointer; font-family: inherit; transition: background 0.2s, transform 0.15s;
        }
        .mw-btn-sm:hover { background: rgba(255,255,255,0.14); }
        .mw-btn-sm:active { transform: scale(0.94); }

        .mw-api-badge {
            display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700;
            padding: 2px 7px; border-radius: 999px; letter-spacing: 0.3px;
        }
        .mw-api-badge.ok { background: rgba(46,213,115,0.15); color: #2ed573; border: 1px solid rgba(46,213,115,0.3); }
        .mw-api-badge.err { background: rgba(255,71,87,0.15); color: #ff6b6b; border: 1px solid rgba(255,71,87,0.3); }
        .mw-api-badge.idle { background: rgba(255,255,255,0.08); color: #999; border: 1px solid rgba(255,255,255,0.1); }
        .mw-api-badge.loading { background: rgba(108,92,231,0.18); color: #a29bfe; border: 1px solid rgba(108,92,231,0.4); }
        .mw-spinner { width: 10px; height: 10px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: mw-spin 0.8s linear infinite; }

        .mw-ring { position: absolute; border: 2px solid #2ed573; border-radius: 999px; pointer-events: none; animation: mw-ring 0.9s ease-out forwards; z-index: 10; }

        #mw-quota-status { transition: color 0.2s, transform 0.2s; }
        #mw-quota-status:hover { color: #a29bfe !important; transform: scale(1.05); }
        #mw-quota-status:active { transform: scale(0.95); }

        #mammouth-widget:not(.minimized) {
            max-height: min(720px, calc(100vh - 40px));
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(162,155,254,.5) transparent;
        }
        #mammouth-widget::-webkit-scrollbar { width: 5px; }
        #mammouth-widget::-webkit-scrollbar-thumb { background: rgba(162,155,254,.45); border-radius: 10px; }

        .mw-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
        .mw-stat { padding: 9px; border-radius: 10px; background: rgba(255,255,255,0.045); border: 1px solid rgba(255,255,255,0.06); }
        .mw-stat-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 4px; }
        .mw-stat-value { color: #ddd; font-size: 12px; font-weight: 700; }
        .mw-setting-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; padding-top: 8px; }
        #mw-history-canvas { display: block; width: 100%; height: 52px; margin-top: 10px; }
        #mw-import-file { display: none; }

        .mw-collapse-header { cursor: pointer; user-select: none; margin-bottom: 0; }
        .mw-collapse-header:hover { color: #a29bfe; }
        .mw-collapse-arrow { margin-left: auto; color: #a29bfe; font-size: 15px; transition: transform .25s ease; }
        .mw-consumption-content {
            max-height: 300px; opacity: 1; overflow: hidden; padding-top: 10px;
            transition: max-height .35s ease, opacity .25s ease, padding .35s ease;
        }
        #mw-card-consumption.collapsed { padding-top: 12px; padding-bottom: 12px; }
        #mw-card-consumption.collapsed .mw-consumption-content { max-height: 0; opacity: 0; padding-top: 0; }

        /* ================= SIDEBAR UI (alternative) ================= */
        #mw-sidebar {
            position: fixed; right: 10px; top: 50%; transform: translateY(-50%);
            display: flex; flex-direction: column; align-items: center; gap: 12px;
            background: rgba(15,15,20,0.94); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
            border: 1px solid rgba(255,255,255,0.09); border-radius: 22px;
            padding: 12px 8px; z-index: 999998;
            box-shadow: 0 10px 40px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08);
            transition: opacity 0.25s ease, transform 0.25s ease;
        }
        #mw-sidebar.mw-hidden { opacity: 0; pointer-events: none; transform: translateY(-50%) translateX(30px); }
        .mw-sb-item { position: relative; width: 52px; height: 52px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: transform 0.18s ease, filter 0.18s ease; }
        .mw-sb-item:hover { transform: scale(1.07); filter: brightness(1.10); }
        .mw-sb-item:active { transform: scale(0.96); }
        .mw-sb-item svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
        .mw-sb-center { position: absolute; inset: 0; display: grid; place-items: center; z-index: 1; line-height: 1; }
        .mw-sb-pct { font-size: 11px; font-weight: 800; color: #f0f0f0; letter-spacing: -0.3px; line-height: 1; transform: translateY(3px); }
        .mw-sb-icon { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); font-size: 8px; line-height: 1; opacity: 0.9; pointer-events: none; }
        .mw-sb-dot { position: absolute; top: -2px; right: -2px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid rgba(15,15,20,0.94); display: none; }
        .mw-sb-dot.on { display: block; }
        #mw-popover {
            position: fixed; right: 76px; top: 50%; transform: translateY(-50%);
            width: 300px; max-width: calc(100vw - 96px);
            background: rgba(15,15,20,0.98); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.10); border-radius: 20px;
            box-shadow: 0 18px 50px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.08);
            color: #f0f0f0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;
            z-index: 999997; overflow: visible; padding: 16px 14px 12px;
            opacity: 0; pointer-events: none; transition: opacity 0.22s ease, transform 0.22s ease;
            transform: translateY(-50%) translateX(10px);
        }
        #mw-popover.open { opacity: 1; pointer-events: auto; transform: translateY(-50%) translateX(0); }
        #mw-popover::after { content: ''; position: absolute; right: -7px; top: 50%; transform: translateY(-50%) rotate(45deg); width: 14px; height: 14px; background: rgba(15,15,20,0.98); border-right: 1px solid rgba(255,255,255,0.10); border-top: 1px solid rgba(255,255,255,0.10); }
        .mw-pop-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 12px; gap: 8px; }
        .mw-pop-title { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 800; letter-spacing: -0.3px; color: #fff; }
        .mw-pop-time { font-size: 12px; color: #e0e0e6; font-weight: 700; letter-spacing: 0.1px; }
        .mw-pop-gear { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #b8b8c0; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; transition: background 0.2s, color 0.2s; }
        .mw-pop-gear:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .mw-pop-section { padding: 11px 11px 10px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 10px; }
        .mw-pop-section:last-child { margin-bottom: 0; }
        .mw-pop-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .mw-pop-label { font-size: 12.5px; font-weight: 700; color: #f0f0f0; letter-spacing: -0.1px; display: flex; align-items: center; gap: 6px; }
        .mw-pop-reset { font-size: 11px; color: #b0b0b8; font-weight: 600; white-space: nowrap; }
        .mw-pop-bar { width: 100%; height: 6px; background: rgba(255,255,255,0.09); border-radius: 999px; overflow: visible; margin-top: 8px; position: relative; }
        .mw-pop-fill { height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1), background 0.3s; position: relative; }
        .mw-pop-fill::after { content: ''; position: absolute; right: -5px; top: 50%; transform: translateY(-50%); width: 10px; height: 10px; border-radius: 50%; background: inherit; border: 2px solid rgba(15,15,20,0.98); box-shadow: 0 1px 4px rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.2s; }
        .mw-pop-fill[style*="width: 0%"]::after { opacity: 0; }
        .mw-pop-fill:not([style*="width: 0%"])::after { opacity: 1; }
        .mw-pop-used { font-size: 11px; color: #b0b0b8; margin-top: 6px; font-weight: 600; }
        .mw-pop-select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); color: #e0e0e6; font-size: 11px; font-weight: 600; border-radius: 7px; padding: 3px 6px; max-width: 130px; font-family: inherit; cursor: pointer; }
        .mw-pop-select:focus { outline: none; border-color: rgba(162,155,254,0.5); }
        .mw-pop-select option { background: #1a1a20; }
        .mw-pop-footer { display: flex; gap: 8px; margin-top: 14px; }
        .mw-pop-footer .mw-btn-sm { flex: 1; justify-content: center; padding: 8px; font-size: 11px; }
        .mw-pop-footer .mw-btn-primary-sm { background: rgba(108,92,231,0.28); border-color: rgba(108,92,231,0.45); color: #fff; }
        .mw-pop-footer .mw-btn-primary-sm:hover { background: rgba(108,92,231,0.40); }
        .mw-model-block { padding:9px 11px; border-radius:12px; background: rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.06); margin-bottom:8px; }
        .mw-model-block:last-child { margin-bottom:0; }
        .mw-model-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
        .mw-model-name { font-size:12px; font-weight:700; color:#f0f0f0; }
        .mw-model-pct { font-size:11px; font-weight:700; color:#ffa502; }
        .mw-model-block.mw-enter { animation: mw-fade-rise 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes mw-bump { 0% { transform: scale(1); } 35% { transform: scale(1.28); color: #2ed573; } 100% { transform: scale(1); } }
        .mw-bump { animation: mw-bump 0.55s ease; display: inline-block; }
        .mw-model-logo { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.45); flex: 0 0 auto; }
        .mw-model-logo svg { display: block; }
        .mw-logo-toggle { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); color: #cfcfd6; border-radius: 8px; min-width: 22px; height: 22px; cursor: pointer; font-size: 11px; font-weight: 800; line-height: 1; padding: 0 4px; display: inline-flex; align-items: center; justify-content: center; transition: background 0.2s, border-color 0.2s, color 0.2s; }
        .mw-logo-toggle:hover { background: rgba(255,255,255,0.14); }
        .mw-logo-toggle.on { border-color: rgba(255,165,2,0.65); color: #ffa502; background: rgba(255,165,2,0.12); }
        .mw-sb-logo { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; z-index: 1; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.55)); pointer-events: none; }
        .mw-sb-logo svg { position: static; width: 32px; height: 32px; }
        [id^="mw-sb-ring"] { transition: stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1); }
        .mw-sim-chip { font-size: 10.5px; color: #9d9da8; font-weight: 700; white-space: nowrap; }
        .mw-sim-chip b { color: #2ed573; }
        .mw-sim-slider { width: 100%; margin: 10px 0 0; height: 16px; accent-color: #6c5ce7; cursor: pointer; background: transparent; }
        .mw-sim-slider:disabled { opacity: 0.3; cursor: default; }
        .mw-sim-slider:focus { outline: none; }
        .mw-sim-marks { position: relative; height: 7px; margin: -1px 2px 0; pointer-events: none; }
        .mw-sim-dot { position: absolute; top: 0.5px; width: 6px; height: 6px; border-radius: 50%; background: #6c5ce7; opacity: 0.85; transform: translateX(-50%); box-shadow: 0 0 0 2px rgba(108,92,231,0.18); transition: left 0.9s linear; }
        .mw-sim-dot.big { background: #2ed573; box-shadow: 0 0 0 2px rgba(46,213,115,0.2); }
        .mw-sim-result { font-size: 11.5px; color: #e0e0e6; font-weight: 600; margin-top: 6px; min-height: 15px; }
        .mw-sim-result b { color: #2ed573; font-weight: 800; }
        .mw-sim-result .mw-sim-arrow { color: #9d9da8; }
        body.mw-mode-sidebar #mammouth-widget { opacity: 0; pointer-events: none; transform: scale(0.92); }
        body.mw-mode-classic #mw-sidebar, body.mw-mode-classic #mw-popover { opacity: 0; pointer-events: none; }
        @media (max-width: 520px) { #mw-sidebar { right: 8px; } #mw-popover { right: 68px; width: min(300px, calc(100vw - 82px)); } }
    `;
    document.head.appendChild(style);

    document.getElementById('mammouth-widget')?.remove();
    document.getElementById('mw-sidebar')?.remove();
    document.getElementById('mw-popover')?.remove();

    /* ================= WIDGET ================= */
    const widget = document.createElement('div');
    widget.id = 'mammouth-widget';
    widget.innerHTML = `
        <div id="mw-header">
            <div id="mw-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                Mammouth
            </div>
            <div id="mw-header-btns">
                <button class="mw-btn-icon" id="mw-btn-settings" title="Settings">⚙</button>
                <button class="mw-btn-icon" id="mw-btn-minimize" title="Minimiser">ー</button>
            </div>
        </div>
        <div id="mw-body">
            <div class="mw-card" id="mw-card-quota">
                <div class="mw-label">
                    <span>Quota Réel</span>
                    <span id="mw-quota-status" style="color:#6c5ce7; cursor:pointer;" title="Cliquez pour forcer le scan API + DOM">Rafraîchir ♻️</span>
                </div>
                <div class="mw-big-text" style="color: #ff6b6b;" id="mw-real-percent">-- %</div>
                <div class="mw-sub-text" id="mw-quota-models">Cliquez sur Rafraîchir pour scanner</div>
                <div class="mw-progress-bar">
                    <div class="mw-progress-fill fill-gradient-coral" id="mw-progress-quota" style="width: 0%;"></div>
                </div>
                <div style="margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
                    <span class="mw-api-badge idle" id="mw-api-badge">API en attente</span>
                    <span class="mw-sub-text" id="mw-api-ts">jamais synchronisé</span>
                </div>
            </div>

            <div class="mw-card" id="mw-card-timer">
                <div class="mw-label">Fenêtre glissante</div>
                <div class="mw-big-text" id="mw-countdown">00:00:00</div>
                <div class="mw-sub-text" id="mw-status-text">En attente du 1er message...</div>
                <div class="mw-progress-bar">
                    <div class="mw-progress-fill fill-gradient-violet" id="mw-progress-timer" style="width: 0%;"></div>
                </div>
            </div>

            <div class="mw-card" id="mw-card-sim">
                <div class="mw-label">
                    <span>🔮 Simulateur · <span id="mw-sim-offset">maintenant</span></span>
                    <span class="mw-sim-chip" id="mw-sim-chip">—</span>
                </div>
                <input type="range" class="mw-sim-slider" id="mw-sim-slider" min="0" max="180" step="5" value="0" aria-label="Simuler le temps écoulé pour projeter le quota récupéré">
                <div class="mw-sim-marks" id="mw-sim-marks"></div>
                <div class="mw-sub-text mw-sim-result" id="mw-sim-result">—</div>
            </div>

            <button class="mw-btn mw-btn-primary" id="mw-btn-start">🚀 Forcer début session</button>
            <button class="mw-btn mw-btn-danger" id="mw-btn-stop">🗑 Réinitialiser timer</button>
            <button class="mw-btn" id="mw-btn-return" style="display:none; background: rgba(46,213,115,0.2); border:1px solid rgba(46,213,115,0.4);">↩ Retour à ma discussion</button>

            <div id="mw-settings">
                <div class="mw-setting-row">
                    <label>Position fenêtre</label>
                    <button class="mw-btn-sm" id="mw-btn-reset-pos">Réinitialiser</button>
                </div>
                <div class="mw-setting-row">
                    <label>Scan API auto</label>
                    <button class="mw-btn-sm" id="mw-btn-toggle-api">Activé</button>
                </div>
                <div class="mw-setting-row">
                    <label>Seuil requête (¢)</label>
                    <button class="mw-btn-sm" id="mw-btn-threshold-dec">−</button>
                    <span id="mw-threshold-display">0.0¢</span>
                    <button class="mw-btn-sm" id="mw-btn-threshold-inc">+</button>
                </div>
                <div class="mw-setting-row">
                    <label>Simuler requête</label>
                    <button class="mw-btn-sm" id="mw-btn-simulate">Test timer</button>
                </div>
                <div class="mw-setting-row">
                    <label>Notifications</label>
                    <button class="mw-btn-sm" id="mw-btn-notifications">Activées</button>
                </div>
                <div class="mw-setting-row">
                    <label>Calibration quota</label>
                    <button class="mw-btn-sm" id="mw-btn-calibrate">Calibrer</button>
                </div>
                <div class="mw-setting-row">
                    <label>Effacer fenêtre</label>
                    <button class="mw-btn-sm" id="mw-btn-clear-requests">Effacer</button>
                </div>
                <div class="mw-setting-row">
                    <label>Texte minimisé</label>
                    <button class="mw-btn-sm" id="mw-btn-mini-mode" title="Ce qu'affiche le texte au centre du cercle">Temps restant</button>
                </div>
                <div class="mw-setting-row">
                    <label>Anneau minimisé</label>
                    <button class="mw-btn-sm" id="mw-btn-circle-mode" title="Ce que représente le cercle qui se remplit">Temps restant</button>
                </div>
                <div class="mw-setting-row">
                    <label>Mode d'affichage</label>
                    <button class="mw-btn-sm" id="mw-btn-ui-mode" title="Classique = widget 300px · Barre latérale = 3 anneaux + popover (comme capture)">Classique</button>
                </div>
                <div class="mw-setting-actions" style="display:flex;gap:8px;margin-top:6px;">
                    <button class="mw-btn-sm" id="mw-btn-export" style="flex:1">Exporter</button>
                    <button class="mw-btn-sm" id="mw-btn-import" style="flex:1">Importer</button>
                </div>
            </div>
            <input id="mw-import-file" type="file" accept="application/json" style="display:none">
        </div>
        <div id="mw-mini">
            <svg viewBox="0 0 64 64" preserveAspectRatio="xMidYMid meet">
                <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
                <circle id="mw-mini-ring" cx="32" cy="32" r="27" fill="none" stroke="#6c5ce7" stroke-width="3" stroke-linecap="round" stroke-dasharray="169.65" stroke-dashoffset="169.65" transform="rotate(-90 32 32)"/>
            </svg>
            <span id="mw-mini-time">—</span>
        </div>
    `;
    document.body.appendChild(widget);

    /* ================= SIDEBAR POPOVER (alternative UI) ================= */
    const sidebar = document.createElement('div');
    sidebar.id = 'mw-sidebar';
    sidebar.className = 'mw-hidden';
    sidebar.innerHTML = `
        <div class="mw-sb-item" id="mw-sb-1" title="Session en cours">
            <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4"/><circle id="mw-sb-ring-1" cx="26" cy="26" r="20" fill="none" stroke="#ff6b6b" stroke-width="4" stroke-linecap="round" stroke-dasharray="125.66" stroke-dashoffset="125.66" transform="rotate(-90 26 26)"/></svg>
            <div class="mw-sb-center"><span class="mw-sb-icon">✦</span><span class="mw-sb-pct" id="mw-sb-pct-1">—</span></div>
            <span class="mw-sb-dot" id="mw-sb-dot-1" style="background:#ff6b6b"></span>
        </div>
        <div class="mw-sb-item" id="mw-sb-2" title="Fenêtre glissante">
            <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4"/><circle id="mw-sb-ring-2" cx="26" cy="26" r="20" fill="none" stroke="#2ed573" stroke-width="4" stroke-linecap="round" stroke-dasharray="125.66" stroke-dashoffset="125.66" transform="rotate(-90 26 26)"/></svg>
            <div class="mw-sb-center"><span class="mw-sb-icon">◈</span><span class="mw-sb-pct" id="mw-sb-pct-2">—</span></div>
            <span class="mw-sb-dot" id="mw-sb-dot-2" style="background:#2ed573"></span>
        </div>
        <div class="mw-sb-item" id="mw-sb-3" title="Quota journalier">
            <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="3"/><circle id="mw-sb-ring-3" cx="26" cy="26" r="23" fill="none" stroke="#ffa502" stroke-width="3" stroke-linecap="round" stroke-dasharray="144.51" stroke-dashoffset="144.51" transform="rotate(-90 26 26)"/></svg>
            <div class="mw-sb-center"><span class="mw-sb-icon" id="mw-sb-icon-3">◐</span><span class="mw-sb-pct" id="mw-sb-pct-3">—</span><span class="mw-sb-logo" id="mw-sb-logo-3"></span></div>
            <span class="mw-sb-dot" id="mw-sb-dot-3" style="background:#ffa502"></span>
        </div>
    `;
    document.body.appendChild(sidebar);

    const popover = document.createElement('div');
    popover.id = 'mw-popover';
    popover.innerHTML = `
        <div class="mw-pop-header">
            <div class="mw-pop-title"><span style="color:#ff6b6b">✦</span> Mammouth</div>
            <div style="display:flex;align-items:center;gap:8px">
                <span class="mw-pop-time" id="mw-pop-time">--:--</span>
                <button class="mw-pop-gear" id="mw-pop-gear" title="Paramètres">⚙</button>
            </div>
        </div>
        <div class="mw-pop-section">
            <div class="mw-pop-row"><span class="mw-pop-label">Session en cours</span><span class="mw-pop-reset" id="mw-pop-reset-1">—</span></div>
            <div class="mw-pop-bar"><div class="mw-pop-fill" id="mw-pop-fill-1" style="width:0%; background: linear-gradient(90deg,#ff6b6b,#ff8e53)"></div></div>
            <div class="mw-pop-used" id="mw-pop-used-1">—</div>
        </div>
        <div class="mw-pop-section">
            <div class="mw-pop-row"><span class="mw-pop-label">Fenêtre glissante</span><span class="mw-pop-reset" id="mw-pop-reset-2">—</span></div>
            <div class="mw-pop-bar"><div class="mw-pop-fill" id="mw-pop-fill-2" style="width:0%; background: linear-gradient(90deg,#2ed573,#7bed9f)"></div></div>
            <div class="mw-pop-used" id="mw-pop-used-2">—</div>
            <div class="mw-pop-used" id="mw-pop-sim-hint" style="color:#8f8f98">—</div>
        </div>
        <div class="mw-pop-models-wrap" style="margin-top:10px">
            <div class="mw-pop-row" style="margin-bottom:8px">
                <span class="mw-pop-label">Quota par modèle</span>
                <span style="display:flex;align-items:center;gap:6px">
                    <span class="mw-pop-reset" id="mw-pop-reset-models">Réinit. lun. 16h17</span>
                    <button class="mw-logo-toggle" id="mw-logo-toggle" title="Afficher les logos des laboratoires (à la place des %)">%</button>
                </span>
            </div>
            <div id="mw-pop-models"></div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
                <select class="mw-pop-select" id="mw-pop-model-select" title="Aperçu modèle non utilisé" style="flex:1;max-width:100%"><option value="">— Aperçu autre modèle —</option></select>
            </div>
            <div class="mw-pop-used" id="mw-pop-used-preview" style="display:none"></div>
        </div>
        <div class="mw-pop-footer">
            <button class="mw-btn-sm mw-btn-primary-sm" id="mw-pop-refresh">Rafraîchir ♻️</button>
            <button class="mw-btn-sm" id="mw-pop-close">Fermer</button>
        </div>
    `;
    document.body.appendChild(popover);

    /* ================= CONSTANTES ================= */
    const WINDOW_MS = 3 * 60 * 60 * 1000;
    const API_URL = 'https://mammouth.ai/api/user/recentUsage';
    const CURRENT_USAGE_URL = '/api/user/currentUsage';
    const API_INTERVAL_MS = 5 * 60 * 1000;
    const RING_CIRC = 2 * Math.PI * 27;
    const DRAG_THRESHOLD = 4;

    const STORAGE_KEY_START = 'mammouth_session_start';
    const STORAGE_KEY_POS = 'mammouth_widget_pos';
    const STORAGE_KEY_MIN = 'mammouth_widget_min';
    const STORAGE_KEY_QUOTA = 'mammouth_real_quota_percent';
    const STORAGE_KEY_MODELS = 'mammouth_real_quota_models';
    const STORAGE_KEY_RETURN_URL = 'mammouth_return_url';
    const STORAGE_KEY_API_TS = 'mammouth_api_last_sync';
    const STORAGE_KEY_API_OK = 'mammouth_api_last_ok';
    const STORAGE_KEY_API_ENABLED = 'mammouth_api_enabled';
    const STORAGE_KEY_DOM_PERCENT = 'mammouth_dom_percent';
    const STORAGE_KEY_DOM_PCT_PRECISE = 'mammouth_dom_percent_precise';
    const STORAGE_KEY_LAST_AUTOCAL = 'mammouth_last_auto_calibration';
    const STORAGE_KEY_RAW_USED = 'mammouth_raw_used';
    const STORAGE_KEY_QUOTA_TOTAL = 'mammouth_quota_total';
    const STORAGE_KEY_CALIBRATE_PENDING = 'mammouth_calibrate_pending';
    const STORAGE_KEY_DOM_PERCENT_TS = 'mammouth_dom_percent_ts';
    const STORAGE_KEY_MINI_MODE = 'mammouth_mini_mode';
    const STORAGE_KEY_CIRCLE_MODE = 'mammouth_circle_mode';
    const STORAGE_KEY_UI_MODE = 'mammouth_ui_mode';
    const STORAGE_KEY_DAILY_MODEL = 'mammouth_daily_model';
    const STORAGE_KEY_DAILY_BYMODEL = 'mammouth_daily_bymodel';
    const STORAGE_KEY_MODEL_PCT = 'mammouth_model_quota_pct';
    const STORAGE_KEY_MODEL_PCT_TS = 'mammouth_model_pct_ts';
    const STORAGE_KEY_MODEL_PCT_SEEN = 'mammouth_model_pct_seen';
    const STORAGE_KEY_HARVEST_JOURNAL = 'mammouth_harvest_journal';
    const STORAGE_KEY_POOL_GUARD = 'mammouth_pool_guard_ts';
    const STORAGE_KEY_POOL_GUARD_UNTIL = 'mammouth_pool_guard_until';
    const STORAGE_KEY_LOGO_MODE = 'mammouth_model_show_logo';
    const STORAGE_KEY_REQUESTS = 'mammouth_sliding_requests';
    const STORAGE_KEY_SPEND_CENTS = 'mammouth_current_spend_cents';
    const STORAGE_KEY_THRESHOLD_CENTS = 'mammouth_threshold_cents';
    const STORAGE_KEY_HISTORY = 'mammouth_quota_history';
    const STORAGE_KEY_NOTIFY = 'mammouth_notifications_enabled';
    const STORAGE_KEY_NOTIFIED = 'mammouth_notified_thresholds';
    const STORAGE_KEY_RAW_USED_CACHE = 'mammouth_raw_used_cache';
    const STORAGE_KEY_RAW_USED_CACHE_TS = 'mammouth_raw_used_cache_ts';
    const STORAGE_KEY_PENDING_REQUEST = 'mammouth_pending_request';
    const STORAGE_KEY_LAST_CALIBRATION = 'mammouth_last_calibration';
    const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
    const RAW_USED_CACHE_TTL_MS = 2 * 60 * 1000;
    const CALIBRATION_COOLDOWN_MS = 10000;
    const PURE_BRAND_KEYS = new Set(['grok','claude','anthropic','xai','openai','gpt','chatgpt','google','gemini','meta','llama','deepseek','mistral','kimi','minimax','qwen','mammouth']);
    function isPureBrandKey(k) { return PURE_BRAND_KEYS.has(String(k || '').trim().toLowerCase()); }
    function isJunkModelKey(k) {
        const s = String(k || '').trim();
        if (!s || isPureBrandKey(s)) return true;
        return /d['’]utilisation/i.test(s) || /cliquez\s+pour\s+filtrer/i.test(s);
    }

    /* ================= MÉMOIRE ANTI-EFFACEMENT de la liste par modèle ================= */

    function displayableModelNames(map) {
        return Object.keys(map || {}).filter(k =>
            k !== k.toLowerCase() && /^[A-Z]/.test(k) && !isJunkModelKey(k) && Number.isFinite(map[k]));
    }
    function normalizeModelMap(raw) {
        const out = {};
        if (!raw || typeof raw !== 'object') return out;
        for (const [k, v] of Object.entries(raw)) {
            const pct = numberOrNull(v);
            if (pct === null || pct < 0 || pct > 100) continue;
            let name = String(k || '').replace(/\s+/g, ' ').trim();
            if (!name || isJunkModelKey(name)) continue;
            if (/^[a-z0-9]/.test(name)) {
                const pretty = beautifyModelName(name);
                if (pretty && !isJunkModelKey(pretty)) name = pretty;
            }
            if (!name || isJunkModelKey(name) || GENERIC_TITLE_RE.test(name)) continue;
            out[name] = Math.max(0, Math.min(100, Math.round(pct)));
        }
        return out;
    }
    function journalHarvest(entry) {
        try {
            const j = readJSON(STORAGE_KEY_HARVEST_JOURNAL, []);
            j.push(entry);
            while (j.length > 12) j.shift();
            localStorage.setItem(STORAGE_KEY_HARVEST_JOURNAL, JSON.stringify(j));
        } catch {}
    }
    function storeModelPct(nextRaw, source, opts) {
        try {
            const authoritative = !!(opts && opts.authoritative);
            const next = normalizeModelMap(nextRaw);
            const nextNames = displayableModelNames(next);
            const now0 = Date.now();
            const prev0 = readJSON(STORAGE_KEY_MODEL_PCT, {});
            const prev0Names = displayableModelNames(prev0);
            if (!nextNames.length) {
                if (authoritative && prev0Names.length) {
                    localStorage.setItem(STORAGE_KEY_MODEL_PCT, JSON.stringify({}));
                    localStorage.setItem(STORAGE_KEY_MODEL_PCT_SEEN, JSON.stringify({}));
                    localStorage.setItem(STORAGE_KEY_MODEL_PCT_TS, String(now0));
                    journalHarvest({ ts: now0, source, action: 'purge (section « Quota par modèle » vue vide)', avant: prev0Names, apres: [] });
                    console.log('[MammouthWidget] modèles (' + source + ') : section officielle VIDE → purge de ' + prev0Names.length + ' ancien(s) modèle(s)');
                    return true;
                }
                console.log('[MammouthWidget] store (' + source + ') : aucun modèle affichable → stockage intact');
                return false;
            }
            const prev = prev0;
            const prevNames = prev0Names;
            let action = 'remplace';
            let final = next;
            if (authoritative && prevNames.length && nextNames.length < prevNames.length) {
                const removed = prevNames.filter(n => !nextNames.some(x => x.toLowerCase() === n.toLowerCase()));
                action = 'réconciliation (−' + removed.length + ' obsolète(s) : ' + removed.join(', ') + ')';
            } else if (!authoritative && prevNames.length && nextNames.length < prevNames.length) {
final = { ...prev, ...next };
                action = 'fusion (+' + (prevNames.length - nextNames.length) + ' modèle(s) conservé(s))';
            }
            const withAlias = {};
            for (const [k, v] of Object.entries(final)) {
                if (!Number.isFinite(v)) continue;
                if (k !== k.toLowerCase()) withAlias[k] = Math.max(0, Math.min(100, Math.round(v)));
            }
            for (const [k, v] of Object.entries(withAlias)) {
                const low = k.toLowerCase();
                if (!(low in withAlias)) withAlias[low] = v;
            }
            const now = Date.now();
            const seen = readJSON(STORAGE_KEY_MODEL_PCT_SEEN, {});
            for (const n of nextNames) seen[n] = now;
            for (const n of displayableModelNames(withAlias)) if (!seen[n]) seen[n] = now;
            if (authoritative) {
                for (const n of Object.keys(seen)) {
                    if (!(n in withAlias)) delete seen[n];
                }
            }
            for (const n of Object.keys(seen)) {
                if (now - (seen[n] || 0) > 7 * 24 * 60 * 60 * 1000) {
                    delete seen[n];
                    delete withAlias[n];
                    delete withAlias[n.toLowerCase()];
                }
            }
            localStorage.setItem(STORAGE_KEY_MODEL_PCT, JSON.stringify(withAlias));
            localStorage.setItem(STORAGE_KEY_MODEL_PCT_SEEN, JSON.stringify(seen));
            localStorage.setItem(STORAGE_KEY_MODEL_PCT_TS, String(now));
            const finalNames = displayableModelNames(withAlias);
            journalHarvest({ ts: now, source, action, avant: prevNames, apres: finalNames.map(n => n + '=' + withAlias[n]) });
            console.log('[MammouthWidget] modèles (' + source + ', ' + action + ') →',
                finalNames.map(n => n + ' ' + withAlias[n] + '%').join(', '));
            return true;
        } catch (e) { console.warn('[MammouthWidget] storeModelPct err', e); return false; }
    }
    const GENERIC_TITLE_RE = /utilisation|quota|^total\b|usage|semaine|week|mois|month|cette\b|pool|globale|générale|generale|laboratoire|labo|consommation|conso\b|crédit|credit|fenêtre|glissante|session|réinit|reinit/i;

    /* ================= GARDE ANTI-LECTURE POOL CONTAMINÉE ================= */
    function notePoolActivity(extraMs) {
        try {
            const now = Date.now();
            localStorage.setItem(STORAGE_KEY_POOL_GUARD, String(now));
            if (extraMs) localStorage.setItem(STORAGE_KEY_POOL_GUARD_UNTIL, String(now + extraMs));
        } catch {}
    }
    function poolGuardActive() {
        try {
            const ts = parseInt(localStorage.getItem(STORAGE_KEY_POOL_GUARD) || '0', 10);
            if (ts && Date.now() - ts < 20000) return true;
            const until = parseInt(localStorage.getItem(STORAGE_KEY_POOL_GUARD_UNTIL) || '0', 10);
            return !!(until && Date.now() < until);
        } catch { return false; }
    }
    function expectedPoolPct() {
        try {
            const now = Date.now();
            const cacheTs = parseInt(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE_TS) || '0', 10);
            if (!cacheTs || now - cacheTs > 5 * 60 * 1000) return null;
            const raw = numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED) ?? localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE));
            const total = numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
            if (raw === null || raw <= 0 || total === null || total <= 0) return null;
            return (raw / total) * 100;
        } catch { return null; }
    }
    function poolReadingImplausible(pct) {
        const exp = expectedPoolPct();
if (exp === null || exp < 1) return false;
        const tol = Math.max(2.5, exp * 0.6);
        return Math.abs(pct - exp) > tol;
    }
    function logImplausiblePool(pct) {
        const exp = expectedPoolPct();
        console.log('[MammouthWidget] lecture pool INCOHÉRENTE avec l\u2019usage (' + pct + '% vs ' + (exp !== null ? exp.toFixed(1) : '—') + '% attendus) — ignorée (pool filtrée / jauge labo ?)');
    }

    /* ================= HELPERS STORAGE ================= */
    function numberOrNull(v) {
        if (typeof v === 'number' && !isNaN(v)) return v;
        if (typeof v === 'string') { const n = parseFloat(v); if (!isNaN(n)) return n; }
        return null;
    }
    function toPercent(v) {
        if (typeof v === 'number' && !isNaN(v)) return Math.round(v);
        if (typeof v === 'string') {
            const m = v.trim().match(/^(\d+(?:\.\d+)?)\s*%?$/);
            if (m) return Math.round(parseFloat(m[1]));
        }
        return null;
    }
    function readJSON(key, fallback) {
        try { const p = JSON.parse(localStorage.getItem(key)); return p == null ? fallback : p; }
        catch { return fallback; }
    }

    function getThresholdCents() {
        const v = parseFloat(localStorage.getItem(STORAGE_KEY_THRESHOLD_CENTS));
        return Number.isFinite(v) && v >= 0 ? v : 0;
    }
    function setThresholdCents(v) {
        localStorage.setItem(STORAGE_KEY_THRESHOLD_CENTS, String(Math.max(0, Math.round(v * 10) / 10)));
    }

    function getSessionStart() { return parseInt(localStorage.getItem(STORAGE_KEY_START) || '0', 10) || null; }
    function setSessionStart(ts) { localStorage.setItem(STORAGE_KEY_START, String(ts)); }

    function apiEnabled() { return localStorage.getItem(STORAGE_KEY_API_ENABLED) !== 'off'; }
    function setApiEnabled(on) { localStorage.setItem(STORAGE_KEY_API_ENABLED, on ? 'on' : 'off'); }

    function getMiniMode() {
        const m = localStorage.getItem(STORAGE_KEY_MINI_MODE);
        return (m === 'used' || m === 'remaining' || m === 'time') ? m : 'time';
    }
    function cycleMiniMode() {
        const order = ['time', 'used', 'remaining'];
        const next = order[(order.indexOf(getMiniMode()) + 1) % order.length];
        localStorage.setItem(STORAGE_KEY_MINI_MODE, next);
        return next;
    }

    function getCircleMode() {
        const m = localStorage.getItem(STORAGE_KEY_CIRCLE_MODE);
        return (m === 'used' || m === 'remaining' || m === 'time') ? m : 'time';
    }
    function cycleCircleMode() {
        const order = ['time', 'used', 'remaining'];
        const next = order[(order.indexOf(getCircleMode()) + 1) % order.length];
        localStorage.setItem(STORAGE_KEY_CIRCLE_MODE, next);
        return next;
    }

    function getUiMode() {
        const v = localStorage.getItem(STORAGE_KEY_UI_MODE);
        return v === 'sidebar' ? 'sidebar' : 'classic';
    }
    function setUiMode(m) { localStorage.setItem(STORAGE_KEY_UI_MODE, m === 'sidebar' ? 'sidebar' : 'classic'); }
    function cycleUiMode() {
        const next = getUiMode() === 'classic' ? 'sidebar' : 'classic';
        setUiMode(next);
        return next;
    }

    function getRequests() {
        try {
            let arr = JSON.parse(localStorage.getItem(STORAGE_KEY_REQUESTS) || '[]');
            const now = Date.now();
            arr = arr.filter(r => r && Number.isFinite(r.ts) && r.ts + WINDOW_MS > now);
            if (arr.length === 0) localStorage.removeItem(STORAGE_KEY_REQUESTS);
            else localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(arr));
            return arr.sort((a, b) => a.ts - b.ts);
        } catch { return []; }
    }
    function addRequest(ts, cents) {
        if (!Number.isFinite(cents) || cents <= 0) cents = 0.01;
        try {
            let arr = JSON.parse(localStorage.getItem(STORAGE_KEY_REQUESTS) || '[]');
            arr.push({ ts, cents });
            if (arr.length > 500) arr = arr.slice(-500);
            localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(arr));
        } catch { localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify([{ ts, cents }])); }
    }
    function updateRequestCost(ts, newCents) {
        try {
            const arr = JSON.parse(localStorage.getItem(STORAGE_KEY_REQUESTS) || '[]');
            const e = arr.find(r => r.ts === ts);
            if (e) { e.cents = newCents; localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(arr)); }
        } catch {}
    }

    /* ================= DOM REFS ================= */
    const countdownEl = document.getElementById('mw-countdown');
    const statusEl = document.getElementById('mw-status-text');
    const progressTimerEl = document.getElementById('mw-progress-timer');
    const realPercentEl = document.getElementById('mw-real-percent');
    const quotaModelsEl = document.getElementById('mw-quota-models');
    const progressQuotaEl = document.getElementById('mw-progress-quota');
    const apiBadgeEl = document.getElementById('mw-api-badge');
    const apiTsEl = document.getElementById('mw-api-ts');
    const quotaStatusEl = document.getElementById('mw-quota-status');
    const apiToggleBtn = document.getElementById('mw-btn-toggle-api');
    const timerCardEl = document.getElementById('mw-card-timer');
    const miniTimeEl = document.getElementById('mw-mini-time');
    const miniRingEl = document.getElementById('mw-mini-ring');
    const returnBtn = document.getElementById('mw-btn-return');
    const settingsPanel = document.getElementById('mw-settings');

    let lastBadgeState = null;
    /* ================= BADGE API ================= */
    function setApiBadge(state, label) {
        if (state === lastBadgeState && state !== 'loading') return;
        lastBadgeState = state;
        apiBadgeEl.className = 'mw-api-badge ' + state;
        if (state === 'loading') apiBadgeEl.innerHTML = '<span class="mw-spinner"></span> ' + (label || 'Sync API…');
        else apiBadgeEl.innerText = label;
        apiBadgeEl.style.animation = 'none';
        void apiBadgeEl.offsetWidth;
        apiBadgeEl.style.animation = 'mw-badge-in 0.35s ease';
    }
    function updateApiTimestamp() {
        const ts = parseInt(localStorage.getItem(STORAGE_KEY_API_TS) || '0', 10);
        if (!ts) { apiTsEl.innerText = 'jamais synchronisé'; return; }
        const diff = Math.max(0, Date.now() - ts);
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        const txt = min > 0 ? `sync il y a ${min} min` : `sync il y a ${sec} s`;
        if (apiTsEl.innerText !== txt) apiTsEl.innerText = txt;
    }
    function refreshApiBadgeFromStorage() {
        const ok = localStorage.getItem(STORAGE_KEY_API_OK);
        if (ok === '1') setApiBadge('ok', 'API ✓ synchronisé');
        else if (ok === '0') setApiBadge('err', 'API hors-ligne');
        else setApiBadge('idle', 'API en attente');
    }

    let targetPercent = null;
    let displayedPercent = null;

    /* ================= AFFICHAGE ================= */
    function setPercentDisplay(raw) {
        const t = toPercent(raw);
        if (t === null) return;
        targetPercent = t;
        if (displayedPercent === t) return;
        displayedPercent = t;

        realPercentEl.innerText = t + ' %';
        realPercentEl.classList.remove('mw-pop');
        void realPercentEl.offsetWidth;
        realPercentEl.classList.add('mw-pop');

        realPercentEl.style.color = t >= 90 ? '#ff4757' : t >= 70 ? '#ffa502' : '#2ed573';
        progressQuotaEl.style.width = t + '%';
        progressQuotaEl.className = 'mw-progress-fill ' + (t >= 90 ? 'fill-gradient-coral' : t >= 70 ? 'fill-gradient-amber' : 'fill-gradient-green');
        widget.classList.toggle('mw-critical', t >= 90);
    }

    function ringColorForPercent(p) {
        if (p == null) return '#6c5ce7';
        if (p >= 90) return '#ff6b6b';
        if (p >= 70) return '#ffa502';
        return '#2ed573';
    }
    function setRing(frac, color) {
        const f = Math.max(0, Math.min(1, frac || 0));
        miniRingEl.setAttribute('stroke-dashoffset', String(RING_CIRC * (1 - f)));
        miniRingEl.setAttribute('stroke', color);
    }
    function popElement(el) {
        el.classList.remove('mw-pop');
        void el.offsetWidth;
        el.classList.add('mw-pop');
    }
    function celebrate() {
        const ring = document.createElement('div');
        ring.className = 'mw-ring';
        const size = 40;
        ring.style.width = size + 'px';
        ring.style.height = size + 'px';
        ring.style.left = (widget.offsetWidth / 2 - size / 2) + 'px';
        ring.style.top = (widget.offsetHeight / 2 - size / 2) + 'px';
        widget.appendChild(ring);
        setTimeout(() => ring.remove(), 900);
        popElement(countdownEl);
        timerCardEl.classList.remove('mw-flash');
        void timerCardEl.offsetWidth;
        timerCardEl.classList.add('mw-flash');
    }
    function formatHMS(ms) {
        if (ms == null || !Number.isFinite(ms) || ms < 0) ms = 0;
        const total = Math.floor(ms / 1000);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    function formatDuration(ms) {
        if (!Number.isFinite(ms) || ms <= 0) return '—';
        const totalMinutes = Math.round(ms / 60000);
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        if (days > 0) return `${days}j ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    function updateMini(oldestRemaining, elapsedPct) {
        const q = targetPercent;
        const textMode = getMiniMode();
        const circleMode = getCircleMode();
        const hasActiveWindow = oldestRemaining != null && oldestRemaining > 0;
        const windowEnded = oldestRemaining != null && oldestRemaining <= 0;

        if (textMode === 'used') {
            miniTimeEl.innerText = q != null ? q + '%' : '—';
        } else if (textMode === 'remaining') {
            miniTimeEl.innerText = q != null ? Math.max(0, 100 - q) + '%' : '—';
        } else {
            if (hasActiveWindow) {
                const total = Math.floor(oldestRemaining / 1000);
                const h = Math.floor(total / 3600);
                const m = Math.floor((total % 3600) / 60);
                const s = total % 60;
                miniTimeEl.innerText = h >= 1
                    ? `${h}h${String(m).padStart(2, '0')}`
                    : (m >= 1 ? `${m}m` : `${s}s`);
            } else if (windowEnded) {
                miniTimeEl.innerText = '✓';
            } else {
                miniTimeEl.innerText = q != null ? q + '%' : '—';
            }
        }

        if (circleMode === 'used') {
            if (q != null) {
                setRing(q / 100, ringColorForPercent(q));
            } else {
                setRing(0, '#6c5ce7');
            }
        } else if (circleMode === 'remaining') {
            if (q != null) {
                const remPct = Math.max(0, 100 - q);
                setRing(remPct / 100, ringColorForPercent(q));
            } else {
                setRing(0, '#6c5ce7');
            }
        } else {
            if (hasActiveWindow) {
                setRing(elapsedPct / 100, ringColorForPercent(q));
            } else if (windowEnded) {
                setRing(1, '#2ed573');
            } else if (q != null) {
                setRing(q / 100, ringColorForPercent(q));
            } else {
                setRing(0, '#6c5ce7');
            }
        }
    }

const SB_CIRC = 2 * Math.PI * 20;
    function setSbRing(id, frac) {
        const el = document.getElementById(id);
        if (!el) return;
        const f = Math.max(0, Math.min(1, frac || 0));
        const circ = parseFloat(el.getAttribute('stroke-dasharray')) || SB_CIRC;
        el.setAttribute('stroke-dashoffset', String(circ * (1 - f)));
    }
    /* ================= UPDATE UI ================= */
    function applyUiMode() {
        const mode = getUiMode();
        document.body.classList.toggle('mw-mode-sidebar', mode === 'sidebar');
        document.body.classList.toggle('mw-mode-classic', mode !== 'sidebar');
        sidebar.classList.toggle('mw-hidden', mode !== 'sidebar');
        if (mode !== 'sidebar') popover.classList.remove('open');
        const btn = document.getElementById('mw-btn-ui-mode');
        if (btn) btn.innerText = mode === 'sidebar' ? 'Barre latérale' : 'Classique';
    }
    function syncUiModeButton() { applyUiMode(); }

    function formatResetIn(ms) {
        if (!Number.isFinite(ms) || ms <= 0) return '—';
        const m = Math.round(ms / 60000);
        if (m < 60) return `Réinit. dans ${m} min`;
        const h = Math.floor(m / 60); const mm = m % 60;
        return `Réinit. dans ${h}h ${mm}m`;
    }
    function nextMondayResetLabel() {
        const now = new Date();
        const day = now.getDay();
        let add = (8 - day) % 7; if (add === 0 && now.getHours() >= 16) add = 7;
        if (add === 0) add = 7;
        const d = new Date(now); d.setDate(now.getDate() + add); d.setHours(16, 17, 0, 0);
        return 'Réinit. ' + d.toLocaleDateString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h');
    }

    /* ================= SIMULATEUR DE RÉCUPÉRATION ================= */
    function fmtCentsFr(c) { return (Math.round(c * 100) / 100).toFixed(2).replace('.', ',') + '¢'; }
    function fmtPctFr(v) {
        if (v == null || !Number.isFinite(v)) return '—';
        const r = Math.round(v * 10) / 10;
        return (Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',')) + '%';
    }
    function fmtDurMin(min) {
        if (!Number.isFinite(min) || min <= 0) return 'maintenant';
        if (min < 60) return `${min} min`;
        const h = Math.floor(min / 60), m = min % 60;
        return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
    }
    function fmtHrMin(ms) { return fmtDurMin(Number.isFinite(ms) ? Math.round(ms / 60000) : 0); }
    function fmtClock(ts) { return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }); }

    function simProjection(reqs, deltaMs) {
        const now = Date.now();
        const horizon = now + Math.max(0, deltaMs || 0);
        const events = [];
        for (const r of (reqs || [])) {
            const c = numberOrNull(r && r.cents);
            if (!r || !Number.isFinite(r.ts) || c === null || c <= 0) continue;
            events.push({ rel: r.ts + WINDOW_MS, cents: c });
        }
        events.sort((a, b) => a.rel - b.rel);
        let recovered = 0, count = 0;
        for (const e of events) if (e.rel <= horizon) { recovered += e.cents; count++; }
        const next = events.find(e => e.rel > now) || null;
        const total = numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        const spend = numberOrNull(localStorage.getItem(STORAGE_KEY_SPEND_CENTS));
        let curPct = targetPercent;
        if (curPct == null && spend != null && total != null && total > 0) curPct = (spend / total) * 100;
        let futurePct = null;
        if (curPct != null && total != null && total > 0) futurePct = Math.max(0, curPct - (recovered / total) * 100);
        const maxRemaining = events.length ? Math.max(0, events[events.length - 1].rel - now) : 0;
        const totalRecoverable = events.reduce((s, e) => s + e.cents, 0);
        return { recovered, count, totalReqs: events.length, totalRecoverable, next, curPct, futurePct, maxRemaining };
    }

    let _simDotsSig = null;
    function updateSimulator(reqs) {
        const slider = document.getElementById('mw-sim-slider');
        const chip = document.getElementById('mw-sim-chip');
        const marks = document.getElementById('mw-sim-marks');
        const result = document.getElementById('mw-sim-result');
        const offsetEl = document.getElementById('mw-sim-offset');
        if (!slider || !result) return;
        const list = Array.isArray(reqs) ? reqs : getRequests();
        const now = Date.now();
        const dragging = slider === document.activeElement;

        const proj0 = simProjection(list, 0);
        const maxMin = Math.ceil(proj0.maxRemaining / 60000);
        const newMax = String(Math.max(maxMin, 5));
        if (slider.getAttribute('max') !== newMax) slider.setAttribute('max', newMax);
        const disabled = proj0.totalReqs === 0;
        if (slider.disabled !== disabled) slider.disabled = disabled;

        if (chip) {
            const chipTxt = disabled ? '—' : `↺ +<b>${fmtCentsFr(proj0.totalRecoverable)}</b> d'ici ${fmtHrMin(proj0.maxRemaining)}`;
            if (chip.innerHTML !== chipTxt) chip.innerHTML = chipTxt;
        }

        let min = parseInt(slider.value, 10) || 0;
        if (!dragging) {
            if (min > maxMin && maxMin > 0) { min = maxMin; slider.value = String(min); } // horizon rétréci (libérations passées)
            if (maxMin <= 0) min = 0;
        }
        if (offsetEl) offsetEl.textContent = disabled ? '—' : fmtDurMin(min);

        if (marks) {
            const sig = list.map(r => `${r.ts}:${r.cents}`).join('|') + '#' + newMax;
            if (sig !== _simDotsSig) {
                _simDotsSig = sig;
                const evs = [];
                for (const r of list) { const c = numberOrNull(r.cents); if (Number.isFinite(r.ts) && c !== null && c > 0) evs.push({ rel: r.ts + WINDOW_MS, cents: c }); }
                evs.sort((a, b) => b.cents - a.cents);
                marks.innerHTML = evs.slice(0, 12).map(e =>
                    `<span class="mw-sim-dot${e.cents >= 1 ? ' big' : ''}" data-rel="${e.rel}" title="+${fmtCentsFr(e.cents)} · ${fmtClock(e.rel)}"></span>`
                ).join('');
            }
            const maxMs = Math.max(1, maxMin * 60000);
            for (const d of marks.children) {
                const rel = parseFloat(d.getAttribute('data-rel'));
                d.style.left = Math.max(0, Math.min(100, ((rel - now) / maxMs) * 100)) + '%';
            }
        }

        let txt;
        if (disabled) txt = 'Aucune requête — rien à libérer dans la fenêtre glissante';
        else {
            const p = simProjection(list, min * 60000);
            if (min <= 0) {
                txt = p.next
                    ? `Prochaine libération : +<b>${fmtCentsFr(p.next.cents)}</b> dans ${fmtHrMin(p.next.rel - now)} (${fmtClock(p.next.rel)})`
                    : 'Glisse le curseur vers le futur pour projeter le quota récupéré';
            } else if (p.count === 0) {
                txt = p.next
                    ? `Rien de libéré d'ici ${fmtDurMin(min)} — prochaine lib. dans ${fmtHrMin(p.next.rel - now)} (+${fmtCentsFr(p.next.cents)})`
                    : `Rien de libéré d'ici ${fmtDurMin(min)}`;
            } else {
                const pctPart = (p.futurePct != null && p.curPct != null)
                    ? ` · <b>${fmtPctFr(p.curPct)}</b> <span class="mw-sim-arrow">→</span> <b>${fmtPctFr(p.futurePct)}</b>`
                    : '';
                txt = `+<b>${fmtCentsFr(p.recovered)}</b> récupérés d'ici ${fmtDurMin(min)}${pctPart}`;
            }
        }
        if (result.innerHTML !== txt) result.innerHTML = txt;
    }

    function updatePopoverSimHint(reqs) {
        const el = document.getElementById('mw-pop-sim-hint');
        if (!el) return;
        const list = Array.isArray(reqs) ? reqs : getRequests();
        const p = simProjection(list, 0);
        let txt;
        if (p.totalReqs === 0) txt = 'Aucune libération prévue';
        else {
            const parts = [];
            if (p.next) parts.push(`prochaine : +${fmtCentsFr(p.next.cents)} dans ${fmtHrMin(p.next.rel - Date.now())}`);
            parts.push(`total +${fmtCentsFr(p.totalRecoverable)} d'ici ${fmtHrMin(p.maxRemaining)}`);
            txt = '↺ ' + parts.join(' · ');
        }
        if (el.innerText !== txt) el.innerText = txt;
    }
    function getDailyModel() { return localStorage.getItem(STORAGE_KEY_DAILY_MODEL) || ''; }
    function setDailyModel(v) { if (v) localStorage.setItem(STORAGE_KEY_DAILY_MODEL, v); else localStorage.removeItem(STORAGE_KEY_DAILY_MODEL); }
    function getDailyByModelMap() {
        const m = readJSON(STORAGE_KEY_DAILY_BYMODEL, {});
        for (const k of Object.keys(m)) if (isJunkModelKey(k)) delete m[k];
        const p = readJSON(STORAGE_KEY_MODEL_PCT, {});
        for (const [k,v] of Object.entries(p)) if (Number.isFinite(v) && !isJunkModelKey(k)) m[k] = v;
        return m;
    }
    function resolveDailyPct(dailyModel, map) {
        if (!dailyModel) return null;
        if (map[dailyModel] != null && Number.isFinite(map[dailyModel])) return map[dailyModel];
        const low = dailyModel.toLowerCase();
        for (const [k, v] of Object.entries(map)) {
            if (k.toLowerCase() === low && Number.isFinite(v)) return v;
        }
        for (const [k, v] of Object.entries(map)) {
            const kl = k.toLowerCase();
            if (low.includes(kl) || kl.includes(low)) return v;
        }
        return null;
    }
    let _lastDailyKey = '';
    function populateDailyModelSelect() {
        const sel = document.getElementById('mw-pop-model-select');
        if (!sel) return;
        let current = getDailyModel();
        const modelsRaw = localStorage.getItem(STORAGE_KEY_MODELS) || '';
        const list = modelsRaw ? modelsRaw.split(/\s*(?:·|,)\s*/).map(s => s.replace(/\s*\+\d+$/, '').trim()).filter(Boolean) : [];
        const genericBrands = new Set(['Claude','Grok','GPT','Gemini','Llama','DeepSeek','Mistral','Kimi']);
        const filtered = list.filter(m => !genericBrands.has(m));
        const all = filtered.length ? filtered : list;
        if (genericBrands.has(current)) {
            const mapped = all.find(m => resolveDailyPct(m, getDailyByModelMap()) != null && m.toLowerCase().includes(current.toLowerCase()))
                || all.find(m => m.toLowerCase().includes(current.toLowerCase()));
            if (mapped) { current = mapped; setDailyModel(current); }
            else { current = ''; setDailyModel(''); }
        }
        const key = all.join('|') + '|' + current;
        if (key === _lastDailyKey && sel.options.length === all.length + 1) {
            if (sel.value !== current) sel.value = current;
            return;
        }
        _lastDailyKey = key;
        const prev = sel.value;
        sel.innerHTML = '<option value="">— Aperçu autre modèle —</option>' + all.map(m => `<option value="${m.replace(/"/g,'&quot;')}">${m}</option>`).join('');
        sel.value = all.includes(prev) ? prev : (all.includes(current) ? current : '');
        if (!sel.value && current === '') sel.value = '';
    }
    /* ================= logos laboratoire + animations ================= */

let _mwRenderedSig = null;
let _mwPrevPct = {};

    function getLogoMode() { return localStorage.getItem(STORAGE_KEY_LOGO_MODE) === '1'; }
    function setLogoMode(on) { localStorage.setItem(STORAGE_KEY_LOGO_MODE, on ? '1' : '0'); syncLogoToggle(); }
    function bumpEl(el) {
        try { el.classList.remove('mw-bump'); void el.offsetWidth; el.classList.add('mw-bump'); } catch {}
    }
    function setTextBump(el, txt) {
        if (!el) return;
        if (el.innerText !== txt) { el.innerText = txt; bumpEl(el); }
    }
    function syncLogoToggle() {
        const b = document.getElementById('mw-logo-toggle');
        if (!b) return;
        const on = getLogoMode();
        b.classList.toggle('on', on);
        b.innerHTML = on ? brandLogoSvg('', 13) : '%';
        b.title = on ? 'Afficher les % (à la place des logos)' : 'Afficher les logos des laboratoires (à la place des %)';
    }
    let _sb3LogoFam = null;
    function renderRing3Logo(modelName, pct) {
        const logoEl = document.getElementById('mw-sb-logo-3');
        const pctEl = document.getElementById('mw-sb-pct-3');
        const itemEl = document.getElementById('mw-sb-3');
        const iconEl = document.getElementById('mw-sb-icon-3');
        if (!logoEl || !pctEl) return;
        if (!modelName) {
            if (logoEl.style.display !== 'none') { logoEl.style.display = 'none'; _sb3LogoFam = null; }
            if (pctEl.style.display !== '') pctEl.style.display = '';
            if (iconEl && iconEl.style.display !== '') iconEl.style.display = '';
            if (itemEl && itemEl.title !== 'Quota journalier') itemEl.title = 'Quota journalier';
            return;
        }
        const fam = brandFamilyOf(modelName) || '';
if (_sb3LogoFam !== fam) {
            logoEl.innerHTML = brandLogoSvg(fam, 32);
            _sb3LogoFam = fam;
            bumpEl(logoEl);
        }
        if (logoEl.style.display !== 'flex') logoEl.style.display = 'flex';
        if (pctEl.style.display !== 'none') pctEl.style.display = 'none';
        if (iconEl && iconEl.style.display !== 'none') iconEl.style.display = 'none';
        const t = 'Quota journalier · ' + modelName + ' — ' + (pct != null ? pct + '%' : '—');
        if (itemEl && itemEl.title !== t) itemEl.title = t;
    }
    function brandLogoSvg(fam, size = 18) {
        const wrap = (inner) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
        const badge = (bg, d) => wrap(`<circle cx="12" cy="12" r="12" fill="${bg}"/><g transform="translate(3.84 3.84) scale(0.68)" fill="#fff"><path d="${d}"/></g>`);
        const letter = (bg, ch) => wrap(`<circle cx="12" cy="12" r="12" fill="${bg}"/><text x="12" y="16.6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12.5" font-weight="800" fill="#fff">${ch}</text>`);
        switch (fam) {
            case 'Grok':
                return wrap(`<circle cx="12" cy="12" r="12" fill="#000"/><g transform="translate(3.84 3.84) scale(0.0159375)" fill="#fff"><path d="${GROK_1}"/><path d="${GROK_2}"/></g>`);
            case 'Claude':
                return badge('#D97757', 'm4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z');
            case 'GPT':
                return wrap(`<circle cx="12" cy="12" r="12" fill="#F3F3F0"/><g transform="translate(3.84 3.84) scale(0.68)" fill="#0F0F0F"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></g>`);
            case 'Gemini':
                return wrap(`<defs><linearGradient id="mwg-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4E8BFF"/><stop offset="1" stop-color="#9B72FF"/></linearGradient></defs><circle cx="12" cy="12" r="12" fill="url(#mwg-grad)"/><g transform="translate(3.84 3.84) scale(0.68)" fill="#fff"><path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"/></g>`);
            case 'Qwen':
                return badge('#6950EF', 'M23.919 14.545 20.817 9.17l1.47-2.544a.56.56 0 0 0 0-.566l-1.633-2.83a.57.57 0 0 0-.49-.283h-6.207L12.487.402a.57.57 0 0 0-.49-.284H8.732a.56.56 0 0 0-.49.284L5.139 5.775h-2.94a.56.56 0 0 0-.49.284L.077 8.887a.56.56 0 0 0 0 .567L3.18 14.83l-1.47 2.545a.56.56 0 0 0 0 .566l1.634 2.83a.57.57 0 0 0 .49.283h6.205l1.47 2.545a.57.57 0 0 0 .49.284h3.266a.57.57 0 0 0 .49-.284l3.104-5.375h2.94a.57.57 0 0 0 .49-.283l1.634-2.828a.55.55 0 0 0-.004-.568M8.733.686l1.634 2.828-1.634 2.828H21.8L20.164 9.17H7.425L5.63 6.06Zm1.306 19.801-6.205-.002 1.634-2.83h3.265L2.201 6.344h3.267q3.182 5.517 6.367 11.032zm10.124-5.66L18.53 12l-6.532 11.315-1.634-2.83c2.129-3.673 4.25-7.351 6.373-11.028h3.592l3.102 5.374z');
            case 'DeepSeek':
                return badge('#5786FE', 'M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45');
            case 'Mistral':
                return badge('#FA520F', 'M17.143 3.429v3.428h-3.429v3.429h-3.428V6.857H6.857V3.43H3.43v13.714H0v3.428h10.286v-3.428H6.857v-3.429h3.429v3.429h3.429v-3.429h3.428v3.429h-3.428v3.428H24v-3.428h-3.43V3.429z');
            case 'Llama':
                return badge('#0467DF', 'M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z');
            case 'Kimi':
                return wrap(`<circle cx="12" cy="12" r="12" fill="#F5F5F3"/><g transform="translate(3.84 3.84) scale(0.68)" fill="#111"><path d="M21.765.351C22.998.351 24 1.353 24 2.586S22.998 4.82 21.765 4.82h-1.974c-.15 0-.26-.12-.26-.26V2.586A2.237 2.237 0 0 1 21.765.35M9.41 13.388l8.447-8.377c.16-.16.07-.471-.14-.471h-4.55s-.1.02-.14.06l-9.099 9.029c-.14.14-.35.02-.35-.21V4.81c0-.15-.1-.27-.221-.27H.22c-.12 0-.22.12-.22.27v18.57c0 .15.1.27.22.27h3.137c.12 0 .22-.12.22-.27v-3.79c0-.08.03-.16.08-.21l2.826-2.796c.07-.07.16-.08.241-.03l7.546 5.551a8.9 8.9 0 0 0 4.018 1.493c.12.01.23-.11.23-.27V19.76c0-.14-.08-.25-.19-.26a5.8 5.8 0 0 1-2.355-.942l-6.533-4.73c-.14-.09-.15-.32-.03-.441"/></g>`);
            case 'GLM':
                return letter('#2A6BFF', 'G');
            default: // inconnu — badge dégradé + ✦ (pas de faux logo de marque)
                return wrap(`<defs><linearGradient id="mwd-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa502"/><stop offset="1" stop-color="#ff8e53"/></linearGradient></defs><circle cx="12" cy="12" r="12" fill="url(#mwd-grad)"/><text x="12" y="16.6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="800" fill="#fff">✦</text>`);
        }
    }
    const GROK_1 = 'M395.479 633.828L735.91 381.105C752.599 368.715 776.454 373.548 784.406 392.792C826.26 494.285 807.561 616.253 724.288 699.996C641.016 783.739 525.151 802.104 419.247 760.277L303.556 814.143C469.49 928.202 670.987 899.995 796.901 773.282C896.776 672.843 927.708 535.937 898.785 412.476L899.047 412.739C857.105 231.37 909.358 158.874 1016.4 10.6326C1018.93 7.11771 1021.47 3.60279 1024 0L883.144 141.651V141.212L395.392 633.916';
    const GROK_2 = 'M325.226 695.251C206.128 580.84 226.662 403.776 328.285 301.668C403.431 226.097 526.549 195.254 634.026 240.596L749.454 186.994C728.657 171.88 702.007 155.623 671.424 144.2C533.19 86.9942 367.693 115.465 255.323 228.382C147.234 337.081 113.244 504.215 171.613 646.833C215.216 753.423 143.739 828.818 71.7385 904.916C46.2237 931.893 20.6216 958.87 0 987.429L325.139 695.339';

    function renderModelBlocks() {
        const c = document.getElementById('mw-pop-models');
        if (!c) return;
        const harvested = readJSON(STORAGE_KEY_MODEL_PCT, {});
        const usedModels = [...new Set(Object.keys(harvested).filter(k => k !== k.toLowerCase() && /^[A-Z]/.test(k) && !isJunkModelKey(k) && Number.isFinite(harvested[k])))];
        usedModels.sort((a, b) => harvested[b] - harvested[a]);
        const logoMode = getLogoMode();
        if (!usedModels.length) {
            if (_mwRenderedSig !== 'empty') {
                _mwRenderedSig = 'empty';
                _mwPrevPct = {};
                const onSettings = window.location.pathname.includes('/app/account/settings');
                c.innerHTML = `<div class="mw-pop-used" style="text-align:center;padding:8px 0;line-height:1.5">
                    ${onSettings ? 'Clique <b>Rafraîchir</b> pour scanner les quotas par modèle.' : 'Va sur <b>Réglages → Quota</b> puis clique <b>Rafraîchir</b> dans ce panneau.<br><span style="font-size:10px;opacity:0.7">Le scan lit la jauge affichée sous chaque modèle (ex : Grok Fast 3%).</span>'}
                </div>`;
            }
            return;
        }
        const colors = { Grok:['#ff6b6b','#ff8e53'], Claude:['#a29bfe','#6c5ce7'], GPT:['#2ed573','#7bed9f'], Gemini:['#ffa502','#ffc048'] };
        const defaultCol = ['#ffa502','#ffc048'];
        const namesSig = usedModels.join('|') + (logoMode ? '#L' : '#P');
        if (namesSig !== _mwRenderedSig) {
            _mwRenderedSig = namesSig;
            _mwPrevPct = {};
            c.innerHTML = usedModels.map((name, i) => {
                const pct = harvested[name] != null ? harvested[name] : 0;
                const fam = brandFamilyOf(name);
                const col = colors[fam] || defaultCol;
                const safeName = String(name).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                const headRight = logoMode
                    ? `<span class="mw-model-logo" title="${fam || 'Laboratoire'}">${brandLogoSvg(fam)}</span>`
                    : `<span class="mw-model-pct">${pct}%</span>`;
                return `<div class="mw-model-block mw-enter" style="animation-delay:${i * 70}ms">
                    <div class="mw-model-head"><span class="mw-model-name">${safeName}</span>${headRight}</div>
                    <div class="mw-pop-bar" style="margin-top:6px"><div class="mw-pop-fill" style="width:${pct}%;background:linear-gradient(90deg,${col[0]},${col[1]})"></div></div>
                    <div class="mw-pop-used">${pct}% utilisé · ${safeName}</div>
                </div>`;
            }).join('');
            for (const name of usedModels) _mwPrevPct[name] = harvested[name];
            return;
        }
        const blocks = c.querySelectorAll('.mw-model-block');
        usedModels.forEach((name, i) => {
            const block = blocks[i];
            if (!block) return;
            const pct = harvested[name] != null ? harvested[name] : 0;
            if (_mwPrevPct[name] === pct) return;
            const fill = block.querySelector('.mw-pop-fill');
            if (fill) fill.style.width = pct + '%';
            const pctEl = block.querySelector('.mw-model-pct');
            if (pctEl) { pctEl.textContent = pct + '%'; bumpEl(pctEl); }
            const usedEl = block.querySelector('.mw-pop-used');
            if (usedEl) { usedEl.textContent = pct + '% utilisé · ' + name; bumpEl(usedEl); }
            _mwPrevPct[name] = pct;
        });
    }
    function updateSidebar() {
const q = targetPercent;
        const reqs = getRequests();
        const now = Date.now();
        const pct1 = q;
        let elapsedPct = 0; let oldestRem = null;
        if (reqs.length) { const oldest = reqs[0]; oldestRem = Math.max(0, oldest.ts + WINDOW_MS - now); elapsedPct = Math.min(100, ((WINDOW_MS - oldestRem) / WINDOW_MS) * 100); }
        const pct2 = Math.round(elapsedPct);
        const dailyModel = getDailyModel();
        const byModel = getDailyByModelMap();
        let pct3;
let model3 = null;
        const resolved = resolveDailyPct(dailyModel, byModel);
        if (dailyModel && resolved != null) {
            pct3 = Math.max(0, Math.min(100, Math.round(resolved)));
            model3 = dailyModel;
        } else if (dailyModel && resolved == null) {
            pct3 = 0;
            model3 = dailyModel;
        } else {
            const vals = Object.values(readJSON(STORAGE_KEY_MODEL_PCT, {})).filter(v=>Number.isFinite(v));
            pct3 = vals.length ? Math.max(...vals) : (q != null ? q : 0);
            if (vals.length) {
                const harvested = readJSON(STORAGE_KEY_MODEL_PCT, {});
                let top = null, topVal = -1;
                for (const k of displayableModelNames(harvested)) {
                    if (harvested[k] > topVal) { topVal = harvested[k]; top = k; }
                }
                if (top) model3 = top;
            }
        }

        const p1 = pct1, p2 = pct2, p3 = pct3;
        const el1 = document.getElementById('mw-sb-pct-1'), el2 = document.getElementById('mw-sb-pct-2'), el3 = document.getElementById('mw-sb-pct-3');
        setTextBump(el1, p1 != null ? p1 + '%' : '—');
        if (el2) el2.innerText = p2 ? p2 + '%' : '—';
setTextBump(el3, p3 ? p3 + '%' : '—');
renderRing3Logo(model3, p3);
        setSbRing('mw-sb-ring-1', p1 != null ? p1 / 100 : 0);
        setSbRing('mw-sb-ring-2', p2 / 100);
        setSbRing('mw-sb-ring-3', p3 / 100);

        const f1 = document.getElementById('mw-pop-fill-1'), f2 = document.getElementById('mw-pop-fill-2');
        if (f1) f1.style.width = (p1 != null ? p1 : 0) + '%';
        if (f2) f2.style.width = p2 + '%';
        renderModelBlocks();
        const previewEl = document.getElementById('mw-pop-used-preview');
        if (previewEl) {
            if (dailyModel && resolveDailyPct(dailyModel, byModel) != null) {
                const pv = Math.round(resolveDailyPct(dailyModel, byModel));
                previewEl.style.display = 'block';
                previewEl.innerText = pv + '% utilisé · ' + dailyModel + ' (aperçu)';
            } else if (dailyModel) {
                previewEl.style.display = 'block';
                previewEl.innerText = 'En attente — va sur Réglages → Quota puis Rafraîchir · ' + dailyModel;
            } else previewEl.style.display = 'none';
        }
        const u1 = document.getElementById('mw-pop-used-1'), u2 = document.getElementById('mw-pop-used-2');
        setTextBump(u1, p1 != null ? p1 + '% utilisé' : '—');
        if (u2) u2.innerText = p2 ? p2 + '% utilisé' : 'Aucune requête';
        const r1 = document.getElementById('mw-pop-reset-1');
        if (r1) r1.innerText = oldestRem != null && oldestRem > 0 ? formatResetIn(oldestRem) : (reqs.length ? 'Libéré ✓' : '—');
        const r2 = document.getElementById('mw-pop-reset-2');
        if (r2) r2.innerText = oldestRem != null && oldestRem > 0 ? formatResetIn(oldestRem) : '—';
updatePopoverSimHint(reqs);
        const rm = document.getElementById('mw-pop-reset-models');
        if (rm) rm.innerText = nextMondayResetLabel();
        const tEl = document.getElementById('mw-pop-time');
        if (tEl) tEl.innerText = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
        const d1 = document.getElementById('mw-sb-dot-1'), d2 = document.getElementById('mw-sb-dot-2'), d3 = document.getElementById('mw-sb-dot-3');
        if (d1) d1.classList.toggle('on', p1 != null && p1 >= 90);
        if (d2) d2.classList.toggle('on', p2 >= 90);
        if (d3) d3.classList.toggle('on', p3 >= 90);
    }

    function updateUI() {
        setPercentDisplay(localStorage.getItem(STORAGE_KEY_QUOTA));

        const savedModels = localStorage.getItem(STORAGE_KEY_MODELS);
        if (savedModels && quotaModelsEl.innerText !== savedModels) {
            quotaModelsEl.innerText = savedModels;
            quotaModelsEl.style.color = '#cfcfd6';
            setTimeout(() => { quotaModelsEl.style.color = ''; }, 400);
        }

        const requests = getRequests();
        const now = Date.now();
        let oldestRemaining = null;
        let elapsedPct = 0;

        if (requests.length === 0) {
            countdownEl.classList.remove('mw-pulse-text');
            if (countdownEl.innerText !== '00:00:00') countdownEl.innerText = '00:00:00';
            const txt = 'Aucune requête en fenêtre glissante';
            if (statusEl.innerText !== txt) statusEl.innerText = txt;
            progressTimerEl.style.width = '0%';
        } else {
            const oldest = requests[0];
            const newest = requests[requests.length - 1];
            oldestRemaining = Math.max(0, oldest.ts + WINDOW_MS - now);
            const newestRemaining = Math.max(0, newest.ts + WINDOW_MS - now);
            elapsedPct = Math.min(100, ((WINDOW_MS - oldestRemaining) / WINDOW_MS) * 100);

            const totalCents = requests.reduce((s, r) => s + (numberOrNull(r.cents) || 0), 0);
            const oldestTxt = formatHMS(oldestRemaining);

            if (countdownEl.innerText !== oldestTxt) countdownEl.innerText = oldestTxt;
            countdownEl.classList.toggle('mw-pulse-text', oldestRemaining <= 0);

            const newStatus = `${requests.length} req · ${totalCents.toFixed(2)}¢ · dernier libéré dans ${formatHMS(newestRemaining)}`;
            if (statusEl.innerText !== newStatus) statusEl.innerText = newStatus;
            progressTimerEl.style.width = elapsedPct.toFixed(1) + '%';
        }

        updateMini(oldestRemaining, elapsedPct);
updateSimulator(requests);
        updateApiTimestamp();
        refreshApiBadgeFromStorage();
        populateDailyModelSelect();
        updateSidebar();
    }

    /* ================= NOMS DE MODÈLES ================= */
    function beautifyModelName(raw) {
        if (raw == null) return '';
        let s = String(raw).trim().toLowerCase();
        if (!s) return s;
        s = s.replace(/^(anthropic[-_\/\s]?(?:claude[-_\/\s]?)?|openrouter[-_\/\s]?|openai[-_\/\s]?|google[-_\/\s]?(?:gemini[-_\/\s]?)?|meta[-_\/\s]?(?:llama[-_\/\s]?)?|moonshot(?:ai)?[-_\/\s]?|mistralai[-_\/\s]?|mistral[-_\/\s]?ai[-_\/\s]?|xai[-_\/\s]?(?:grok[-_\/\s]?)?|cohere[-_\/\s]?|nvidia[-_\/\s]?|amazon[-_\/\s]?|ai21[-_\/\s]?|together[-_\/\s]?|fireworks[-_\/\s]?|groq[-_\/\s]?|deepinfra[-_\/\s]?|anyscale[-_\/\s]?|perplexity[-_\/\s]?|replicate[-_\/\s]?|claude[-_\/\s]?|mammouth[-_\/\s]?)/, '');
        s = s.replace(/[-_\/](preview|instruct|image|customtools|latest|stable|ga)\b/g, '');
        s = s.replace(/[-_\/]\d{4}\b/g, '');
        s = s.replace(/(^|[^0-9.])(\d)[p\-](\d)(?![0-9.])/g, '$1$2.$3');
        s = s.replace(/[-_\/]+/g, ' ');
        s = s.replace(/([a-z]{2,})(\d)/g, '$1 $2');
        s = s.replace(/(\d)b\b/g, '$1B');
        s = s.replace(/\ba(\d+B)\b/g, 'A$1');
        s = s.replace(/\b(gpt|glm|api|ai|llm|opus)\b/g, m => m.toUpperCase());
        s = s.replace(/\bdeepseek\b/g, 'DeepSeek');
        s = s.replace(/\bminimax\b/g, 'MiniMax');
        s = s.replace(/\bkimi\b/g, 'Kimi');
        s = s.replace(/\b([a-z]+)\b/g, m => m.charAt(0).toUpperCase() + m.slice(1));
        return s.replace(/\s+/g, ' ').trim();
    }

    function brandFamilyOf(name) {
        const s = String(name || '').toLowerCase();
        if (/claude|sonnet|opus|haiku|anthropic/.test(s)) return 'Claude';
        if (/grok|xai\b/.test(s)) return 'Grok';
        if (/gpt|openai|chatgpt/.test(s)) return 'GPT';
        if (/gemini|google/.test(s)) return 'Gemini';
        if (/llama|\bmeta\b/.test(s)) return 'Llama';
        if (/deepseek/.test(s)) return 'DeepSeek';
        if (/mistral|mixtral/.test(s)) return 'Mistral';
        if (/kimi|moonshot/.test(s)) return 'Kimi';
        if (/qwen/.test(s)) return 'Qwen';
        if (/glm|zhipu/.test(s)) return 'GLM';
        return '';
    }

    /* ================= CALIBRATION ================= */
    function calibrateIfPending() {
        if (typeof _harvestInFlight !== 'undefined' && _harvestInFlight) {
            return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        }
        const isSettingsPage = window.location.pathname.includes('/app/account/settings');
        if (!isSettingsPage) {
            return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        }
        if (localStorage.getItem(STORAGE_KEY_CALIBRATE_PENDING) !== '1') {
            return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        }
        const now = Date.now();
        const lastCal = parseInt(localStorage.getItem(STORAGE_KEY_LAST_CALIBRATION) || '0', 10);
        if (now - lastCal < CALIBRATION_COOLDOWN_MS) {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
            console.log('[MammouthWidget] Calibration skipped (cooldown)');
            return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        }
        const domTs = parseInt(localStorage.getItem(STORAGE_KEY_DOM_PERCENT_TS) || '0', 10);
        if (now - domTs > 5000) {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
            return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        }
        const domP = numberOrNull(localStorage.getItem(STORAGE_KEY_DOM_PERCENT));
        const domPrecise = numberOrNull(localStorage.getItem(STORAGE_KEY_DOM_PCT_PRECISE));
        let domVal = (domPrecise !== null && domPrecise > 0.2 && domPrecise < 100) ? domPrecise : domP;
        const gLiveCal = readPoolGauge();
        if (gLiveCal && gLiveCal.filtered) {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
            console.log('[MammouthWidget] Calibration annulée — jauge pool filtrée/ambiguë en ce moment');
            return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        }
        if (gLiveCal && gLiveCal.precise !== null && gLiveCal.precise > 0.2 && gLiveCal.precise < 100) {
            domVal = gLiveCal.precise;
        }
        if (poolGuardActive()) {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
            console.log('[MammouthWidget] Calibration annulée — harvest en cours / trop récent (garde pool)');
            return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        }
        if (poolReadingImplausible(domVal)) {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
            logImplausiblePool(domVal);
            return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        }
        if (domVal === null || domVal <= 0 || domVal >= 100) {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
            console.warn('[MammouthWidget] Invalid DOM% for calibration:', domVal);
            return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        }
        let raw = numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED));
        if (raw === null || raw <= 0) {
            const cacheTs = parseInt(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE_TS) || '0', 10);
            if (now - cacheTs <= RAW_USED_CACHE_TTL_MS) {
                raw = numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE));
                if (raw !== null) console.log('[MammouthWidget] Using cached rawUsedSum:', raw);
            }
        }
        if (domVal !== null && domVal > 0 && domVal < 100 && raw !== null && raw > 0) {
            let total = raw / (domVal / 100);
            const prevTotal = numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
            if (prevTotal !== null && prevTotal > 0 && (total > prevTotal * 6 || total < prevTotal / 6)) {
                localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
                console.log('[MammouthWidget] Calibration refusée — total irréaliste:', prevTotal.toFixed(2), '→', total.toFixed(2), '(DOM', domVal + '%, usage', raw.toFixed(2) + ')');
                return prevTotal;
            }
            if (total > 0) {
                localStorage.setItem(STORAGE_KEY_QUOTA_TOTAL, String(total));
                localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
                localStorage.setItem(STORAGE_KEY_LAST_CALIBRATION, String(now));
                console.log('[MammouthWidget] Calibration (verrouillée): total =', total.toFixed(2), 'crédits (DOM', domVal + '%, usage brut', raw.toFixed(2) + ')');
                return total;
            }
        }
        localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
        return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
    }
    function computePercentFromRaw(rawUsedSum) {
        if (rawUsedSum === null) return null;
        const total = numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        if (total !== null && total > 0) return Math.max(0, Math.min(100, Math.round((rawUsedSum / total) * 100)));
        return null;
    }

    let _divergeCount = 0;
    let _divergeLastTs = 0;
    let _divergeFirstTs = 0;
    function recalibrateIfDivergent() {
        try {
            if (typeof _harvestInFlight !== 'undefined' && _harvestInFlight) return;
            const now = Date.now();
            const domTs = parseInt(localStorage.getItem(STORAGE_KEY_DOM_PERCENT_TS) || '0', 10);
            if (!domTs || now - domTs > 60 * 1000) { _divergeCount = 0; _divergeFirstTs = 0; return; }
            const total = numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
            if (total === null || total <= 0) return;
            const lastAuto = parseInt(localStorage.getItem(STORAGE_KEY_LAST_AUTOCAL) || '0', 10);
            if (now - lastAuto < 60 * 1000) return;
            let raw = numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED));
            if (raw === null || raw <= 0) {
                const cacheTs = parseInt(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE_TS) || '0', 10);
                if (now - cacheTs <= RAW_USED_CACHE_TTL_MS) raw = numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE));
            }
            if (raw === null || raw <= 0) return;
            const gLive = readPoolGauge();
            if (!gLive || gLive.filtered || gLive.ambiguous ||
                gLive.precise === null || gLive.precise <= 0.2 || gLive.precise >= 100) {
                _divergeCount = 0; _divergeFirstTs = 0;
                return;
            }
            if (poolGuardActive()) { _divergeCount = 0; _divergeFirstTs = 0; return; }
            const domVal = gLive.precise;
            const computed = (raw / total) * 100;
            const diff = Math.abs(computed - domVal);
            if (diff < 0.5) { _divergeCount = 0; _divergeFirstTs = 0; return; }
            const large = diff > Math.max(2.5, computed * 0.6);
            if (now - _divergeLastTs > 5000) {
                _divergeCount++; _divergeLastTs = now;
                if (!_divergeFirstTs) _divergeFirstTs = now;
                if (large && _divergeCount <= 2) {
                    console.log('[MammouthWidget] divergence pool/usage notable (jauge ' + domVal.toFixed(2) + '% vs calculé ' + computed.toFixed(2) + '%) — recalibration différée (garde anti-lecture contaminée)');
                }
            }
            const needCount = large ? 6 : 2;
            const needSpan = large ? 90000 : 0;
            if (_divergeCount >= needCount && now - _divergeFirstTs >= needSpan) {
                const newTotal = raw / (domVal / 100);
                if (newTotal > total * 6 || newTotal < total / 6) {
                    console.log('[MammouthWidget] Recalibration refusée — total irréaliste:', total.toFixed(2), '→', newTotal.toFixed(2), '(jauge', domVal + '%, usage', raw.toFixed(2) + ')');
                    _divergeCount = 0; _divergeFirstTs = 0;
                    return;
                }
                localStorage.setItem(STORAGE_KEY_QUOTA_TOTAL, String(newTotal));
                localStorage.setItem(STORAGE_KEY_LAST_AUTOCAL, String(now));
                _divergeCount = 0; _divergeFirstTs = 0;
                console.log('[MammouthWidget] Recalibration auto: total', total.toFixed(2), '→', newTotal.toFixed(2), 'crédits (jauge pool', domVal + '%, calculé', computed.toFixed(2) + '%, usage brut', raw.toFixed(2) + ')');
                const p = Math.max(0, Math.min(100, Math.round((raw / newTotal) * 100)));
                localStorage.setItem(STORAGE_KEY_QUOTA, String(p));
                updateUI();
            }
        } catch (e) { console.warn('[MammouthWidget] recalibrateIfDivergent err', e); }
    }

    function parseQuotaResponse(data) {
        const result = { percent: null, models: null, rawUsedSum: null, byModel: null };
        if (data == null) return result;

        const directPct = [data.percent, data.percentUsed, data.usagePercent, data.quotaPercent,
            data.quota && data.quota.percent,

            data.usage && data.usage.percent].find(v => toPercent(v) !== null);
        if (directPct !== undefined) result.percent = toPercent(directPct);

        if (Array.isArray(data.byBrand)) {
            let sum = 0;
            let found = false;
            const map = {};
            const brandAlias = { anthropic: 'Claude', claude: 'Claude', 'xai': 'Grok', grok: 'Grok', openai: 'GPT', gpt: 'GPT', google: 'Gemini', gemini: 'Gemini', meta: 'Llama', llama: 'Llama', deepseek: 'DeepSeek', mistral: 'Mistral' };
            for (const b of data.byBrand) {
                const v = numberOrNull(b && b.value);
                const rawBrand = String(b && (b.brand || b.name || b.model || b.id) || '').trim();
                let beautified = beautifyModelName(rawBrand);
                if (!beautified) beautified = rawBrand ? rawBrand.charAt(0).toUpperCase() + rawBrand.slice(1) : '';
                const alias = brandAlias[rawBrand.toLowerCase()];
                if (v !== null) {
                    sum += v; found = true;
                    if (beautified) map[beautified] = v;
                    if (alias && alias !== beautified) map[alias] = v;
                    map[rawBrand.toLowerCase()] = v;
                }
            }
            if (found) { result.rawUsedSum = sum; result.byModel = map; }
        }

        const modelsArr = Array.isArray(data.usedModels) ? data.usedModels
            : Array.isArray(data.models) ? data.models : null;
        if (modelsArr && modelsArr.length) {
            const names = modelsArr
                .map(m => beautifyModelName(typeof m === 'string' ? m : (m && (m.name || m.model || m.id))))
                .filter(Boolean);
            if (names.length) {
                result.models = names.length > 3
                    ? names.slice(0, 3).join(', ') + ` +${names.length - 3}`
                    : names.join(', ');
            }
        }
        return result;
    }

    const QUOTA_BAR_SELECTORS = [
        '[aria-label="Utilisation du quota"]',
        '[aria-label="Quota usage"]',
        '[aria-label="Quota utilization"]',
        '[aria-label="Usage du quota"]',
    ];

    /* ================= SCAN DOM ================= */
    function findQuotaBar(root) {
        for (const selector of QUOTA_BAR_SELECTORS) {
            const el = root.querySelector(selector);
            if (el) return el;
        }
        return null;
    }

    function isBrandFilterBtn(b) {
        const l = (b.getAttribute && b.getAttribute('aria-label')) || '';
        return l.includes("d'utilisation") && l.includes('Cliquez pour filtrer');
    }
    function gaugeCardFor(bar) {
        return bar.closest('section')
            || (bar.parentElement && (bar.parentElement.parentElement || bar.parentElement))
            || document.body;
    }
    function classifyQuotaBars() {
        const isWidget = (el) => !!(el && el.closest && el.closest('#mammouth-widget, #mw-sidebar, #mw-popover'));
        const sel = QUOTA_BAR_SELECTORS.join(', ');
        const bars = [...document.querySelectorAll(sel)].filter(b => !isWidget(b));
        const brandNames = new Set();
        [...document.querySelectorAll('button[aria-label]')].filter(isBrandFilterBtn).forEach(b => {
            const brand = ((b.getAttribute('aria-label') || '').split('—')[0] || '').trim().toLowerCase();
            if (brand) brandNames.add(brand);
        });
        const hasFilterRow = (bar, card) => !!card && [...card.querySelectorAll('button')].some(b => {
            if (bar.contains(b) || b.closest('[role="progressbar"]')) return false;
            if (isBrandFilterBtn(b)) return true;
            const t = String(b.textContent || '').trim().toLowerCase();
return !!t && brandNames.has(t);
        });
        const nameOf = new Map();
        for (const bar of bars) nameOf.set(bar, findModelNameForBar(bar));
        const preciseWidthOf = (bar) => {
            const ws = [...bar.querySelectorAll('[style*="width"]')]
                .map(el => { const m = /width\s*:\s*([\d.]+)%/.exec(el.getAttribute('style') || ''); return m ? parseFloat(m[1]) : null; })
                .filter(w => w !== null && Number.isFinite(w) && w > 0.05 && w < 100);
            return ws.length ? Math.min(...ws) : null;
        };
        const modelWidths = [];
        for (const bar of bars) {
            const nm = nameOf.get(bar);
            if (nm && !GENERIC_TITLE_RE.test(nm)) {
                const w = preciseWidthOf(bar);
                if (w !== null) modelWidths.push(w);
            }
        }
        const matchesModelWidth = (w) => w !== null && modelWidths.some(mw => Math.abs(mw - w) <= 0.02);
        let pool = null;
        for (const bar of bars) {
            const card = gaugeCardFor(bar);
            if (!hasFilterRow(bar, card)) continue;
            const nm = nameOf.get(bar);
            const generic = !nm || GENERIC_TITLE_RE.test(nm);
            if (!generic) continue;
            if (matchesModelWidth(preciseWidthOf(bar))) continue;
            pool = bar;
            break;
        }
        if (!pool && bars.length) {
            pool = bars.find(b => !matchesModelWidth(preciseWidthOf(b)))
                || (modelWidths.length ? null : bars[0]);
        }
        return { bars, pool };
    }
    function detectBrandFilterActive(bar) {
        const isWidgetNode = (el) => !!(el && el.closest && el.closest('#mammouth-widget, #mw-sidebar, #mw-popover'));
        const isVisible = (b) => {
            if (b.offsetParent) return true;
            try { return b.getClientRects().length > 0; } catch { return false; }
        };
        const matchesClear = (b) => {
            const t = (((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).toLowerCase()).trim();
            if ((t.includes('effacer') || t.includes('clear')) && (isVisible(b) || !b.offsetParent)) return true;
            return isVisible(b) && (t.trim() === '×' || t.trim() === 'x' || t.trim() === '✕');
        };
        const scope = gaugeCardFor(bar);
        const chipActive = [...scope.querySelectorAll('button[aria-label]')].some(b => {
            if (isWidgetNode(b) || !isBrandFilterBtn(b)) return false;
            if (b.getAttribute('aria-pressed') === 'true') return true;
            if (b.getAttribute('aria-checked') === 'true') return true;
            const ds = (b.getAttribute('data-state') || '').toLowerCase();
            return ds === 'on' || ds === 'checked' || ds === 'open' || ds === 'true';
        });
        if (chipActive) return true;
        return [...scope.querySelectorAll('button')].some(b => !isWidgetNode(b) && matchesClear(b));
    }
    function allGaugePreciseWidths(exceptBar) {
        const isWidgetNode = (el) => !!(el && el.closest && el.closest('#mammouth-widget, #mw-sidebar, #mw-popover'));
        const sel = QUOTA_BAR_SELECTORS.join(', ');
        const out = [];
        for (const bar of document.querySelectorAll(sel)) {
            if (isWidgetNode(bar)) continue;
            if (exceptBar && (bar === exceptBar || bar.contains(exceptBar) || exceptBar.contains(bar))) continue;
            const ws = [...bar.querySelectorAll('[style*="width"]')]
                .map(el => { const m = /width\s*:\s*([\d.]+)%/.exec(el.getAttribute('style') || ''); return m ? parseFloat(m[1]) : null; })
                .filter(w => w !== null && Number.isFinite(w) && w > 0.05 && w < 100);
            if (ws.length) out.push(Math.min(...ws));
        }
        return out;
    }
    function readPoolGauge(allowDuringHarvest) {
        if (!allowDuringHarvest && typeof _harvestInFlight !== 'undefined' && _harvestInFlight) return null;
        const { pool } = classifyQuotaBars();
        if (!pool) return null;
        let round = null;
        const nowAttr = pool.getAttribute('aria-valuenow');
        if (nowAttr != null) round = toPercent(nowAttr);
        const widths = [...pool.querySelectorAll('[style*="width"]')]
            .map(el => { const m = /width\s*:\s*([\d.]+)%/.exec(el.getAttribute('style') || ''); return m ? parseFloat(m[1]) : null; })
            .filter(w => w !== null && Number.isFinite(w) && w > 0.05 && w < 100);
        let precise = null;
        if (widths.length) {
            const matching = (round !== null) ? widths.filter(w => Math.round(w) === round) : [];
            precise = matching.length ? Math.max(...matching) : Math.min(...widths);
        }
        if (round === null && precise !== null) round = Math.round(precise);
        if (precise === null && round !== null) precise = round;
        if (round === null && precise === null) return null;
        precise = Math.max(0, Math.min(100, precise));
        const ambiguous = precise !== null && allGaugePreciseWidths(pool).some(w => Math.abs(w - precise) <= 0.02);
        return { round, precise, filtered: ambiguous || detectBrandFilterActive(pool), bar: pool, ambiguous };
    }

    function scanDomForPercent() {
        const g = readPoolGauge();
        if (!g || g.filtered) return null;
        if (g.round === null) return null;
        if (poolGuardActive()) return null;
        const chk = g.precise != null ? g.precise : g.round;
        if (poolReadingImplausible(chk)) { logImplausiblePool(g.round); return null; }
        localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(g.round));
        localStorage.setItem(STORAGE_KEY_DOM_PCT_PRECISE, String(g.precise));
        localStorage.setItem(STORAGE_KEY_DOM_PERCENT_TS, String(Date.now()));
        return g.round;
    }

    let _harvestInFlight = false;

    function findModelNameForBar(bar) {
        let found = null;
        walkUp:
        for (let up = 0; up < 8; up++) {
            let node = bar;
            for (let step = 0; step <= up; step++) {
                node = node && node.parentElement;
                if (!node || node === document.body) break walkUp;
            }
            const kids = [...node.children];
            const ownerIdx = kids.findIndex(k => k.contains(bar));
if (ownerIdx <= 0) continue;
            for (let j = ownerIdx - 1; j >= 0; j--) {
                const sib = kids[j];
                if (sib.querySelector && sib.querySelector('[role="progressbar"]')) break walkUp;
                const t = String(sib.innerText || sib.textContent || '').trim().replace(/\s+/g, ' ');
                if (!t) continue;
                if (/d['’]utilisation/i.test(t) || /cliquez\s+pour\s+filtrer/i.test(t)) continue;
                const head = (sib.matches && sib.matches('[class*="font-semibold"], h3, h4')) ? sib
                    : (sib.querySelector ? sib.querySelector('[class*="font-semibold"], h3, h4') : null);
                const ht = head ? String(head.innerText || head.textContent || '').trim().replace(/\s+/g, ' ') : '';
                found = (ht && ht.length <= 60) ? ht : t.slice(0, 60);
                break walkUp;
            }
        }
        if (found) return found;
        try {
            const card = gaugeCardFor(bar);
            const scope = (card && card !== document.body) ? card : document.body;
            const heads = [...scope.querySelectorAll('h1,h2,h3,h4,h5,[class*="font-semibold"],[class*="font-bold"]')].filter(h => {
                if (h.closest('button') || h.closest('[role="progressbar"]')) return false;
                if (bar.contains(h)) return false;
                const t = String(h.innerText || h.textContent || '').trim().replace(/\s+/g, ' ');
                if (!t || t.length > 60) return false;
                if (GENERIC_TITLE_RE.test(t)) return false;
if (/d['’]utilisation/i.test(t)) return false;
                if (isPureBrandKey(t)) return false;
                return true;
            });
            const br = bar.getBoundingClientRect ? bar.getBoundingClientRect() : null;
            const barTop = (br && Number.isFinite(br.top)) ? br.top : null;
            let best = null, bestDist = Infinity;
            for (const h of heads) {
                const t = String(h.innerText || h.textContent || '').trim().replace(/\s+/g, ' ');
                let dist = null;
                if (barTop !== null && h.getBoundingClientRect) {
                    const r = h.getBoundingClientRect();
if (r && Number.isFinite(r.top)) dist = barTop - r.top;
                }
                if (dist === null) {
                    if (!(bar.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_PRECEDING)) continue;
} else if (dist < 0 || dist > 160) continue;
                if (dist < bestDist) { bestDist = dist; best = t; }
            }
            if (best) return best;
        } catch {}
        return '';
    }

    function scanModelSections() {
        const { bars, pool } = classifyQuotaBars();
        if (!bars.length) return [];
        const modelBars = bars.filter(b =>
            !pool || (b !== pool && !pool.contains(b) && !b.contains(pool)));
        const out = [];
        const seen = new Set();
        for (const bar of modelBars) {
            const rawPct = bar.getAttribute('aria-valuenow') != null ? bar.getAttribute('aria-valuenow') : bar.getAttribute('aria-valuetext');
            const pct = toPercent(rawPct);
            if (pct == null || pct < 0 || pct > 100) continue;
            let name = findModelNameForBar(bar);
            if (!name) continue;
            name = name.replace(/\s*[—–-]\s*[\d.,]+\s*%\s*d['’]utilisation\.?\s*$/i, '').trim();
            if (!name || /utilisation\s+totale/i.test(name)) continue;
            if (GENERIC_TITLE_RE.test(name)) continue;
            if (isJunkModelKey(name)) continue;
            const key = name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ name, pct });
        }
        return out;
    }

    function officialModelSectionSeen() {
        try {
            const isWidget = (el) => !!(el && el.closest && el.closest('#mammouth-widget, #mw-sidebar, #mw-popover'));
            const els = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div');
            for (const el of els) {
                if (isWidget(el)) continue;
                if (el.closest && el.closest('[role="progressbar"]')) continue;
                const t = String(el.textContent || '').trim().replace(/\s+/g, ' ');
                if (t.length > 60) continue;
                if (/quota\s+par\s+mod[eè]le/i.test(t)) return true;
            }
        } catch {}
        return false;
    }

    async function harvestModelQuotasViaDom() {
        if (_harvestInFlight) return;
        if (!window.location.pathname.includes('/app/account/settings')) {
            console.log('[MammouthWidget] harvest reporté — va sur /app/account/settings puis Rafraîchir');
            return;
        }
        const quotaBar = (readPoolGauge(true) || {}).bar || findQuotaBar(document);
        if (!quotaBar) return;
        const seenBrands = new Set();
        const brandBtns = [...document.querySelectorAll('button[aria-label]')].filter(b => {
            const l = b.getAttribute('aria-label') || '';
            if (!(l.includes("d'utilisation") && l.includes('Cliquez pour filtrer'))) return false;
            const brand = (l.split('—')[0] || '').trim().toLowerCase();
            if (!brand || seenBrands.has(brand)) return false;
            seenBrands.add(brand);
            return true;
        });
        _harvestInFlight = true;
        notePoolActivity();
        const getGauge = () => {
            const g = readPoolGauge(true);
            if (g && g.round !== null) return g.round;
            const bar = findQuotaBar(document) || quotaBar;
            return toPercent(bar && bar.getAttribute('aria-valuenow'));
        };
        const waitGauge = (prev, ms=1600) => new Promise(res => {
            const step = 60;
            let ticks = 0;
            const maxTicks = Math.max(2, Math.ceil(ms / step));
            const iv = setInterval(() => {
                const cur = getGauge();
                if (cur !== prev || ++ticks >= maxTicks) { clearInterval(iv); res(cur); }
            }, step);
        });
        const globalBefore = getGauge();
const harvested = {};
        const mergeScan = () => { const secs = scanModelSections(); for (const s of secs) harvested[s.name] = s.pct; return secs.length; };
        const findBtn = (brand) => [...document.querySelectorAll('button[aria-label]')].find(b => {
            const l = b.getAttribute('aria-label')||''; return l.toLowerCase().startsWith(brand.toLowerCase()+' —') || l.toLowerCase().includes(brand.toLowerCase()+' —');
        });
        const isWidgetNode = (el) => !!(el && el.closest && el.closest('#mammouth-widget, #mw-sidebar, #mw-popover'));
        const matchesClear = (b) => {
            const t = (((b.getAttribute('aria-label')||'') + ' ' + (b.innerText||'')).toLowerCase()).trim();
            return ((t.includes('effacer') || t.includes('clear')) && !!b.offsetParent) || t.trim()==='×' || t.trim()==='x' || t.trim()==='✕';
        };
        const findClearBtn = () => {
            const scope = gaugeCardFor(quotaBar) || document.body;
            const scoped = [...scope.querySelectorAll('button')].filter(b => !isWidgetNode(b)).find(matchesClear);
            if (scoped) return scoped;
            return [...document.querySelectorAll('button')].filter(b => !isWidgetNode(b)).find(matchesClear);
        };
        try {
            const directCount = mergeScan();
            console.log('[MammouthWidget] scan direct →', directCount, 'modèle(s) visible(s)');
            const brandFamilies = brandBtns.map(b => brandFamilyOf(((b.getAttribute('aria-label')||'').split('—')[0]||'').trim()));
            const storedNames = displayableModelNames(readJSON(STORAGE_KEY_MODEL_PCT, {}));
            const covered = directCount > 0
                && brandFamilies.every(f => !!f && Object.keys(harvested).some(n => brandFamilyOf(n) === f))
                && storedNames.every(n => Object.keys(harvested).some(k => k.toLowerCase() === n.toLowerCase()));
            if (!covered) for (let i = 0; i < brandBtns.length; i++) {
                let btn = brandBtns[i];
                const label0 = btn.getAttribute('aria-label') || '';
                let brandRaw = (label0.split('—')[0] || '').trim();
                if (!brandRaw) continue;
                const fresh = findBtn(brandRaw);
                if (fresh) btn = fresh;
                const prev = getGauge();
                if (prev !== globalBefore && globalBefore != null) {
                    const clear = findClearBtn();
                    if (clear) { clear.click(); await waitGauge(prev); await new Promise(r=>setTimeout(r,250)); }
                    else { btn.click(); await waitGauge(prev); await new Promise(r=>setTimeout(r,250)); }
                    if (getGauge() !== globalBefore) {
                        const c2 = findClearBtn(); if (c2) { c2.click(); await new Promise(r=>setTimeout(r,300)); }
                    }
                }
                const beforeClick = getGauge();
                const curBtn = findBtn(brandRaw) || btn;
                curBtn.click();
notePoolActivity();
                await waitGauge(beforeClick);
                await new Promise(r => setTimeout(r, 220));
const nFound = mergeScan();
                console.log('[MammouthWidget] harvest filtre', brandRaw, '→', nFound, 'modèle(s) scanné(s)');
                const clearBtn = findClearBtn();
                if (clearBtn) { clearBtn.click(); await waitGauge(beforeClick); }
                else { const offBtn = findBtn(brandRaw) || curBtn; offBtn.click(); await waitGauge(beforeClick); }
                await new Promise(r => setTimeout(r, 320));
                if (getGauge() !== globalBefore && globalBefore != null) {
                    await new Promise(r=>setTimeout(r,150));
                    const cur = getGauge();
                    if (cur !== globalBefore) {
                        const c = findClearBtn(); if (c) c.click(); else { const b2 = findBtn(brandRaw); if (b2) b2.click(); }
                        await new Promise(r=>setTimeout(r,300));
                    }
                }
            }
            let after = getGauge();
            if (after !== globalBefore && globalBefore != null) {
                for (let attempt = 0; attempt < 3 && getGauge() !== globalBefore; attempt++) {
                    const clear = findClearBtn();
                    if (clear) { clear.click(); }
                    else {
                        const last = brandBtns[brandBtns.length - 1];
                        const lastBrand = ((last.getAttribute('aria-label')||'').split('—')[0]||'').trim();
                        const bb = findBtn(lastBrand) || last;
                        bb.click();
                    }
                    await new Promise(r=>setTimeout(r, 350));
                }
                after = getGauge();
                console.log('[MammouthWidget] restauration filtre global →', after != null ? after + '%' : '—', (after === globalBefore ? '(OK)' : '(≠ avant harvest)'));
                notePoolActivity(after === globalBefore ? 0 : 60000);
            }
            const stillLive = !!(readPoolGauge(true) || findQuotaBar(document));
            const scanComplete = covered || brandBtns.length > 0;
            const authoritative = stillLive && scanComplete;
            if (Object.keys(harvested).length) {
                storeModelPct(harvested, 'dom', { authoritative });
                populateDailyModelSelect();
                updateSidebar();
            } else if (authoritative && officialModelSectionSeen()) {
                await new Promise(r => setTimeout(r, 900));
                const recheck = mergeScan();
                if (!recheck) {
                    if (storeModelPct({}, 'dom', { authoritative: true })) {
                        populateDailyModelSelect();
                        updateSidebar();
                    }
                } else {
                    storeModelPct(harvested, 'dom', { authoritative });
                    populateDailyModelSelect();
                    updateSidebar();
                }
            } else {
                console.log('[MammouthWidget] harvest: aucune jauge par modèle détectée — les blocs modèles doivent être affichés sous la jauge totale');
            }
        } finally {
            _harvestInFlight = false;
        }
    }
    let _bgHarvestInFlight = false;
    async function backgroundHarvestIfNeeded(force) {
        if (_bgHarvestInFlight || _harvestInFlight) return;
        if (window.location.pathname.includes('/app/account/settings')) return;
        const ts = parseInt(localStorage.getItem(STORAGE_KEY_MODEL_PCT_TS) || '0', 10);
        if (!force && ts && Date.now() - ts < 4 * 60 * 1000) return;
        _bgHarvestInFlight = true;
        console.log('[MammouthWidget] background harvest via fetch…');
        try {
            const candidates = [
                '/api/user/quota', '/api/user/quotas', '/api/user/usage', '/api/user/limits',
                '/api/user/plan', '/api/user/subscription', '/api/user/billing',
                '/api/user/currentUsage', API_URL
            ];
            let found = null;
            for (const url of candidates) {
                try {
                    const r = await _origFetch(url, { credentials:'include', cache:'no-store' });
                    if (!r.ok) continue;
                    const j = await r.json().catch(()=>null);
                    if (!j) continue;
                    const s = JSON.stringify(j);
                    if (/grok|claude/i.test(s) && /percent|quota|limit|usage/i.test(s)) {
                        console.log('[MammouthWidget] candidate', url, '→', j);
                        const extract = (obj) => {
                            const map = {};
                            const walk = (o) => {
                                if (!o || typeof o!=='object') return;
                                if (Array.isArray(o)) { o.forEach(walk); return; }
                                for (const [k,v] of Object.entries(o)) {
                                    if (/^(model|name|label)$/i.test(k) && typeof v==='string' && v.trim() && !isJunkModelKey(v)) {
                                        const pct = numberOrNull(o.percent != null ? o.percent : (o.usagePercent != null ? o.usagePercent : (o.percentage != null ? o.percentage : o.percentUsed)));
                                        if (pct !== null && pct >= 0 && pct <= 100) map[v.trim()] = Math.round(pct);
                                    }
                                    walk(v);
                                }
                            };
                            walk(obj);
                            return map;
                        };
                        const m = extract(j);
                        if (Object.keys(m).length) { found = m; break; }
                    }
                } catch {}
            }
            if (found && Object.keys(found).length) {
                if (storeModelPct(found, 'fetch')) {
                    console.log('[MammouthWidget] background harvest done (fetch, par modèle)');
                    populateDailyModelSelect(); updateSidebar();
                    return;
                }
            }
            if (force) {
                console.log('[MammouthWidget] ouverture popup harvest…');
                try {
                    localStorage.setItem('mammouth_harvest_popup', String(Date.now()));
                    const w = window.open('/app/account/settings', 'mw_harvest', 'width=400,height=400,left=-1000,top=-1000');
                    if (!w) console.warn('[MammouthWidget] popup bloqué — autorise les popups pour mammouth.ai');
                    else {
                        setTimeout(() => { try { if (!w.closed) w.close(); } catch {} }, 25000);
                    }
                } catch(e) { console.warn('[MammouthWidget] popup err', e); }
                return;
            }
            console.log('[MammouthWidget] background harvest: va une fois sur Réglages → Quota (ou clique Rafraîchir pour ouvrir le popup auto)');
        } catch(e) { console.warn('[MammouthWidget] background harvest err', e); }
        finally { _bgHarvestInFlight = false; setTimeout(()=>{ _bgHarvestInFlight=false; }, 2000); }
    }

    let apiInFlight = false;
    const _origFetch = window.fetch.bind(window);

    /* ================= FETCH QUOTA API ================= */
    function fetchQuotaFromAPI(silent) {
        if (!apiEnabled() || apiInFlight) return;
        apiInFlight = true;
        if (!silent) setApiBadge('loading', 'Sync API…');

        _origFetch(API_URL, { credentials: 'include', cache: 'no-store' })
            .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
            .then(data => {
                console.log('[MammouthWidget] recentUsage →', data);
                const parsed = parseQuotaResponse(data);

                if (parsed.rawUsedSum !== null) {
                    localStorage.setItem(STORAGE_KEY_RAW_USED, String(parsed.rawUsedSum));
                    localStorage.setItem(STORAGE_KEY_RAW_USED_CACHE, String(parsed.rawUsedSum));
                    localStorage.setItem(STORAGE_KEY_RAW_USED_CACHE_TS, String(Date.now()));
                }

                let pct = parsed.percent;
                if (pct === null && parsed.rawUsedSum !== null) {
                    pct = computePercentFromRaw(parsed.rawUsedSum);
                }
                if (pct !== null && parsed.rawUsedSum !== null) {
                    const computedPct = computePercentFromRaw(parsed.rawUsedSum);
                    if (computedPct !== null && Math.abs(computedPct - pct) > Math.max(2.5, computedPct * 0.6)) {
                        console.log('[MammouthWidget] percent API (' + pct + '%) incohérent avec l\u2019usage (' + computedPct + '%) → valeur calculée retenue');
                        pct = computedPct;
                    }
                }
                if (pct !== null) localStorage.setItem(STORAGE_KEY_QUOTA, String(pct));
                if (parsed.models) localStorage.setItem(STORAGE_KEY_MODELS, parsed.models);
                if (parsed.byModel) {
                    const pctMap = {};
                    const globalPct = pct;
                    const rawSum = parsed.rawUsedSum;
                    const total = numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
                    for (const [k, v] of Object.entries(parsed.byModel)) {
                        let pv = null;
                        if (total && total > 0) pv = Math.round((v / total) * 100);
                        else if (globalPct != null && rawSum && rawSum > 0) pv = Math.round((v / rawSum) * globalPct);
                        else pv = Math.round(v);
                        pctMap[k] = Math.max(0, Math.min(100, pv));
                    }
                    const prev = readJSON(STORAGE_KEY_DAILY_BYMODEL, {});
                    localStorage.setItem(STORAGE_KEY_DAILY_BYMODEL, JSON.stringify({ ...prev, ...pctMap }));
                }

                localStorage.setItem(STORAGE_KEY_API_TS, String(Date.now()));
                localStorage.setItem(STORAGE_KEY_API_OK, '1');
                setApiBadge('ok', 'API ✓ synchronisé');
                recordHistory();
                updateUI();
            })
            .catch(err => {
                console.warn('[MammouthWidget] recentUsage échec:', err.message);
                localStorage.setItem(STORAGE_KEY_API_OK, '0');
                setApiBadge('err', 'API hors-ligne');
                const isSettingsPage = window.location.pathname.includes('/app/account/settings');
                if (!isSettingsPage) {
                    const domPct = scanDomForPercent();
                    if (domPct !== null) {
                        localStorage.setItem(STORAGE_KEY_QUOTA, String(domPct));
                        localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(domPct));
                    }
                } else if (!window.__mwApiRetry) {
                    window.__mwApiRetry = true;
                    console.log('[MammouthWidget] Retrying API on settings page...');
                    setTimeout(() => { window.__mwApiRetry = false; fetchQuotaFromAPI(true); }, 1500);
                }
                updateUI();
            })
            .finally(() => { apiInFlight = false; });
    }

    let doneDebounce = 0;

    /* ================= MESURE DU COÛT (currentUsage) ================= */
    function getPendingRequest() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY_PENDING_REQUEST) || 'null'); } catch { return null; }
    }
    function setPendingRequest(req) {
        if (req) localStorage.setItem(STORAGE_KEY_PENDING_REQUEST, JSON.stringify(req));
        else localStorage.removeItem(STORAGE_KEY_PENDING_REQUEST);
    }
    function clearPendingRequest() { localStorage.removeItem(STORAGE_KEY_PENDING_REQUEST); }

    function readCurrentUsage() {
        return _origFetch(CURRENT_USAGE_URL, { credentials: 'include', cache: 'no-store' })
            .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
            .then(d => {
                console.log('[MammouthWidget] currentUsage →', d);
                const c = numberOrNull(d && d.currentSpendCents);
                return c;
            })
            .catch(err => {
                console.warn('[MammouthWidget] currentUsage échec:', err.message);
                return null;
            });
    }

    function onMessageSent() {
        const now = Date.now();
        const existing = getPendingRequest();
        if (existing && now - existing.ts < 3000) return;

        const before = numberOrNull(localStorage.getItem(STORAGE_KEY_SPEND_CENTS));
        const req = { ts: now, before: before, recorded: false };
        setPendingRequest(req);

        if (!getSessionStart()) setSessionStart(now);

        addRequest(now, 0.01);
        req.recorded = true;
        setPendingRequest(req);
        console.log('[MammouthWidget] Message envoyé — requête enregistrée (avant:', before, '¢). En attente du coût réel via currentUsage.');

        celebrate();
        updateUI();

        setTimeout(() => {
            const p = getPendingRequest();
            if (p && p.ts === now) {
                readCurrentUsage().then(after => {
                    if (after === null) return;
                    localStorage.setItem(STORAGE_KEY_SPEND_CENTS, String(after));
                    const base = p.before !== null ? p.before : before;
                    if (base !== null) {
                        const cost = after - base;
                        if (cost > 0) {
                            updateRequestCost(now, cost);
                            console.log(`[MammouthWidget] Coût réel mesuré: ${cost.toFixed(2)}¢ (was 0.01¢)`);
                        }
                    }
                    clearPendingRequest();
                    updateUI();
                    updateConsumptionStats();
                    fetchQuotaFromAPI(true);
                }).catch(() => { clearPendingRequest(); });
            }
        }, 8000);

        setTimeout(() => {
            const p = getPendingRequest();
            if (p && p.ts === now) clearPendingRequest();
        }, 180000);
    }

    function findRecentPlaceholderRequest(maxAgeMs) {
        const reqs = getRequests();
        const cutoff = Date.now() - maxAgeMs;
        for (let i = reqs.length - 1; i >= 0; i--) {
            const r = reqs[i];
            if (r.ts >= cutoff && numberOrNull(r.cents) !== null && numberOrNull(r.cents) <= 0.01) {
                return r;
            }
        }
        return null;
    }

    function onGenerationDone() {
        const now = Date.now();
        if (now - doneDebounce < 1500) return;
        doneDebounce = now;
        console.log('[MammouthWidget] Fin de génération détectée → lecture currentUsage');

        readCurrentUsage().then(after => {
            if (after === null) return;
            const prev = numberOrNull(localStorage.getItem(STORAGE_KEY_SPEND_CENTS));
            localStorage.setItem(STORAGE_KEY_SPEND_CENTS, String(after));

            let pending = getPendingRequest();
            if (!pending) {
                const ph = findRecentPlaceholderRequest(180000);
                if (ph) {
                    pending = { ts: ph.ts, before: prev, recorded: true, retries: 0 };
                    console.log('[MammouthWidget] Requête placeholder récente trouvée — correction du coût.');
                } else {
                    return;
                }
            }

            const base = pending.before !== null ? pending.before : prev;
            if (base === null) {
                console.log('[MammouthWidget] Pas de référence — baseline enregistrée.');
                const p = getPendingRequest();
                if (!p || p.recorded) {
                    return;
                }
                addRequest(p.ts, 0.01);
                p.recorded = true;
                setPendingRequest(p);
                updateUI();
                return;
            }

            const cost = after - base;
            const threshold = getThresholdCents();
            const minMeaningfulCost = 0.02;
            const maxRetries = 3;

            if (cost < 0) {
                console.warn('[MammouthWidget] Coût négatif ignoré:', cost.toFixed(2), '¢');
                return;
            }

            if (cost > 0 && cost < threshold && threshold > 0) {
                console.log(`[MammouthWidget] Micro-requête ignorée: ${cost.toFixed(2)}¢ < ${threshold.toFixed(1)}¢`);
                return;
            }

            if (cost < minMeaningfulCost) {
                const retries = (pending.retries || 0) + 1;
                if (retries >= maxRetries) {
                    console.log(`[MammouthWidget] Max retries atteint, on enregistre 0.01¢`);
                    const finalCost = 0.01;
                    const p = getPendingRequest();
                    if (p && p.recorded) {
                        updateRequestCost(p.ts, finalCost);
                    } else if (p && !p.recorded) {
                        addRequest(p.ts, finalCost);
                        p.recorded = true;
                        setPendingRequest(p);
                    } else {
                        updateRequestCost(pending.ts, finalCost);
                    }
                    celebrate();
                    updateUI();
                    fetchQuotaFromAPI(true);
                    return;
                }
                pending.retries = retries;
                setPendingRequest(pending);
                console.log(`[MammouthWidget] Coût trop faible (${cost.toFixed(2)}¢), tentative ${retries}/${maxRetries} dans 3s...`);
                setTimeout(() => { try { onGenerationDone(); } catch {} }, 3000);
                return;
            }

            const p = getPendingRequest();
            if (p && p.recorded) {
                updateRequestCost(p.ts, cost);
                console.log(`[MammouthWidget] Coût corrigé: ${cost.toFixed(2)}¢ (was 0.01¢)`);
            } else if (p && !p.recorded) {
                addRequest(p.ts, cost);
                p.recorded = true;
                setPendingRequest(p);
                console.log(`[MammouthWidget] Requête enregistrée: ${cost.toFixed(2)}¢`);
            } else {
                updateRequestCost(pending.ts, cost);
                console.log(`[MammouthWidget] Coût placeholder corrigé: ${cost.toFixed(2)}¢`);
            }
            celebrate();
            updateUI();
            fetchQuotaFromAPI(true);
        });
    }

    /* ================= DÉTECTION D'ENVOI (DOM, fiable) ================= */
    document.addEventListener('keydown', function (e) {
        const target = e.target;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (isInputField && e.key === 'Enter' && !e.shiftKey) {
            setTimeout(() => {
                const isEmpty = (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') ? target.value.trim() === '' : target.innerText.trim() === '';
                if (isEmpty) {
                    try { onMessageSent(); } catch (err) {}
                }
            }, 300);
        }
    });

    document.addEventListener('submit', event => {
        const form = event.target;
        if (form instanceof HTMLFormElement) {
            setTimeout(() => { try { onMessageSent(); } catch (e) {} }, 100);
        }
    }, true);

    document.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || button.closest('#mammouth-widget')) return;
        const accessibleName = [
            button.getAttribute('aria-label'),
            button.getAttribute('title'),
            button.innerText
        ].filter(Boolean).join(' ').toLowerCase();
        if (/\b(envoyer|send|submit)\b/.test(accessibleName) || button.getAttribute('type') === 'submit') {
            setTimeout(() => { try { onMessageSent(); } catch (e) {} }, 150);
        }
    }, true);

    /* ================= INTERCEPTEUR RÉSEAU (coût réel, complémentaire) ================= */
    window.fetch = function (...args) {
        const p = _origFetch.apply(window, args);
        let url = '';
        try {
            const a = args[0];
            url = typeof a === 'string' ? a : (a && a.url) ? a.url : String(a);
        } catch {}
        if (/\/api\/message\/send/i.test(url) || /\/api\/chat\/send/i.test(url)) {
            p.then(() => { try { onGenerationDone(); } catch (e) {} }).catch(() => {});
        }
        return p;
    };

    const _origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__mwUrl = String(url || '');
        return _origOpen.call(this, method, url, ...rest);
    };
    const _origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
        try {
            const u = this.__mwUrl || '';
            if (/\/api\/message\/send/i.test(u) || /\/api\/chat\/send/i.test(u)) {
                this.addEventListener('load', () => { try { onGenerationDone(); } catch (e) {} });
            }
        } catch (e) {}
        return _origSend.apply(this, args);
    };

    /* ================= HISTORIQUE 7 JOURS ================= */
    function recordHistory() {
        const pct = toPercent(localStorage.getItem(STORAGE_KEY_QUOTA));
        if (pct === null) return;
        let arr = readJSON(STORAGE_KEY_HISTORY, []);
        if (!Array.isArray(arr)) arr = [];
        const now = Date.now();
        arr = arr.filter(e => e && Number.isFinite(e.t) && now - e.t <= HISTORY_RETENTION_MS);
        const last = arr[arr.length - 1];
        if (!last || now - last.t > 5 * 60 * 1000 || last.p !== pct) arr.push({ t: now, p: pct });
        if (arr.length > 2000) arr = arr.slice(-2000);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(arr));
    }

    function drawHistory() {
        const canvas = document.getElementById('mw-history-canvas');
        if (!canvas) return;
        const arr = readJSON(STORAGE_KEY_HISTORY, []);
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth || 260;
        const h = 52;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        if (!Array.isArray(arr) || arr.length < 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText('Pas encore assez de données', 6, h / 2 + 3);
            return;
        }

        const now = Date.now();
        const t0 = now - HISTORY_RETENTION_MS;
        const pts = arr.filter(e => e.t >= t0);
        if (pts.length < 2) return;

        const xOf = t => ((t - t0) / HISTORY_RETENTION_MS) * w;
        const yOf = p => h - 4 - (Math.max(0, Math.min(100, p)) / 100) * (h - 10);

        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
            const y = (h / 4) * i;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(162,155,254,0.35)');
        grad.addColorStop(1, 'rgba(162,155,254,0)');
        ctx.beginPath();
        ctx.moveTo(xOf(pts[0].t), yOf(pts[0].p));
        pts.forEach(p => ctx.lineTo(xOf(p.t), yOf(p.p)));
        ctx.lineTo(xOf(pts[pts.length - 1].t), h);
        ctx.lineTo(xOf(pts[0].t), h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(xOf(pts[0].t), yOf(pts[0].p));
        pts.forEach(p => ctx.lineTo(xOf(p.t), yOf(p.p)));
        ctx.strokeStyle = '#a29bfe';
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        ctx.stroke();

        const lastPt = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(xOf(lastPt.t), yOf(lastPt.p), 2.6, 0, Math.PI * 2);
        ctx.fillStyle = '#a29bfe';
        ctx.fill();
    }

    /* ================= CARTE CONSOMMATION ================= */
    function updateConsumptionStats() {
        const reqs = getRequests();
        const totalCents = reqs.reduce((s, r) => s + (numberOrNull(r.cents) || 0), 0);

        const elWin = document.getElementById('mw-stat-window');
        const elCount = document.getElementById('mw-stat-count');
        const elAvg = document.getElementById('mw-stat-avg');
        const elSpend = document.getElementById('mw-stat-spend');

        if (elWin) elWin.innerText = totalCents.toFixed(2) + '¢';
        if (elCount) elCount.innerText = String(reqs.length);
        if (elAvg) elAvg.innerText = reqs.length ? (totalCents / reqs.length).toFixed(2) + '¢' : '—';
        if (elSpend) {
            const s = numberOrNull(localStorage.getItem(STORAGE_KEY_SPEND_CENTS));
            elSpend.innerText = s !== null ? s.toFixed(2) + '¢' : '—';
        }
        drawHistory();
    }

    (function injectConsumptionCard() {
        const timerCard = document.getElementById('mw-card-timer');
        if (!timerCard) return;
        const card = document.createElement('div');
        card.className = 'mw-card';
        card.id = 'mw-card-consumption';
        card.innerHTML = `
            <div class="mw-label mw-collapse-header" id="mw-consumption-toggle">
                <span>Consommation 7 jours</span>
                <span class="mw-collapse-arrow" id="mw-consumption-arrow">⌄</span>
            </div>
            <div class="mw-consumption-content">
                <canvas id="mw-history-canvas"></canvas>
                <div class="mw-stats-grid">
                    <div class="mw-stat"><div class="mw-stat-label">Fenêtre 3h</div><div class="mw-stat-value" id="mw-stat-window">—</div></div>
                    <div class="mw-stat"><div class="mw-stat-label">Requêtes</div><div class="mw-stat-value" id="mw-stat-count">—</div></div>
                    <div class="mw-stat"><div class="mw-stat-label">Moy./req</div><div class="mw-stat-value" id="mw-stat-avg">—</div></div>
                    <div class="mw-stat"><div class="mw-stat-label">Dépense API</div><div class="mw-stat-value" id="mw-stat-spend">—</div></div>
                </div>
            </div>
        `;
        timerCard.insertAdjacentElement('afterend', card);

        const toggle = document.getElementById('mw-consumption-toggle');
        const arrow = document.getElementById('mw-consumption-arrow');
        if (localStorage.getItem('mammouth_consumption_collapsed') === '1') {
            card.classList.add('collapsed');
            arrow.style.transform = 'rotate(-90deg)';
        }
        toggle.onclick = () => {
            const collapsed = card.classList.toggle('collapsed');
            arrow.style.transform = collapsed ? 'rotate(-90deg)' : '';
            localStorage.setItem('mammouth_consumption_collapsed', collapsed ? '1' : '0');
            if (!collapsed) setTimeout(drawHistory, 360);
        };
    })();

    /* ================= DRAG ================= */
    (function setupDrag() {
        let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;

        function applyPos(left, top) {
            const maxL = Math.max(0, window.innerWidth - widget.offsetWidth);
            const maxT = Math.max(0, window.innerHeight - widget.offsetHeight);
            const l = Math.min(Math.max(0, left), maxL);
            const t = Math.min(Math.max(0, top), maxT);
            widget.style.left = l + 'px';
            widget.style.top = t + 'px';
            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
            return { l, t };
        }

        const saved = readJSON(STORAGE_KEY_POS, null);
        if (saved && Number.isFinite(saved.l) && Number.isFinite(saved.t)) {
            requestAnimationFrame(() => applyPos(saved.l, saved.t));
        }

        function onDown(e) {
            if (e.target.closest('.mw-btn-icon') || e.target.closest('button')) return;
            dragging = true; moved = false;
            const r = widget.getBoundingClientRect();
            sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }
        function onMove(e) {
            if (!dragging) return;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                moved = true;
                widget.classList.add('mw-dragging');
            }
            if (moved) { e.preventDefault(); applyPos(ox + dx, oy + dy); }
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (!dragging) return;
            dragging = false;
            widget.classList.remove('mw-dragging');
            if (moved) {
                const r = widget.getBoundingClientRect();
                localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ l: r.left, t: r.top }));
            }
            setTimeout(() => { moved = false; }, 0);
        }

        document.getElementById('mw-header').addEventListener('mousedown', onDown);
        document.getElementById('mw-mini').addEventListener('mousedown', onDown);

        document.getElementById('mw-mini').addEventListener('click', () => {
            if (moved) return;
            widget.classList.remove('minimized');
            localStorage.setItem(STORAGE_KEY_MIN, '0');
            setTimeout(() => { updateUI(); drawHistory(); }, 420);
        });

        miniTimeEl.addEventListener('dblclick', e => {
            e.stopPropagation();
            cycleMiniMode();
            updateUI();
        });

        window.addEventListener('resize', () => {
            const s = readJSON(STORAGE_KEY_POS, null);
            if (s) applyPos(s.l, s.t);
            drawHistory();
        });

        window.__mwResetPos = function () {
            localStorage.removeItem(STORAGE_KEY_POS);
            widget.style.left = 'auto'; widget.style.top = 'auto';
            widget.style.right = '30px'; widget.style.bottom = '30px';
        };
    })();

    function readQuotaFromDOM(root) {
        if (typeof _harvestInFlight !== 'undefined' && _harvestInFlight) return null;
        const g = (root === document || !root) ? readPoolGauge() : null;
        if (!g || !g.bar) return null;
        if (g.filtered) return g.round;
        if (g.round !== null && g.round > 0 && g.round < 100) {
            if (poolGuardActive()) return g.round;
            const chk = g.precise != null ? g.precise : g.round;
            if (poolReadingImplausible(chk)) { logImplausiblePool(g.round); return g.round; }
            localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(g.round));
            localStorage.setItem(STORAGE_KEY_DOM_PCT_PRECISE, String(g.precise));
            localStorage.setItem(STORAGE_KEY_DOM_PERCENT_TS, String(Date.now()));
            localStorage.setItem(STORAGE_KEY_QUOTA, String(g.round));
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '1');
            calibrateIfPending();
        }
        const models = [];
        const btns = g.bar.querySelectorAll('button[aria-label]');
        btns.forEach(btn => {
            const label = btn.getAttribute('aria-label');
            if (label) {
                const raw = label.split('—')[0].trim();
                const pretty = beautifyModelName(raw) || raw;
                if (pretty) models.push(pretty);
            }
        });
        if (models.length > 0 && !localStorage.getItem(STORAGE_KEY_MODELS)) {
            localStorage.setItem(STORAGE_KEY_MODELS, models.join('  ·  '));
        }
        updateUI();
        return g.round;
    }

    function autoClickQuotaButton() {
        const labels = document.querySelectorAll('span[data-slot="label"]');
        for (const lbl of labels) {
            if (lbl.innerText && lbl.innerText.toLowerCase().includes('quota')) {
                const clickable = lbl.closest('button') || lbl.closest('a') || lbl.parentElement;
                if (clickable) { clickable.click(); return true; }
            }
        }
        const all = document.querySelectorAll('button, a');
        for (const el of all) {
            if (el.innerText && el.innerText.toLowerCase().includes('quota')) { el.click(); return true; }
        }
        return false;
    }

    function autoScanOnSettingsPage() {
        if (!window.location.pathname.includes('/app/account/settings')) return;
        let attempts = 0;
        const maxAttempts = 25;
        const tryScan = () => {
            attempts++;
            const pct = readQuotaFromDOM(document);
            if (pct !== null) {
                console.log('[MammouthWidget] Quota bar found on settings page:', pct + '%');
                setTimeout(() => { harvestModelQuotasViaDom().then(() => {
                    const popTs = parseInt(localStorage.getItem('mammouth_harvest_popup')||'0',10);
                    if (popTs && Date.now() - popTs < 30000 && window.opener) {
                        setTimeout(() => { try { window.close(); } catch {} }, 1200);
                    }
                }); fetchQuotaFromAPI(true); }, 400);
                return;
            }
            autoClickQuotaButton();
            setTimeout(() => { readQuotaFromDOM(document); }, 500);
            if (attempts < maxAttempts) setTimeout(tryScan, 800);
            else console.warn('[MammouthWidget] Quota bar not found after', maxAttempts, 'attempts');
        };
        tryScan();
    }

    let observerCooldown = false;
    const domObserver = new MutationObserver(() => {
        if (observerCooldown) return;
        observerCooldown = true;
        setTimeout(() => { readQuotaFromDOM(document); observerCooldown = false; }, 1500);
    });
    let settingsObserverActive = false;
    function startSettingsObserver() {
        if (settingsObserverActive) return;
        settingsObserverActive = true;
        try { domObserver.observe(document.body, { childList: true, subtree: true }); } catch {}
    }
    function stopSettingsObserver() {
        if (!settingsObserverActive) return;
        domObserver.disconnect();
        settingsObserverActive = false;
    }

    /* ================= FONCTIONS HISTORIQUES RESTAURÉES ================= */
    function notificationsEnabled() { return localStorage.getItem(STORAGE_KEY_NOTIFY) !== 'off'; }
    function sendNotification(title, body) {
        if (!notificationsEnabled()) return;
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try { new Notification(title, { body, icon: '/favicon.ico', tag: title }); }
        catch (e) { console.warn('[MammouthWidget] Notification impossible:', e); }
    }

    function checkQuotaNotifications(percent) {
        if (!Number.isFinite(percent)) return;
        let notified = readJSON(STORAGE_KEY_NOTIFIED, []);
        if (percent < 65 && notified.length) notified = [];
        for (const threshold of [70, 90, 100]) {
            if (percent >= threshold && !notified.includes(threshold)) {
                notified.push(threshold);
                sendNotification(`Quota Mammouth : ${percent} %`,
                    threshold === 100 ? 'Le quota semble épuisé.' : `Le seuil de ${threshold} % vient d'être atteint.`);
            }
        }
        localStorage.setItem(STORAGE_KEY_NOTIFIED, JSON.stringify(notified));
    }

    let timerEndNotifiedFor = null;
    function checkTimerNotification() {
        const reqs = getRequests();
        if (reqs.length === 0) { timerEndNotifiedFor = null; return; }
        const oldestKey = reqs[0].ts;
        const expired = reqs[0].ts + WINDOW_MS <= Date.now();
        if (expired && timerEndNotifiedFor !== oldestKey) {
            timerEndNotifiedFor = oldestKey;
            sendNotification('Fenêtre Mammouth terminée', 'La fenêtre glissante de 3 heures est terminée.');
        } else if (!expired && timerEndNotifiedFor === oldestKey) {
            timerEndNotifiedFor = null;
        }
    }

    function syncNotificationButton() {
        const btn = document.getElementById('mw-btn-notifications');
        if (btn) btn.innerText = notificationsEnabled() ? 'Activées' : 'Désactivées';
    }

    function syncMiniModeButton() {
        const mode = getMiniMode();
        const labels = { used: 'Quota consommé', remaining: 'Quota restant', time: 'Temps restant' };
        const btn = document.getElementById('mw-btn-mini-mode');
        if (btn) btn.innerText = labels[mode] || 'Temps restant';
    }

    function syncCircleModeButton() {
        const mode = getCircleMode();
        const labels = { used: 'Quota consommé', remaining: 'Quota restant', time: 'Temps restant' };
        const btn = document.getElementById('mw-btn-circle-mode');
        if (btn) btn.innerText = labels[mode] || 'Temps restant';
    }

    function updateReturnButton() {
        const returnURL = localStorage.getItem(STORAGE_KEY_RETURN_URL);
        returnBtn.style.display =
            returnURL && window.location.pathname.includes('/app/account/settings') ? 'block' : 'none';
    }

let lastTrackedURL = window.location.href;
    function handleNavigationChange() {
        if (window.location.href === lastTrackedURL) return;
        lastTrackedURL = window.location.href;
        updateReturnButton();
        if (window.location.pathname.includes('/app/account/settings')) {
            startSettingsObserver();
            setTimeout(autoScanOnSettingsPage, 500);
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '1');
            setTimeout(() => fetchQuotaFromAPI(false), 3000);
        } else {
            stopSettingsObserver();
            setTimeout(() => fetchQuotaFromAPI(false), 700);
        }
    }

    function patchHistoryMethod(methodName) {
        const original = history[methodName];
        history[methodName] = function (...args) {
            const result = original.apply(this, args);
            window.dispatchEvent(new Event('mw-location-change'));
            return result;
        };
    }
    patchHistoryMethod('pushState');
    patchHistoryMethod('replaceState');
    window.addEventListener('popstate', handleNavigationChange);
    window.addEventListener('mw-location-change', handleNavigationChange);
    const spaObserver = new MutationObserver(handleNavigationChange);
    spaObserver.observe(document.body, { childList: true, subtree: true });
    if (window.location.pathname.includes('/app/account/settings')) startSettingsObserver();

    let previousTrackedPercent = null;
    function extensionTick() {
        const percent = numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA));
        if (percent !== null && percent !== previousTrackedPercent) {
            previousTrackedPercent = percent;
            recordHistory();
            checkQuotaNotifications(percent);
            drawHistory();
        }
        checkTimerNotification();
        recalibrateIfDivergent();
        updateReturnButton();
        handleNavigationChange();
    }

    /* ================= EXPORT / IMPORT ================= */
    const EXPORT_KEYS = [
        STORAGE_KEY_START, STORAGE_KEY_POS, STORAGE_KEY_MIN, STORAGE_KEY_QUOTA, STORAGE_KEY_MODELS,
        STORAGE_KEY_API_TS, STORAGE_KEY_API_OK, STORAGE_KEY_API_ENABLED, STORAGE_KEY_DOM_PERCENT, STORAGE_KEY_DOM_PCT_PRECISE,
        STORAGE_KEY_DOM_PERCENT_TS, STORAGE_KEY_LAST_AUTOCAL,
        STORAGE_KEY_RAW_USED, STORAGE_KEY_QUOTA_TOTAL, STORAGE_KEY_CALIBRATE_PENDING,
        STORAGE_KEY_LOGO_MODE,
        STORAGE_KEY_REQUESTS, STORAGE_KEY_SPEND_CENTS, STORAGE_KEY_THRESHOLD_CENTS,
        STORAGE_KEY_HISTORY, STORAGE_KEY_NOTIFY, STORAGE_KEY_NOTIFIED, STORAGE_KEY_MINI_MODE,
        STORAGE_KEY_CIRCLE_MODE, STORAGE_KEY_UI_MODE, STORAGE_KEY_DAILY_MODEL, STORAGE_KEY_DAILY_BYMODEL, STORAGE_KEY_MODEL_PCT, STORAGE_KEY_MODEL_PCT_TS, STORAGE_KEY_MODEL_PCT_SEEN
    ];

    document.getElementById('mw-btn-minimize').onclick = e => {
        e.stopPropagation();
        widget.classList.add('minimized');
        localStorage.setItem(STORAGE_KEY_MIN, '1');
        updateUI();
    };
    if (localStorage.getItem(STORAGE_KEY_MIN) === '1') widget.classList.add('minimized');

    document.getElementById('mw-btn-settings').onclick = e => {
        e.stopPropagation();
        settingsPanel.classList.toggle('open');
    };

    document.getElementById('mw-btn-start').onclick = () => {
        const now = Date.now();
        setSessionStart(now);
        if (getRequests().length === 0) addRequest(now, 0.01);
        celebrate();
        updateUI();
        updateConsumptionStats();
    };

    document.getElementById('mw-btn-stop').onclick = () => {
        localStorage.removeItem(STORAGE_KEY_START);
        localStorage.removeItem(STORAGE_KEY_REQUESTS);
        clearPendingRequest();
        updateUI();
        updateConsumptionStats();
    };

    quotaStatusEl.onclick = () => {
        const domPct = scanDomForPercent();
        if (domPct !== null) localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(domPct));
        localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '1');
        fetchQuotaFromAPI(false);
        readCurrentUsage().then(c => {
            if (c !== null) {
                localStorage.setItem(STORAGE_KEY_SPEND_CENTS, String(c));
                updateConsumptionStats();
            }
        });
    };

    document.getElementById('mw-btn-reset-pos').onclick = e => {
        e.stopPropagation();
        window.__mwResetPos();
    };

    /* ================= BOUTONS ================= */
    function syncApiToggle() {
        apiToggleBtn.innerText = apiEnabled() ? 'Activé' : 'Désactivé';
        apiToggleBtn.style.color = apiEnabled() ? '#2ed573' : '#ff6b6b';
    }
    apiToggleBtn.onclick = e => {
        e.stopPropagation();
        setApiEnabled(!apiEnabled());
        syncApiToggle();
        if (apiEnabled()) fetchQuotaFromAPI(false);
    };
    syncApiToggle();

    function syncThresholdDisplay() {
        const d = document.getElementById('mw-threshold-display');
        if (d) d.innerText = getThresholdCents().toFixed(1) + '¢';
    }
    document.getElementById('mw-btn-threshold-dec').onclick = e => {
        e.stopPropagation();
        setThresholdCents(Math.max(0, getThresholdCents() - 0.5));
        syncThresholdDisplay();
    };
    document.getElementById('mw-btn-threshold-inc').onclick = e => {
        e.stopPropagation();
        setThresholdCents(getThresholdCents() + 0.5);
        syncThresholdDisplay();
    };
    syncThresholdDisplay();

    document.getElementById('mw-btn-simulate').onclick = e => {
        e.stopPropagation();
        addRequest(Date.now(), Math.max(getThresholdCents(), 5));
        if (!getSessionStart()) setSessionStart(Date.now());
        celebrate();
        updateUI();
        updateConsumptionStats();
    };

    returnBtn.onclick = () => {
        const url = localStorage.getItem(STORAGE_KEY_RETURN_URL);
        if (!url) return;
        localStorage.removeItem(STORAGE_KEY_RETURN_URL);
        try {
            const u = new URL(url, window.location.href);
            const sameSite = u.protocol === 'https:' &&
                (u.hostname === 'mammouth.ai' || u.hostname.endsWith('.mammouth.ai'));
            if (sameSite) {
                window.location.href = u.href;
            } else {
                console.warn('[MammouthWidget] URL de retour non autorisée — navigation annulée :', url);
            }
        } catch (e) {
            console.warn('[MammouthWidget] URL de retour invalide — navigation annulée :', url);
        }
    };

    document.getElementById('mw-btn-mini-mode').onclick = (e) => {
        e.stopPropagation();
        cycleMiniMode();
        syncMiniModeButton();
        updateUI();
    };

    document.getElementById('mw-btn-circle-mode').onclick = (e) => {
        e.stopPropagation();
        cycleCircleMode();
        syncCircleModeButton();
        updateUI();
    };

    document.getElementById('mw-btn-ui-mode').onclick = (e) => {
        e.stopPropagation();
        cycleUiMode();
        syncUiModeButton();
        updateUI();
    };
    let popoverPinned = false;
    function togglePopover() { popoverPinned = !popoverPinned; popover.classList.toggle('open', popoverPinned); }
    function openPopover() { clearTimeout(sbLeaveTimer); popover.classList.add('open'); }
    function closePopoverIfNotPinned() { if (!popoverPinned) popover.classList.remove('open'); }
    document.getElementById('mw-sb-1').onclick = togglePopover;
    document.getElementById('mw-sb-2').onclick = togglePopover;
    document.getElementById('mw-sb-3').onclick = togglePopover;
    let sbLeaveTimer = null;
    function scheduleClose() { clearTimeout(sbLeaveTimer); sbLeaveTimer = setTimeout(closePopoverIfNotPinned, 400); }
    sidebar.addEventListener('mouseenter', () => { if (getUiMode() === 'sidebar') openPopover(); });
    popover.addEventListener('mouseenter', () => { clearTimeout(sbLeaveTimer); if (getUiMode() === 'sidebar') popover.classList.add('open'); });
    sidebar.addEventListener('mouseleave', scheduleClose);
    popover.addEventListener('mouseleave', scheduleClose);
    document.getElementById('mw-pop-close').onclick = () => { popoverPinned = false; popover.classList.remove('open'); };
    document.getElementById('mw-pop-gear').onclick = (e) => {
        e.stopPropagation();
        popoverPinned = false;
        popover.classList.remove('open');
        setUiMode('classic');
        syncUiModeButton();
        updateUI();
        settingsPanel.classList.add('open');
    };
    const dailySel = document.getElementById('mw-pop-model-select');
    if (dailySel) {
        dailySel.onclick = (e) => e.stopPropagation();
        dailySel.onchange = () => { setDailyModel(dailySel.value); updateSidebar(); };
    }
    const logoToggleBtn = document.getElementById('mw-logo-toggle');
    if (logoToggleBtn) {
        logoToggleBtn.onclick = (e) => {
            e.stopPropagation();
            setLogoMode(!getLogoMode());
            renderModelBlocks();
        };
    }
    const simSliderEl = document.getElementById('mw-sim-slider');
    if (simSliderEl) simSliderEl.addEventListener('input', () => updateSimulator(getRequests()));
    syncLogoToggle();
    document.getElementById('mw-pop-refresh').onclick = (e) => {
        e.stopPropagation();
        const domPct = scanDomForPercent();
        if (domPct !== null) localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(domPct));
        localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '1');
        if (window.location.pathname.includes('/app/account/settings')) harvestModelQuotasViaDom();
        else backgroundHarvestIfNeeded(true);
        fetchQuotaFromAPI(false);
        readCurrentUsage().then(c => { if (c !== null) { localStorage.setItem(STORAGE_KEY_SPEND_CENTS, String(c)); updateConsumptionStats(); } });
    };
    document.addEventListener('click', (e) => {
        if (getUiMode() !== 'sidebar') return;
        if (!sidebar.contains(e.target) && !popover.contains(e.target)) { popoverPinned = false; popover.classList.remove('open'); }
    });

    document.getElementById('mw-btn-notifications').onclick = async (e) => {
        e.stopPropagation();
        if (notificationsEnabled()) {
            localStorage.setItem(STORAGE_KEY_NOTIFY, 'off');
        } else {
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }
            localStorage.setItem(STORAGE_KEY_NOTIFY, 'on');
        }
        syncNotificationButton();
    };

    document.getElementById('mw-btn-calibrate').onclick = (e) => {
        e.stopPropagation();
        if (window.location.pathname.includes('/app/account/settings')) {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '1');
            autoScanOnSettingsPage();
            return;
        }
        localStorage.setItem(STORAGE_KEY_RETURN_URL, window.location.href);
        localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '1');
        window.location.href = `${window.location.origin}/app/account/settings`;
    };

    document.getElementById('mw-btn-clear-requests').onclick = (e) => {
        e.stopPropagation();
        if (confirm('Effacer la fenêtre glissante (requêtes) et l\'historique de quota ?')) {
            localStorage.removeItem(STORAGE_KEY_REQUESTS);
            localStorage.removeItem(STORAGE_KEY_START);
            localStorage.removeItem(STORAGE_KEY_HISTORY);
            localStorage.removeItem(STORAGE_KEY_NOTIFIED);
            pendingRequest = null;
            updateUI();
            updateConsumptionStats();
            drawHistory();
        }
    };

    const exportBtn = document.getElementById('mw-btn-export');
    const importBtn = document.getElementById('mw-btn-import');
    const importFile = document.getElementById('mw-import-file');

    exportBtn.onclick = (e) => {
        e.stopPropagation();
        const data = { version: 14, exportedAt: new Date().toISOString(), values: {} };
        for (const key of EXPORT_KEYS) {
            const value = localStorage.getItem(key);
            if (value !== null) data.values[key] = value;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `mammouth-quota-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    importBtn.onclick = (e) => { e.stopPropagation(); importFile.click(); };

    importFile.onchange = async () => {
        const file = importFile.files && importFile.files[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            if (!parsed.values || typeof parsed.values !== 'object') throw new Error('Format incorrect');
            for (const key of EXPORT_KEYS) {
                if (typeof parsed.values[key] === 'string') localStorage.setItem(key, parsed.values[key]);
            }
            updateUI();
            updateConsumptionStats();
            drawHistory();
            syncNotificationButton();
            syncApiToggle();
            syncMiniModeButton();
            syncCircleModeButton();
            syncUiModeButton();
            updateReturnButton();
            alert('Données Mammouth importées.');
        } catch (error) {
            console.error('[MammouthWidget] Import:', error);
            alert('Impossible d\'importer ce fichier.');
        } finally {
            importFile.value = '';
        }
    };

    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY_MODEL_PCT && event.newValue !== event.oldValue) {
            try {
                const nw = JSON.parse(event.newValue || '{}');
                const od = JSON.parse(event.oldValue || '{}');
                const fmt = (m) => displayableModelNames(m).map(n => n + ' ' + m[n] + '%').join(', ') || '(vide)';
                console.log('[MammouthWidget] modèles mis à jour par une autre fenêtre →', fmt(nw), '| avant:', fmt(od));
                const jr = readJSON(STORAGE_KEY_HARVEST_JOURNAL, []);
                if (jr.length) console.log('[MammouthWidget] journal harvest →', JSON.stringify(jr[jr.length - 1]));
            } catch {}
        }
        if (!event.key || event.key.startsWith('mammouth_')) {
            updateUI();
            updateConsumptionStats();
            syncNotificationButton();
            syncApiToggle();
            syncMiniModeButton();
            syncCircleModeButton();
            syncUiModeButton();
syncLogoToggle();
            updateReturnButton();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateUI();
            updateConsumptionStats();
            checkTimerNotification();
            const lastSync = Number(localStorage.getItem(STORAGE_KEY_API_TS) || 0);
            if (Date.now() - lastSync >= API_INTERVAL_MS) fetchQuotaFromAPI(false);
        }
    });

    syncNotificationButton();
    syncMiniModeButton();
    syncCircleModeButton();
    syncUiModeButton();
    applyUiMode();
    updateReturnButton();

    updateUI();
    updateConsumptionStats();

    try {
        const curPct = readJSON(STORAGE_KEY_MODEL_PCT, {});
        const cleanedPct = {};
        for (const [k, v] of Object.entries(curPct)) if (!isJunkModelKey(k) && Number.isFinite(v)) cleanedPct[k] = v;
        if (Object.keys(cleanedPct).length !== Object.keys(curPct).length) {
            localStorage.setItem(STORAGE_KEY_MODEL_PCT, JSON.stringify(cleanedPct));
            console.log('[MammouthWidget] purge clés non-modèle du stockage par modèle →', Object.keys(cleanedPct));
        }
    } catch {}

    _origFetch(CURRENT_USAGE_URL, { credentials: 'include', cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
            const c = numberOrNull(d && d.currentSpendCents);
            if (c !== null) {
                localStorage.setItem(STORAGE_KEY_SPEND_CENTS, String(c));
                console.log('[MammouthWidget] Baseline currentSpendCents =', c);
                updateConsumptionStats();
            }
        })
        .catch(() => {});

    setTimeout(() => {
        const isSettingsPage = window.location.pathname.includes('/app/account/settings');
        if (!isSettingsPage) {
            const d = scanDomForPercent();
            if (d !== null) localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(d));
            fetchQuotaFromAPI(true);
            setTimeout(() => backgroundHarvestIfNeeded(), 6000);
        } else {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '1');
            autoScanOnSettingsPage();
            setTimeout(() => fetchQuotaFromAPI(true), 2500);
        }
    }, 2500);

    /* ================= BOUCLES ================= */
    if (!window.__mwTimersStarted) {
        window.__mwTimersStarted = true;
        window.__mwTickTimer = setInterval(updateUI, 1000);
        window.__mwApiTimer = setInterval(() => { if (apiEnabled()) { fetchQuotaFromAPI(true); if (window.location.pathname.includes('/app/account/settings')) harvestModelQuotasViaDom(); else backgroundHarvestIfNeeded(); } }, API_INTERVAL_MS);
        window.__mwConsTimer = setInterval(updateConsumptionStats, 15000);
        window.addEventListener('beforeunload', () => {
            clearInterval(window.__mwTickTimer);
            clearInterval(window.__mwApiTimer);
            clearInterval(window.__mwConsTimer);
        });
    }

    if (!window.__mwExtTimers) {
        window.__mwExtTimers = true;
        setInterval(() => { if (!document.hidden) { if (window.location.pathname.includes('/app/account/settings')) harvestModelQuotasViaDom(); else backgroundHarvestIfNeeded(); } }, 3 * 60 * 1000);
        setInterval(() => { if (!document.hidden) extensionTick(); }, 3000);
        setInterval(() => { if (document.hidden) extensionTick(); }, 30000);
    }

    window.__mwDebug = {
        classifyQuotaBars, readPoolGauge, scanModelSections, findModelNameForBar,
        allGaugePreciseWidths, detectBrandFilterActive, scanDomForPercent,
        recalibrateIfDivergent, isJunkModelKey, isPureBrandKey,
        storeModelPct, normalizeModelMap, displayableModelNames,
        officialModelSectionSeen,
        poolGuardActive, expectedPoolPct, poolReadingImplausible, notePoolActivity,
        calibrateIfPending, readQuotaFromDOM, fetchQuotaFromAPI,
        renderModelBlocks, brandLogoSvg, syncLogoToggle, setLogoMode, getLogoMode,
        updateSidebar, renderRing3Logo,
        simProjection, updateSimulator, updatePopoverSimHint,
        harvestDom: () => harvestModelQuotasViaDom(),
        harvestJournal: () => readJSON(STORAGE_KEY_HARVEST_JOURNAL, []),
    };

    console.log('[MammouthWidget] Quota Tracker v14.22 chargé');
})();