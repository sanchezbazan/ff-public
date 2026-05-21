/* ================================================
   scripts_app.js
   Fetches script records from QuickBase and
   renders the card grid with live search + filters.

   ⚠️  Replace {SCRIPTS_TABLE_ID} with your real table ID

   Table ID  : {SCRIPTS_TABLE_ID}
   Field 1   : Date Created
   Field 3   : Record ID
   Field 6   : Category         (text multiple choice)
   Field 7   : Calculation      (rich text — JS code)
   Field 8   : What It Does     (text)
   ================================================ */

(function () {

    var TABLE_ID = "{SCRIPTS_TABLE_ID}";
    var REALM    = "team.quickbase.com";

    var QUERY_BODY = {
        from: TABLE_ID,
        select: [1, 3, 6, 7, 8],
        sortBy: [{ fieldId: 1, order: "DESC" }]
    };

    /* State */
    var allScripts  = [];
    var activeQuery = "";
    var activeCat   = "all";

    /* ─── Auth → Query ─── */
    function loadScripts() {
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
                allScripts = (data.data || []).map(parseRecord);
                updateStats(allScripts);
                renderCards(allScripts);
            })
            .catch(function (err) {
                console.error("scripts_app.js — query failed:", err);
                showError();
            });
        };

        xhr.send();
    }

    /* ─── Parse a raw QB record into a clean object ─── */
    function parseRecord(rec) {
        /* QB Rich Text fields return HTML — strip tags for searching
           but keep raw HTML for display fallback */
        var calcRaw  = val(rec, 7) || "";
        var calcText = stripHtml(calcRaw);

        return {
            id:       val(rec, 3) || "",
            date:     val(rec, 1) || "",
            category: val(rec, 6) || "Other",
            code:     calcText,         /* plain text for display + search */
            codeRaw:  calcRaw,          /* original value */
            what:     val(rec, 8) || ""
        };
    }

    /* ─── Stats ─── */
    function updateStats(scripts) {
        safeText("script-total",  scripts.length);
        safeText("script-showing", scripts.length);
        safeText("script-ff",    scripts.filter(function (s) { return s.category === "FF UNIQUE SCRIPTS"; }).length);
        safeText("script-fr",    scripts.filter(function (s) { return s.category === "Field Rules"; }).length);
        safeText("script-other", scripts.filter(function (s) { return s.category === "Other"; }).length);
    }

    /* ─── Filter + search → render ─── */
    function applyFilters() {
        var q = activeQuery.toLowerCase().trim();

        var filtered = allScripts.filter(function (s) {
            /* Category filter */
            var catMatch = activeCat === "all" ||
                s.category === activeCat;

            /* Search: matches what-it-does, category, or code */
            var searchMatch = !q ||
                s.what.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q) ||
                s.code.toLowerCase().includes(q);

            return catMatch && searchMatch;
        });

        safeText("script-showing", filtered.length);
        renderCards(filtered, q);
    }

    /* ─── Render card grid ─── */
    function renderCards(scripts, query) {
        var grid  = document.getElementById("script-cards-grid");
        var empty = document.getElementById("scripts-empty");
        var msg   = document.getElementById("scripts-empty-msg");
        if (!grid) return;

        grid.innerHTML = "";

        if (!scripts.length) {
            empty.classList.remove("hidden");
            msg.textContent = query
                ? 'No scripts match "' + query + '".'
                : "No scripts documented yet. Add one above.";
            return;
        }

        empty.classList.add("hidden");

        scripts.forEach(function (s) {
            var card = document.createElement("div");
            card.className = "script-card";
            card.setAttribute("data-id", s.id);

            var catClass  = catBadgeClass(s.category);
            var dateStr   = formatDate(s.date);

            /* Highlight search terms in what-it-does */
            var whatHl = query ? highlight(escHtml(s.what), query) : escHtml(s.what);

            /* Code preview — first 4 lines */
            var previewLines = s.code.split("\n").slice(0, 4).join("\n");
            var codeHl = query ? highlight(escHtml(previewLines), query) : escHtml(previewLines);

            card.innerHTML =
                '<div class="card-top-bar">' +
                    '<span class="card-cat-badge ' + catClass + '">' + escHtml(s.category) + '</span>' +
                    '<span class="card-date">' + escHtml(dateStr) + '</span>' +
                '</div>' +
                '<div class="card-body-section">' +
                    '<p class="card-what">' + (whatHl || '<span style="color:var(--text-muted)">No description</span>') + '</p>' +
                '</div>' +
                '<div class="card-code-preview">' + (codeHl || '<span style="color:var(--text-muted)">No code stored</span>') + '</div>' +
                '<div class="card-footer-actions">' +
                    '<span class="card-record-id">#' + escHtml(String(s.id)) + '</span>' +
                    '<div class="card-actions-row">' +
                        '<button class="copy-btn" data-code="' + escAttr(s.code) + '">&#128203; Copy</button>' +
                        '<button class="view-btn" data-id="' + s.id + '">&#128196; View</button>' +
                    '</div>' +
                '</div>';

            /* Copy button */
            card.querySelector(".copy-btn").addEventListener("click", function (e) {
                e.stopPropagation();
                copyToClipboard(s.code, e.currentTarget);
            });

            /* View button + click card body */
            card.querySelector(".view-btn").addEventListener("click", function (e) {
                e.stopPropagation();
                openViewModal(s);
            });
            card.addEventListener("click", function () { openViewModal(s); });

            grid.appendChild(card);
        });
    }

    /* ─── View modal ─── */
    function openViewModal(s) {
        var modal    = document.getElementById("scriptViewModal");
        var catBadge = document.getElementById("view-category-badge");
        var title    = document.getElementById("view-modal-title");
        var whatEl   = document.getElementById("view-what-it-does");
        var codeEl   = document.getElementById("view-code-block");
        var copyBtn  = document.getElementById("copy-modal-btn");

        catBadge.textContent  = s.category;
        catBadge.className    = "badge card-cat-badge " + catBadgeClass(s.category);
        title.textContent     = "#" + s.id + " · " + formatDate(s.date);
        whatEl.textContent    = s.what || "No description provided.";
        codeEl.textContent    = s.code || "// No code stored.";

        /* Reset copy button */
        copyBtn.textContent = "📋 Copy";
        copyBtn.className   = "copy-btn-modal";

        copyBtn.onclick = function () {
            copyToClipboard(s.code, copyBtn);
        };

        modal.classList.remove("hidden");
    }

    /* ─── Copy to clipboard ─── */
    function copyToClipboard(text, btn) {
        navigator.clipboard.writeText(text).then(function () {
            var original = btn.innerHTML;
            btn.innerHTML = "&#10003; Copied!";
            btn.classList.add("copied");
            setTimeout(function () {
                btn.innerHTML = original.includes("Copy") ? original : "📋 Copy";
                btn.classList.remove("copied");
            }, 2000);
        }).catch(function () {
            /* Fallback for older browsers */
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity  = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            btn.innerHTML = "&#10003; Copied!";
            btn.classList.add("copied");
            setTimeout(function () {
                btn.innerHTML = "📋 Copy";
                btn.classList.remove("copied");
            }, 2000);
        });
    }

    /* ─── Search wiring ─── */
    var searchInput = document.getElementById("script-search");
    var clearBtn    = document.getElementById("search-clear-btn");

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            activeQuery = searchInput.value;
            clearBtn.classList.toggle("hidden", !activeQuery);
            applyFilters();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", function () {
            searchInput.value = "";
            activeQuery = "";
            clearBtn.classList.add("hidden");
            searchInput.focus();
            applyFilters();
        });
    }

    /* ─── Category filter chips ─── */
    document.addEventListener("click", function (e) {
        var chip = e.target.closest(".script-filter-bar .filter-chip");
        if (!chip) return;
        document.querySelectorAll(".script-filter-bar .filter-chip").forEach(function (c) {
            c.classList.remove("active");
        });
        chip.classList.add("active");
        activeCat = chip.dataset.cat;
        applyFilters();
    });

    /* ─── View modal close ─── */
    document.addEventListener("click", function (e) {
        var closeBtn = document.getElementById("closeScriptViewModal");
        var modal    = document.getElementById("scriptViewModal");
        if (!modal) return;
        if ((closeBtn && e.target === closeBtn) || e.target === modal) {
            modal.classList.add("hidden");
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            var vm = document.getElementById("scriptViewModal");
            var sm = document.getElementById("scriptModal");
            if (vm && !vm.classList.contains("hidden")) vm.classList.add("hidden");
            if (sm && !sm.classList.contains("hidden")) sm.classList.add("hidden");
        }
    });

    /* ─── Helpers ─── */
    function val(rec, fid) {
        return rec[String(fid)] ? rec[String(fid)].value : null;
    }

    function stripHtml(html) {
        if (!html) return "";
        /* Remove HTML tags, decode common entities */
        return html
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ")
            .replace(/&quot;/g, '"')
            .trim();
    }

    function highlight(text, query) {
        if (!query) return text;
        var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return text.replace(new RegExp("(" + escaped + ")", "gi"), '<span class="hl">$1</span>');
    }

    function catBadgeClass(cat) {
        var map = {
            "Date/Time":       "cat-datetime",
            "Subforms":        "cat-subforms",
            "GPS":             "cat-gps",
            "Math":            "cat-math",
            "Field Rules":     "cat-fieldrules",
            "Lists":           "cat-lists",
            "FF UNIQUE SCRIPTS": "cat-ff",
            "Other":           "cat-other"
        };
        return map[cat] || "cat-other";
    }

    function formatDate(raw) {
        if (!raw) return "—";
        try {
            return new Date(raw).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric"
            });
        } catch (e) { return raw; }
    }

    function escHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function escAttr(str) {
        return String(str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function safeText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function showError() {
        var grid = document.getElementById("script-cards-grid");
        if (!grid) return;
        grid.innerHTML =
            '<div class="scripts-loading" style="color:var(--color-critical)">' +
            '&#9888; Failed to load scripts. Check the console.' +
            '</div>';
    }

    /* ─── Kick off ─── */
    loadScripts();
    window.loadScripts = loadScripts;

})();
