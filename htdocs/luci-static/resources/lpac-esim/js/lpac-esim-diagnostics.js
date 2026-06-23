/* lpac-esim-diagnostics.js — v1.3.6 */
'use strict';

function loadRunlog() {
    var el = document.getElementById('diag-log');
    if (!el) return;
    el.textContent = 'Loading system check...';
    var btn = document.getElementById('btn-runlog');
    apiGet('runlog')
        .then(function(data) {
            if (data && data.payload && data.payload.code === 0 && data.payload.data) {
                el.textContent = data.payload.data.log || '(empty — run lpac-esim once to generate)';
            } else {
                el.textContent = 'Failed to load system check.';
            }
            if (btn) btn.value = '\u21bb System Check';
        })
        .catch(function(e) { el.textContent = 'Error: ' + (e.message || 'network'); });
}

function loadSyslog() {
    var logDiv = document.getElementById('diag-log');
    if (!logDiv) return;
    logDiv.textContent = 'Loading...';
    var btn = document.getElementById('btn-syslog');

    apiGet('syslog')
        .then(function(data) {
            if (data && data.payload && data.payload.code === 0 && data.payload.data) {
                var log = data.payload.data.log || '(empty log)';
                logDiv.textContent = log;
                logDiv.scrollTop = logDiv.scrollHeight;
            } else {
                logDiv.textContent = 'Failed to load log.';
            }
            if (btn) btn.value = '\u21bb System Log';
        })
        .catch(function(e) {
            logDiv.textContent = 'Error: ' + (e.message || 'network error');
        });
}

function copyLog() {
    var logDiv = document.getElementById('diag-log');
    if (!logDiv) return;
    var text = logDiv.textContent || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showDiagResult('success', 'Log copied to clipboard.');
        }).catch(function() {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showDiagResult('success', 'Log copied to clipboard.');
    } catch (e) {
        showDiagResult('error', 'Copy failed. Select log text manually.');
    }
    document.body.removeChild(ta);
}

function diagAction(endpoint, label) {
    if (!confirm('Execute ' + label + '?\n\nThis will affect modem connectivity.')) return;

    showDiagResult('info', label + ' in progress...');
    appendToLog('[' + new Date().toLocaleTimeString() + '] >>> ' + label + ' requested');

    var promise;
    if (endpoint === 'reboot_modem') {
        promise = apiPost(endpoint, {});
    } else {
        promise = apiPost(endpoint, {});
    }

    promise.then(function(data) {
        if (data && data.payload) {
            if (data.payload.code === 0) {
                var method = '';
                if (data.payload.data && data.payload.data.method) {
                    method = ' (via ' + data.payload.data.method + ')';
                }
                if (data.payload.message === 'processing') {
                    showDiagResult('info', label + ' initiated. Modem is rebooting...');
                    appendToLog('[' + new Date().toLocaleTimeString() + '] ' + label + ' launched in background');
                    startLockPolling(function(result) {
                        if (result && result.success) {
                            showDiagResult('success', result.message || label + ' completed.');
                        } else if (result && !result.success) {
                            showDiagResult('error', result.message || label + ' failed.');
                        } else {
                            showDiagResult('success', label + ' completed.');
                        }
                        appendToLog('[' + new Date().toLocaleTimeString() + '] ' + label + ' finished');
                        setTimeout(loadSyslog, 2000);
                    });
                } else {
                    showDiagResult('success', label + ' completed' + method + '.');
                    appendToLog('[' + new Date().toLocaleTimeString() + '] ' + label + ' OK' + method);
                    setTimeout(loadSyslog, 2000);
                }
            } else {
                var msg = data.payload.message || 'failed';
                if (data.payload.data && data.payload.data.msg) msg += ': ' + data.payload.data.msg;
                showDiagResult('error', label + ' failed: ' + msg);
                appendToLog('[' + new Date().toLocaleTimeString() + '] ' + label + ' FAILED: ' + msg);
            }
        }
    })
    .catch(function(e) {
        showDiagResult('error', label + ' error: ' + (e.message || 'network error'));
        appendToLog('[' + new Date().toLocaleTimeString() + '] ' + label + ' ERROR: ' + (e.message || 'network'));
    });
}

