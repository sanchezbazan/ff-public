/* ================================================
   bugs_app.js
   Fetches + renders bug records from QuickBase.

   Table ID  : bvxc9t2rh
   Field 6   : Date Reported
   Field 7   : Affected System  (multi-select)
   Field 8   : Description/Issue (long text)
   Field 9   : Define Other      (text)
   Field 11  : Status
   Field 12  : Severity
   ================================================ */

(function () {

    var TABLE_ID = "bvxc9t2rh";
    var REALM    = "team.quickbase.com";

    var QUERY_BODY = {
        from: TABLE_ID,
        select: [3, 6, 7, 8, 9, 11, 12],
        sortBy: [{ fieldId: 3, order: "DESC" }]
    };

    /* Current active filters */
    var activeStatus   = "all";
    var activeSeverity = "all";

    /* Full record cache so filters don't need a re-fetch */
    var allRecords = [];

    /* ─── Auth → Query ─── */
    function loadBugs() {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://api.quickbase.com/v1/auth/temporary/" + TABLE_ID, true);
        xhr.setRequestHeader("QB-Realm-Hostname", REALM);
        xhr.setRequestHeader("QB-App-Token", "{QB-App-Token}");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.withCredentials = true;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== XMLHttpRequest.DONE) return;

            var auth  = JSON.parse(xhr.responseText);
            var token = auth.temporaryAuthorization;

            fetch("https://api.quickbase.com/v1/records/query", {
                method: "POST",
                headers: {
                    "QB-Realm-Hostname": REALM,
                    "Authorization":     "QB-TEMP-TOKEN " + token,
                    "Content-Type":      "application/json"
                },
                body: JSON.stringify(QUERY_BODY)
            })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                allRecords = data.data || [];
                updateStats(allRecords);
                renderTable(allRecords);
            })
            .catch(function (err) {
                console.error("bugs_app.js — query failed:", err);
                showError();
            });
        };

        xhr.send();
    }

    /* ─── Stat cards ─── */
    function updateStats(records) {
        var total    = records.length;
        var open     = records.filter(function (r) { return isOpen(r); }).length;
        var resolved = records.filter(function (r) { return isResolved(r); }).length;
        var critical = records.filter(function (r) { return getSeverity(r) === "Critical"; }).length;
        var high     = records.filter(function (r) { return getSeverity(r) === "High"; }).length;
        var medium   = records.filter(function (r) {
            var s = getSeverity(r);
            return s === "Medium" || s === "Low";
        }).length;

        safeText("bug-total",       total);
        safeText("bug-table-count", total);
        safeText("bug-open",        open);
        safeText("bug-resolved",    resolved);
        safeText("bug-critical",    critical);
        safeText("bug-high",        high);
        safeText("bug-medium",      medium);
    }

    /* ─── Render table (respects active filters) ─── */
    function renderTable(records) {
        var filtered = records.filter(function (r) {
            var statusMatch   = true;
            var severityMatch = true;

            if (activeStatus !== "all") {
                var s = (getStatus(r) || "").toLowerCase().replace(/\s+/g, "-");
                statusMatch = s === activeStatus;
            }

            if (activeSeverity !== "all") {
                var sev = (getSeverity(r) || "").toLowerCase();
                severityMatch = sev === activeSeverity;
            }

            return statusMatch && severityMatch;
        });

        var tbody = document.getElementById("bug-table-body");
        if (!tbody) return;

        /* Update badge to reflect filtered count */
        safeText("bug-table-count", filtered.length);

        if (!filtered.length) {
            tbody.innerHTML =
                '<tr><td colspan="6" class="bugs-empty">' +
                '<div style="font-size:24px;margin-bottom:8px;">&#128030;</div>' +
                '<p>No bugs match the current filter.</p>' +
                '</td></tr>';
            return;
        }

        tbody.innerHTML = "";

        filtered.forEach(function (rec) {
            var id          = val(rec, 3);
            var dateRaw     = val(rec, 6);
            var systems     = val(rec, 7);
            var description = val(rec, 8);
            var defineOther = val(rec, 9);
            var status      = val(rec, 11);
            var severity    = val(rec, 12);

            /* Multi-select: QB can return array or semicolon-delimited string */
            if (typeof systems === "string") {
                systems = systems.split(";").map(function (s) { return s.trim(); });
            }
            if (!Array.isArray(systems)) systems = systems ? [systems] : [];

            /* If Other was selected and there's a defineOther value, replace
               the "Other" entry with the actual text for display */
            var displaySystems = systems.map(function (s) {
                return (s === "Other" && defineOther) ? defineOther : s;
            });

            var systemPills = displaySystems
                .filter(Boolean)
                .map(function (s) {
                    return '<span class="system-pill">' + escHtml(s) + '</span>';
                })
                .join("");

            /* Format date */
            var dateDisplay = formatDate(dateRaw);

            /* Badge classes */
            var sevClass    = severityClass(severity);
            var statClass   = statusClass(status);

            var row = document.createElement("tr");
            row.setAttribute("data-id", id);
            row.setAttribute("data-status",   (status   || "").toLowerCase().replace(/\s+/g, "-"));
            row.setAttribute("data-severity", (severity || "").toLowerCase());

            row.innerHTML =
                '<td class="bug-id">#' + escHtml(String(id)) + '</td>' +
                '<td class="bug-desc-cell" title="' + escHtml(description) + '">' +
                    escHtml(truncate(description, 75)) +
                '</td>' +
                '<td><div class="system-pills">' +
                    (systemPills || '<span class="system-pill">—</span>') +
                '</div></td>' +
                '<td>' +
                    (severity
                        ? '<span class="badge ' + sevClass + '">' + escHtml(severity) + '</span>'
                        : '<span style="color:var(--text-muted)">—</span>') +
                '</td>' +
                '<td>' +
                    (status
                        ? '<span class="badge ' + statClass + '">' + escHtml(status) + '</span>'
                        : '<span style="color:var(--text-muted)">—</span>') +
                '</td>' +
                '<td style="color:var(--text-muted);font-size:12px;font-family:var(--font-mono);white-space:nowrap;">' +
                    escHtml(dateDisplay) +
                '</td>';

            tbody.appendChild(row);
        });
    }

    /* ─── Filter chip wiring ─── */
    document.addEventListener("click", function (e) {
        var chip = e.target.closest(".filter-chip");
        if (!chip) return;

        var filter = chip.dataset.filter;
        var isSev  = chip.classList.contains("sev");

        if (isSev) {
            /* Severity chip: toggle off if already active */
            if (activeSeverity === filter) {
                activeSeverity = "all";
                chip.classList.remove("active");
            } else {
                document.querySelectorAll(".filter-chip.sev").forEach(function (c) {
                    c.classList.remove("active");
                });
                activeSeverity = filter;
                chip.classList.add("active");
            }
        } else {
            /* Status chip */
            document.querySelectorAll(".filter-chip:not(.sev)").forEach(function (c) {
                c.classList.remove("active");
            });
            chip.classList.add("active");
            activeStatus = filter;
        }

        renderTable(allRecords);
    });

    /* ─── Helpers ─── */
    function val(rec, fid) {
        return rec[String(fid)] ? rec[String(fid)].value : null;
    }

    function getStatus(rec)   { return val(rec, 11) || ""; }
    function getSeverity(rec) { return val(rec, 12) || ""; }

    function isOpen(rec) {
        var s = getStatus(rec).toLowerCase();
        return s === "open" || s === "reported" || s === "in progress" || s === "in-progress";
    }

    function isResolved(rec) {
        var s = getStatus(rec).toLowerCase();
        return s === "resolved" || s === "closed" || s === "done";
    }

    function severityClass(s) {
        if (!s) return "";
        var map = {
            "critical": "priority-critical",
            "high":     "priority-high",
            "medium":   "priority-medium",
            "low":      "priority-low"
        };
        return map[(s || "").toLowerCase()] || "status-new";
    }

    function statusClass(s) {
        if (!s) return "";
        var map = {
            "open":        "status-reported",
            "reported":    "status-reported",
            "in progress": "status-in-progress",
            "in-progress": "status-in-progress",
            "review":      "status-review",
            "resolved":    "status-completed",
            "closed":      "status-completed",
            "done":        "status-completed"
        };
        return map[(s || "").toLowerCase()] || "status-new";
    }

    function formatDate(raw) {
        if (!raw) return "—";
        try {
            var d = new Date(raw);
            return d.toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric"
            });
        } catch (e) { return raw; }
    }

    function truncate(str, n) {
        if (!str) return "—";
        return str.length > n ? str.slice(0, n) + "…" : str;
    }

    function escHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function safeText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function showError() {
        var tbody = document.getElementById("bug-table-body");
        if (!tbody) return;
        tbody.innerHTML =
            '<tr><td colspan="6" class="bugs-empty">' +
            '<div style="font-size:20px;margin-bottom:8px;color:var(--color-critical)">&#9888;</div>' +
            '<p>Failed to load bug records. Check the console.</p>' +
            '</td></tr>';
    }

    /* ─── Kick off + expose for post-submit refresh ─── */
    loadBugs();
    window.loadBugs = loadBugs;

})();
