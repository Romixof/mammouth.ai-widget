// ==UserScript==
// @name         Mammouth AI - Quota Tracker
// @namespace    http://tampermonkey.net/
// @version      15.18
// @description  Quota Tracker mammouth.ai — quota global (pool), fenêtre glissante 3h en base TEMPS, quota par modèle.
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

    // Styles
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
        .mw-stat-wide { grid-column: 1 / -1; }
        .mw-stat-wide .mw-stat-value { color: #b8b8c0; font-size: 11px; font-weight: 600; line-height: 1.45; }
        .mw-stat-wide.warn .mw-stat-value { color: #ffa502; }
        .mw-stat-wide.warn .mw-stat-label { color: #ffa502; }
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
            position: fixed; right: 90px; top: 50%; transform: translateY(-50%);
            width: 300px; max-width: calc(100vw - 108px);
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

        .mw-pop-sync { font-size: 10px; color: #7a7a86; font-weight: 600; white-space: nowrap; }
        .mw-pop-sync::before { content: '●'; margin-right: 4px; font-size: 7px; vertical-align: 1px; color: #4a9d5a; }
        .mw-pop-sync.syncing::before { color: #a29bfe; animation: mw-pulse 0.9s infinite; }
        .mw-pop-gear { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #b8b8c0; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; transition: background 0.2s, color 0.2s; }
        .mw-pop-gear:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .mw-pop-section { padding: 11px 11px 10px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 10px; }
        .mw-pop-section:last-child { margin-bottom: 0; }
        .mw-pop-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .mw-pop-label { font-size: 12.5px; font-weight: 700; color: #f0f0f0; letter-spacing: -0.1px; display: flex; align-items: center; gap: 6px; }
        .mw-pop-reset { font-size: 11px; color: #b0b0b8; font-weight: 600; white-space: nowrap; }
        .mw-pop-bar { width: 100%; height: 7px; background: rgba(255,255,255,0.09); border-radius: 999px; overflow: visible; margin-top: 10px; position: relative; }

        .mw-pop-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 9px; min-height: 17px; }
        .mw-pop-pct { font-size: 12px; font-weight: 700; color: #f0f0f0; letter-spacing: -0.1px; }
        .mw-pop-note {
            font-size: 10px; font-weight: 600; color: #8a8a95; letter-spacing: 0.1px;
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
            border-radius: 999px; padding: 2px 7px; white-space: nowrap; line-height: 1.5;
        }
        .mw-pop-note.warn { color: #ffa502; background: rgba(255,165,2,0.10); border-color: rgba(255,165,2,0.26); }
        .mw-pop-note:empty { display: none; }
        .mw-pop-fill { height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1), background 0.3s; position: relative; }
        .mw-pop-fill::after { content: ''; position: absolute; right: -5px; top: 50%; transform: translateY(-50%); width: 11px; height: 11px; border-radius: 50%; background: inherit; border: 2px solid rgba(15,15,20,0.98); box-shadow: 0 1px 5px rgba(0,0,0,0.45); opacity: 0; transition: opacity 0.2s; }
        .mw-pop-fill[style*="width: 0%"]::after { opacity: 0; }
        .mw-pop-fill:not([style*="width: 0%"])::after { opacity: 1; }
        .mw-pop-used { font-size: 11px; color: #b0b0b8; margin-top: 6px; font-weight: 600; }
        .mw-pop-used.warn { color: #ffa502; }

        .mw-dot {
            display: inline-block; width: 3px; height: 3px; border-radius: 50%;
            background: #6a6a78; margin: 0 7px; vertical-align: middle;
            position: relative; top: -1px;
        }
        .mw-pop-used.stale, .stale { color: #ffa502; }
        .mw-pop-reset.stale { color: #ffa502; }
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
        .mw-model-pct { font-size:11px; font-weight:700; color:#ffa502; white-space:nowrap; }
        .mw-model-pct.warn { color:#ff6b6b; }
        .mw-model-right { display:inline-flex; align-items:center; gap:5px; flex:0 0 auto; }

        .mw-model-age { margin-top:5px; font-size:9.5px; color:#6b6b78; font-weight:600; letter-spacing:0.1px; }
        .mw-model-block.mw-enter { animation: mw-fade-rise 0.45s cubic-bezier(0.22,1,0.36,1) both; }

        .mw-model-block.mw-over { border-color: rgba(255,71,87,0.45); }
        .mw-model-block.mw-over .mw-pop-fill { background: repeating-linear-gradient(135deg, #ff4757 0px, #ff4757 5px, #ff6b81 5px, #ff6b81 10px) !important; }
        .mw-model-block.mw-over .mw-model-pct, .mw-model-block.mw-over .mw-pop-used { color: #ff4757; }
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

    // Widget
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

            <div class="mw-card" id="mw-card-models">
                <div class="mw-label">
                    <span>Quota par modèle</span>
                    <span class="mw-sub-text" id="mw-widget-models-reset" style="margin:0">—</span>
                </div>
                <div id="mw-widget-models" style="margin-top:8px"></div>
                <button class="mw-btn" id="mw-widget-fetch-models" style="width:100%;margin-top:10px;padding:8px;font-size:11px" title="Un seul clic : une petite fenêtre s'ouvre en bas à droite, clique la section Quota toute seule, lit les jauges par modèle puis se ferme (~15–30 s). Ta page et ton travail restent intacts.">📥 Récupérer les quotas par modèle</button>
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
                    <label title="Le quota par modèle se relit tout seul ~12 s après chaque réponse (petite fenêtre qui s'ouvre et se ferme). Désactiver si tu préfères ne lire les quotas par modèle qu'à la demande.">Modèles auto</label>
                    <button class="mw-btn-sm" id="mw-btn-model-auto">Auto</button>
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

    // Sidebar et popover
    const sidebar = document.createElement('div');
    sidebar.id = 'mw-sidebar';
    sidebar.className = 'mw-hidden';
    sidebar.innerHTML = `
        <div class="mw-sb-item" id="mw-sb-1" title="Quota global (fenêtre 3h)">
            <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4"/><circle id="mw-sb-ring-1" cx="26" cy="26" r="20" fill="none" stroke="#ff6b6b" stroke-width="4" stroke-linecap="round" stroke-dasharray="125.66" stroke-dashoffset="125.66" transform="rotate(-90 26 26)"/></svg>
            <div class="mw-sb-center"><span class="mw-sb-icon">✦</span><span class="mw-sb-pct" id="mw-sb-pct-1">—</span></div>
            <span class="mw-sb-dot" id="mw-sb-dot-1" style="background:#ff6b6b"></span>
        </div>
        <div class="mw-sb-item" id="mw-sb-2" title="Fenêtre glissante — consommation réelle (3 h, réconciliée avec le site)">
            <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4"/><circle id="mw-sb-ring-2" cx="26" cy="26" r="20" fill="none" stroke="#2ed573" stroke-width="4" stroke-linecap="round" stroke-dasharray="125.66" stroke-dashoffset="125.66" transform="rotate(-90 26 26)"/></svg>
            <div class="mw-sb-center"><span class="mw-sb-icon">◈</span><span class="mw-sb-pct" id="mw-sb-pct-2">—</span></div>
            <span class="mw-sb-dot" id="mw-sb-dot-2" style="background:#2ed573"></span>
        </div>
        <div class="mw-sb-item" id="mw-sb-3" title="Modèle le plus strained (quota par modèle)">
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
                <span class="mw-pop-sync" id="mw-pop-sync" title="Dernière lecture du quota par le site">·</span>
                <span class="mw-pop-time" id="mw-pop-time">--:--</span>
                <button class="mw-pop-gear" id="mw-pop-gear" title="Paramètres">⚙</button>
            </div>
        </div>
        <div class="mw-pop-used warn" id="mw-pop-total-warning" style="display:none;margin-bottom:10px"></div>
        <div class="mw-pop-used warn" id="mw-pop-blocked" style="display:none;margin-bottom:10px"></div>
        <div class="mw-pop-section">
            <div class="mw-pop-row"><span class="mw-pop-label">Quota global</span></div>
            <div class="mw-pop-bar"><div class="mw-pop-fill" id="mw-pop-fill-1" style="width:0%; background: linear-gradient(90deg,#ff6b6b,#ff8e53)"></div></div>
            <div class="mw-pop-foot"><span class="mw-pop-pct" id="mw-pop-used-1">—</span></div>
        </div>
        <div class="mw-pop-section">
            <div class="mw-pop-row"><span class="mw-pop-label">Fenêtre glissante</span><span class="mw-pop-reset" id="mw-pop-reset-2">—</span></div>
            <div class="mw-pop-bar"><div class="mw-pop-fill" id="mw-pop-fill-2" style="width:0%; background: linear-gradient(90deg,#2ed573,#7bed9f)"></div></div>
            <div class="mw-pop-foot"><span class="mw-pop-pct" id="mw-pop-used-2">—</span></div>
        </div>
        <div class="mw-pop-section">
            <div class="mw-pop-row"><span class="mw-pop-label">Modèle le plus strained</span><span class="mw-pop-reset" id="mw-pop-reset-3">—</span></div>
            <div class="mw-pop-bar"><div class="mw-pop-fill" id="mw-pop-fill-3" style="width:0%; background: linear-gradient(90deg,#ffa502,#ffc048)"></div></div>
            <div class="mw-pop-foot"><span class="mw-pop-pct" id="mw-pop-used-3">—</span></div>
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
        </div>
        <button class="mw-btn-sm" id="mw-pop-fetch-models" style="width:100%;margin-top:10px;padding:8px;font-size:11px" title="Un seul clic : une petite fenêtre s'ouvre en bas à droite, clique la section Quota toute seule, lit les jauges par modèle puis se ferme (~15–30 s). Ta page et ton travail restent intacts.">📥 Récupérer les quotas par modèle</button>
        <div class="mw-pop-footer">
            <button class="mw-btn-sm mw-btn-primary-sm" id="mw-pop-refresh">Rafraîchir ♻️</button>
            <button class="mw-btn-sm" id="mw-pop-close">Fermer</button>
        </div>
    `;
    document.body.appendChild(popover);

    // Constantes
    const WINDOW_MS = 3 * 60 * 60 * 1000;
    const API_URL = 'https://mammouth.ai/api/user/recentUsage';
    const CURRENT_USAGE_URL = '/api/user/currentUsage';
    const API_INTERVAL_MS = 5 * 60 * 1000;
    const POOL_POLL_MS = 60 * 1000;
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
    const STORAGE_KEY_SPEND_TS = 'mammouth_current_spend_ts';
    const STORAGE_KEY_THRESHOLD_CENTS = 'mammouth_threshold_cents';
    const STORAGE_KEY_HISTORY = 'mammouth_quota_history';
    const STORAGE_KEY_NOTIFY = 'mammouth_notifications_enabled';
    const STORAGE_KEY_NOTIFIED = 'mammouth_notified_thresholds';
    const STORAGE_KEY_RAW_USED_CACHE = 'mammouth_raw_used_cache';
    const STORAGE_KEY_RAW_USED_CACHE_TS = 'mammouth_raw_used_cache_ts';
    const STORAGE_KEY_PENDING_REQUEST = 'mammouth_pending_request';
    const STORAGE_KEY_PENDING_QUEUE = 'mammouth_pending_queue';
    const STORAGE_KEY_LEDGER_CLEARED = 'mammouth_ledger_cleared_ts';
    const STORAGE_KEY_LAST_CALIBRATION = 'mammouth_last_calibration';
    const STORAGE_KEY_CALIB_STATE = 'mammouth_calibrator_state';
    const STORAGE_KEY_POPUP_GAUGE = 'mammouth_popup_gauge';
    const STORAGE_KEY_MODEL_QUOTA = 'mammouth_model_quota';
    const STORAGE_KEY_MODEL_MISSES = 'mammouth_model_quota_misses';
    const STORAGE_KEY_SCHEMA = 'mammouth_schema_version';
    const STORAGE_KEY_PLAN_REFUSED = 'mammouth_plan_pool_refused';
    const STORAGE_KEY_SOURCE_LOG = 'mammouth_source_log';
    const STORAGE_KEY_POOL_SOURCE = 'mammouth_pool_source';
    const STORAGE_KEY_MODEL_AUTO = 'mammouth_model_auto_refresh';

    const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000;
    const RAW_USED_CACHE_TTL_MS = 2 * 60 * 1000;
    const CALIBRATION_COOLDOWN_MS = 10000;
    const SCHEMA_VERSION = 2;

    // Config
    const CFG = {
        windowMs: WINDOW_MS,
        apiIntervalMs: API_INTERVAL_MS,

        modelTtlMs: 30 * 60 * 1000,
        modelRemoveAfterMisses: 2,

        modelFreshMs: 2 * 60 * 60 * 1000,

        ledgerMaxEntries: 500,
        ledgerPruneMs: 5000,

        calibSettleReads: 2,
        calibSettleGapMs: 4000,
        calibMaxRetries: 3,
        calibRetryBackoffMs: 30000,
        calibMaxSpread: 1.5,

        poolGuardMs: 20000,
        poolImplausibleFloor: 2.5,
        poolImplausibleRel: 0.6,

        popupFailsafeMs: 90000,
        popupGrowthQuietMs: 6000,
        popupStableTicks: 3,
        popupMaxAssists: 10,
        popupAssistGapMs: 2300,
        popupFirstAssistMs: 2200,
        popupRelocateMinMs: 18000,
        popupRelocateMaxMs: 45000,
        popupRelocateIdleMs: 6000,
        popupProbeStepMs: 60,

        poolPollMs: 60000,
        modelAutoMinGapMs: 180000,
        modelAutoStaleMs: 240000,
        modelAutoDelayMs: 12000,
        resolveMaxTries: 4,
        resolveTimeoutMs: 20000,
        calibSoftRetryMs: 4000,
        calibSoftLogMs: 120000,
        calibSoftExpireMs: 15 * 60 * 1000,

        calibAmbigGraceMs: 90 * 1000,

        popupBrandPhaseMs: 7000,
        popupBrandReadMs: 1400,
        popupBrandRestoreMs: 800,

        gaugeCacheMs: 300,
        nameMapCacheMs: 500,
        officialSectionCacheMs: 5000,
        lightTickMs: 1000,
        heavyTickMs: 5000,
        harvestJournalMax: 12,
    };

    // Plafond par plan
    const PLAN_POOL_CENTS = { standard: 450, expert: 1500 };
    const PLAN_POOL_TOLERANCE = 0.12;
    function getRefusedPlans() {
        const r = readJSON(STORAGE_KEY_PLAN_REFUSED, []);
        return Array.isArray(r) ? r : [];
    }
    function refusePlanPoolIfDivergent(newTotal) {
        if (!(newTotal > 0)) return;
        const list = getRefusedPlans();
        let changed = false;
        for (const [pl, pool] of Object.entries(PLAN_POOL_CENTS)) {
            if (Math.abs(newTotal - pool) > pool * PLAN_POOL_TOLERANCE && !list.includes(pl)) { list.push(pl); changed = true; }
        }
        if (changed) localStorage.setItem(STORAGE_KEY_PLAN_REFUSED, JSON.stringify(list));
    }

    function healTotalFromPlan(spendCents, plan) {
        const pool = PLAN_POOL_CENTS[plan];
        if (!pool) return null;
        const refused = getRefusedPlans();
        if (refused.includes(plan)) return null;
        if (!(spendCents > 0) || spendCents >= pool) return null;
        const total = numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
        if (total === null || !(total > 0)) {

            const pct = POOL.commit({ usedCents: spendCents, totalCents: pool, source: 'plan:' + plan });
            console.log('[MammouthWidget] total initialisé depuis le plan ' + plan + ' (' + pool + '¢) → ' + pct + '%');
            return pct;
        }

        if (Math.abs(total - pool) > pool * PLAN_POOL_TOLERANCE) {
            POOL.flagTotalWarning('Total calibré (' + fmtCentsFr(total) + ') très loin du plan ' + plan
                + ' (' + fmtCentsFr(pool) + ') — lance « Calibrer » pour réaligner.');
            console.log('[MammouthWidget] ⚠ total ' + fmtCentsFr(total) + ' vs plan ' + plan + ' ' + fmtCentsFr(pool)
                + ' — signalé (v14.37 écrasait silencieusement ici, ce qui cassait la calibration)');
        }
        return null;
    }
    const PURE_BRAND_KEYS = new Set(['grok','claude','anthropic','xai','openai','gpt','chatgpt','google','gemini','meta','llama','deepseek','mistral','kimi','minimax','qwen','mammouth']);
    function isPureBrandKey(k) { return PURE_BRAND_KEYS.has(String(k || '').trim().toLowerCase()); }
    function isJunkModelKey(k) {
        const s = String(k || '').trim();
        if (!s || isPureBrandKey(s)) return true;
        return /d['’]utilisation/i.test(s) || /cliquez\s+pour\s+filtrer/i.test(s);
    }

    // Modèles

    const GENERIC_TITLE_RE = /utilisation|quota|^total\b|usage|semaine|week|mois|month|cette\b|pool|globale|générale|generale|laboratoire|labo|consommation|conso\b|crédit|credit|fenêtre|glissante|session|réinit|reinit/i;

    function isDisplayableModelKey(k) {
        const s = String(k == null ? '' : k).replace(/\s+/g, ' ').trim();
        if (!s) return false;
        if (isJunkModelKey(s)) return false;
        if (GENERIC_TITLE_RE.test(s)) return false;
        return /[a-zà-ÿ]/i.test(s);
    }
    function displayableModelNames(map) {
        return Object.keys(map || {}).filter(k => isDisplayableModelKey(k) && Number.isFinite(pctOf(map[k])));
    }

    function pctOf(v) {
        if (v && typeof v === 'object') return numberOrNull(v.pct != null ? v.pct : v.value);
        return numberOrNull(v);
    }

    function normalizeModelMap(raw) {
        const out = {};
        if (!raw || typeof raw !== 'object') return out;

        const best = new Map();
        for (const [k0, v] of Object.entries(raw)) {
            const pct = pctOf(v);
            if (pct === null || pct < 0 || pct > 1000) continue;
            const key = String(k0 || '').replace(/\s+/g, ' ').trim();
            if (!key) continue;
            const low = key.toLowerCase();
            const isLowerAlias = key === low;
            const prev = best.get(low);
            if (!prev || (prev.isLowerAlias && !isLowerAlias)) {
                best.set(low, { key, pct, isLowerAlias });
            }
        }
        for (const { key, pct } of best.values()) {
            let name = key;
            if (/^[a-z0-9]/.test(name)) {
                const pretty = beautifyModelName(name);
                if (pretty) name = pretty;
            }
            if (!isDisplayableModelKey(name)) continue;

            out[name] = Math.max(0, Math.min(1000, Math.round(pct)));
        }
        return out;
    }

    function journalHarvest(entry) {
        try {
            const j = readJSON(STORAGE_KEY_HARVEST_JOURNAL, []);
            j.push(entry);
            while (j.length > CFG.harvestJournalMax) j.shift();
            localStorage.setItem(STORAGE_KEY_HARVEST_JOURNAL, JSON.stringify(j));
        } catch {}
    }

    function readModelEnvelope() {
        const raw = readJSON(STORAGE_KEY_MODEL_QUOTA, null);
        if (raw && typeof raw === 'object' && raw.models && typeof raw.models === 'object') {
            const models = {};
            for (const [k, v] of Object.entries(raw.models)) {
                const pct = pctOf(v);
                if (pct === null) continue;
                models[k] = {
                    pct: Math.max(0, Math.min(1000, Math.round(pct))),
                    lastSeen: numberOrNull(v && v.lastSeen) || numberOrNull(raw.ts) || 0,
                    hits: (v && typeof v.hits === 'object' && v.hits) ? v.hits : {},
                };
            }
            return {
                v: 1,
                ts: numberOrNull(raw.ts) || 0,
                source: typeof raw.source === 'string' ? raw.source : '?',
                complete: raw.complete === true,
                confidence: numberOrNull(raw.confidence) || 0.4,
                models,
            };
        }
        return { v: 1, ts: 0, source: 'vide', complete: false, confidence: 0, models: {} };
    }

    function modelEntries() {
        const env = readModelEnvelope();
        const now = Date.now();
        const out = [];
        for (const [k, v] of Object.entries(env.models)) {
            if (!isDisplayableModelKey(k)) continue;
            if (now - (v.lastSeen || 0) > CFG.modelFreshMs) continue;
            out.push({ name: k, pct: v.pct, lastSeen: v.lastSeen || 0 });
        }
        out.sort((a, b) => b.pct - a.pct);
        return out;
    }

    function modelPctMap() {
        const out = {};
        for (const e of modelEntries()) out[e.name] = e.pct;
        return out;
    }
    function modelNames() { return modelEntries().map(e => e.name); }
    function modelStale() {
        const es = modelEntries();
        if (!es.length) return true;

        let oldest = Infinity;
        for (const e of es) if (e.lastSeen < oldest) oldest = e.lastSeen;
        return !oldest || (Date.now() - oldest) > CFG.modelTtlMs;
    }

    function modelEntryAgeLabel(lastSeen) {
        const s = Math.max(0, Math.round((Date.now() - (lastSeen || 0)) / 1000));
        if (s < 90) return 'à l\'instant';
        if (s < 3600) return 'relevé il y a ' + Math.round(s / 60) + ' min';
        if (s < 86400) return 'relevé il y a ' + Math.round(s / 3600) + ' h';
        return 'relevé il y a ' + Math.round(s / 86400) + ' j';
    }
    function modelAgeLabel() {
        const env = readModelEnvelope();
        if (!env.ts) return 'jamais mesuré';
        const s = Math.max(0, Math.round((Date.now() - env.ts) / 1000));
        if (s < 60) return 'relevé à l\'instant';
        if (s < 3600) return 'relevé il y a ' + Math.round(s / 60) + ' min';
        return 'relevé il y a ' + Math.round(s / 3600) + ' h';
    }

    function storeModelPct(nextRaw, source, opts) {
        try {
            const o = opts || {};
            const incoming = normalizeModelMap(nextRaw);
            const incomingNames = displayableModelNames(incoming);
            const now = Date.now();
            const prev = readModelEnvelope();
            const prevNames = Object.keys(prev.models).filter(isDisplayableModelKey);
            const complete = o.complete === true;

            if (!incomingNames.length) {

                if (complete && prevNames.length) {
                    const misses = readModelMisses();
                    if (Object.keys(misses).length) {
                        localStorage.setItem(STORAGE_KEY_MODEL_MISSES, JSON.stringify({}));
                    }
                    console.log('[MammouthWidget] modèles (' + source + ') : scan complet VIDE — '
                        + prevNames.length + ' modèle(s) conservé(s) (purge seulement après '
                        + CFG.modelRemoveAfterMisses + ' scans complets consécutifs)');
                } else {
                    console.log('[MammouthWidget] store (' + source + ') : scan partiel vide — stockage intact');
                }
                return false;
            }

            const next = { v: 1, ts: now, source: String(source || '?'), complete, confidence: numberOrNull(o.confidence) || (complete ? 0.85 : 0.4), models: {} };
            for (const [k, v] of Object.entries(prev.models)) {
                const low = k.toLowerCase();
                const hit = incomingNames.find(n => n.toLowerCase() === low);
                if (hit) { next.models[hit] = { pct: incoming[hit], lastSeen: now, hits: Object.assign({}, v.hits, { [source]: now }) }; }
                else { next.models[k] = { pct: v.pct, lastSeen: v.lastSeen, hits: v.hits }; }
            }
            for (const n of incomingNames) {
                if (next.models[n]) continue;
                next.models[n] = { pct: incoming[n], lastSeen: now, hits: { [source]: now } };
            }

            const misses = readModelMisses();
            const removed = [];
            if (complete) {
                for (const k of Object.keys(next.models)) {
                    if (incomingNames.some(n => n.toLowerCase() === k.toLowerCase())) { delete misses[k]; continue; }
                    misses[k] = (misses[k] || 0) + 1;
                    if (misses[k] >= CFG.modelRemoveAfterMisses) { delete next.models[k]; delete misses[k]; removed.push(k); }
                }
            }

            for (const k of Object.keys(next.models)) {
                if (now - (next.models[k].lastSeen || 0) > HISTORY_RETENTION_MS) { delete next.models[k]; delete misses[k]; removed.push(k); }
            }

            localStorage.setItem(STORAGE_KEY_MODEL_QUOTA, JSON.stringify(next));
            localStorage.setItem(STORAGE_KEY_MODEL_MISSES, JSON.stringify(misses));

            const finalNames = Object.keys(next.models).filter(isDisplayableModelKey);
            const action = removed.length ? ('retrait de ' + removed.length + ' : ' + removed.join(', '))
                : (complete ? 'scan complet' : 'fusion (scan partiel)');
            journalHarvest({ ts: now, source, action, avant: prevNames, apres: finalNames.map(n => n + '=' + next.models[n].pct) });
            console.log('[MammouthWidget] modèles (' + source + ', ' + action + ') →',
                finalNames.map(n => n + ' ' + next.models[n].pct + '%').join(', '));
            return true;
        } catch (e) { console.warn('[MammouthWidget] storeModelPct err', e); return false; }
    }
    function readModelMisses() {
        const m = readJSON(STORAGE_KEY_MODEL_MISSES, {});
        return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
    }

    // Garde anti-lecture contaminée
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
            if (ts && Date.now() - ts < CFG.poolGuardMs) return true;
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
    let _lastImplausibleLog = 0;
    function logImplausiblePool(pct) {
        const nowTick = Date.now();
        if (nowTick - _lastImplausibleLog < 15000) return;
        _lastImplausibleLog = nowTick;
        const exp = expectedPoolPct();
        console.log('[MammouthWidget] lecture pool INCOHÉRENTE avec l\u2019usage (' + pct + '% vs ' + (exp !== null ? exp.toFixed(1) : '—') + '% attendus) — ignorée (pool filtrée / jauge labo ?)');
    }

    // Helpers storage
    function numberOrNull(v) {
        if (typeof v === 'number' && !isNaN(v)) return v;
        if (typeof v === 'string') { const n = parseFloat(v); if (!isNaN(n)) return n; }
        return null;
    }

    function toPercent(v) {
        if (typeof v === 'number' && isFinite(v)) {
            if (v > 0 && v <= 1) return Math.round(v * 100);
            return Math.round(v);
        }
        if (typeof v === 'string') {
            const m = v.trim().match(/^(\d+(?:[.,]\d+)?)\s*%?$/);
            if (!m) return null;
            const n = parseFloat(m[1].replace(',', '.'));
            if (!isFinite(n)) return null;
            if (n > 0 && n <= 1) return Math.round(n * 100);
            return Math.round(n);
        }
        return null;
    }

    function fmtPct(pct, suffix) {
        if (pct == null || !isFinite(pct)) return '—';
        const r = Math.round(pct);
        return r + (suffix == null ? ' %' : suffix);
    }

    function toPercentStrict(v) {
        if (typeof v === 'number' && isFinite(v)) return Math.round(v);
        if (typeof v === 'string') {
            const m = v.trim().match(/^(\d+(?:[.,]\d+)?)\s*%?$/);
            if (!m) return null;
            const n = parseFloat(m[1].replace(',', '.'));
            return isFinite(n) ? Math.round(n) : null;
        }
        return null;
    }
    function readJSON(key, fallback) {
        try { const p = JSON.parse(localStorage.getItem(key)); return p == null ? fallback : p; }
        catch { return fallback; }
    }
    function setJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

    function logSourceRejection(source, reason, raw) {
        setJSON(STORAGE_KEY_SOURCE_LOG, { ts: Date.now(), source, reason, sample: raw == null ? null : JSON.stringify(raw).slice(0, 300) });
        console.warn('[MammouthWidget] source ' + source + ' REJETÉE : ' + reason);
    }

    // Pool
    const POOL = {
        _warning: null,
        _warningUntil: 0,
        flagTotalWarning(msg) {
            this._warning = msg;
            this._warningUntil = Date.now() + 30 * 60 * 1000;
            console.log('[MammouthWidget] ⚠ ' + msg);
        },
        warning() { return (this._warning && Date.now() < this._warningUntil) ? this._warning : null; },
        clearWarning() { this._warning = null; this._warningUntil = 0; },
        get usedCents() { return numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED)); },
        get totalCents() { return numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL)); },
        get ts() { return numberOrNull(localStorage.getItem(STORAGE_KEY_API_TS)); },

        commit({ usedCents, totalCents, source } = {}) {
            const u = numberOrNull(usedCents);
            const t = numberOrNull(totalCents);
            if (u !== null && u >= 0) {
                localStorage.setItem(STORAGE_KEY_RAW_USED, String(u));
                localStorage.setItem(STORAGE_KEY_RAW_USED_CACHE, String(u));
                localStorage.setItem(STORAGE_KEY_RAW_USED_CACHE_TS, String(Date.now()));
            }
            if (t !== null && t > 0) localStorage.setItem(STORAGE_KEY_QUOTA_TOTAL, String(t));
            const ut = POOL.usedCents, tt = POOL.totalCents;
            if (ut === null || ut < 0 || tt === null || !(tt > 0)) return null;
            const raw = (ut / tt) * 100;
            const pct = Math.max(0, Math.round(raw));
            localStorage.setItem(STORAGE_KEY_QUOTA, String(pct));
            POOL.setBlockedFrom(ut, tt);
            if (source) localStorage.setItem(STORAGE_KEY_POOL_SOURCE, String(source));
            return pct;
        },

        blocked: false,
        _syncing: false,
        setSyncing(v) { this._syncing = !!v; updateSyncIndicator(); },
        isSyncing() { return this._syncing; },

        lastPoolSyncTs() { return parseInt(localStorage.getItem(STORAGE_KEY_SPEND_TS) || '0', 10); },
        setBlockedFrom(usedCents, totalCents) {
            const u = numberOrNull(usedCents), t = numberOrNull(totalCents);
            this.blocked = !!(u != null && t != null && t > 0 && (u / t) * 100 > 100);
            return this.blocked;
        },
        computePct(usedCents, totalCents) {
            const u = numberOrNull(usedCents), t = numberOrNull(totalCents);
            if (u === null || u < 0 || t === null || !(t > 0)) return null;
            return Math.max(0, Math.min(100, Math.round((u / t) * 100)));
        },
    };

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

    function modelAutoEnabled() { return localStorage.getItem(STORAGE_KEY_MODEL_AUTO) !== 'off'; }
    function setModelAuto(on) { localStorage.setItem(STORAGE_KEY_MODEL_AUTO, on ? 'on' : 'off'); syncModelAutoButton(); }
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

    // Ledger
    const SPEND_FRESH_MS = 10 * 60 * 1000;
    const RAW_USED_FRESH_MS = 6 * 60 * 1000;

    function getRequests() {
        const now = Date.now();
        const arr = readRequestsRaw();
        return arr.sort((a, b) => a.ts - b.ts);
    }

    function getRealRequests() { return getRequests().filter(r => !r.sandbox); }
    function addRequest(ts, cents, meta) {
        let c = numberOrNull(cents);
        if (c === null || c <= 0) c = 0.01;
        try {
            const arr = readRequestsRaw();
            arr.push(Object.assign({ ts, cents: c, measured: c > 0.01 }, meta || {}));
            if (arr.length > CFG.ledgerMaxEntries) arr = arr.slice(-CFG.ledgerMaxEntries);
            writeRequestsRaw(arr);
        } catch { writeRequestsRaw([Object.assign({ ts, cents: c }, meta || {})]); }
    }
    function updateRequestCost(ts, newCents) {
        const arr = readRequestsRaw();
        let hit = false;
        for (const e of arr) {
            if (e.ts === ts) { e.cents = newCents; e.measured = newCents > 0.01; hit = true; break; }
        }
        if (hit) writeRequestsRaw(arr);
    }
    function removeRequests(pred) {
        const arr = readRequestsRaw();
        const kept = arr.filter(r => !pred(r));
        if (kept.length !== arr.length) writeRequestsRaw(kept);
        return arr.length - kept.length;
    }
    function readRequestsRaw() {
        try {
            const arr = JSON.parse(localStorage.getItem(STORAGE_KEY_REQUESTS) || '[]');
            const now = Date.now();
            return (Array.isArray(arr) ? arr : [])
                .filter(r => r && Number.isFinite(r.ts) && r.ts + WINDOW_MS > now);
        } catch { return []; }
    }
    function writeRequestsRaw(arr) {
        try { localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(arr)); } catch {}
    }

    function pruneRequests() {
        const now = Date.now();
        const raw = (() => { try { const a = JSON.parse(localStorage.getItem(STORAGE_KEY_REQUESTS) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } })();
        const kept = raw.filter(r => r && Number.isFinite(r.ts) && r.ts + WINDOW_MS > now)
            .slice(-CFG.ledgerMaxEntries);
        if (kept.length !== raw.length) {
            if (kept.length) localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(kept));
            else localStorage.removeItem(STORAGE_KEY_REQUESTS);
        }
        return kept;
    }
    let _lastPruneTs = 0;
    function maybePruneRequests() {
        const now = Date.now();
        if (now - _lastPruneTs < CFG.ledgerPruneMs) return;
        _lastPruneTs = now;
        pruneRequests();
    }

    function authoritativeWindowSpend() {
        const spendTs = parseInt(localStorage.getItem(STORAGE_KEY_SPEND_TS) || '0', 10);
        const spend = numberOrNull(localStorage.getItem(STORAGE_KEY_SPEND_CENTS));
        if (spendTs && Date.now() - spendTs <= SPEND_FRESH_MS && spend !== null && spend > 0) return spend;
        const rawTs = parseInt(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE_TS) || '0', 10);
        const raw = numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED)) ?? numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE));
        if (rawTs && Date.now() - rawTs <= RAW_USED_FRESH_MS && raw !== null && raw > 0) return raw;
        return null;
    }

    function computeCoverage() {
        const tracked = getRealRequests().reduce((s, r) => s + (numberOrNull(r.cents) || 0), 0);
        const pool = authoritativeWindowSpend();
        const clearedTs = numberOrNull(localStorage.getItem(STORAGE_KEY_LEDGER_CLEARED)) || 0;
        if (pool === null) return { trackedCents: tracked, poolCents: null, gapCents: null, gapPct: null, cleared: false };
        const gap = Math.max(0, Math.round((pool - tracked) * 100) / 100);
        return {
            trackedCents: tracked, poolCents: pool, gapCents: gap,
            gapPct: pool > 0 ? Math.round((gap / pool) * 100) : 0,
            cleared: !!clearedTs && Date.now() - clearedTs < 60 * 60 * 1000,
        };
    }

    function coverageLabel() {
        const c = computeCoverage();
        if (c.poolCents === null) return '';
        if (c.cleared) return '⨯ registre effacé';
        if (c.gapPct >= 8) return '⚠ ' + c.gapPct + ' % non suivis (autre onglet)';
        if (c.gapPct > 2) return '≈ ' + c.gapPct + ' % non suivis';
        return '✓ suivi complet';
    }

    // Références DOM
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
    // Badge API
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

    // Affichage

    function setPercentDisplay(v) {
        const fromPool = (v && typeof v === 'object') ? v.p1 : toPercentStrict(v);
        let t = (fromPool === null || fromPool === undefined) ? toPercentStrict(localStorage.getItem(STORAGE_KEY_QUOTA)) : fromPool;

        if (POOL.totalCents == null) t = null;
        if (t === null) {
            if (displayedPercent !== null) {
                displayedPercent = null;
                realPercentEl.innerText = '— %';
                realPercentEl.style.color = '#888';
                progressQuotaEl.style.width = '0%';
                widget.classList.remove('mw-critical');
            }
            return;
        }
        t = Math.max(0, Math.min(100, Math.round(t)));
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

    function updateMini(oldestRemaining, elapsedPct, V) {
        const v = V || buildRings();
        const q = v.p1 != null ? v.p1 : targetPercent;
        const textMode = getMiniMode();
        const circleMode = getCircleMode();
        const hasActiveWindow = oldestRemaining != null && oldestRemaining > 0;
        const windowEnded = oldestRemaining != null && oldestRemaining <= 0;

        if (textMode === 'used') {
            miniTimeEl.innerText = fmtPct(q, '%');
        } else if (textMode === 'remaining') {
            miniTimeEl.innerText = fmtPct(q != null ? Math.max(0, 100 - q) : null, '%');
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
                miniTimeEl.innerText = fmtPct(q, '%');
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
    // Mise à jour de l'UI
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

    // Simulateur de récupération
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
            if (!r || r.sandbox) continue;
            const c = numberOrNull(r.cents);
            if (!Number.isFinite(r.ts) || c === null || c <= 0) continue;
            events.push({ rel: r.ts + WINDOW_MS, cents: c });
        }
        events.sort((a, b) => a.rel - b.rel);
        let recovered = 0, count = 0;
        for (const e of events) if (e.rel <= horizon) { recovered += e.cents; count++; }

        let next = null;
        for (const e of events) {
            if (e.rel <= now) continue;
            if (next && e.rel - next.rel > 500) break;
            next = next ? { rel: next.rel, cents: next.cents + e.cents } : { rel: e.rel, cents: e.cents };
        }
        const total = POOL.totalCents;
        const curPct = POOL.computePct(POOL.usedCents, total);
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
            if (min > maxMin && maxMin > 0) { min = maxMin; slider.value = String(min); }
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

    function scoreModelName(query, candidate) {
        if (!query || !candidate) return 0;

        const canon = (x) => String(x).toLowerCase().trim().replace(/[-_/.]+/g, ' ').replace(/\s+/g, ' ');
        const q = canon(query), c = canon(candidate);
        if (!q || !c) return 0;
        if (q === c) return 100;
        const qTok = new Set(q.split(' ').filter(Boolean));
        const cTok = new Set(c.split(' ').filter(Boolean));
        let inter = 0; for (const t of qTok) if (cTok.has(t)) inter++;
        if (!inter) return 0;
        let sc = 30;
        sc += Math.round((inter / qTok.size) * 30);
        sc += Math.round((inter / cTok.size) * 15);
        if (c.startsWith(q)) sc += 15;
        if (brandFamilyOf(c) && brandFamilyOf(c) === brandFamilyOf(q)) sc += 10;
        sc -= Math.abs(c.length - q.length) * 0.3;
        return Math.max(0, Math.round(sc));
    }
    function resolveDailyPct(dailyModel, map) {
        if (!dailyModel) return null;
        const src = map || modelPctMap();
        if (src[dailyModel] != null && Number.isFinite(src[dailyModel])) return src[dailyModel];
        let best = null, bestScore = 0;
        for (const [k, v] of Object.entries(src)) {
            if (!Number.isFinite(v)) continue;
            const sc = scoreModelName(dailyModel, k);
            if (sc > bestScore) { bestScore = sc; best = v; }
        }
        return bestScore >= 60 ? best : null;
    }
    // Logos et animations

    const MW_MODEL_CONTAINERS = ['mw-pop-models', 'mw-widget-models'];
    let _mwRenderSigs = {};
    let _mwPrevPcts = {};

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
            if (itemEl && itemEl.title !== 'Modèle le plus strained') itemEl.title = 'Modèle le plus strained';
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
        const t = 'Modèle le plus strained · ' + modelName + ' — ' + fmtPct(pct);
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
            default:
                return wrap(`<defs><linearGradient id="mwd-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa502"/><stop offset="1" stop-color="#ff8e53"/></linearGradient></defs><circle cx="12" cy="12" r="12" fill="url(#mwd-grad)"/><text x="12" y="16.6" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="800" fill="#fff">✦</text>`);
        }
    }
    const GROK_1 = 'M395.479 633.828L735.91 381.105C752.599 368.715 776.454 373.548 784.406 392.792C826.26 494.285 807.561 616.253 724.288 699.996C641.016 783.739 525.151 802.104 419.247 760.277L303.556 814.143C469.49 928.202 670.987 899.995 796.901 773.282C896.776 672.843 927.708 535.937 898.785 412.476L899.047 412.739C857.105 231.37 909.358 158.874 1016.4 10.6326C1018.93 7.11771 1021.47 3.60279 1024 0L883.144 141.651V141.212L395.392 633.916';
    const GROK_2 = 'M325.226 695.251C206.128 580.84 226.662 403.776 328.285 301.668C403.431 226.097 526.549 195.254 634.026 240.596L749.454 186.994C728.657 171.88 702.007 155.623 671.424 144.2C533.19 86.9942 367.693 115.465 255.323 228.382C147.234 337.081 113.244 504.215 171.613 646.833C215.216 753.423 143.739 828.818 71.7385 904.916C46.2237 931.893 20.6216 958.87 0 987.429L325.139 695.339';

    function renderModelBlocks() {
        for (const cid of MW_MODEL_CONTAINERS) renderModelBlocksInto(cid);
    }
    const MODEL_COLORS = { Grok:['#ff6b6b','#ff8e53'], Claude:['#a29bfe','#6c5ce7'], GPT:['#2ed573','#7bed9f'], Gemini:['#ffa502','#ffc048'] };
    const MODEL_DEFAULT_COL = ['#ffa502','#ffc048'];
    function renderModelBlocksInto(containerId) {
        const c = document.getElementById(containerId);
        if (!c) return;

        const entries = modelEntries();
        const harvested = {};
        for (const e of entries) harvested[e.name] = e.pct;
        const ageOf = {};
        for (const e of entries) ageOf[e.name] = e.lastSeen;
        const usedModels = entries.map(e => e.name);
        const logoMode = getLogoMode();
        const stale = modelStale();
        if (!usedModels.length) {
            if (_mwRenderSigs[containerId] !== 'empty') {
                _mwRenderSigs[containerId] = 'empty';
                _mwPrevPcts[containerId] = {};
                const onSettings = window.location.pathname.includes('/app/account/settings');
                c.innerHTML = `<div class="mw-pop-used" style="text-align:center;padding:8px 0;line-height:1.5">
                    ${onSettings ? 'Clique <b>Rafraîchir</b> pour scanner les quotas par modèle.' : 'Clique le bouton <b>📥 Récupérer les quotas par modèle</b> ci-dessous : une petite fenêtre s\'ouvre en bas à droite, lit les jauges puis se ferme toute seule — ta page reste intacte. (La popup officielle du quota fonctionne aussi — lecture automatique.)'}
                </div>`;
            }
            return;
        }
        const namesSig = usedModels.join('|') + (logoMode ? '#L' : '#P') + (stale ? '#S' : '');
        const prevPct = _mwPrevPcts[containerId] || {};
        if (namesSig !== _mwRenderSigs[containerId]) {
            _mwRenderSigs[containerId] = namesSig;
            _mwPrevPcts[containerId] = {};
            c.innerHTML = usedModels.map((name, i) => {
                const pct = harvested[name];
                const over = pct > 100;
                const fam = brandFamilyOf(name);
                const col = MODEL_COLORS[fam] || MODEL_DEFAULT_COL;
                const safeName = escapeHtml(name);

                const headRight = `<span class="mw-model-right">`
                    + (logoMode ? `<span class="mw-model-logo" title="${escapeHtml(fam || 'Laboratoire')}">${brandLogoSvg(fam)}</span>` : '')
                    + `<span class="mw-model-pct${over ? ' warn' : ''}">${fmtPct(pct, '%')}</span></span>`;

                const ageLbl = modelEntryAgeLabel(ageOf[name]);
                const ageLine = ageLbl === 'à l\'instant' ? ''
                    : `<div class="mw-model-age" title="Dernière mesure réelle de ce quota">${escapeHtml(ageLbl)}</div>`;
                return `<div class="mw-model-block mw-enter${over ? ' mw-over' : ''}"${over ? ' title="Quota dépassé — requêtes bloquées temporairement"' : ''} style="animation-delay:${i * 70}ms">
                    <div class="mw-model-head"><span class="mw-model-name">${safeName}</span>${headRight}</div>
                    <div class="mw-pop-bar" style="margin-top:6px"><div class="mw-pop-fill" style="width:${Math.min(100, pct)}%;background:linear-gradient(90deg,${col[0]},${col[1]})"></div></div>
                    ${ageLine}
                </div>`;
            }).join('');
            for (const name of usedModels) _mwPrevPcts[containerId][name] = harvested[name];
            return;
        }
        const blocks = c.querySelectorAll('.mw-model-block');
        usedModels.forEach((name, i) => {
            const block = blocks[i];
            if (!block) return;
            const pct = harvested[name];
            if (prevPct[name] === pct) return;
            block.classList.toggle('mw-over', pct > 100);
            const fill = block.querySelector('.mw-pop-fill');
            if (fill) fill.style.width = Math.min(100, pct) + '%';
            const pctEl = block.querySelector('.mw-model-pct');
            if (pctEl) {
                pctEl.textContent = fmtPct(pct, '%');
                pctEl.classList.toggle('warn', pct > 100);
                bumpEl(pctEl);
            }
            _mwPrevPcts[containerId][name] = pct;
        });
    }
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // Anneaux
    function buildRings() {
        const now = Date.now();
        const reqs = getRequests();
        const real = reqs.filter(r => !r.sandbox);

        const pct1 = POOL.computePct(POOL.usedCents, POOL.totalCents);
        const poolUsed = POOL.usedCents, poolTotal = POOL.totalCents;

        let oldestRem = null, elapsedPct = null, newestRem = null, elapsedMs = null;
        if (real.length) {
            oldestRem = Math.max(0, real[0].ts + WINDOW_MS - now);
            newestRem = Math.max(0, real[real.length - 1].ts + WINDOW_MS - now);

            elapsedMs = Math.max(0, Math.min(WINDOW_MS, WINDOW_MS - oldestRem));
            elapsedPct = Math.max(0, Math.min(100, Math.round((elapsedMs / WINDOW_MS) * 100)));
        }
        const sumCents = real.reduce((s, r) => s + (numberOrNull(r.cents) || 0), 0);
        const proj0 = simProjection(real, 0);
        const nextRel = proj0.next ? proj0.next.rel : null;
        const unmeasured = real.filter(r => r.measured === false).length;
        let line2 = 'aucune requête en fenêtre';
        if (real.length) {
            const bits = [fmtCentsFr(sumCents)];
            if (nextRel) bits.push('prochaine lib. dans ' + fmtHrMin(nextRel - now));
            else bits.push('plus rien à libérer');
            if (unmeasured) bits.push(unmeasured + ' non mesurée(s)');
            line2 = bits.join(' · ');
        }

        const map = modelPctMap();
        let pct3 = null, model3 = null;
        for (const n of Object.keys(map)) {
            if (!isDisplayableModelKey(n)) continue;
            const v = map[n];
            if (pct3 === null || v > pct3) { pct3 = v; model3 = n; }
        }
        const modelAge = modelAgeLabel();
        const stale = modelStale();

        return {
            reqs, real,
            p1: pct1, p2: elapsedPct, p3: pct3, model3, modelAge, stale,
            poolUsed, poolTotal,
            oldestRem, newestRem, elapsedMs, sumCents, line2, nextRel,
            coverage: computeCoverage(),
            modelsAge: modelAge,
        };
    }

    function modelNamesResetLabel() {
        if (!Object.keys(readModelEnvelope().models).length) return '—';
        return modelStale() ? '⚠ ' + modelAgeLabel() : modelAgeLabel();
    }

    function updateSidebar(V) {

        const v = (V && typeof V === 'object' && 'p1' in V) ? V : buildRings();
        const p1 = v.p1, p2 = v.p2, p3 = v.p3;
        const reqs = v.reqs;

        const el1 = document.getElementById('mw-sb-pct-1'),
            el2 = document.getElementById('mw-sb-pct-2'),
            el3 = document.getElementById('mw-sb-pct-3');
        setTextBump(el1, fmtPct(p1, '%'));

        setTextBump(el2, fmtPct(p2, '%'));
        setTextBump(el3, fmtPct(p3, '%'));
        renderRing3Logo(v.model3, p3);
        setSbRing('mw-sb-ring-1', p1 != null ? p1 / 100 : 0);
        setSbRing('mw-sb-ring-2', p2 != null ? p2 / 100 : 0);
        setSbRing('mw-sb-ring-3', p3 != null ? p3 / 100 : 0);

        const f1 = document.getElementById('mw-pop-fill-1'),
            f2 = document.getElementById('mw-pop-fill-2'),
            f3 = document.getElementById('mw-pop-fill-3');
        if (f1) f1.style.width = (p1 != null ? p1 : 0) + '%';
        if (f2) f2.style.width = (p2 != null ? p2 : 0) + '%';
        if (f3) f3.style.width = (p3 != null ? Math.min(100, p3) : 0) + '%';
        renderModelBlocks();

        const u1 = document.getElementById('mw-pop-used-1'),
            u2 = document.getElementById('mw-pop-used-2'),
            u3 = document.getElementById('mw-pop-used-3');

        setTextBump(u1, p1 != null ? fmtPct(p1) + ' utilisé' : '—');

        if (u2) {
            if (!v.real.length) u2.textContent = 'Aucune requête sur la fenêtre';
            else if (v.elapsedMs < 60000) u2.textContent = 'Fenêtre qui démarre';
            else u2.textContent = fmtDurMin(Math.round(v.elapsedMs / 60000)) + ' écoulées sur 3 h';
        }

        if (u3) {
            u3.innerHTML = p3 != null

                ? '<b>' + fmtPct(p3) + '</b>\u00A0<span class="mw-dot"></span>\u00A0' + escapeHtml(v.model3)
                : '—';
        }

        const r2 = document.getElementById('mw-pop-reset-2'), r3 = document.getElementById('mw-pop-reset-3');

        if (r2) r2.innerText = v.oldestRem == null ? '—'
            : v.oldestRem > 0 ? 'libération dans ' + fmtHrMin(v.oldestRem)
            : 'libération en cours';
        if (r3) r3.innerText = v.modelAge;

        const rm = document.getElementById('mw-pop-reset-models');
        if (rm) { rm.innerText = modelNamesResetLabel(); rm.classList.toggle('stale', v.stale); }
        const rmw = document.getElementById('mw-widget-models-reset');
        if (rmw) { rmw.textContent = modelNamesResetLabel(); rmw.classList.toggle('stale', v.stale); }

        const tEl = document.getElementById('mw-pop-time');
        if (tEl) tEl.innerText = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });

        const d1 = document.getElementById('mw-sb-dot-1'), d2 = document.getElementById('mw-sb-dot-2'), d3 = document.getElementById('mw-sb-dot-3');
        if (d1) d1.classList.toggle('on', p1 != null && p1 >= 90);
        if (d2) d2.classList.toggle('on', p2 != null && p2 >= 90);
        if (d3) d3.classList.toggle('on', p3 != null && p3 >= 90);

        const bl = document.getElementById('mw-pop-blocked');
        if (bl) {
            const on = POOL.setBlockedFrom(v.poolUsed, v.poolTotal);
            bl.innerText = on ? '⛔ pool épuisé — requêtes bloquées côté site' : '';
            bl.style.display = on ? 'block' : 'none';
        }
        const warn = document.getElementById('mw-pop-total-warning');
        if (warn) {
            const w = POOL.warning();
            warn.innerText = w || '';
            warn.style.display = w ? 'block' : 'none';
        }
        return v;
    }

    // Ticks
    let _lastHeavyTs = 0;
    function updateUI(forceHeavy) {
        const now = Date.now();
        const heavy = forceHeavy === true || (now - _lastHeavyTs) >= CFG.heavyTickMs;
        if (heavy) _lastHeavyTs = now;

        maybePruneRequests();
        const v = buildRings();
        setPercentDisplay(v);
        const requests = v.reqs, real = v.real;

        if (real.length === 0) {
            countdownEl.classList.remove('mw-pulse-text');
            if (countdownEl.innerText !== '00:00:00') countdownEl.innerText = '00:00:00';
            const txt = 'Aucune requête en fenêtre glissante';
            if (statusEl.innerText !== txt) statusEl.innerText = txt;
            progressTimerEl.style.width = '0%';
        } else {
            const oldestTxt = formatHMS(v.oldestRem);
            if (countdownEl.innerText !== oldestTxt) countdownEl.innerText = oldestTxt;
            countdownEl.classList.toggle('mw-pulse-text', v.oldestRem <= 0);

            const newStatus = real.length + ' req · prochaine libération dans ' + fmtHrMin(v.newestRem);
            if (statusEl.innerText !== newStatus) statusEl.innerText = newStatus;
            progressTimerEl.style.width = (v.p2 != null ? v.p2 : 0) + '%';
        }

        updateMini(v.oldestRem, v.p2 != null ? v.p2 : 0, v);
        updateSidebar(v);

        updateSyncIndicator();
        if (!heavy) return;
        updateSimulator(real);
        updateApiTimestamp();
        refreshApiBadgeFromStorage();
        updateModelsSubtitle();
    }

    function updateModelsSubtitle() {
        const map = modelPctMap();
        const names = Object.keys(map).filter(isDisplayableModelKey)
            .sort((a, b) => map[b] - map[a]);
        const txt = names.length ? names.join('  ·  ') : (localStorage.getItem(STORAGE_KEY_MODELS) || '');
        if (txt && quotaModelsEl.textContent !== txt) {
            quotaModelsEl.textContent = txt;
            quotaModelsEl.style.color = '#cfcfd6';
            setTimeout(() => { quotaModelsEl.style.color = ''; }, 400);
        }
        if (!txt && quotaModelsEl.textContent) quotaModelsEl.textContent = 'Cliquez sur Rafraîchir pour scanner';
    }

    // Noms de modèles
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

        s = s.replace(/\b(gpt|glm|api|ai|llm)\b/g, m => m.toUpperCase());
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

    // Calibration
    const CALIB = {
        _s: null,
        state() {
            if (!this._s) this._s = readJSON(STORAGE_KEY_CALIB_STATE, null) || { state: 'IDLE', reads: [], retries: 0, lastRunTs: 0 };
            return this._s;
        },
        save() { setJSON(STORAGE_KEY_CALIB_STATE, this._s); },
        request(reason) {
            const s = this.state();
            if (s.state === 'COMMITTED' && Date.now() - s.lastRunTs < 10 * 60 * 1000) return;
            s.state = 'PENDING'; s.reason = reason || 'manuel';
            s.reads = []; s.retries = 0; s.queuedTs = Date.now(); s.softSince = 0;
            this.save();
            console.log('[MammouthWidget] calibration demandée (' + s.reason + ')');
        },

        tick() {
            if (typeof _harvestInFlight !== 'undefined' && _harvestInFlight) return null;
            const s = this.state();
            if (s.state === 'IDLE' || s.state === 'COMMITTED') return null;
            if (s.state === 'PENDING') {

                if (poolGuardActive()) { this._defer('garde pool active (harvest en cours)', true); return null; }
                if (Date.now() - (s.queuedTs || 0) < CALIBRATION_COOLDOWN_MS) return null;
                s.state = 'SETTLING'; s.reads = []; this.save();
            }
            if (s.state !== 'SETTLING') return null;
            if (Date.now() - (s.lastRunTs || 0) < CFG.calibSettleGapMs) return null;

            const g = readPoolGauge();

            if (!g) {
                const pg = freshPopupGauge();
                if (!pg) { this._defer('jauge pool absente', true); return null; }
                return this._commitFromPopup(pg);
            }
            const brandFilterActive = (() => { try { return detectBrandFilterActive(g.bar); } catch { return false; } })();
            if (brandFilterActive) { this._defer('jauge pool filtrée (marque active)', true); return null; }
            if (g.ambiguous) {
                const s0 = this.state();
                s0.ambigSince = s0.ambigSince || Date.now();
                this.save();
                if (Date.now() - s0.ambigSince < CFG.calibAmbigGraceMs) {
                    this._defer('jauge pool ambiguë (largeur incertaine) — attente avant recal', true);
                    return null;
                }

                const ord = toPercentStrict(g.bar && g.bar.getAttribute('aria-valuenow'));
                if (ord === null || ord <= 0.2 || ord >= 100) {
                    this._defer('jauge pool ambiguë SANS aria-valuenow exploitable', true);
                    return null;
                }
                console.log('[MammouthWidget] calibration — jauge « ambiguous » persistée, reprise sur aria-valuenow(' + ord + ' %)');
                g.precise = ord;
                g.round = ord;
            } else {

                const s0 = this.state();
                if (s0.ambigSince) { s0.ambigSince = 0; this.save(); }
            }
            if (g.precise === null || g.precise <= 0.2 || g.precise >= 100) { this._defer('jauge pool illisible (' + g.precise + ')', g.precise === null); return null; }
            if (poolReadingImplausible(g.precise)) { this._defer('lecture pool incohérente avec l\'usage', true); logImplausiblePool(g.round); return null; }

            const raw = freshRawUsed();
            if (raw === null || raw <= 0) { this._defer('usage brut inconnu'); return null; }
            s.reads.push({ ts: Date.now(), pct: g.precise });
            s.lastRunTs = Date.now();
            if (s.reads.length < CFG.calibSettleReads) { this.save(); return null; }

            return this._commit(s.reads.map(r => r.pct), raw);
        },

        _commitFromPopup(pg) {
            const s = this.state();
            const pcts = pg.samples.filter(p => p > 0.2 && p < 100);
            if (!pcts.length) { this._defer('jauge lue dans la fenêtre illisible', true); return null; }
            const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
            if (poolReadingImplausible(mean)) { this._defer('lecture pool incohérente avec l\'usage', true); logImplausiblePool(Math.round(mean)); return null; }
            const raw = freshRawUsed();
            if (raw === null || raw <= 0) { this._defer('usage brut inconnu'); return null; }
            s.lastRunTs = Date.now();
            return this._commit(pcts, raw);
        },

        _commit(pcts, raw) {
            const s = this.state();
            const spread = Math.max(...pcts) - Math.min(...pcts);
            if (spread > CFG.calibMaxSpread) { this._defer('lectures instables (spread ' + spread.toFixed(2) + ' %)', true); return null; }

            const domVal = pcts.reduce((a, b) => a + b, 0) / pcts.length;
            const prevTotal = POOL.totalCents;
            const newTotal = raw / (domVal / 100);
            if (!(newTotal > 0)) { this._defer('total calculé invalide'); return null; }
            if (prevTotal != null && prevTotal > 0 && (newTotal > prevTotal * 6 || newTotal < prevTotal / 6)) {
                this._defer('total irréaliste ' + fmtCentsFr(prevTotal) + ' → ' + fmtCentsFr(newTotal));
                return null;
            }
            POOL.commit({ usedCents: raw, totalCents: newTotal, source: 'calibration' });
            refusePlanPoolIfDivergent(newTotal);
            localStorage.setItem(STORAGE_KEY_LAST_CALIBRATION, String(Date.now()));
            POOL.clearWarning();
            s.state = 'COMMITTED'; s.retries = 0; s.lastRunTs = Date.now(); s.softSince = 0;
            s.total = newTotal; this.save();
            console.log('[MammouthWidget] calibration VALIDÉE : total ' + fmtCentsFr(newTotal)
                + ' (jauge ' + domVal.toFixed(2) + ' % ± ' + spread.toFixed(2) + ', usage ' + fmtCentsFr(raw) + ')');
            return newTotal;
        },

        _defer(why, soft) {
            const s = this.state();
            if (soft) {

                s.state = 'PENDING';
                s.queuedTs = Date.now() + CFG.calibSoftRetryMs;
                s.softSince = s.softSince || Date.now();
                this.save();
                if (Date.now() - (s.softLogTs || 0) > CFG.calibSoftLogMs) {
                    s.softLogTs = Date.now(); this.save();
                    console.log('[MammouthWidget] calibration en attente (' + why + ') — reprise automatique');
                }
                if (Date.now() - s.softSince > CFG.calibSoftExpireMs) {
                    s.state = 'IDLE'; s.reads = []; s.retries = 0; s.softSince = 0;
                    this.save();
                    console.log('[MammouthWidget] calibration expirée après ' + Math.round(CFG.calibSoftExpireMs / 60000)
                        + ' min d\'attente — le total reste celui du plan. Relance avec « Rafraîchir ♻️ » sur la page Réglages → Abonnement (la jauge « Quota d\'utilisation » doit y être visible, sans marque sélectionnée).');
                }
                return;
            }
            s.retries = (s.retries || 0) + 1;
            if (s.retries > CFG.calibMaxRetries) {
                s.state = 'IDLE'; s.retries = 0; s.reads = [];
                this.save();
                console.log('[MammouthWidget] calibration abandonnée après ' + CFG.calibMaxRetries + ' tentatives — ' + why);
                return;
            }
            s.state = 'PENDING';
            s.queuedTs = Date.now() + CFG.calibRetryBackoffMs;
            this.save();
            console.log('[MammouthWidget] calibration différée (' + s.retries + '/' + CFG.calibMaxRetries + ') : ' + why);
        },
    };

    function freshRawUsed() {
        const r = numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED));
        if (r != null && r > 0) {
            const ts = parseInt(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE_TS) || '0', 10);
            if (ts && Date.now() - ts <= RAW_USED_FRESH_MS) return r;
        }
        const cTs = parseInt(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE_TS) || '0', 10);
        const c = numberOrNull(localStorage.getItem(STORAGE_KEY_RAW_USED_CACHE));
        if (c != null && cTs && Date.now() - cTs <= RAW_USED_FRESH_MS) return c;
        return r != null && r > 0 ? r : null;
    }
    function computePercentFromRaw(rawUsedSum) {
        return POOL.computePct(rawUsedSum, POOL.totalCents);
    }

    // Sources
    function parseQuotaResponse(data) {
        const result = { ok: false, reason: null, percent: null, modelsList: null, rawUsedSum: null, byBrandNames: [] };
        if (data == null || typeof data !== 'object') { result.reason = 'réponse vide'; return result; }

        const directPct = [data.percent, data.percentUsed, data.usagePercent, data.quotaPercent,
            data.quota && data.quota.percent, data.usage && data.usage.percent]
            .find(v => toPercent(v) !== null);
        if (directPct !== undefined) result.percent = toPercent(directPct);

        if (Array.isArray(data.byBrand)) {
            let sum = 0, found = false;
            const names = [];
            for (const b of data.byBrand) {
                const v = numberOrNull(b && (b.value != null ? b.value : b.amount));
                if (v === null || v < 0) continue;
                sum += v; found = true;
                const raw = String(b && (b.brand || b.name || b.model || b.id) || '').trim();
                if (raw) names.push(beautifyModelName(raw) || raw);
            }
            if (found) {

                const total = numberOrNull(localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL));
                let okUnit = true;
                if (sum > 0 && sum <= 1.001) { okUnit = false; result.reason = 'byBrand somme un RATIO (' + sum + ') — ignoré'; }
                else if (sum > 0 && sum <= 100 && total != null && total > 20 && sum / total < 0.005) { okUnit = false; result.reason = 'byBrand somme un POURCENTAGE (' + sum + ') alors que le pool vaut ' + fmtCentsFr(total) + ' — ignoré'; }
                if (okUnit) { result.rawUsedSum = sum; result.byBrandNames = names; }
                else sum = 0;
            }
        }

        const modelsArr = Array.isArray(data.usedModels) ? data.usedModels
            : Array.isArray(data.models) ? data.models : null;
        if (modelsArr && modelsArr.length) {

            const names = modelsArr
                .map(m => beautifyModelName(typeof m === 'string' ? m : (m && (m.name || m.model || m.id))))
                .filter(Boolean);
            if (names.length) result.modelsList = [...new Set(names)];
        }
        result.ok = true;
        if (!result.reason) result.reason = 'ok';
        return result;
    }

    const QUOTA_BAR_SELECTORS = [
        '[aria-label="Utilisation du quota"]',
        '[aria-label="Quota usage"]',
        '[aria-label="Quota utilization"]',
        '[aria-label="Usage du quota"]',
    ];

    // Scan du DOM
    function findQuotaBar(root) {
        for (const selector of QUOTA_BAR_SELECTORS) {
            const el = root.querySelector(selector);
            if (el) return el;
        }
        return null;
    }

    function isBrandFilterBtn(b) {
        if (!b) return false;
        const l = (((b.getAttribute && b.getAttribute('aria-label')) || '') + ' ' + (b.textContent || '')).toLowerCase();
        if (!l.trim()) return false;
        return /cliquez\s*(?:pour)?\s*filtrer/.test(l)
            || /\bfiltrer\b[^.]{0,40}(utilisation|usage|quota)/.test(l)
            || /\bfiltrer\s+(par|les?)\b/.test(l);
    }
    const BRAND_STOPWORDS = /^(cliquez|voir|le|la|les|votre|utilisation|usage|quota|filtrer|par|sur|total|marque|mod[eè]le|modèles|et|ou|de|du|des|d')$/i;

    function brandFromLabel(label) {
        const raw = String(label || '').replace(/\s+/g, ' ').trim();
        if (!raw) return '';
        const head = (raw.split(/\s+[—–-]\s+|\s+\|\s+|\s+—/)[0] || '').trim();
        if (head && head.length <= 26 && !/filtr|utilisation|usage|quota/i.test(head) && !BRAND_STOPWORDS.test(head)) return head;

        const words = raw.replace(/\([^)]*\)/g, ' ').split(/\s+/);
        for (const w of words) {
            const c = w.replace(/[^\p{L}\p{N}\s.+_-]/gu, '').trim();
            if (!c || c.length > 22) continue;
            if (BRAND_STOPWORDS.test(c)) continue;
            if (/filtrer|utilisation|usage|quota|cliquez/i.test(c)) continue;
            if (/^[A-ZÀ-Ý]/.test(c)) return c;
        }
        return '';
    }
    function gaugeCardFor(bar) {
        const ownerBody = (bar && bar.ownerDocument && bar.ownerDocument.body) || document.body;
        return bar.closest('section')
            || (bar.parentElement && (bar.parentElement.parentElement || bar.parentElement))
            || ownerBody;
    }

    function classifyQuotaBars(doc = document) {
        const isWidget = (el) => !!(el && el.closest && el.closest('#mammouth-widget, #mw-sidebar, #mw-popover'));
        const sel = QUOTA_BAR_SELECTORS.join(', ');
        let bars = [...doc.querySelectorAll(sel)].filter(b => !isWidget(b));

        if (!bars.length) {
            bars = [...doc.querySelectorAll('[role="progressbar"]')].filter(b => {
                if (isWidget(b)) return false;
                const lbl = ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('aria-valuetext') || '')).toLowerCase();
                return /quota|utilisation/.test(lbl);
            });
        }
        const brandNames = new Set();
        [...doc.querySelectorAll('button[aria-label]')].filter(isBrandFilterBtn).forEach(b => {
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

            pool = bars.find(b => {
                const nm = nameOf.get(b);
                if (nm && !GENERIC_TITLE_RE.test(nm)) return false;
                return !matchesModelWidth(preciseWidthOf(b));
            }) || (modelWidths.length ? null : bars[0]);
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

    let _gaugeCache = { ts: 0, sig: '', val: null };
    function gaugeSignature() {
        try {
            const sel = QUOTA_BAR_SELECTORS.join(', ');
            const bars = document.querySelectorAll(sel);
            return bars.length + '|' + (bars[0] ? bars[0].getAttribute('aria-valuenow') : '');
        } catch { return 'x'; }
    }
    function readPoolGauge(allowDuringHarvest) {
        if (!allowDuringHarvest && typeof _harvestInFlight !== 'undefined' && _harvestInFlight) return null;
        const now = Date.now();
        const sig = gaugeSignature();
        if (_gaugeCache.val && _gaugeCache.sig === sig && now - _gaugeCache.ts < CFG.gaugeCacheMs) return _gaugeCache.val;
        const val = readPoolGaugeUncached();
        _gaugeCache = { ts: now, sig: val ? sig : _gaugeCache.sig, val };
        return val;
    }
    function freshPopupGauge() {
        const v = readJSON(STORAGE_KEY_POPUP_GAUGE, null);
        if (!v || !Array.isArray(v.samples) || !v.samples.length) return null;
        return Date.now() - v.ts <= 3 * 60 * 1000 ? v : null;
    }
    function recordPopupGauge(doc) {
        try {
            const g = readPoolGaugeUncached(doc);
            if (!g || detectBrandFilterActive(g.bar)) return;
            const pct = g.ambiguous ? g.round : g.precise;
            if (pct == null) return;
            const prev = readJSON(STORAGE_KEY_POPUP_GAUGE, null);
            const keep = prev && Array.isArray(prev.samples) && Date.now() - prev.ts <= 20 * 1000 ? prev.samples.slice(-5) : [];
            setJSON(STORAGE_KEY_POPUP_GAUGE, { ts: Date.now(), samples: keep.concat(pct) });
        } catch {}
    }
    function readPoolGaugeUncached(doc) {
        const { pool } = classifyQuotaBars(doc);
        if (!pool) return null;
        let round = null;
        const nowAttr = pool.getAttribute('aria-valuenow');
        if (nowAttr != null) round = toPercentStrict(nowAttr);
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
        if (poolReadingImplausible(chk)) {
            logImplausiblePool(g.round);
            localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(g.round));
            localStorage.setItem(STORAGE_KEY_DOM_PCT_PRECISE, String(g.precise));
            localStorage.setItem(STORAGE_KEY_DOM_PERCENT_TS, String(Date.now()));
            return null;
        }
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
            if (node === ((bar.ownerDocument && bar.ownerDocument.body) || document.body)) break walkUp;
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
            const ownerBody = (bar.ownerDocument && bar.ownerDocument.body) || document.body;
            const card = gaugeCardFor(bar);
            const scope = (card && card !== ownerBody) ? card : ownerBody;
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

    function scanModelSections(doc = document) {
        const { bars, pool } = classifyQuotaBars(doc);
        if (!bars.length) return [];
        const modelBars = bars.filter(b =>
            !pool || (b !== pool && !pool.contains(b) && !b.contains(pool)));
        const out = [];
        const seen = new Set();
        for (const bar of modelBars) {

            const nowPct = toPercentStrict(bar.getAttribute('aria-valuenow'));
            const txtPct = toPercentStrict(bar.getAttribute('aria-valuetext'));
            const pct = (txtPct != null && (nowPct == null || txtPct > nowPct)) ? txtPct : nowPct;
            if (pct == null || pct < 0 || pct > 1000) continue;
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

    // Lecture de la page abonnement
    const SUBSCRIPTION_LEGEND_BAD_RE = /^\d+$|^\d+\s*%$|^%$|^x\d+$|^\s*·\s*$/i;
    function legendNameForButton(btn) {
        let name = '';
        try {
            for (const s of btn.querySelectorAll('span')) {
                const t = String(s.textContent || '').trim();
                if (!t) continue;
                if (/^\s*[\d.,]+\s*%/.test(t)) break;
                if (SUBSCRIPTION_LEGEND_BAD_RE.test(t)) break;
                name = t; break;
            }
        } catch {}
        if (!name) name = brandFromLabel(btn.getAttribute('aria-label') || btn.title || btn.innerText || '');
        return name;
    }
    function readSubscriptionQuotaSection(doc = document) {
        const DOC = doc || document;
        const bodyTxt = (() => { try { return String((DOC.body && DOC.body.innerText) || '').replace(/\s+/g, ' '); } catch { return ''; } })();
        const isSubPage =
            !!(DOC.getElementById && DOC.getElementById('usage_quota')) ||
            /quota\s+d['’]utilisation/i.test(bodyTxt) ||
            /utilisation\s+totale\s+du\s+quota/i.test(bodyTxt);
        const result = { isSubPage, pool: null, models: [], segments: [] };
        if (!isSubPage) return result;
        const isWidgetNode = (el) => !!(el && el.closest && el.closest('#mammouth-widget, #mw-sidebar, #mw-popover, [id^="mw-"]'));
        const section = (DOC.getElementById && DOC.getElementById('usage_quota')) || null;
        const scope = isWidgetNode(section) ? DOC.body : (section || DOC.body);

        const pbars = [...scope.querySelectorAll('[role="progressbar"]')].filter(b => !isWidgetNode(b));
        const poolBar = (readPoolGaugeIn(DOC, true) || {}).bar || (pbars.find(b => /utilisation\s+du\s+quota/i.test(b.getAttribute('aria-label') || '')) || pbars[0]);
        if (poolBar) {
            const nowVal = toPercentStrict(poolBar.getAttribute('aria-valuenow'));
            const txtVal = toPercentStrict(poolBar.getAttribute('aria-valuetext')) || toPercentStrict((poolBar.textContent || '').trim());
            const pct = (nowVal != null && txtVal != null) ? Math.max(nowVal, txtVal) : (nowVal != null ? nowVal : txtVal);
            if (pct != null) result.pool = pct;
        }

        const seen = new Set();

        for (const btn of scope.querySelectorAll('button[aria-label]')) {
            if (isWidgetNode(btn)) continue;
            const label = (btn.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
            if (!label || !(label.toLowerCase().includes("d'utilisation") || label.toLowerCase().includes("d’utilisation"))) continue;
            const pctSeg = toPercentStrict((label.match(/([.,]?\d+(?:[.,]\d+)?)\s*%\s*d['’]utilisation/i) || [])[1]);
            const brand = (label.split(/[—–]/)[0] || '').trim();
            if (!brand || pctSeg == null || seen.has(brand.toLowerCase())) continue;
            seen.add(brand.toLowerCase());
            result.segments.push({ brand, pct: pctSeg });
        }
        for (const btn of scope.querySelectorAll('button')) {
            if (isWidgetNode(btn)) continue;

        }

        return result;
    }

    let _officialCache = { ts: 0, val: false };
    function officialModelSectionSeen(doc = document) {
        const now = Date.now();
        if (doc === document && now - _officialCache.ts < CFG.officialSectionCacheMs) return _officialCache.val;
        let val = false;
        try {
            if (/quota\s+par\s+mod[eè]le/i.test(doc.body.textContent || '')) {
                const hit = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div')]
                    .find(el => !(el.closest && el.closest('#mammouth-widget, #mw-sidebar, #mw-popover, [role="progressbar"]'))
                        && /quota\s+par\s+mod[eè]le/i.test(String(el.textContent || '').slice(0, 120)));
                val = !!hit;
            }
        } catch {}
        if (doc === document) _officialCache = { ts: now, val };
        return val;
    }

    let _modalHarvestTs = 0;

    async function maybeHarvestModelsFromModal() {
        if (typeof _harvestInFlight !== 'undefined' && _harvestInFlight) return;
        if (Date.now() - _modalHarvestTs < 60000) return;

        if (inHarvestPopup()) return;
        if (!officialModelSectionSeen()) return;
        _modalHarvestTs = Date.now();
        let secs = scanModelSections();
        let grew = false;
        let quietMs = 0;
        if (!secs.length) {
            for (let i = 0; i < 5 && !secs.length; i++) {
                await new Promise(r => setTimeout(r, 550));
                secs = scanModelSections();
            }
        } else {

            const stepMs = 550, quietNeeded = 4000, maxSteps = 14;
            for (let i = 0; i < maxSteps; i++) {
                await new Promise(r => setTimeout(r, stepMs));
                const again = scanModelSections();
                const grew = again.some(s => !secs.some(x => x.name === s.name));
                if (grew) {
                    const merged = {};
                    for (const s of secs) merged[s.name] = s.pct;
                    for (const s of again) merged[s.name] = s.pct;
                    secs = Object.entries(merged).map(([name, pct]) => ({ name, pct }));
                    quietMs = 0;
                    grew = true;
                    continue;
                }
                if (again.length && again.length === secs.length) secs = again;
                quietMs += stepMs;
                if (quietMs >= quietNeeded) break;
            }
        }
        if (!secs.length) {
            console.log('[MammouthWidget] popup officielle du quota ouverte — 0 jauge par modèle trouvée');
            return;
        }
        const map = {};
        for (const s of secs) map[s.name] = s.pct;

        const complete = quietMs >= CFG.calibSettleGapMs * 8 && grew === false;
        if (storeModelPct(map, 'modal', { complete, confidence: complete ? 0.95 : 0.55 })) {
            console.log('[MammouthWidget] harvest via popup officielle (' + (complete ? 'complet' : 'partiel') + ') →',
                secs.length, 'modèle(s):', secs.map(x => x.name + ' ' + x.pct + '%').join(', '));
                updateSidebar();
        }
    }

    async function harvestModelQuotasViaDom() {

        if (inHarvestPopup()) return;
        if (_harvestInFlight) return;
        if (!window.location.pathname.includes('/app/account/settings')) {
            console.log('[MammouthWidget] harvest reporté — va sur /app/account/settings/subscription puis Rafraîchir');
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
            return toPercentStrict(bar && bar.getAttribute('aria-valuenow'));
        };

        const waitGauge = (prev, ms = 1600) => new Promise(res => {
            const t0 = Date.now();
            const iv = setInterval(() => {
                let cur = null;
                try { cur = getGauge(); } catch (e) { cur = null; }
                if (cur !== prev || (Date.now() - t0) >= ms) { clearInterval(iv); res(cur); }
            }, CFG.popupProbeStepMs);
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

        const isChipActive = (b) => {
            if (!b) return false;
            if (b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true') return true;
            return String(b.getAttribute('data-state') || '').toLowerCase() === 'on';
        };
        const clearFilterOrToggle = (fallbackBrand) => {
            const clear = findClearBtn();
            if (clear) { clear.click(); return true; }
            const chip = fallbackBrand
                ? findBtn(fallbackBrand)
                : [...document.querySelectorAll('button[aria-label]')].filter(b => !isWidgetNode(b) && isBrandFilterBtn(b)).find(isChipActive);
            if (chip) { chip.click(); return true; }
            return false;
        };
        try {
            let directCount = mergeScan();
            if (!directCount && officialModelSectionSeen()) {

                for (let i = 0; i < 8 && !directCount; i++) {
                    await new Promise(r => setTimeout(r, 600));
                    directCount = mergeScan();
                }
                if (directCount) console.log('[MammouthWidget] blocs modèles apparus après attente');
            }
            console.log('[MammouthWidget] scan direct →', directCount, 'modèle(s) visible(s)');
            const brandFamilies = brandBtns.map(b => brandFamilyOf(brandFromLabel(b.getAttribute('aria-label') || b.textContent)));
            const storedNames = modelNames();
            const covered = directCount > 0
                && brandFamilies.every(f => !!f && Object.keys(harvested).some(n => brandFamilyOf(n) === f))
                && storedNames.every(n => Object.keys(harvested).some(k => k.toLowerCase() === n.toLowerCase()));
            if (!covered) for (let i = 0; i < brandBtns.length; i++) {
                let btn = brandBtns[i];
                const label0 = btn.getAttribute('aria-label') || '';
                let brandRaw = brandFromLabel(label0);
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
                        const lastBrand = brandFromLabel(last.getAttribute('aria-label') || last.textContent);
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

            const restored = (after === globalBefore);
            const sectionSeen = officialModelSectionSeen();
            const complete = stillLive && scanComplete && restored && sectionSeen;
            if (Object.keys(harvested).length) {
                storeModelPct(harvested, 'dom', { complete, confidence: covered ? 0.95 : 0.6 });
                        updateSidebar();
            } else if (complete) {

                storeModelPct({}, 'dom', { complete: true, confidence: 0.9 });
                        updateSidebar();
            } else {
                console.log('[MammouthWidget] harvest: scan INCOMPLET (restauré=' + restored
                    + ', section=' + sectionSeen + ') — fusion conservatrice, aucune suppression');
            }
        } finally {

            try { restoreGlobalFilter(globalBefore, getGauge, findClearBtn); } catch (e) { console.warn('[MammouthWidget] restauration filtre err', e); }
            _harvestInFlight = false;
        }
    }

    function restoreGlobalFilter(globalBefore, getGauge, findClearBtn) {
        if (globalBefore == null) return true;
        for (let attempt = 0; attempt < 4 && getGauge() !== globalBefore; attempt++) {
            const clear = findClearBtn();
            if (clear) clear.click();
            else {

                const active = [...document.querySelectorAll('button[aria-label]')]
                    .filter(b => !b.closest('#mammouth-widget, #mw-sidebar, #mw-popover') && isBrandFilterBtn(b))
                    .find(b => b.getAttribute('data-state') === 'on' || b.getAttribute('aria-pressed') === 'true');
                if (active) { active.click(); continue; }
                const b = findQuotaTriggerCandidates(document).find(c => /d['’]utilisation/i.test(String(c.el.getAttribute('aria-label') || '')));
                if (b) b.el.click();
            }
            notePoolActivity();
        }
        const ok = getGauge() === globalBefore;
        if (ok) { console.log('[MammouthWidget] filtre marque restauré ✓'); }
        else {
            notePoolActivity(120000);
            POOL.flagTotalWarning('Filtre du site NON restauré (le quota peut rester figé) — '
                + 'coche « Effacer » dans le panneau Quota de mammouth.ai.');
            console.warn('[MammouthWidget] ⚠ filtre marque NON restauré — l\'utilisateur doit décocher le filtre manuellement');
        }
        return ok;
    }
    let _bgHarvestInFlight = false;
    let _adviceLogTs = 0;
    let _bgHarvestAttemptTs = 0;
    async function backgroundHarvestIfNeeded(force) {
        if (_bgHarvestInFlight || _harvestInFlight) return;
        if (window.location.pathname.includes('/app/account/settings')) return;

        const minGap = force ? 30 * 1000 : 5 * 60 * 1000;
        if (Date.now() - _bgHarvestAttemptTs < minGap) return;
        const ts = parseInt(localStorage.getItem(STORAGE_KEY_MODEL_PCT_TS) || '0', 10);
        if (!force && ts && Date.now() - ts < 4 * 60 * 1000) return;
        _bgHarvestAttemptTs = Date.now();
        _bgHarvestInFlight = true;
        if (force) console.log('[MammouthWidget] background harvest via fetch…');
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
                    updateSidebar();
                    return;
                }
            }

            _bgHarvestInFlight = false;
            if (harvestViaPopupWindow('auto')) return;

            if (Date.now() - _lastPopupHarvestTs < 15 * 60 * 1000) return;
            if (Date.now() - _adviceLogTs > 15 * 60 * 1000) {
                _adviceLogTs = Date.now();
                console.log('[MammouthWidget] background harvest: clique « Récupérer les quotas par modèle » dans le widget (petite fenêtre automatique) — ou ouvre la popup officielle du quota');
            }
        } catch(e) { console.warn('[MammouthWidget] background harvest err', e); }
        finally { _bgHarvestInFlight = false; setTimeout(()=>{ _bgHarvestInFlight=false; }, 2000); }
    }

    // Harvest par modèle
    let _popupHarvest = null;
    let _lastPopupHarvestTs = 0;

    const _popupWindows = new Set();
    function trackPopupWindow(w) { if (w) _popupWindows.add(w); }
    function untrackPopupWindow(w) { if (w) _popupWindows.delete(w); }
    function closeTrackedPopupWindows() {
        for (const w of Array.from(_popupWindows)) {
            try { if (w && !w.closed) w.close(); } catch {}
            _popupWindows.delete(w);
        }

    }
    let _lastUserGestureTs = 0;

    function inHarvestPopup() { try { return String(window.name || '').startsWith('mw_harvest'); } catch { return false; } }
    function noteUserGesture() { _lastUserGestureTs = Date.now(); }

    function finishPopupHarvest(why) {
        const st = _popupHarvest;
        if (!st) return;
        _popupHarvest = null;
        if (st.timer) clearInterval(st.timer);
        try { if (st.win && !st.win.closed) st.win.close(); } catch {}
        untrackPopupWindow(st.win);
        console.log('[MammouthWidget] petite fenêtre harvest fermée (' + why + ')');
    }

    const POPUP_SCROLL_STEP = 320;
    function gentleScrollPopup(w, doc, st) {
        try {
            const els = [...doc.querySelectorAll('h1,h2,h3,h4,[role="progressbar"]')];
            const cand = els.find(el => /quota/i.test(String(el.innerText || el.textContent || '')));
            if (cand && cand.scrollIntoView) { cand.scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; }
            const s2 = st || {};
            if (s2.scrollN === undefined) { s2.scrollN = 0; s2.scrollTop0 = 0; }
            const docH = (doc.documentElement && doc.documentElement.scrollHeight) || 0;
            const max = Math.max(0, docH - (w.innerHeight || 0));
            const phase = s2.scrollN < 5 ? 1 : s2.scrollN < 8 ? -1 : 0;
            if (!phase) return false;
            s2.scrollTop0 = Math.max(0, Math.min(max, s2.scrollTop0 + phase * POPUP_SCROLL_STEP));
            s2.scrollN++;
            if (w.scrollTo) w.scrollTo({ top: s2.scrollTop0, behavior: 'smooth' });
            return true;
        } catch { return false; }
    }

    function findQuotaTriggerCandidates(doc) {
        const out = [];
        const seen = new Set();
        const isWidgetNode = (el) => !!(el.closest && el.closest('#mammouth-widget, [id^="mw-"]'));
        const push = (el, score) => {
            if (!el || typeof el.click !== 'function' || isWidgetNode(el)) return;
            if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
            if (seen.has(el)) return;
            seen.add(el);
            out.push({ el, score });
        };
        try {

            for (const el of doc.querySelectorAll('button, [role="tab"], [role="button"], [role="menuitem"], a[href]')) {
                const t = ((el.getAttribute('aria-label') || '') + ' ' + (el.title || '') + ' ' + String(el.innerText || el.textContent || ''))
                    .replace(/\s+/g, ' ').trim().toLowerCase();
                if (!t || t.length > 60) continue;
                if (/quota\s+par\s+mod[eè]le/.test(t)) push(el, 6);
                else if (/voir\s+(votre\s+|le\s+|la\s+)?quota/.test(t)) push(el, 5);
                else if (/\bquota\b/.test(t)) push(el, 4);
            }

            for (const bar of doc.querySelectorAll('[role="progressbar"]')) {
                const lbl = (bar.getAttribute('aria-label') || '').toLowerCase();
                if (!lbl.includes('quota')) continue;
                const wrap = bar.closest('button, [role="button"], a[href]');
                if (wrap) push(wrap, 3);
            }
        } catch {}
        out.sort((a, b) => b.score - a.score);
        return out;
    }

    // Aide popup
    function brandFilterChips(doc) {
        const out = [];
        const seen = new Set();
        for (const b of doc.querySelectorAll('button[aria-label]')) {
            if (!isBrandFilterBtn(b)) continue;
            if (b.closest('#mammouth-widget, #mw-sidebar, #mw-popover')) continue;
            const brand = brandFromLabel(b.getAttribute('aria-label') || b.textContent || '');
            if (!brand || seen.has(brand.toLowerCase())) continue;
            seen.add(brand.toLowerCase());
            out.push({ brand, el: b });
        }
        return out;
    }
    function chipIsActive(el) {
        if (el.getAttribute('aria-pressed') === 'true') return true;
        if (el.getAttribute('aria-checked') === 'true') return true;
        const ds = (el.getAttribute('data-state') || '').toLowerCase();
        return ds === 'on' || ds === 'checked' || ds === 'active' || ds === 'true';
    }

    function clearPopupFilter(doc, chip) {
        try {
            const bar = (readPoolGaugeIn(doc, true) || {}).bar;
            const scope = bar ? gaugeCardFor(bar) : doc.body;
            const cand = [...scope.querySelectorAll('button')].filter(b => !b.closest('#mammouth-widget, #mw-sidebar, #mw-popover'));
            const clear = cand.find(b => {
                const t = (((b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '')).toLowerCase()).trim();
                return (t.includes('effacer') || t.includes('clear') || t === '×' || t === 'x' || t === '✕') && !chipIsActive(b);
            });
            const target = clear || (chip && chip.el);
            if (target) { target.click(); return true; }
            return false;
        } catch { try { if (chip && chip.el) { chip.el.click(); return true; } } catch {} return false; }
    }

    function readPoolGaugeIn(doc, allowDuringHarvest) {
        if (!allowDuringHarvest && _harvestInFlight) return null;
        const { pool } = classifyQuotaBars(doc);
        if (!pool) return null;
        const round = pool.getAttribute('aria-valuenow') != null ? toPercentStrict(pool.getAttribute('aria-valuenow')) : null;
        return { round, bar: pool };
    }

    function popupBanner(doc, text, tone) {
        try {
            let el = doc.getElementById('mw-harvest-banner');
            if (!el) {
                el = doc.createElement('div');
                el.id = 'mw-harvest-banner';
                el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483647;'
                    + 'font:600 12px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;'
                    + 'padding:9px 12px;color:#fff;background:#1a1a22;border-bottom:1px solid rgba(255,255,255,.12);'
                    + 'box-shadow:0 6px 20px rgba(0,0,0,.35);pointer-events:none;text-align:center';
                doc.body.appendChild(el);
            }
            el.textContent = '🐘 Mammouth · ' + text;
            el.style.background = tone === 'ok' ? '#12351f' : tone === 'warn' ? '#3a2a12' : '#1a1a22';
            return el;
        } catch { return null; }
    }

    function assistPopupQuotaClick(doc, st) {
        try {
            if (!st.triedEls) st.triedEls = [];
            if (!st.triedLabels) st.triedLabels = [];
            for (const c of findQuotaTriggerCandidates(doc)) {
                if (st.triedEls.indexOf(c.el) !== -1) continue;
                const label = String(c.el.innerText || c.el.textContent || c.el.getAttribute('aria-label') || '')
                    .replace(/\s+/g, ' ').trim().slice(0, 40) || 'élément quota';

                const labelKey = label.toLowerCase();
                if (st.triedLabels.indexOf(labelKey) !== -1) continue;
                st.triedEls.push(c.el);
                st.triedLabels.push(labelKey);
                try { c.el.click(); } catch { return false; }
                console.log('[MammouthWidget] assistance harvest — clic sur « ' + label + ' » dans la petite fenêtre');
                return true;
            }
        } catch {}
        return false;
    }

    function popupHarvestTick() {
        const st = _popupHarvest;
        if (!st) return 'inactif';
        const w = st.win;
        if (!w || w.closed) {

            if (st.best > 0) { storeModelPct(st.accum, 'popup', { complete: false, confidence: 0.5 }); updateSidebar(); }
            finishPopupHarvest(st.best > 0 ? 'ok (fenêtre fermée tôt, cumul conservé)' : 'fermée prématurément — aucun quota par modèle visible');
            return 'fermee';
        }
        let doc = null;
        try { doc = w.document; } catch { return 'indisponible'; }
        if (!doc || !doc.body) return 'chargement';
        if (doc !== st.lastDoc) {
            st.lastDoc = doc; st.triedEls = []; st.triedLabels = [];
            st.lastGrowthTs = Date.now();
            if (st.phase === 'brands') { st.phase = 'passive'; st.chips = null; st.visited = {}; }
        }
        const elapsed = Date.now() - st.startTs;

        recordPopupGauge(doc);
        try {
            const secs = scanModelSections(doc);
            st.lastScan = secs;
            for (const s of secs) st.accum[s.name] = s.pct;
        } catch {}
        const count = Object.keys(st.accum).length;
        if (count > st.best) { st.best = count; st.stable = 0; }
        else if (count > 0) st.stable++;
        if (count > (st.lastCount || 0)) st.lastGrowthTs = Date.now();
        st.lastCount = count;
        const quietMs = Date.now() - (st.lastGrowthTs || st.startTs);

        const close = (why, complete) => {
            if (complete && st.best > 0) {
                const map = st.accum;
                if (storeModelPct(map, 'popup', { complete: true, confidence: 0.95 })) { updateSidebar(); }

                const stored = modelPctMap();
                const readEntries = Object.keys(stored).filter(isDisplayableModelKey).map(n => [n, stored[n]]);
                const lus = displayableModelNames(map).length;
                console.log('[MammouthWidget] harvest petite fenêtre → ' + readEntries.length + ' modèle(s) en mémoire'
                    + (readEntries.length ? ' : ' + readEntries.map(([n, p]) => n + ' ' + p + '%').join(', ') : '—')
                    + ' (' + lus + ' lus dans la fenêtre, ' + (readEntries.length - lus) + ' conservés) — fermeture');
            } else if (st.best > 0) {
                storeModelPct(st.accum, 'popup', { complete: false, confidence: 0.5 });
                updateSidebar();
                console.log('[MammouthWidget] harvest petite fenêtre — ' + st.best + ' modèle(s) conservés (scan partiel)');
            }
            finishPopupHarvest(why);
            return 'ok';
        };

        if (st.phase === 'passive') {
            if (count > 0 && st.stable >= CFG.popupStableTicks && elapsed > 4000 && quietMs >= CFG.popupGrowthQuietMs) {
                const complete = st.stable >= CFG.popupStableTicks && quietMs >= CFG.popupGrowthQuietMs && !st.relocated;
                return close(complete ? 'ok' : 'ok (scan partiel, fusion conservatrice)', complete);
            }

            if (count === 0 && elapsed > CFG.popupFirstAssistMs && st.steps < CFG.popupMaxAssists
                && Date.now() - st.lastStepTs > CFG.popupAssistGapMs) {
                st.steps++; st.lastStepTs = Date.now();
                const clicked = assistPopupQuotaClick(doc, st);
                if (clicked) { st.lastAssistTs = Date.now(); st.lastGrowthTs = Date.now(); popupBanner(doc, 'ouverture du panneau quota…'); }

                else gentleScrollPopup(w, doc, st);
            }

            if (elapsed > CFG.popupBrandPhaseMs) {
                const chips = brandFilterChips(doc);
                if (chips.length && count === 0) {
                    st.phase = 'brands'; st.chips = chips; st.idx = 0; st.step = 0; st.waitUntil = 0; st.visited = {};
                    notePoolActivity();
                    console.log('[MammouthWidget] popup : ' + chips.length + ' filtre(s) marque détecté(s) → '
                        + chips.map(c => c.brand).join(', ') + ' — parcours des marques (les jauges par modèle '
                        + 'ne s\'affichent qu\'après sélection d\'une marque)');
                    popupBanner(doc, 'lecture par marque : ' + chips.map(c => c.brand).join(' · '), 'warn');
                    return 'en cours';
                }
            }

            if (count === 0 && !st.relocated && st.steps >= 4
                && elapsed > CFG.popupRelocateMinMs && elapsed < CFG.popupRelocateMaxMs
                && (Date.now() - (st.lastAssistTs || 0) > CFG.popupRelocateIdleMs || st.steps >= CFG.popupMaxAssists)) {
                st.relocated = true; st.triedEls = [];
                try {
                    console.log('[MammouthWidget] petite fenêtre → /app/account/settings/subscription (jauge officielle du quota)');
                    popupBanner(doc, 'chargement de la page Abonnement…');
                    w.location.href = (w.location && w.location.origin ? w.location.origin : window.location.origin) + '/app/account/settings/subscription';
                } catch {}
            }
        }

        if (st.phase === 'brands') {
            if (Date.now() < (st.waitUntil || 0)) return 'en cours';
            if (!st.chips || st.idx >= st.chips.length) {

                const complete = st.brandRestored !== false && st.best > 0;
                return close(complete ? 'ok (toutes les marques lues)' : 'ok (marques lues, filtre restauré partiellement)', complete);
            }
            if (st.step === 0) {

                const fresh = brandFilterChips(doc);
                if (!fresh.length) {
                    console.log('[MammouthWidget] popup : pastilles disparues → retour au scan passif');
                    st.phase = 'passive'; st.chips = null; st.idx = 0; st.visited = {};
                    return 'en cours';
                }
                st.chips = fresh;
                if (!st.visited) st.visited = {};
                const pending = fresh.filter(c => !st.visited[c.brand.toLowerCase()]);
                if (!pending.length) {
                    const complete = st.brandRestored !== false && st.best > 0;
                    return close(complete ? 'ok (toutes les marques lues)' : 'ok (marques lues, filtre restauré partiellement)', complete);
                }
                const chip = pending[0];
                st.idx = fresh.indexOf(chip);
                st.lastBrand = chip.brand;
                st.visited[chip.brand.toLowerCase()] = true;
                notePoolActivity();
                try { chip.el.click(); } catch { return 'en cours'; }
                st.step = 1;
                st.waitUntil = Date.now() + CFG.popupBrandReadMs;
                popupBanner(doc, 'marque ' + (st.idx + 1) + '/' + fresh.length + ' : ' + chip.brand + '…');
                console.log('[MammouthWidget] popup — filtre marque « ' + chip.brand + ' » (' + (st.idx + 1) + '/' + fresh.length + ')');
                return 'en cours';
            }

            const chip = (st.chips || []).find(c => c.brand === st.lastBrand) || { brand: st.lastBrand, el: null };
            const secs = scanModelSections(doc);
            for (const sec of secs) st.accum[sec.name] = sec.pct;
            const cumul = Object.keys(st.accum).length;
            if (cumul > st.best) { st.best = cumul; st.stable = 0; }
            st.lastGrowthTs = Date.now();
            popupBanner(doc, 'marque ' + (st.idx + 1) + '/' + (st.chips || []).length + ' : ' + chip.brand
                + ' → ' + cumul + ' modèle(s) cumulés');
            console.log('[MammouthWidget] popup — « ' + chip.brand + ' » lu : '
                + (secs.map(x => x.name).join(', ') || 'aucune jauge'));
            clearPopupFilter(doc, chip);
            st.step = 0; st.idx++;
            st.waitUntil = Date.now() + CFG.popupBrandRestoreMs;
            if (chip.el) st.brandRestored = true;
            return 'en cours';
        }

        if (elapsed > CFG.popupFailsafeMs) {
            let diag = '';
            try {
                const labels = [...doc.querySelectorAll('[role="progressbar"]')].slice(0, 3).map(b => {
                    const t = (b.getAttribute('aria-label') || b.getAttribute('aria-valuetext') || String(b.innerText || '')).replace(/\s+/g, ' ').trim();
                    return t ? t.slice(0, 24) : 'sans-libellé';
                });
                diag = ' — diag: url=' + String((w.location && w.location.href) || '?')
                    + ' · progressbars=' + doc.querySelectorAll('[role="progressbar"]').length
                    + ' · pastilles marque=' + brandFilterChips(doc).length
                    + ' · clics=' + (st.triedEls ? st.triedEls.length : 0)
                    + ' · jauges=' + (labels.length ? labels.join(' | ') : '—');
            } catch {}
            if (st.best > 0) return close('délai dépassé' + diag, false);
            popupBanner(doc, 'aucun quota par modèle trouvé — ' + diag, 'warn');
            console.warn('[MammouthWidget] harvest popup : RIEN lu après ' + Math.round(elapsed / 1000) + ' s' + diag);
            console.warn('[MammouthWidget] → ouvre /app/account/settings → panneau Quota, puis colle dans la console :');
            console.warn('[MammouthWidget]   __mwDebug.diagnoseQuotaDOM()');
            finishPopupHarvest('délai dépassé' + diag);
            return 'timeout';
        }
        return 'en cours';
    }
    // Placement de la fenêtre
    function popupTargetRect(W, H, gap) {
        const g = gap == null ? 10 : gap;

        const ox = Number.isFinite(window.mozInnerScreenX) ? window.mozInnerScreenX
            : Number.isFinite(window.screenX) ? window.screenX : 0;
        const oy = Number.isFinite(window.mozInnerScreenY) ? window.mozInnerScreenY
            : Number.isFinite(window.screenY) ? window.screenY : 0;
        const vw = window.innerWidth || (window.screen && window.screen.width) || 1280;
        const vh = window.innerHeight || (window.screen && window.screen.height) || 800;
        return {
            left: Math.max(0, Math.round(ox + vw - W - g)),
            top: Math.max(0, Math.round(oy + vh - H - g)),
        };
    }

    function popupIsMisplaced(w, W, H) {
        try {
            if (!w || w.closed) return false;
            const r = popupTargetRect(W, H);
            if (w.outerWidth && Math.abs(w.outerWidth - W) > 60) return true;
            if (w.outerHeight && Math.abs(w.outerHeight - H) > 90) return true;
            const sx = Number.isFinite(w.mozScreenX) ? w.mozScreenX
                : Number.isFinite(w.screenX) ? w.screenX : null;
            const sy = Number.isFinite(w.mozScreenY) ? w.mozScreenY
                : Number.isFinite(w.screenY) ? w.screenY : null;

            if (sx !== null && sy !== null && (Math.abs(sx - r.left) > 60 || Math.abs(sy - r.top) > 60)) return true;
            return false;
        } catch { return false; }
    }
    function applyPopupRect(w, W, H) {
        try {
            if (!popupIsMisplaced(w, W, H)) return false;
            const r = popupTargetRect(W, H);
            if (typeof w.moveTo === 'function') w.moveTo(r.left, r.top);
            if (typeof w.resizeTo === 'function') w.resizeTo(W, H);
            return true;
        } catch { return false; }
    }

    function harvestViaPopupWindow(reason) {
        if (inHarvestPopup()) return false;
        if (_harvestInFlight || _bgHarvestInFlight) return false;
        if (_popupHarvest) return true;
        const minGap = reason === 'auto' ? 10 * 60 * 1000 : 20 * 1000;
        if (Date.now() - _lastPopupHarvestTs < minGap) return false;
        if (reason === 'auto' && Date.now() - _lastUserGestureTs > 20000) return false;
        let w = null;
        const W = 360, H = 420;
        try {

            closeTrackedPopupWindows();
            const rect = popupTargetRect(W, H);

            const uniq = 'mw_harvest_' + Date.now().toString(36);

            w = window.open('/app/account/settings/subscription', uniq,
                'width=' + W + ',height=' + H + ',left=' + rect.left + ',top=' + rect.top +
                ',menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes');
        } catch {}
        _lastPopupHarvestTs = Date.now();
        if (!w) {
            console.log('[MammouthWidget] petite fenêtre bloquée par le navigateur — reclique 📥 ou passe par Réglages → Quota (lecture automatique ensuite)');
            return false;
        }

        trackPopupWindow(w);
        applyPopupRect(w, W, H);
        setTimeout(() => applyPopupRect(w, W, H), 600);
        setTimeout(() => { try { if (window.focus) window.focus(); } catch {} }, 60);
        _popupHarvest = { win: w, startTs: Date.now(), lastGrowthTs: Date.now(), lastCount: 0, accum: {}, lastScan: [], best: 0, stable: 0, steps: 0, lastStepTs: 0, lastAssistTs: 0, triedLabels: [], timer: 0, phase: 'passive', chips: null, idx: 0, step: 0, waitUntil: 0, brandRestored: true, visited: {}, lastBrand: null };
        _popupHarvest.timer = setInterval(popupHarvestTick, 700);
        console.log('[MammouthWidget] petite fenêtre harvest ouverte (coin bas-droit) — lecture, parcours des marques, puis fermeture automatique ; ta page reste intacte');
        return true;
    }

    let _syncIndicatorTs = 0;
    function poolFreshnessLabel() {
        const ts = POOL.lastPoolSyncTs();
        if (!ts) return 'jamais synchronisé';
        const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
        if (sec < 5) return 'à l\'instant';
        if (sec < 60) return 'il y a ' + sec + ' s';
        if (sec < 3600) return 'il y a ' + Math.round(sec / 60) + ' min';
        return 'il y a ' + Math.round(sec / 3600) + ' h';
    }
    function updateSyncIndicator() {
        const el = document.getElementById('mw-pop-sync');
        if (!el) return;
        const now = Date.now();
        if (now - _syncIndicatorTs > 5000) { _syncIndicatorTs = now; el.textContent = poolFreshnessLabel(); }
        el.classList.toggle('syncing', !!POOL.isSyncing());
    }

    let apiInFlight = false;

    const _hasFetch = typeof window.fetch === 'function';
    const _origFetch = _hasFetch ? window.fetch.bind(window) : function () {
        return Promise.reject(new Error('fetch indisponible'));
    };
    if (!_hasFetch) console.warn('[MammouthWidget] window.fetch indisponible — suivi API et mesure de coût désactivés');

    // Fetch API quota
    function fetchQuotaFromAPI(silent) {
        if (!apiEnabled() || apiInFlight) return;
        apiInFlight = true;
        if (!silent) setApiBadge('loading', 'Sync API…');

        _origFetch(API_URL, { credentials: 'include', cache: 'no-store' })
            .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
            .then(data => {
                console.log('[MammouthWidget] recentUsage →', data);
                const parsed = parseQuotaResponse(data);
                if (!parsed.ok) {
                    logSourceRejection('recentUsage', parsed.reason, data);
                    localStorage.setItem(STORAGE_KEY_API_TS, String(Date.now()));
                    localStorage.setItem(STORAGE_KEY_API_OK, '1');
                    setApiBadge('ok', 'API ✓ (lecture ignorée)');
                    updateUI();
                    return;
                }
                if (parsed.reason && parsed.reason !== 'ok') logSourceRejection('recentUsage', parsed.reason, null);

                let pct = parsed.percent;
                const computed = parsed.rawUsedSum !== null ? computePercentFromRaw(parsed.rawUsedSum) : null;
                if (pct !== null && computed !== null && Math.abs(computed - pct) > Math.max(CFG.poolImplausibleFloor, computed * CFG.poolImplausibleRel)) {
                    console.log('[MammouthWidget] percent API (' + pct + '%) incohérent avec l\'usage (' + computed + '%) → valeur calculée retenue');
                    pct = computed;
                }
                POOL.commit({
                    usedCents: parsed.rawUsedSum !== null ? parsed.rawUsedSum : POOL.usedCents,
                    totalCents: POOL.totalCents,
                    source: 'recentUsage',
                });

                if (parsed.modelsList && parsed.modelsList.length) {
                    localStorage.setItem(STORAGE_KEY_MODELS, parsed.modelsList.join('  ·  '));
                }
                if (parsed.byBrandNames && parsed.byBrandNames.length) {
                    setJSON(STORAGE_KEY_SOURCE_LOG, {
                        ts: Date.now(), brands: parsed.byBrandNames,
                        usedCents: parsed.rawUsedSum, totalCents: POOL.totalCents,
                    });
                }

                localStorage.setItem(STORAGE_KEY_API_TS, String(Date.now()));
                localStorage.setItem(STORAGE_KEY_API_OK, '1');
                setApiBadge('ok', 'API ✓ synchronisé');
                recordHistory();
                updateUI(true);
            })
            .catch(err => {
                console.warn('[MammouthWidget] recentUsage échec:', err.message);
                localStorage.setItem(STORAGE_KEY_API_OK, '0');
                setApiBadge('err', 'API hors-ligne');
                const isSettingsPage = window.location.pathname.includes('/app/account/settings');
                if (!isSettingsPage) {
                    const domPct = scanDomForPercent();
                    if (domPct !== null) localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(domPct));
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

    function clearPendingRequests() {
        localStorage.removeItem(STORAGE_KEY_PENDING_REQUEST);
        localStorage.removeItem(STORAGE_KEY_PENDING_QUEUE);
    }

    function readCurrentUsage() {
        return _origFetch(CURRENT_USAGE_URL, { credentials: 'include', cache: 'no-store' })
            .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
            .then(d => {
                console.log('[MammouthWidget] currentUsage →', d);
                const c = numberOrNull(d && d.currentSpendCents);
                if (c !== null && d && d.usagePlan) {
                    if (healTotalFromPlan(c, String(d.usagePlan).toLowerCase()) !== null) updateUI();
                }
                if (c !== null) {

                    localStorage.setItem(STORAGE_KEY_SPEND_CENTS, String(c));
                    localStorage.setItem(STORAGE_KEY_SPEND_TS, String(Date.now()));
                }
                return c;
            })
            .catch(err => {
                console.warn('[MammouthWidget] currentUsage échec:', err.message);
                return null;
            });
    }

    const MAX_PENDING = 3;
    function getPendingQueue() {
        const q = readJSON(STORAGE_KEY_PENDING_QUEUE, []);
        return Array.isArray(q) ? q : [];
    }
    function pushPending(entry) {
        const q = getPendingQueue();
        q.push(entry);
        while (q.length > MAX_PENDING) q.shift();
        setJSON(STORAGE_KEY_PENDING_QUEUE, q);
    }

    function popPending(ts) {
        const q = getPendingQueue();
        const i = q.findIndex(e => e.ts === ts);
        if (i === -1) return null;
        const removed = q.splice(i, 1)[0];
        if (q.length) setJSON(STORAGE_KEY_PENDING_QUEUE, q);
        else localStorage.removeItem(STORAGE_KEY_PENDING_QUEUE);
        return removed;
    }
    function clearPendingQueue() { localStorage.removeItem(STORAGE_KEY_PENDING_QUEUE); }

    function onMessageSent() {
        const now = Date.now();
        const before = numberOrNull(localStorage.getItem(STORAGE_KEY_SPEND_CENTS));
        if (before === null) {  }
        if (!getSessionStart()) setSessionStart(now);

        addRequest(now, 0.01, { measured: false });
        pushPending({ ts: now, before, tries: 0, deadline: now + 180000 });
        console.log('[MammouthWidget] Message envoyé — requête enregistrée (base ' + fmtCentsFr(before || 0)
            + '). ' + getPendingQueue().length + ' mesure(s) en attente.');

        celebrate();
        updateUI(true);
        setTimeout(() => resolveOnePending(), 8000);
    }

    let _resolving = false;
    function resolveOnePending() {
        if (_resolving) return;
        const q = getPendingQueue();
        if (!q.length) return;
        const p = q[0];
        if (Date.now() > (p.deadline || 0)) {
            popPending(p.ts);
            setTimeout(() => resolveOnePending(), 0);
            return;
        }
        p.tries = (p.tries || 0) + 1;
        if (p.tries > CFG.resolveMaxTries) {
            console.log('[MammouthWidget] mesure abandonnée après ' + CFG.resolveMaxTries + ' tentatives — placeholder conservé (0,01¢)');
            popPending(p.ts);
            setTimeout(() => resolveOnePending(), 0);
            return;
        }
        _resolving = true;
        const guard = setTimeout(() => { _resolving = false; }, CFG.resolveTimeoutMs);
        readCurrentUsage().then(after => {
            clearTimeout(guard);
            _resolving = false;
            if (after === null) { setTimeout(() => resolveOnePending(), 6000); return; }
            localStorage.setItem(STORAGE_KEY_SPEND_CENTS, String(after));
            let measured = false;
            if (p.before !== null && p.before !== undefined) {

                const cost = Math.round((after - p.before) * 10000) / 10000;
                if (cost > 0) {
                    updateRequestCost(p.ts, cost);
                    measured = true;
                    console.log('[MammouthWidget] Coût réel mesuré: ' + fmtCentsFr(cost) + ' (placeholder 0,01¢)');
                } else if (cost < 0) {
                    console.warn('[MammouthWidget] Coût négatif ignoré: ' + fmtCentsFr(cost));
                }
            }
            if (!measured && p.tries < CFG.resolveMaxTries) {
                setJSON(STORAGE_KEY_PENDING_QUEUE, getPendingQueue());
                setTimeout(() => resolveOnePending(), 4000);
                return;
            }
            popPending(p.ts);
            updateUI(true);
            updateConsumptionStats();
            if (measured) { fetchQuotaFromAPI(true); scheduleAutoModelRefresh('coût mesuré'); }
            if (getPendingQueue().length) setTimeout(() => resolveOnePending(), 800);
        }).catch(() => { clearTimeout(guard); _resolving = false; setTimeout(() => resolveOnePending(), 6000); });
    }

    let _autoModelTimer = null;
    function scheduleAutoModelRefresh(why) {
        if (!modelAutoEnabled()) return;
        if (inHarvestPopup() || _popupHarvest || _harvestInFlight) return;
        if (Date.now() - _lastUserGestureTs > 45000) return;
        const env = readModelEnvelope();
        if (!Object.keys(env.models).length) return;

        if (!modelStale() && Date.now() - (env.ts || 0) < CFG.modelAutoStaleMs) return;
        if (Date.now() - _lastPopupHarvestTs < CFG.modelAutoMinGapMs) return;
        if (_autoModelTimer) clearTimeout(_autoModelTimer);
        _autoModelTimer = setTimeout(() => {
            _autoModelTimer = null;
            if (modelStale()) {
                console.log('[MammouthWidget] quotas par modèle : mise à jour automatique (' + why + ')');
                harvestViaPopupWindow('auto');
            }
        }, CFG.modelAutoDelayMs);
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

        if (!getPendingQueue().length) {
            const ph = findRecentPlaceholderRequest(180000);
            if (ph) {
                pushPending({ ts: ph.ts, before: numberOrNull(localStorage.getItem(STORAGE_KEY_SPEND_CENTS)), tries: 0, deadline: now + 30000 });
                console.log('[MammouthWidget] placeholder récente reprise — mesure du coût réel.');
            } else {
                return;
            }
        }
        resolveOnePending();
    }

    // Détection d'envoi
    function looksLikeComposer(el) {
        if (!el) return false;
        if (el.closest('#mammouth-widget, #mw-sidebar, #mw-popover')) return false;
        if (el.isContentEditable) return true;
        if (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') return false;

        if (el.tagName === 'INPUT') {
            const ty = (el.type || 'text').toLowerCase();
            if (!['text', 'search', 'email', 'url', ''].includes(ty)) return false;
        }

        const form = el.form || el.closest('form');
        if (!form) return el.tagName === 'TEXTAREA' || !!el.getAttribute('data-slot');
        if (form.querySelector('select, input[type="checkbox"], input[type="radio"]')) return false;
        const hasSend = [...form.querySelectorAll('button,[role="button"]')].some(b => {
            const n = ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '') + ' ' + (b.innerText || '')).toLowerCase();
            return /\b(envoyer|send|submit|publier)\b/.test(n) || b.getAttribute('type') === 'submit';
        });
        return hasSend;
    }
    function onComposerEnter(e) {
        const target = e.target;
        if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
        if (!looksLikeComposer(target)) return;
        setTimeout(() => {
            const empty = (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
                ? target.value.trim() === '' : target.innerText.trim() === '';
            if (empty) { try { onMessageSent(); } catch (err) {} }
        }, 300);
    }
    document.addEventListener('keydown', onComposerEnter, true);

    document.addEventListener('submit', event => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (!looksLikeComposer(form.querySelector('textarea, input, [contenteditable]'))) return;
        setTimeout(() => { try { onMessageSent(); } catch (e) {} }, 100);
    }, true);

    document.addEventListener('click', event => {
        const button = event.target.closest('button, [role="button"]');
        if (!button || button.closest('#mammouth-widget, #mw-sidebar, #mw-popover')) return;
        const accessibleName = [
            button.getAttribute('aria-label'), button.getAttribute('title'), button.innerText
        ].filter(Boolean).join(' ').toLowerCase();
        const isSend = /\b(envoyer|send|submit|publier)\b/.test(accessibleName);
        if (!isSend) return;

        const scope = button.form || button.closest('form') || button.parentElement;
        if (!scope || !looksLikeComposer(scope.querySelector('textarea, input, [contenteditable]') || scope)) return;
        setTimeout(() => { try { onMessageSent(); } catch (e) {} }, 150);
    }, true);

    // Intercepteur réseau
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

    // Historique 7 jours
    function recordHistory() {
        const pct = toPercentStrict(localStorage.getItem(STORAGE_KEY_QUOTA));
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
        let ctx = null;
        try { ctx = canvas.getContext && canvas.getContext('2d'); } catch (e) { ctx = null; }

        if (!ctx) return;
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

    // Carte consommation
    function updateConsumptionStats() {
        const reqs = getRequests();
        const totalCents = reqs.reduce((s, r) => s + (numberOrNull(r.cents) || 0), 0);

        const elWin = document.getElementById('mw-stat-window');
        const elCount = document.getElementById('mw-stat-count');
        const elAvg = document.getElementById('mw-stat-avg');
        const elSpend = document.getElementById('mw-stat-spend');

        if (elWin) elWin.innerText = fmtCentsFr(totalCents);
        if (elCount) elCount.innerText = String(reqs.length);
        if (elAvg) elAvg.innerText = reqs.length ? fmtCentsFr(totalCents / reqs.length) : '—';
        if (elSpend) {
            const s = numberOrNull(localStorage.getItem(STORAGE_KEY_SPEND_CENTS));
            elSpend.innerText = s !== null ? fmtCentsFr(s) : '—';
        }

        const covWrap = document.getElementById('mw-stat-coverage-wrap');
        const covVal = document.getElementById('mw-stat-coverage');
        if (covWrap && covVal) {
            const c = computeCoverage();
            if (c.poolCents === null) {
                covWrap.style.display = 'none';
            } else {
                covWrap.style.display = 'block';
                const attribuee = Math.max(0, 100 - c.gapPct);
                covWrap.className = 'mw-stat mw-stat-wide' + (c.cleared || attribuee < 90 ? ' warn' : '');
                covVal.textContent = c.cleared
                    ? 'registre effacé — la fenêtre ne peut plus être suivie requête par requête'
                    : attribuee + ' % de ' + fmtCentsFr(c.poolCents) + ' attribués à une requête mesurée · '
                        + fmtCentsFr(c.trackedCents) + ' suivis, ' + fmtCentsFr(c.gapCents)
                        + ' envoyés ailleurs (autre onglet, autre appareil, avant installation)';
            }
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
                    <div class="mw-stat mw-stat-wide" id="mw-stat-coverage-wrap" style="display:none">
                        <div class="mw-stat-label">Suivi de la fenêtre</div>
                        <div class="mw-stat-value" id="mw-stat-coverage">—</div>
                    </div>
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

    // Drag
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
        maybeHarvestModelsFromModal();
        if (g.filtered) return g.round;
        if (g.round !== null && g.round > 0 && g.round < 100) {
            if (poolGuardActive()) return g.round;
            const chk = g.precise != null ? g.precise : g.round;
            if (poolReadingImplausible(chk)) {
                logImplausiblePool(g.round);
                localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(g.round));
                localStorage.setItem(STORAGE_KEY_DOM_PCT_PRECISE, String(g.precise));
                localStorage.setItem(STORAGE_KEY_DOM_PERCENT_TS, String(Date.now()));
                return g.round;
            }
            localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(g.round));
            localStorage.setItem(STORAGE_KEY_DOM_PCT_PRECISE, String(g.precise));
            localStorage.setItem(STORAGE_KEY_DOM_PERCENT_TS, String(Date.now()));

            if (POOL.totalCents == null) CALIB.request('pool inconnu');
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

    const QUOTA_CLICK_ALLOW = /^(voir\s+(votre\s+|le\s+|la\s+)?quota|quota\s+par\s+mod[eè]le|quota|usage|utilisation|facturation|abonnement|plan)\b/;
    let _autoClickBudget = 3;
    function autoClickQuotaButton() {
        if (_autoClickBudget <= 0) return false;
        const pathBefore = window.location.pathname;
        const cands = [];
        for (const el of document.querySelectorAll('button, [role="tab"], [role="switch"], [role="button"]')) {
            if (el.closest('#mammouth-widget, #mw-sidebar, #mw-popover')) continue;
            if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
            const t = String((el.innerText || el.textContent || '') + ' ' + (el.getAttribute('aria-label') || ''))
                .replace(/\s+/g, ' ').trim().toLowerCase();
            if (!t || t.length > 40) continue;
            if (!QUOTA_CLICK_ALLOW.test(t)) continue;
            cands.push({ el, t });
        }
        cands.sort((a, b) => a.t.length - b.t.length);
        for (const c of cands) {
            try { c.el.click(); } catch { return false; }
            _autoClickBudget--;
            console.log('[MammouthWidget] auto-ouverture du panneau quota — clic sur « ' + c.t + ' » (budget restant ' + _autoClickBudget + ')');
            if (window.location.pathname !== pathBefore) { window.history.back(); }
            return true;
        }
        return false;
    }
    function resetAutoClickBudget() { _autoClickBudget = 3; }

    const SETTINGS_SCAN_MAX = 14;
    let _settingsScan = null;
    function autoScanOnSettingsPage() {
        if (!window.location.pathname.includes('/app/account/settings')) return;
        if (_settingsScan) return;
        resetAutoClickBudget();
        let attempts = 0;
        const tryScan = () => {
            attempts++;
            const pct = readQuotaFromDOM(document);
            if (pct !== null) {
                console.log('[MammouthWidget] Quota bar found on settings page:', pct + '%');
                _settingsScan = null;
                setTimeout(() => { harvestModelQuotasViaDom(); fetchQuotaFromAPI(true); }, 400);
                return;
            }
            autoClickQuotaButton();
            if (attempts < SETTINGS_SCAN_MAX) _settingsScan = setTimeout(tryScan, 800);
            else { _settingsScan = null; console.warn('[MammouthWidget] Quota bar not found after', SETTINGS_SCAN_MAX, 'attempts'); }
        };
        _settingsScan = setTimeout(tryScan, 0);
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

    // Fonctions historiques
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
        const oldest = reqs[0];
        const rel = oldest.ts + WINDOW_MS;
        if (rel > Date.now()) { timerEndNotifiedFor = null; return; }
        if (timerEndNotifiedFor !== oldest.ts) {
            timerEndNotifiedFor = oldest.ts;
            sendNotification('Fenêtre Mammouth terminée', 'La fenêtre glissante de 3 heures est terminée.');
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
        if (window.closed) return;
        if (window.location.href === lastTrackedURL) return;
        lastTrackedURL = window.location.href;
        updateReturnButton();
        if (window.location.pathname.includes('/app/account/settings')) {
            startSettingsObserver();
            setTimeout(autoScanOnSettingsPage, 500);
            CALIB.request('navigation → Réglages');
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

        if (officialModelSectionSeen()) { scanDomForPercent(); maybeHarvestModelsFromModal(); }
        CALIB.tick();
        updateReturnButton();
        handleNavigationChange();
    }

    // Export et import
    const EXPORT_KEYS = [
        STORAGE_KEY_START, STORAGE_KEY_POS, STORAGE_KEY_MIN, STORAGE_KEY_QUOTA, STORAGE_KEY_MODELS,
        STORAGE_KEY_API_TS, STORAGE_KEY_API_OK, STORAGE_KEY_API_ENABLED, STORAGE_KEY_DOM_PERCENT, STORAGE_KEY_DOM_PCT_PRECISE,
        STORAGE_KEY_DOM_PERCENT_TS, STORAGE_KEY_LAST_AUTOCAL,
        STORAGE_KEY_RAW_USED, STORAGE_KEY_QUOTA_TOTAL,
        STORAGE_KEY_LOGO_MODE,
        STORAGE_KEY_REQUESTS, STORAGE_KEY_SPEND_CENTS, STORAGE_KEY_THRESHOLD_CENTS,
        STORAGE_KEY_HISTORY, STORAGE_KEY_NOTIFY, STORAGE_KEY_NOTIFIED, STORAGE_KEY_MINI_MODE,
        STORAGE_KEY_CIRCLE_MODE, STORAGE_KEY_UI_MODE, STORAGE_KEY_DAILY_MODEL,
        STORAGE_KEY_MODEL_QUOTA, STORAGE_KEY_MODEL_MISSES, STORAGE_KEY_SCHEMA,
        STORAGE_KEY_LEDGER_CLEARED, STORAGE_KEY_CALIB_STATE, STORAGE_KEY_PLAN_REFUSED, STORAGE_KEY_MODEL_AUTO,
        STORAGE_KEY_HARVEST_JOURNAL, STORAGE_KEY_RAW_USED_CACHE, STORAGE_KEY_RAW_USED_CACHE_TS,
        STORAGE_KEY_SPEND_TS, STORAGE_KEY_LAST_CALIBRATION, STORAGE_KEY_POOL_GUARD,
        STORAGE_KEY_POOL_GUARD_UNTIL, STORAGE_KEY_POOL_SOURCE, 'mammouth_consumption_collapsed'
    ];
    const LEGACY_MODEL_KEYS = [STORAGE_KEY_MODEL_PCT, STORAGE_KEY_MODEL_PCT_SEEN, STORAGE_KEY_MODEL_PCT_TS, STORAGE_KEY_DAILY_BYMODEL];

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
        if (getRequests().length === 0) addRequest(now, 0.01, { measured: false });
        celebrate();
        updateUI(true);
        updateConsumptionStats();
    };

    document.getElementById('mw-btn-stop').onclick = () => {
        localStorage.removeItem(STORAGE_KEY_START);
        localStorage.removeItem(STORAGE_KEY_REQUESTS);
        clearPendingRequests();

        localStorage.setItem(STORAGE_KEY_LEDGER_CLEARED, String(Date.now()));
        console.log('[MammouthWidget] registre effacé — les prochaines requêtes repartent de zéro');
        updateUI(true);
        updateConsumptionStats();
    };

    quotaStatusEl.onclick = () => {
        const domPct = scanDomForPercent();
        if (domPct !== null) localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(domPct));
        CALIB.request('clic Rafraîchir');
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

    // Boutons
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
        if (d) d.innerText = getThresholdCents().toFixed(1).replace('.', ',') + '¢';
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

        addRequest(Date.now(), Math.max(getThresholdCents(), 5), { sandbox: true, measured: false });
        if (!getSessionStart()) setSessionStart(Date.now());
        celebrate();
        updateUI(true);
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
        CALIB.request('bouton Rafraîchir');
        if (window.location.pathname.includes('/app/account/settings')) harvestModelQuotasViaDom();
        else backgroundHarvestIfNeeded(true);
        fetchQuotaFromAPI(false);
        readCurrentUsage().then(c => { if (c !== null) { localStorage.setItem(STORAGE_KEY_SPEND_CENTS, String(c)); updateConsumptionStats(); } });
    };

    function fetchModelsBtnClick(e) {
        if (e) e.stopPropagation();

        let tries = 0;
        const attemptOpen = () => {
            if (_popupHarvest) return;
            if (harvestViaPopupWindow('manual')) return;
            if (tries < 8 && (_bgHarvestInFlight || _harvestInFlight)) { tries++; setTimeout(attemptOpen, 900); return; }
            console.log('[MammouthWidget] ouverture impossible pour l\'instant — Réglages → Quota fonctionne aussi (lecture automatique)');
        };
        attemptOpen();
    }
    document.getElementById('mw-pop-fetch-models').onclick = fetchModelsBtnClick;
    const wFetchBtn = document.getElementById('mw-widget-fetch-models');
    if (wFetchBtn) wFetchBtn.onclick = fetchModelsBtnClick;
    document.addEventListener('click', (e) => {
        if (getUiMode() !== 'sidebar') return;
        if (!sidebar.contains(e.target) && !popover.contains(e.target)) { popoverPinned = false; popover.classList.remove('open'); }
    });

    function syncModelAutoButton() {
        const b = document.getElementById('mw-btn-model-auto');
        if (!b) return;
        b.innerText = modelAutoEnabled() ? 'Auto' : 'Manuel';
        b.style.color = modelAutoEnabled() ? '#2ed573' : '#ffa502';
    }
    const modelAutoBtn = document.getElementById('mw-btn-model-auto');
    if (modelAutoBtn) modelAutoBtn.onclick = (e) => { e.stopPropagation(); setModelAuto(!modelAutoEnabled()); };

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

        CALIB.request('bouton Calibrer');
        localStorage.setItem(STORAGE_KEY_RETURN_URL, window.location.href);
        noteUserGesture();
        if (!harvestViaPopupWindow('manual')) {
            if (window.location.pathname.includes('/app/account/settings')) autoScanOnSettingsPage();
            else            console.log('[MammouthWidget] petite fenêtre bloquée — ouvre manuellement /app/account/settings/subscription puis clique Rafraîchir');
        }
    };

    document.getElementById('mw-btn-clear-requests').onclick = (e) => {
        e.stopPropagation();
        if (confirm('Effacer la fenêtre glissante (requêtes) et l\'historique de quota ?')) {

            localStorage.removeItem(STORAGE_KEY_REQUESTS);
            localStorage.removeItem(STORAGE_KEY_START);
            localStorage.removeItem(STORAGE_KEY_HISTORY);
            localStorage.removeItem(STORAGE_KEY_NOTIFIED);
            clearPendingRequests();
            localStorage.setItem(STORAGE_KEY_LEDGER_CLEARED, String(Date.now()));
            console.log('[MammouthWidget] fenêtre + historique effacés');
            updateUI(true);
            updateConsumptionStats();
            drawHistory();
        }
    };

    const exportBtn = document.getElementById('mw-btn-export');
    const importBtn = document.getElementById('mw-btn-import');
    const importFile = document.getElementById('mw-import-file');

    exportBtn.onclick = (e) => {
        e.stopPropagation();

        const data = { schema: SCHEMA_VERSION, version: 14, exportedAt: new Date().toISOString(), values: {}, models: readModelEnvelope() };
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

    const IMPORT_RULES = {
        [STORAGE_KEY_QUOTA_TOTAL]: (v) => { const n = numberOrNull(v); return n != null && n > 0 && n < 1000000 ? n : null; },
        [STORAGE_KEY_QUOTA]: (v) => { const n = numberOrNull(v); return n != null && n >= 0 && n <= 100 ? n : null; },
        [STORAGE_KEY_RAW_USED]: (v) => { const n = numberOrNull(v); return n != null && n >= 0 ? n : null; },
        [STORAGE_KEY_RAW_USED_CACHE]: (v) => { const n = numberOrNull(v); return n != null && n >= 0 ? n : null; },
        [STORAGE_KEY_SPEND_CENTS]: (v) => { const n = numberOrNull(v); return n != null && n >= 0 ? n : null; },
        [STORAGE_KEY_THRESHOLD_CENTS]: (v) => { const n = numberOrNull(v); return n != null && n >= 0 && n < 100000 ? n : null; },
        [STORAGE_KEY_MINI_MODE]: (v) => (['used', 'remaining', 'time'].includes(v) ? v : null),
        [STORAGE_KEY_CIRCLE_MODE]: (v) => (['used', 'remaining', 'time'].includes(v) ? v : null),
        [STORAGE_KEY_UI_MODE]: (v) => (['classic', 'sidebar'].includes(v) ? v : null),
        [STORAGE_KEY_LOGO_MODE]: (v) => (v === '0' || v === '1' ? v : null),
        [STORAGE_KEY_MIN]: (v) => (v === '0' || v === '1' ? v : null),
        [STORAGE_KEY_API_ENABLED]: (v) => (v === 'on' || v === 'off' ? v : null),
        [STORAGE_KEY_NOTIFY]: (v) => (v === 'on' || v === 'off' ? v : null),
        [STORAGE_KEY_API_OK]: (v) => (v === '0' || v === '1' ? v : null),
    };
    function validateImport(values) {
        const out = {}, rejected = [];
        for (const key of EXPORT_KEYS) {
            if (typeof values[key] !== 'string') continue;
            const rule = IMPORT_RULES[key];
            if (rule) {
                const v = rule(values[key]);
                if (v === null) { rejected.push(key + '=' + values[key]); continue; }
                out[key] = String(v);
            } else if (/^-?\d{1,15}$/.test(values[key]) || /^[a-z0-9_:,\-\.·% ]{0,4000}$/i.test(values[key])) {
                out[key] = values[key];
            } else rejected.push(key);
        }
        return { out, rejected };
    }

    importFile.onchange = async () => {
        const file = importFile.files && importFile.files[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text());
            if (!parsed.values || typeof parsed.values !== 'object') throw new Error('Format incorrect');
            const { out, rejected } = validateImport(parsed.values);
            if (rejected.length) console.warn('[MammouthWidget] import : ' + rejected.length + ' valeur(s) rejetée(s) →', rejected);
            let skippedModels = false;
            if (parsed.models && typeof parsed.models === 'object') {
                const m = normalizeModelMap(parsed.models.models || parsed.models);
                if (Object.keys(m).length) storeModelPct(m, 'import', { complete: false, confidence: 0.5 });
                else skippedModels = true;
            } else skippedModels = true;
            for (const key of Object.keys(out)) localStorage.setItem(key, out[key]);
            localStorage.setItem(STORAGE_KEY_SCHEMA, String(SCHEMA_VERSION));
            updateUI(true);
            updateConsumptionStats();
            drawHistory();
            syncNotificationButton();
            syncModelAutoButton();
            syncApiToggle();
            syncMiniModeButton();
            syncCircleModeButton();
            syncUiModeButton();
            updateReturnButton();
            alert('Données Mammouth importées.'
                + (rejected.length ? '\n\n' + rejected.length + ' valeur(s) rejetée(s) (voir console).' : '')
                + (skippedModels ? '\n\nAucun quota par modèle dans le fichier.' : ''));
        } catch (error) {
            console.error('[MammouthWidget] Import:', error);
            alert('Impossible d\'importer ce fichier.');
        } finally {
            importFile.value = '';
        }
    };

    const STORAGE_NO_REDRAW = new Set([STORAGE_KEY_HARVEST_JOURNAL, STORAGE_KEY_SOURCE_LOG,
        STORAGE_KEY_POOL_GUARD, STORAGE_KEY_POOL_GUARD_UNTIL, STORAGE_KEY_API_TS,
        STORAGE_KEY_RAW_USED_CACHE, STORAGE_KEY_RAW_USED_CACHE_TS, STORAGE_KEY_SPEND_TS]);
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY_MODEL_QUOTA && event.newValue !== event.oldValue) {
            try {
                const nw = readJSON(STORAGE_KEY_MODEL_QUOTA, {});
                const fmt = (m) => Object.keys(m.models || {}).filter(isDisplayableModelKey)
                    .map(n => n + ' ' + m.models[n].pct + '%').join(', ') || '(vide)';
                console.log('[MammouthWidget] quotas par modèle mis à jour par une autre fenêtre →', fmt(nw), '| source:', nw.source);
            } catch {}
        }
        if (!event.key || event.key.startsWith('mammouth_')) {
            if (event.key && STORAGE_NO_REDRAW.has(event.key)) return;
            updateUI(true);
            updateConsumptionStats();
            syncNotificationButton();
            syncModelAutoButton();
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
    syncModelAutoButton();
    syncMiniModeButton();
    syncCircleModeButton();
    syncUiModeButton();
    applyUiMode();
    updateReturnButton();

    updateUI(true);
    updateConsumptionStats();
    updateSyncIndicator();
    scheduleAutoModelRefresh('démarrage');

    // Migration v14 vers v15
    function migrateSchema() {
        const cur = numberOrNull(localStorage.getItem(STORAGE_KEY_SCHEMA)) || 0;
        if (cur >= SCHEMA_VERSION) return false;
        const report = [];
        const legacy = readJSON(STORAGE_KEY_MODEL_PCT, {});
        const seen = readJSON(STORAGE_KEY_MODEL_PCT_SEEN, {});
        const legacyNames = Object.keys(legacy).filter(k => isDisplayableModelKey(k) && pctOf(legacy[k]) !== null);
        if (legacyNames.length && !Object.keys(readModelEnvelope().models).length) {
            const flat = {};
            for (const k of legacyNames) flat[k] = pctOf(legacy[k]);
            storeModelPct(flat, 'migration', { complete: false, confidence: 0.4 });
            report.push('modèles migrés : ' + legacyNames.length);
        }

        const raw = (() => { try { const a = JSON.parse(localStorage.getItem(STORAGE_KEY_REQUESTS) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } })();
        const virt = raw.filter(r => r && r.virt).length;
        if (virt) {
            const kept = raw.filter(r => r && !r.virt).map(r => {
                const o = { ts: r.ts, cents: numberOrNull(r.cents) || 0.01 };
                o.measured = r.measured !== false && o.cents > 0.01;
                if (r.sandbox) o.sandbox = true;
                return o;
            });
            if (kept.length) localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(kept));
            else localStorage.removeItem(STORAGE_KEY_REQUESTS);
            report.push('requêtes virtuelles supprimées : ' + virt);
        }

        if (localStorage.getItem(STORAGE_KEY_QUOTA_TOTAL) !== null) {
            localStorage.removeItem(STORAGE_KEY_QUOTA_TOTAL);
            report.push('total du pool remis à zéro (recalibration propre)');
        }
        localStorage.removeItem(STORAGE_KEY_CALIBRATE_PENDING);
        localStorage.removeItem(STORAGE_KEY_LAST_AUTOCAL);

        for (const k of LEGACY_MODEL_KEYS) localStorage.removeItem(k);
        localStorage.setItem(STORAGE_KEY_SCHEMA, String(SCHEMA_VERSION));
        console.log('[MammouthWidget] migration v14 → v15 :', report.length ? report.join(' · ') : 'rien à migrer');
        return true;
    }
    migrateSchema();

    const PASSIVE = inHarvestPopup();

    if (!PASSIVE) readCurrentUsage().then(c => {
        if (c !== null) {
            localStorage.setItem(STORAGE_KEY_SPEND_CENTS, String(c));
            console.log('[MammouthWidget] Dépense site courante =', fmtCentsFr(c));
            updateConsumptionStats();
        }
        if (POOL.totalCents == null) CALIB.request('démarrage');
    });

    if (!PASSIVE) setTimeout(() => {
        const isSettingsPage = window.location.pathname.includes('/app/account/settings');
        if (!isSettingsPage) {
            const d = scanDomForPercent();
            if (d !== null) localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(d));
            fetchQuotaFromAPI(true);
            setTimeout(() => backgroundHarvestIfNeeded(), 6000);
        } else {
            CALIB.request('page Réglages');
            autoScanOnSettingsPage();
            setTimeout(() => fetchQuotaFromAPI(true), 2500);
        }
    }, 2500);

    // Boucles
    window.__mwTimers = window.__mwTimers || [];
    window.__mwTimers.push(setInterval(() => updateUI(false), CFG.lightTickMs));
    if (!PASSIVE) {
        window.__mwTimers.push(setInterval(() => {
            if (apiEnabled()) {
                fetchQuotaFromAPI(true);
                if (window.location.pathname.includes('/app/account/settings')) harvestModelQuotasViaDom();
                else backgroundHarvestIfNeeded();
            }
        }, API_INTERVAL_MS));
        window.__mwTimers.push(setInterval(() => {
            if (document.hidden) return;
            if (window.location.pathname.includes('/app/account/settings')) harvestModelQuotasViaDom();
            else backgroundHarvestIfNeeded();
        }, 3 * 60 * 1000));
        window.__mwTimers.push(setInterval(() => {
            if (document.hidden) extensionTick();
            CALIB.tick();
        }, 3000));

        window.__mwTimers.push(setInterval(() => {
            if (document.hidden || !apiEnabled() || _popupHarvest) return;
            POOL.setSyncing(true);
            readCurrentUsage().then(c => { POOL.setSyncing(false); if (c !== null) updateUI(true); });
        }, CFG.poolPollMs));
    }
    window.__mwTimers.push(setInterval(updateConsumptionStats, 15000));
    window.addEventListener('beforeunload', () => {
        for (const t of (window.__mwTimers || [])) clearInterval(t);
        window.__mwTimers = [];
    }, { once: true });

    try {
        document.addEventListener('pointerdown', noteUserGesture, true);
        document.addEventListener('keydown', noteUserGesture, true);
        document.addEventListener('wheel', noteUserGesture, { capture: true, passive: true });
    } catch {}

    window.addEventListener('message', (ev) => {
        if (ev.origin !== window.location.origin) return;
        const d = ev.data;
        if (!d || d.type !== 'mw_harvest_result' || !window.opener) return;
        const map = normalizeModelMap(d.models);
        const names = displayableModelNames(map);
        if (!names.length) { console.log('[MammouthWidget] popup : lecture vide, ignorée'); return; }
        const complete = d.complete === true;
        storeModelPct(map, 'popup', { complete, confidence: complete ? 0.95 : 0.5 });
        journalHarvest({ ts: Date.now(), source: 'popup:message', action: complete ? 'scan complet' : 'scan partiel', avant: modelNames(), apres: names.map(n => n + '=' + map[n]) });
        console.log('[MammouthWidget] quotas par modèle reçus de la petite fenêtre ('
            + (complete ? 'complet' : 'partiel') + ') →',
            names.map(n => n + ' ' + map[n] + '%').join(', '));
        updateUI(true);
    });

    // Tests
    function buildTestSuite() {
        const cases = [];
        const t = (name, fn) => cases.push({ name, fn });
        const eq = (got, want, msg) => ({ ok: String(got) === String(want), got, want, msg });

        t('toPercent ratio 0.43 → 43', () => eq(toPercent(0.43), 43));
        t('toPercent ratio "0.43" → 43', () => eq(toPercent('0.43'), 43));
        t('toPercent pct 43 → 43', () => eq(toPercent(43), 43));
        t('toPercent "43%" → 43', () => eq(toPercent('43%'), 43));
        t('toPercent "192%" → 192 (modèle bloqué)', () => eq(toPercent('192%'), 192));
        t('toPercent 0 → 0 (pas un ratio)', () => eq(toPercent(0), 0));
        t('toPercent null → null', () => eq(toPercent(null), 'null'));
        t('toPercentStrict "0.5" → 1 (0,5 %, pas 50 %)', () => eq(toPercentStrict('0.5'), 1));
        t('toPercentStrict "43" → 43', () => eq(toPercentStrict('43'), 43));

        t('fmtPct(0) → "0 %"', () => eq(fmtPct(0), '0 %'));
        t('fmtPct(null) → "—"', () => eq(fmtPct(null), '—'));
        t('fmtPct(12.6) → "13 %"', () => eq(fmtPct(12.6), '13 %'));
        t('fmtPct(43,"%") → "43%" (suffix serré)', () => eq(fmtPct(43, '%'), '43%'));
        t('fmtPct(43) → "43 %"', () => eq(fmtPct(43), '43 %'));

        t('fmtCentsFr(12.4) → "12,40¢"', () => eq(fmtCentsFr(12.4), '12,40¢'));
        t('fmtCentsFr(0.005) → "0,01¢"', () => eq(fmtCentsFr(0.005), '0,01¢'));

        t('displayable "3.1 70B" (visible)', () => eq(isDisplayableModelKey('3.1 70B'), true));
        t('displayable "70B Turbo" (visible)', () => eq(isDisplayableModelKey('70B Turbo'), true));
        t('displayable "o3" (visible)', () => eq(isDisplayableModelKey('o3'), true));
        t('displayable "Quota par modèle" (rejeté)', () => eq(isDisplayableModelKey('Quota par modèle'), false));
        t('displayable "Claude" marque pure (rejeté — part de marque, pas un modèle)', () => eq(isDisplayableModelKey('Claude'), false));
        t('displayable "Cliquez pour filtrer" (rejeté)', () => eq(isDisplayableModelKey('Cliquez pour filtrer'), false));
        t('displayable "" (rejeté)', () => eq(isDisplayableModelKey(''), false));

        t('normalize: alias minuscule ÉLIMINÉ', () => eq(
            Object.keys(normalizeModelMap({ 'Claude Sonnet 5': 31, 'grok 4': 12 })).includes('grok 4'), false));
        t('normalize: 192 % conservé (bloqué)', () => eq(normalizeModelMap({ 'Claude Fable 5.1': 192 })['Claude Fable 5.1'], 192));
        t('normalize: 1500 % rejeté', () => eq(Object.keys(normalizeModelMap({ 'X Y': 1500 })).length, 0));
        t('normalize: nom beautifié', () => eq(Object.keys(normalizeModelMap({ 'claude-opus-4-1': 44 }))[0], 'Opus 4.1'));

        t('score "k2" vs "Kimi K2" ≥ "Kimi K2.5"', () => eq(
            scoreModelName('k2', 'Kimi K2') > scoreModelName('k2', 'Kimi K2.5'), true));
        t('score "gpt-4o" soi-même = 100', () => eq(scoreModelName('gpt-4o', 'GPT 4O'), 100));
        t('score sans rapport = 0', () => eq(scoreModelName('claude', 'GPT 5'), 0));

        t('parse: byBrand en centimes accepté', () => eq(
            parseQuotaResponse({ byBrand: [{ brand: 'claude', value: 194.18 }, { brand: 'grok', value: 12.5 }] }).rawUsedSum, 206.68));
        t('parse: byBrand RATIO rejeté', () => eq(
            parseQuotaResponse({ byBrand: [{ brand: 'claude', value: 0.43 }] }).rawUsedSum, 'null'));
        t('parse: percent ratio 0.43 → 43', () => eq(parseQuotaResponse({ percent: 0.43 }).percent, 43));
        t('parse: usedModels NON tronqué', () => eq(
            (parseQuotaResponse({ usedModels: ['a1', 'a2', 'a3', 'a4', 'a5'] }).modelsList || []).length, 5));
        t('parse: réponse nulle → ok:false', () => eq(parseQuotaResponse(null).ok, false));

        t('pool: pct = used/total', () => eq(POOL.computePct(225, 450), 50));
        t('pool: total 0 → null', () => eq(POOL.computePct(10, 0), 'null'));
        t('pool: >100 plafonné à 100', () => eq(POOL.computePct(900, 450), 100));
        t('pool: used 0 → 0 (pas « — »)', () => eq(POOL.computePct(0, 450), 0));

        t('BUG CENTRAL: anneau 2 (temps) ≠ anneau 1 (spend) quand spend=0', () => {
            const now = Date.now();
            const reqs = [{ ts: now - 90 * 60 * 1000, cents: 0, measured: true }];
            const elapsed = Math.round(((WINDOW_MS - (now - 90 * 60 * 1000 + WINDOW_MS - now)) / WINDOW_MS) * 100);
            const poolPct = POOL.computePct(0, 450);
            return eq(poolPct === elapsed, false, 'anneau1=' + poolPct + ' anneau2=' + elapsed + ' reqs=' + JSON.stringify(reqs));
        });
        t('BUG CENTRAL: simulateur exclut le sandbox', () => {
            const now = Date.now();
            const a = simProjection([{ ts: now - 60 * 60 * 1000, cents: 5 }], 3 * 3600 * 1000);
            const b = simProjection([{ ts: now - 60 * 60 * 1000, cents: 5, sandbox: true }], 3 * 3600 * 1000);
            return eq(b.recovered, 0, 'récupéré=' + b.recovered);
        });

        t('sim: agrégation ±500 ms', () => {
            const t0 = Date.now() + 60000;
            const p = simProjection([{ ts: t0 - WINDOW_MS, cents: 3 }, { ts: t0 - WINDOW_MS + 200, cents: 2 }], 0);
            return eq(p.next && p.next.cents, 5);
        });
        t('sim: sandbox ignoré dans next', () => {
            const t0 = Date.now() + 60000;
            const p = simProjection([{ ts: t0 - WINDOW_MS, cents: 3, sandbox: true }], 0);
            return eq(p.totalReqs, 0);
        });

        const rej = (v, k) => validateImport(v).rejected.some(r => r === k || r.startsWith(k + '='));
        t('import: total aberrant rejeté', () => eq(rej({ mammouth_quota_total: 'abc' }, 'mammouth_quota_total'), true));
        t('import: total plausible accepté', () => eq(
            validateImport({ mammouth_quota_total: '450' }).out['mammouth_quota_total'], '450'));
        t('import: ui_mode invalide rejeté', () => eq(rej({ mammouth_ui_mode: 'pirate' }, 'mammouth_ui_mode'), true));
        t('import: ui_mode valide accepté', () => eq(
            validateImport({ mammouth_ui_mode: 'sidebar' }).out['mammouth_ui_mode'], 'sidebar'));
        t('import: pct hors bornes rejeté', () => eq(rej({ mammouth_real_quota_percent: '9999' }, 'mammouth_real_quota_percent'), true));
        t('import: mode mini invalide refusé', () => eq(rej({ mammouth_mini_mode: 'pirate' }, 'mammouth_mini_mode'), true));
        t('import: spend négatif refusé', () => eq(rej({ mammouth_current_spend_cents: '-5' }, 'mammouth_current_spend_cents'), true));

        t('coverage: tracked=0, gap=pool', () => {
            const c = computeCoverage();
            return eq(c.gapCents === null || c.gapCents >= 0, true);
        });

        t('autoClick: budget initial = 3', () => { resetAutoClickBudget(); return eq(_autoClickBudget, 3); });

        return {
            cases,
            run() {
                let pass = 0, fail = 0;
                const failures = [];
                for (const c of cases) {
                    let r;
                    try { r = c.fn(); } catch (e) { r = { ok: false, got: 'throw: ' + e.message, want: '—' }; }
                    if (r && r.ok) { pass++; }
                    else {
                        fail++;
                        failures.push(c.name + ' → attendu ' + r.want + ', obtenu ' + r.got + (r.msg ? ' (' + r.msg + ')' : ''));
                    }
                }
                console.log('%c[MammouthWidget] TESTS v15 — ' + pass + ' passés, ' + fail + ' échoués',
                    'color:' + (fail ? '#ff4757;font-weight:700' : '#2ed573;font-weight:700'));
                for (const f of failures) console.log('  ✗ ' + f);
                return { pass, fail, failures };
            },
        };
    }

    window.__mwDebug = {
        classifyQuotaBars, readPoolGauge, scanModelSections, findModelNameForBar,
        readSubscriptionQuotaSection,
        allGaugePreciseWidths, detectBrandFilterActive, scanDomForPercent,
        CALIB, POOL, buildRings, coverage: computeCoverage, isJunkModelKey, isPureBrandKey,
        storeModelPct, normalizeModelMap, displayableModelNames, modelPctMap, modelNames,
        readModelEnvelope, modelStale, modelAgeLabel, scoreModelName, resolveDailyPct,
        officialModelSectionSeen, maybeHarvestModelsFromModal,
        poolGuardActive, expectedPoolPct, poolReadingImplausible, notePoolActivity,
        readQuotaFromDOM, fetchQuotaFromAPI, migrateSchema,
        renderModelBlocks, brandLogoSvg, syncLogoToggle, setLogoMode, getLogoMode,
        updateSidebar, renderRing3Logo, updateUI, updateModelsSubtitle, updateConsumptionStats, drawHistory,
        simProjection, updateSimulator, fmtPct, fmtCentsFr,
        toPercent, toPercentStrict, fmtDurMin, fmtHrMin, formatResetIn,
        computeCoverage, coverageLabel, authoritativeWindowSpend, pruneRequests,
        parseQuotaResponse, validateImport, IMPORT_RULES, CFG,
        harvestDom: () => harvestModelQuotasViaDom(),
        harvestJournal: () => readJSON(STORAGE_KEY_HARVEST_JOURNAL, []),
        sourceLog: () => readJSON(STORAGE_KEY_SOURCE_LOG, null),
        extensionTick, healTotalFromPlan, refusePlanPoolIfDivergent,
        planPoolCents: PLAN_POOL_CENTS,
        harvestViaPopupWindow, popupHarvestTick, finishPopupHarvest, restoreGlobalFilter,
        closeTrackedPopupWindows, trackedPopups: () => _popupWindows.size,
        findQuotaTriggerCandidates, assistPopupQuotaClick, autoClickQuotaButton,
        noteUserGesture, inHarvestPopup, backgroundHarvestIfNeeded,
        pendingQueue: getPendingQueue, resolveOnePending,
        diagnoseQuotaDOM, brandFilterChips, clearPopupFilter, popupBanner, readPoolGaugeIn, gentleScrollPopup,
        applyPopupRect, popupTargetRect,
        scheduleAutoModelRefresh, poolFreshnessLabel, modelAutoEnabled, setModelAuto, POOL_POLL_MS,
        modelEntries, modelEntryAgeLabel, readModelMisses, HISTORY_RETENTION_MS,
    };
    // Diagnostic
    function diagnoseQuotaDOM() {
        const out = {
            url: location.pathname,
            officialModelSectionSeen: (() => { try { return officialModelSectionSeen(); } catch { return 'err'; } })(),
            progressbars: [],
            brandChips: [],
            headings: [],
            api: null,
        };
        for (const b of document.querySelectorAll('[role="progressbar"]')) {
            if (b.closest('#mammouth-widget, #mw-sidebar, #mw-popover')) continue;
            const card = b.closest('section, [class*="card"], article, div[class*="rounded"]');
            out.progressbars.push({
                ariaLabel: b.getAttribute('aria-label'),
                valuenow: b.getAttribute('aria-valuenow'),
                valuetext: b.getAttribute('aria-valuetext'),
                innerWidths: [...b.querySelectorAll('[style*="width"]')].map(e => e.getAttribute('style')).slice(0, 3),
                nomTrouve: (() => { try { return findModelNameForBar(b); } catch { return 'err'; } })(),
                texteCarte: card ? String(card.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160) : null,
            });
        }
        try {
            out.brandChips = brandFilterChips(document).map(c => ({ marque: c.brand, ariaLabel: c.el.getAttribute('aria-label'), pressed: c.el.getAttribute('aria-pressed'), state: c.el.getAttribute('data-state') }));
            out.tousLesBoutonsAriaLabel = [...document.querySelectorAll('button[aria-label]')]
                .filter(b => !b.closest('#mammouth-widget, #mw-sidebar, #mw-popover'))
                .map(b => (b.getAttribute('aria-label') || '').slice(0, 70)).filter(Boolean).slice(0, 40);
        } catch {}
        for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,[class*="font-semibold"],[class*="font-bold"]')) {
            if (h.closest('#mammouth-widget, #mw-sidebar, #mw-popover, [role="progressbar"]')) continue;
            const t = String(h.innerText || '').replace(/\s+/g, ' ').trim();
            if (t && t.length < 70) out.headings.push(t);
        }
        out.headings = out.headings.slice(0, 30);
        const cands = ['/api/user/recentUsage', '/api/user/currentUsage'];
        out.api = cands.map(u => ({ url: u, _pending: true }));
        Promise.all(cands.map(u => _origFetch(u, { credentials: 'include', cache: 'no-store' })
            .then(r => r.json()).then(j => j).catch(e => ({ _err: String(e.message) }))))
            .then(res => {
                out.api = res;
                console.log('%c[MammouthWidget] DIAGNOSTIC', 'color:#a29bfe;font-weight:700');
                console.log(JSON.stringify(out, null, 2));
                window.__mwLastDiag = out;
                const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'mammouth-diag.json'; a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                console.log('%c[mw] diagnostic téléchargé (mammouth-diag.json) + stocké dans window.__mwLastDiag', 'color:#2ed573');
            });
        console.log('[mw] diagnostic en cours… (télécharge mammouth-diag.json)');
        return out;
    }

    window.__mwTest = buildTestSuite();

    console.log('[MammouthWidget] Quota Tracker v15.18 chargé');
    console.log('[MammouthWidget] diagnostic : __mwDebug.buildRings() · tests : __mwTest.run()');
})();