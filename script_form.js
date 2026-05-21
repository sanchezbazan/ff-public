/* ================================================
   script_form.js
   Handles the "Add Script" modal:
     - Open / close / Escape
     - Validates category, what-it-does, and code
     - POSTs to QuickBase as a rich text field (field 7)
     - Refreshes the card grid on success

   ⚠️  Replace {SCRIPTS_TABLE_ID} with your real table ID

   Table ID  : {SCRIPTS_TABLE_ID}
   Field 6   : Category     (text multiple choice)
   Field 7   : Calculation  (rich text — wrap in <pre>)
   Field 8   : What It Does (text)
   ================================================ */

window.initScriptForm = function () {

    var TABLE_ID = "{SCRIPTS_TABLE_ID}";
    var REALM    = "team.quickbase.com";

    var modal       = document.getElementById("scriptModal");
    var openBtn     = document.getElementById("open-script-modal-btn");
    var closeBtn    = document.getElementById("closeScriptModal");
    var submitBtn   = document.getElementById("submit-script-btn");
    var catField    = document.getElementById("script-category");
    var whatField   = document.getElementById("script-what");
    var calcField   = document.getElementById("script-calc");
    var errorMsg    = document.getElementById("script-form-error");

    if (!modal || !openBtn) {
        console.warn("script_form.js — modal elements not found.");
        return;
    }

    /* ── Open ── */
    openBtn.addEventListener("click", function () {
        resetForm();
        modal.classList.remove("hidden");
        catField.focus();
    });

    /* ── Close — button ── */
    closeBtn.addEventListener("click", function () {
        modal.classList.add("hidden");
    });

    /* ── Close — backdrop ── */
    modal.addEventListener("click", function (e) {
        if (e.target === modal) modal.classList.add("hidden");
    });

    /* ── Tab key in textarea → insert spaces instead of leaving field ── */
    calcField.addEventListener("keydown", function (e) {
        if (e.key === "Tab") {
            e.preventDefault();
            var start = calcField.selectionStart;
            var end   = calcField.selectionEnd;
            calcField.value =
                calcField.value.slice(0, start) + "  " + calcField.value.slice(end);
            calcField.selectionStart = calcField.selectionEnd = start + 2;
        }
    });

    /* ── Submit ── */
    submitBtn.addEventListener("click", function () {
        var category = catField.value.trim();
        var what     = whatField.value.trim();
        var code     = calcField.value.trim();

        /* Validate */
        if (!category || !what || !code) {
            errorMsg.classList.remove("hidden");
            if (!category) catField.focus();
            else if (!what) whatField.focus();
            else calcField.focus();
            return;
        }
        errorMsg.classList.add("hidden");

        submitBtn.disabled     = true;
        submitBtn.textContent  = "Saving…";

        /* QuickBase rich text field expects HTML.
           Wrap the code in <pre> so line breaks and spacing are preserved. */
        var codeHtml = "<pre>" + escHtml(code) + "</pre>";

        /* Auth → POST */
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

            var payload = {
                to: TABLE_ID,
                data: [{
                    6: { value: category },   /* Category */
                    7: { value: codeHtml },   /* Calculation — rich text */
                    8: { value: what }        /* What It Does */
                }],
                fieldsToReturn: [1, 3, 6, 7, 8]
            };

            fetch("https://api.quickbase.com/v1/records", {
                method: "POST",
                headers: {
                    "QB-Realm-Hostname": REALM,
                    "Authorization":     "QB-TEMP-TOKEN " + token,
                    "Content-Type":      "application/json"
                },
                body: JSON.stringify(payload)
            })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                console.log("Script saved:", data);
                modal.classList.add("hidden");
                resetForm();

                /* Refresh the card grid */
                if (typeof window.loadScripts === "function") {
                    window.loadScripts();
                }
            })
            .catch(function (err) {
                console.error("script_form.js — submit failed:", err);
                errorMsg.textContent = "Save failed. Please try again.";
                errorMsg.classList.remove("hidden");
            })
            .finally(function () {
                submitBtn.disabled    = false;
                submitBtn.textContent = "Save Script";
            });
        };

        xhr.send();
    });

    /* ── Reset ── */
    function resetForm() {
        catField.value  = "";
        whatField.value = "";
        calcField.value = "";
        errorMsg.classList.add("hidden");
        errorMsg.textContent  = "Please fill in all fields before submitting.";
        submitBtn.disabled    = false;
        submitBtn.textContent = "Save Script";
    }

    /* ── Helpers ── */
    function escHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

};
