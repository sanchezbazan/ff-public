/* ================================================
   bugs_app.js
   Fetches bug records from QuickBase and renders
   the bugs table + stat cards.

   Table ID : bvxc9t2rh
   Field 7  : Affected System  (multi-select)
   Field 8  : Description/Issue (long text)

   Add more field IDs to the `select` array and
   the renderRow() function as your table grows.
   ================================================ */

(function () {

    var TABLE_ID   = "bvxc9t2rh";
    var REALM      = "team.quickbase.com";

    /* Fields to pull from QuickBase.
       3  = Record ID (built-in)
       7  = Affected System
       8  = Description/Issue
       Add more here, e.g. date created = field 6  */
    var QUERY_BODY = {
        from: TABLE_ID,
        select: [3, 7, 8],
        sortBy: [{ fieldId: 3, order: "DESC" }]
    };

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

            var auth = JSON.parse(xhr.responseText);
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
                renderBugs(data.data || []);
            })
            .catch(function (err) {
                console.error("bugs_app.js — query failed:", err);
                showError();
            });
        };

        xhr.send();
    }

    /* ─── Render table rows ─── */
    function renderBugs(records) {
        var tbody = document.getElementById("bug-table-body");
        if (!tbody) return;

        updateStats(records);

        if (!records.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="bugs-empty">' +
                '<div style="font-size:24px;margin-bottom:8px;">&#128030;</div>' +
                '<p>No bugs reported yet. Nice work.</p>' +
                '</td></tr>';
            return;
        }

        tbody.innerHTML = "";

        records.forEach(function (rec, idx) {
            var id          = rec["3"]  ? rec["3"].value  : "—";
            var systems     = rec["7"]  ? rec["7"].value  : [];   /* array for multi-select */
            var description = rec["8"]  ? rec["8"].value  : "—";

            /* QB multi-select can return a string or array depending on version */
            if (typeof systems === "string") {
                systems = systems.split(";").map(function (s) { return s.trim(); });
            }
            if (!Array.isArray(systems)) systems = [systems];

            var systemPills = systems
                .filter(Boolean)
                .map(function (s) { return '<span class="system-pill">' + escHtml(s) + '</span>'; })
                .join("");

            var row = document.createElement("tr");
            row.setAttribute("data-id", id);

            row.innerHTML =
                '<td class="bug-id">#' + id + '</td>' +
                '<td class="bug-desc-cell" title="' + escHtml(description) + '">' +
                    escHtml(truncate(description, 80)) +
                '</td>' +
                '<td><div class="system-pills">' + (systemPills || '<span class="system-pill">—</span>') + '</div></td>' +
                '<td>—</td>' +   /* Severity placeholder — add field ID when available */
                '<td>—</td>' +   /* Status placeholder   — add field ID when available */
                '<td style="color:var(--text-muted);font-size:12px;font-family:var(--font-mono)">—</td>';

            tbody.appendChild(row);
        });

        /* Re-apply any active filter */
        applyActiveFilter();
    }

    /* ─── Stat cards ─── */
    function updateStats(records) {
        var total = records.length;
        safeText("bug-total",       total);
        safeText("bug-table-count", total);
        /* Placeholders — wire up once you have severity/status field IDs */
        safeText("bug-open",     "—");
        safeText("bug-critical", "—");
        safeText("bug-high",     "—");
        safeText("bug-medium",   "—");
        safeText("bug-resolved", "—");
    }

    /* ─── Filter chips ─── */
    function applyActiveFilter() {
        var active = document.querySelector(".filter-chip.active");
        if (!active) return;
        /* Filtering by severity/status needs those field IDs first.
           For now the chips are wired up structurally — add logic here
           once severity (field ID TBD) is included in QUERY_BODY. */
    }

    document.addEventListener("click", function (e) {
        var chip = e.target.closest(".filter-chip");
        if (!chip) return;
        document.querySelectorAll(".filter-chip").forEach(function (c) {
            c.classList.remove("active");
        });
        chip.classList.add("active");
        applyActiveFilter();
    });

    /* ─── Error state ─── */
    function showError() {
        var tbody = document.getElementById("bug-table-body");
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="bugs-empty">' +
            '<div style="font-size:20px;margin-bottom:8px;color:var(--color-critical)">&#9888;</div>' +
            '<p>Failed to load bug records. Check the console.</p>' +
            '</td></tr>';
    }

    /* ─── Helpers ─── */
    function escHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function truncate(str, n) {
        return str.length > n ? str.slice(0, n) + "…" : str;
    }

    function safeText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    /* ─── Kick off ─── */
    loadBugs();

    /* Expose so main page can call it after a new bug is added */
    window.loadBugs = loadBugs;

})();