function appendToLog(line) {
    var logDiv = document.getElementById('diag-log');
    if (!logDiv) return;
    logDiv.textContent += '\n' + line;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function showDiagResult(type, msg) {
    var el = document.getElementById('diag-result');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = msg;
    if (type === 'success') {
        el.style.background = '#d4edda'; el.style.color = '#155724'; el.style.borderColor = '#c3e6cb';
    } else if (type === 'error') {
        el.style.background = '#f8d7da'; el.style.color = '#721c24'; el.style.borderColor = '#f5c6cb';
    } else {
        el.style.background = '#d1ecf1'; el.style.color = '#0c5460'; el.style.borderColor = '#bee5eb';
    }
    el.style.border = '1px solid';
}

// Loaded by showTab() on first tab activation

/* ===== AT Terminal ===== */
var atHistory = [];

function toggleAtTerminal() {
    var section = document.getElementById('at-terminal-section');
    var arrow = document.getElementById('at-toggle-arrow');
    if (!section) return;
    if (section.style.display === 'none') {
        section.style.display = '';
        if (arrow) arrow.innerHTML = '&#9660;';
    } else {
        section.style.display = 'none';
        if (arrow) arrow.innerHTML = '&#9654;';
    }
}

function sendAtCmd() {
    var input = document.getElementById('at-cmd-input');
    var term = document.getElementById('at-terminal');
    if (!input || !term) return;

    var cmd = input.value.trim();
    if (!cmd) cmd = 'ATI';

    // Show sending state
    atHistory.push('> ' + cmd);
    atHistory.push('  (sending...)');
    term.textContent = atHistory.join('\n');
    term.scrollTop = term.scrollHeight;

    apiPost('at_cmd', { cmd: cmd })
        .then(function(data) {
            // Remove "(sending...)"
            atHistory.pop();
            if (data && data.payload && data.payload.code === 0 && data.payload.data) {
                var resp = data.payload.data.response || '(no response)';
                var port = data.payload.data.port || '?';
                atHistory.push(resp);
                atHistory.push('  [' + port + ']');
            } else {
                var errMsg = (data && data.payload) ? data.payload.message : 'unknown error';
                atHistory.push('  ERROR: ' + errMsg);
            }
            term.textContent = atHistory.join('\n');
            term.scrollTop = term.scrollHeight;
        })
        .catch(function(e) {
            atHistory.pop();
            atHistory.push('  ERROR: ' + (e.message || 'network'));
            term.textContent = atHistory.join('\n');
            term.scrollTop = term.scrollHeight;
        });

    // Clear input for next command
    input.value = '';
    input.focus();
}

function sendAtPreset(cmd) {
    var input = document.getElementById('at-cmd-input');
    if (input) input.value = cmd;
    sendAtCmd();
}

function clearAtTerminal() {
    atHistory = [];
    var term = document.getElementById('at-terminal');
    if (term) term.textContent = 'Ready. Type an AT command or click Send.';
}

/* ===== Version / Build Info ===== */
function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function driverList(s) {
    return String(s || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean);
}

function backendLooksSupported(backend, drivers) {
    if (!backend) return true;
    var d = driverList(drivers);
    // qmi and uqmi are mutually exclusive between builds but both valid
    if (backend === 'qmi')  return d.indexOf('qmi')  !== -1;
    if (backend === 'uqmi') return d.indexOf('uqmi') !== -1;
    if (backend === 'mbim') return d.indexOf('mbim') !== -1;
    if (backend === 'at')   return d.indexOf('at')   !== -1;
    return true;
}

function loadVersionInfo() {
    var el = document.getElementById('diag-version-info');
    if (!el) return;
    el.innerHTML = 'Loading...';

    apiGet('version')
        .then(function(data) {
            if (!data || !data.payload || data.payload.code !== 0) {
                el.innerHTML = '<span style="color:#721c24">Failed to load version info.</span>';
                return;
            }
            var d = data.payload.data;

            var buildLabel = {
                'official-dynamic':  '<span style="color:#856404;background:#fff3cd;padding:1px 6px;border-radius:3px">Official OpenWrt (dynamic drivers)</span>',
                'custom-native-qmi': '<span style="color:#155724;background:#d4edda;padding:1px 6px;border-radius:3px">Custom build (native QMI / libqmi)</span>',
                'unknown':           '<span style="color:#383d41;background:#e2e3e5;padding:1px 6px;border-radius:3px">Unknown build</span>'
            }[d.lpac_build] || '<span>' + escapeHtml(d.lpac_build || '?') + '</span>';

            // Warn only when current backend is NOT in the available driver list
            var recWarning = '';
            if (!backendLooksSupported(d.backend, d.available_drivers)) {
                recWarning = '<br><span style="color:#856404">&#9888; Backend <b>' +
                    escapeHtml(d.backend || '?') +
                    '</b> may not be supported by this lpac build. Suggested: <b>' +
                    escapeHtml(d.recommended_backend || '?') +
                    '</b>. Check Config tab.</span>';
            }

            el.innerHTML =
                '<table style="border-collapse:collapse;width:100%">' +
                '<tr><td style="padding:3px 8px;color:#666;width:180px">lpac version</td><td style="padding:3px 8px"><b>' + escapeHtml(d.lpac_version || '?') + '</b></td></tr>' +
                '<tr><td style="padding:3px 8px;color:#666">build type</td><td style="padding:3px 8px">' + buildLabel + recWarning + '</td></tr>' +
                '<tr><td style="padding:3px 8px;color:#666">available drivers</td><td style="padding:3px 8px"><code>' + escapeHtml(d.available_drivers || '?') + '</code></td></tr>' +
                '<tr><td style="padding:3px 8px;color:#666">active backend</td><td style="padding:3px 8px"><code>' + escapeHtml(d.backend || '?') + '</code> &nbsp; device: <code>' + escapeHtml(d.device || '?') + '</code></td></tr>' +
                '<tr><td style="padding:3px 8px;color:#666">script version</td><td style="padding:3px 8px"><code>' + escapeHtml(d.script_version || '?') + '</code></td></tr>' +
                '</table>';
        })
        .catch(function(e) {
            el.innerHTML = '<span style="color:#721c24">Error: ' + escapeHtml(e.message || 'network') + '</span>';
        });
}
