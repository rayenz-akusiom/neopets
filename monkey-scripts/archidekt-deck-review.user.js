// ==UserScript==
// @name         Archidekt Deck Review Bridge
// @namespace    rayenz.hub.deck-review
// @version      2026-06-21.2
// @description  CORS bridge for Rayenz Hub deck snapshots; applies apply manifests on Archidekt deck pages.
// @author       rayenz-akusiom
// @match        https://archidekt.com/decks/*
// @match        https://rayenz-akusiom.github.io/rayenz-akusiom/*
// @match        http://localhost/*
// @match        http://localhost:*/*
// @match        http://127.0.0.1/*
// @match        http://127.0.0.1:*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    var PANEL_ID = 'rayenz-archidekt-bridge';
    var ARCHIDEKT_API = 'https://archidekt.com/api';
    var USER_AGENT = 'rayenz-hub-bridge/1.0';

    function isHubPage() {
        return /rayenz-akusiom\.github\.io\/rayenz-akusiom/i.test(location.href) ||
            /^https?:\/\/localhost(:\d+)?\//i.test(location.href) ||
            /^https?:\/\/127\.0\.0\.1(:\d+)?\//i.test(location.href);
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
            cards: cards
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

    function installHubBridge() {
        unsafeWindow.RayenzArchidektBridge = {
            isAvailable: true,
            fetchDeckSnapshot: fetchDeckSnapshot
        };
    }

    GM_addStyle(
        '#' + PANEL_ID + ' { position: fixed; bottom: 16px; right: 16px; z-index: 99999; ' +
        'background: #1a202c; color: #e2e8f0; border-radius: 10px; padding: 12px; width: min(360px, 92vw); ' +
        'box-shadow: 0 4px 20px rgba(0,0,0,0.35); font: 13px/1.4 system-ui, sans-serif; }' +
        '#' + PANEL_ID + ' h4 { margin: 0 0 8px; font-size: 14px; }' +
        '#' + PANEL_ID + ' textarea { width: 100%; height: 90px; font: 11px monospace; ' +
        'border-radius: 6px; border: 1px solid #4a5568; padding: 6px; box-sizing: border-box; }' +
        '#' + PANEL_ID + ' button { margin-top: 8px; margin-right: 6px; padding: 6px 10px; ' +
        'border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }' +
        '#' + PANEL_ID + ' .primary { background: #2b6cb0; color: #fff; }' +
        '#' + PANEL_ID + ' .ghost { background: #4a5568; color: #fff; }' +
        '#' + PANEL_ID + ' .status { margin-top: 8px; font-size: 12px; color: #a0aec0; }'
    );

    function deckIdFromUrl() {
        var m = location.pathname.match(/\/decks\/(\d+)/);
        return m ? parseInt(m[1], 10) : null;
    }

    function formatLine(qty, name, setCode, collector, category) {
        var line = qty + 'x ' + name;
        if (setCode && collector) {
            line += ' (' + String(setCode).toLowerCase() + ') ' + collector;
        } else if (setCode) {
            line += ' (' + String(setCode).toLowerCase() + ')';
        }
        if (category) {
            line += ' `' + category + '`';
        }
        return line;
    }

    function importTextFromOperations(ops) {
        var lines = [];
        (ops || []).forEach(function (op) {
            if (op.swap_categories === false) {
                return;
            }
            var qty = op.quantity || 1;
            if (op.card_in && op.card_in.name) {
                lines.push(formatLine(qty, op.card_in.name, op.card_in.set_code, op.card_in.collector_number, 'New Set In'));
            }
            if (op.card_out && op.card_out.name) {
                lines.push(formatLine(op.card_out.quantity || qty, op.card_out.name, op.card_out.set_code, op.card_out.collector_number, 'New Set Out'));
            }
        });
        return lines.join('\n');
    }

    function findImportTextarea() {
        return document.querySelector('textarea[placeholder*="Import"], textarea.import-textarea, .import-modal textarea, textarea');
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
        clickByText('button, a, [role="button"]', 'import');
        await sleep(400);

        var ta = findImportTextarea();
        if (!ta) {
            throw new Error('Import textarea not found. Open Import manually, then click Paste Import Text.');
        }
        ta.focus();
        ta.value = text;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));

        await sleep(200);
        if (!clickByText('button', 'save')) {
            clickByText('button', 'save changes');
        }
    }

    function setStatus(msg) {
        var el = document.querySelector('#' + PANEL_ID + ' .status');
        if (el) {
            el.textContent = msg;
        }
    }

    function parseManifest(raw) {
        var data = JSON.parse(raw);
        if (!data.decks || !Array.isArray(data.decks)) {
            throw new Error('Manifest needs decks[] array');
        }
        return data;
    }

    function opsForCurrentDeck(manifest) {
        var deckId = deckIdFromUrl();
        if (!deckId) {
            throw new Error('Not on a deck page');
        }
        var entry = manifest.decks.find(function (d) {
            return d.archidekt_deck_id === deckId;
        });
        if (!entry) {
            throw new Error('No operations for deck ' + deckId + ' in manifest');
        }
        return entry.operations || [];
    }

    function buildPanel() {
        if (document.getElementById(PANEL_ID)) {
            return;
        }
        var panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.innerHTML =
            '<h4>Rayenz Deck Review</h4>' +
            '<textarea id="rayenz-manifest" placeholder="Paste apply manifest JSON from Rayenz Hub"></textarea>' +
            '<button type="button" class="primary" id="rayenz-apply-import">Apply via Import</button>' +
            '<button type="button" class="ghost" id="rayenz-copy-import">Copy Import Text</button>' +
            '<div class="status">Deck ID: ' + (deckIdFromUrl() || '?') + '</div>';
        document.body.appendChild(panel);

        document.getElementById('rayenz-copy-import').addEventListener('click', function () {
            try {
                var manifest = parseManifest(document.getElementById('rayenz-manifest').value);
                var text = importTextFromOperations(opsForCurrentDeck(manifest));
                navigator.clipboard.writeText(text);
                setStatus('Import text copied (' + text.split('\n').length + ' lines).');
            } catch (err) {
                setStatus(err.message);
            }
        });

        document.getElementById('rayenz-apply-import').addEventListener('click', async function () {
            try {
                var manifest = parseManifest(document.getElementById('rayenz-manifest').value);
                var text = importTextFromOperations(opsForCurrentDeck(manifest));
                if (!text.trim()) {
                    throw new Error('No import lines for this deck');
                }
                setStatus('Opening Import…');
                await openImportAndPaste(text);
                setStatus('Pasted import text. Confirm Save Changes in Archidekt if needed.');
            } catch (err) {
                setStatus(err.message);
            }
        });
    }

    if (isHubPage()) {
        installHubBridge();
    } else {
        buildPanel();
    }
})();
