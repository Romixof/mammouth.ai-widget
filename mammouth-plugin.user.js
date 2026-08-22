// ==UserScript==
// @name         Mammouth AI - Quota Tracker
// @namespace    http://tampermonkey.net/
// @version      14.5
// @description  Quota Tracker — fenêtre glissante 3h + détection d'envoi DOM (reliable) + coût réel par requête + cercle minimisé indépendant (texte vs anneau) + calibration verrouillée + notifications + export/import.
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
    `;
    document.head.appendChild(style);

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
    const STORAGE_KEY_RAW_USED = 'mammouth_raw_used';
    const STORAGE_KEY_QUOTA_TOTAL = 'mammouth_quota_total';
    const STORAGE_KEY_CALIBRATE_PENDING = 'mammouth_calibrate_pending';
    const STORAGE_KEY_DOM_PERCENT_TS = 'mammouth_dom_percent_ts';
    const STORAGE_KEY_MINI_MODE = 'mammouth_mini_mode';
    const STORAGE_KEY_CIRCLE_MODE = 'mammouth_circle_mode';
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

    /* ================= BADGE API ================= */

    let lastBadgeState = null;
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

    /* ================= AFFICHAGE ================= */

    let targetPercent = null;
    let displayedPercent = null;

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

    /* ================= UPDATE UI ================= */

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
        updateApiTimestamp();
        refreshApiBadgeFromStorage();
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

    /* ================= CALIBRATION ================= */

    function calibrateIfPending() {
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
        if (domP === null || domP <= 0 || domP >= 100) {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
            console.warn('[MammouthWidget] Invalid DOM% for calibration:', domP);
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
        if (domP !== null && domP > 0 && domP < 100 && raw !== null && raw > 0) {
            const total = raw / (domP / 100);
            if (total > 0) {
                localStorage.setItem(STORAGE_KEY_QUOTA_TOTAL, String(total));
                localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '0');
                localStorage.setItem(STORAGE_KEY_LAST_CALIBRATION, String(now));
                console.log('[MammouthWidget] Calibration (verrouillée): total =', total.toFixed(2), 'crédits (DOM', domP + '%, usage brut', raw.toFixed(2) + ')');
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

    function parseQuotaResponse(data) {
        const result = { percent: null, models: null, rawUsedSum: null };
        if (data == null) return result;

        const directPct = [data.percent, data.percentUsed, data.usagePercent, data.quotaPercent,
            data.quota && data.quota.percent,


            data.usage && data.usage.percent].find(v => toPercent(v) !== null);
        if (directPct !== undefined) result.percent = toPercent(directPct);

        if (Array.isArray(data.byBrand)) {
            let sum = 0;
            let found = false;
            for (const b of data.byBrand) {
                const v = numberOrNull(b && b.value);
                if (v !== null) { sum += v; found = true; }
            }
            if (found) result.rawUsedSum = sum;
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

    /* ================= SCAN DOM ================= */

    const QUOTA_BAR_SELECTORS = [
        '[aria-label="Utilisation du quota"]',
        '[aria-label="Quota usage"]',
        '[aria-label="Quota utilization"]',
        '[aria-label="Usage du quota"]',
    ];

    function findQuotaBar(root) {
        for (const selector of QUOTA_BAR_SELECTORS) {
            const el = root.querySelector(selector);
            if (el) return el;
        }
        return null;
    }

    function scanDomForPercent() {
        const quotaBar = findQuotaBar(document);
        if (quotaBar) {
            const percent = quotaBar.getAttribute('aria-valuenow');
            if (percent) {
                const p = toPercent(percent);
                if (p !== null) {
                    localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(p));
                    localStorage.setItem(STORAGE_KEY_DOM_PERCENT_TS, String(Date.now()));
                    return p;
                }
            }
        }
        return null;
    }

    /* ================= FETCH QUOTA API ================= */

    let apiInFlight = false;
    const _origFetch = window.fetch.bind(window);

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
                if (pct !== null) localStorage.setItem(STORAGE_KEY_QUOTA, String(pct));
                if (parsed.models) localStorage.setItem(STORAGE_KEY_MODELS, parsed.models);

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

    /* ================= MESURE DU COÛT (currentUsage) ================= */

    let doneDebounce = 0;

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

    /* ================= CARTE CONSOMMATION ================= */

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

    /* ================= FONCTIONS HISTORIQUES RESTAURÉES ================= */

    function readQuotaFromDOM(root) {
        const quotaBar = findQuotaBar(root);
        if (!quotaBar) return null;
        const percent = quotaBar.getAttribute('aria-valuenow');
        let p = null;
        if (percent) {
            p = toPercent(percent);
            if (p !== null && p > 0 && p < 100) {
                localStorage.setItem(STORAGE_KEY_DOM_PERCENT, String(p));
                localStorage.setItem(STORAGE_KEY_DOM_PERCENT_TS, String(Date.now()));
                localStorage.setItem(STORAGE_KEY_QUOTA, String(p));
                localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '1');
                calibrateIfPending();
            }
        }
        const models = [];
        const btns = quotaBar.querySelectorAll('button[aria-label]');
        btns.forEach(btn => {
            const label = btn.getAttribute('aria-label');
            if (label) {
                const raw = label.replace('Cliquez pour filtrer.', '').trim();
                const pretty = beautifyModelName(raw) || raw;
                if (pretty) models.push(pretty);
            }
        });
        if (models.length > 0) localStorage.setItem(STORAGE_KEY_MODELS, models.join('  ·  '));
        updateUI();
        return p;
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
                setTimeout(() => fetchQuotaFromAPI(true), 300);
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
        updateReturnButton();
        handleNavigationChange();
    }

    /* ================= EXPORT / IMPORT ================= */

    const EXPORT_KEYS = [
        STORAGE_KEY_START, STORAGE_KEY_POS, STORAGE_KEY_MIN, STORAGE_KEY_QUOTA, STORAGE_KEY_MODELS,
        STORAGE_KEY_API_TS, STORAGE_KEY_API_OK, STORAGE_KEY_API_ENABLED, STORAGE_KEY_DOM_PERCENT,
        STORAGE_KEY_DOM_PERCENT_TS,
        STORAGE_KEY_RAW_USED, STORAGE_KEY_QUOTA_TOTAL, STORAGE_KEY_CALIBRATE_PENDING,
        STORAGE_KEY_REQUESTS, STORAGE_KEY_SPEND_CENTS, STORAGE_KEY_THRESHOLD_CENTS,
        STORAGE_KEY_HISTORY, STORAGE_KEY_NOTIFY, STORAGE_KEY_NOTIFIED, STORAGE_KEY_MINI_MODE,
        STORAGE_KEY_CIRCLE_MODE
    ];

    /* ================= BOUTONS ================= */

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
        if (url) {
            localStorage.removeItem(STORAGE_KEY_RETURN_URL);
            window.location.href = url;
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
        if (!event.key || event.key.startsWith('mammouth_')) {
            updateUI();
            updateConsumptionStats();
            syncNotificationButton();
            syncApiToggle();
            syncMiniModeButton();
            syncCircleModeButton();
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

    /* ================= BOUCLES ================= */

    syncNotificationButton();
    syncMiniModeButton();
    syncCircleModeButton();
    updateReturnButton();

    updateUI();
    updateConsumptionStats();

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
        } else {
            localStorage.setItem(STORAGE_KEY_CALIBRATE_PENDING, '1');
            autoScanOnSettingsPage();
            setTimeout(() => fetchQuotaFromAPI(true), 2500);
        }
    }, 2500);

    if (!window.__mwTimersStarted) {
        window.__mwTimersStarted = true;
        window.__mwTickTimer = setInterval(updateUI, 1000);
        window.__mwApiTimer = setInterval(() => { if (apiEnabled()) fetchQuotaFromAPI(true); }, API_INTERVAL_MS);
        window.__mwConsTimer = setInterval(updateConsumptionStats, 15000);
        window.addEventListener('beforeunload', () => {
            clearInterval(window.__mwTickTimer);
            clearInterval(window.__mwApiTimer);
            clearInterval(window.__mwConsTimer);
        });
    }

    if (!window.__mwExtTimers) {
        window.__mwExtTimers = true;
        setInterval(() => { if (!document.hidden) extensionTick(); }, 3000);
        setInterval(() => { if (document.hidden) extensionTick(); }, 30000);
    }

    console.log('[MammouthWidget] v14.5 chargé — détection DOM + cercle minimisé indépendant (texte vs anneau) + coût réel.');
})();
 
