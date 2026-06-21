// ==UserScript==
// @name         Archidekt Deck Review Bridge
// @namespace    rayenz.hub.deck-review
// @version      2026-06-21.5
// @description  CORS bridge for Rayenz Hub deck snapshots; stages full-deck apply on Archidekt deck pages.
// @author       rayenz-akusiom
// @match        https://archidekt.com/decks/*
// @match        https://rayenz-akusiom.github.io/rayenz-akusiom/*
// @match        http://localhost/*
// @match        http://localhost:*/*
// @match        http://127.0.0.1/*
// @match        http://127.0.0.1:*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    var BANNER_ID = 'rayenz-archidekt-apply-banner';
    var ARCHIDEKT_API = 'https://archidekt.com/api';
    var USER_AGENT = 'rayenz-hub-bridge/1.2';
    var APPLY_STORAGE_PREFIX = 'rayenz-deck-apply:';

    function isHubPage() {
        return /rayenz-akusiom\.github\.io\/rayenz-akusiom/i.test(location.href) ||
            /^https?:\/\/localhost(:\d+)?\//i.test(location.href) ||
            /^https?:\/\/127\.0\.0\.1(:\d+)?\//i.test(location.href);
    }

    function applyStorageKey(deckId) {
        return APPLY_STORAGE_PREFIX + deckId;
    }

    function buildCategorySettings(rawDeck) {
        var map = {};
        (rawDeck.categories || []).forEach(function (cat) {
            if (!cat || !cat.name) {
                return;
            }
            map[cat.name] = {
                includedInDeck: cat.includedInDeck !== false,
                includedInPrice: cat.includedInPrice !== false
            };
        });
        return map;
    }

    function buildSnapshot(rawDeck) {
        var cards = [];
        (rawDeck.cards || []).forEach(function (entry) {
            if (entry.deletedAt) {
                return;
            }
            var cats = entry.categories || [];
            var primary = cats.length ? cats[0] : null;
            var oracle = entry.card && entry.card.oracleCard;
            var name = oracle && oracle.name;
            if (!name) {
                return;
            }
            var edition = (entry.card && entry.card.edition) || {};
            var setCode = edition.editioncode || edition.editionCode;
            cards.push({
                name: name,
                quantity: entry.quantity || 1,
                set_code: setCode ? String(setCode).toLowerCase() : null,
                collector_number: entry.card.collectorNumber != null ? String(entry.card.collectorNumber) : null,
                primary_category: primary,
                categories: cats,
                archidekt_uid: entry.uid || null
            });
        });
        return {
            fetched_at: new Date().toISOString().slice(0, 10),
            cards: cards,
            category_settings: buildCategorySettings(rawDeck)
        };
    }

    function fetchDeckSnapshot(deckId) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: ARCHIDEKT_API + '/decks/' + deckId + '/',
                headers: {
                    Accept: 'application/json',
                    'User-Agent': USER_AGENT
                },
                onload: function (resp) {
                    if (resp.status < 200 || resp.status >= 300) {
                        reject(new Error('Archidekt API ' + resp.status + ' for deck ' + deckId));
                        return;
                    }
                    try {
                        var raw = JSON.parse(resp.responseText);
                        resolve(buildSnapshot(raw));
                    } catch (err) {
                        reject(err);
                    }
                },
                onerror: function () {
                    reject(new Error('Archidekt request failed for deck ' + deckId));
                }
            });
        });
    }

    function stageApply(deckId, importText) {
        if (!deckId || !importText) {
            throw new Error('Missing deck id or import text');
        }
        var payload = {
            import_text: importText,
            import_mode: 'full_deck_replace',
            created_at: new Date().toISOString()
        };
        try {
            GM_setValue(applyStorageKey(deckId), JSON.stringify(payload));
        } catch (err) {
            throw new Error('Could not stage apply. Use Copy full deck import on tablet instead.');
        }
    }

    function getStagedApply(deckId) {
        try {
            var raw = GM_getValue(applyStorageKey(deckId), null);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function clearStagedApply(deckId) {
        try {
            GM_deleteValue(applyStorageKey(deckId));
        } catch (e) {
            /* ignore */
        }
    }

    function installHubBridge() {
        unsafeWindow.RayenzArchidektBridge = {
            isAvailable: true,
            canApply: true,
            fetchDeckSnapshot: fetchDeckSnapshot,
            stageApply: stageApply,
            clearStagedApply: clearStagedApply,
            APPLY_STORAGE_PREFIX: APPLY_STORAGE_PREFIX
        };
    }

    GM_addStyle(
        '#' + BANNER_ID + ' { position: fixed; bottom: 16px; right: 16px; z-index: 99999; ' +
        'background: #1a202c; color: #e2e8f0; border-radius: 10px; padding: 12px 14px; width: min(360px, 92vw); ' +
        'box-shadow: 0 4px 20px rgba(0,0,0,0.35); font: 13px/1.45 system-ui, sans-serif; }' +
        '#' + BANNER_ID + ' h4 { margin: 0 0 6px; font-size: 14px; }' +
        '#' + BANNER_ID + ' p { margin: 0 0 10px; color: #a0aec0; font-size: 12px; }' +
        '#' + BANNER_ID + ' button { margin-right: 6px; padding: 6px 10px; ' +
        'border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; }' +
        '#' + BANNER_ID + ' .primary { background: #2b6cb0; color: #fff; }' +
        '#' + BANNER_ID + ' .ghost { background: #4a5568; color: #fff; }' +
        '#' + BANNER_ID + ' .status { margin-top: 8px; font-size: 12px; color: #a0aec0; min-height: 1.2em; }'
    );

    function deckIdFromUrl() {
        var m = location.pathname.match(/\/decks\/(\d+)/);
        return m ? parseInt(m[1], 10) : null;
    }

    function findImportTextarea() {
        return document.querySelector(
            'textarea[placeholder*="Import"], textarea.import-textarea, .import-modal textarea, textarea'
        );
    }

    function clickByText(selector, text) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            if ((nodes[i].textContent || '').trim().toLowerCase().indexOf(text) !== -1) {
                nodes[i].click();
                return true;
            }
        }
        return false;
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    async function openImportAndPaste(text) {
        if (!clickByText('button, a, [role="button"]', 'import')) {
            throw new Error('Import button not found. Open Import manually, then click Apply import again.');
        }
        await sleep(500);

        var ta = findImportTextarea();
        if (!ta) {
            throw new Error('Import textarea not found. Open Import manually, then click Apply import again.');
        }
        ta.focus();
        ta.value = text;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function setBannerStatus(msg) {
        var el = document.querySelector('#' + BANNER_ID + ' .status');
        if (el) {
            el.textContent = msg || '';
        }
    }

    function removeBanner() {
        var el = document.getElementById(BANNER_ID);
        if (el) {
            el.remove();
        }
    }

    function buildApplyBanner(deckId, staged) {
        removeBanner();
        var banner = document.createElement('div');
        banner.id = BANNER_ID;
        var lineCount = (staged.import_text || '').split('\n').filter(function (l) { return l.trim(); }).length;
        banner.innerHTML =
            '<h4>Pending update from Rayenz Hub</h4>' +
            '<p>Full deck replace (' + lineCount + ' lines). Confirm Save Changes in Archidekt after import.</p>' +
            '<button type="button" class="primary" id="rayenz-apply-import">Apply import</button>' +
            '<button type="button" class="ghost" id="rayenz-dismiss-apply">Dismiss</button>' +
            '<div class="status"></div>';
        document.body.appendChild(banner);

        document.getElementById('rayenz-dismiss-apply').addEventListener('click', function () {
            clearStagedApply(deckId);
            removeBanner();
        });

        document.getElementById('rayenz-apply-import').addEventListener('click', async function () {
            var btn = document.getElementById('rayenz-apply-import');
            btn.disabled = true;
            setBannerStatus('Opening Import…');
            try {
                await openImportAndPaste(staged.import_text);
                setBannerStatus('Pasted import text. Choose Replace deck if prompted, then Save Changes.');
            } catch (err) {
                setBannerStatus(err.message || String(err));
                btn.disabled = false;
            }
        });
    }

    function checkPendingApply() {
        var deckId = deckIdFromUrl();
        if (!deckId) {
            return;
        }
        var staged = getStagedApply(deckId);
        if (!staged || !staged.import_text) {
            removeBanner();
            return;
        }
        buildApplyBanner(deckId, staged);
    }

    function installArchidektListeners() {
        window.addEventListener('pageshow', checkPendingApply);
        window.addEventListener('focus', checkPendingApply);
    }

    if (isHubPage()) {
        installHubBridge();
    } else {
        checkPendingApply();
        installArchidektListeners();
    }
})();
