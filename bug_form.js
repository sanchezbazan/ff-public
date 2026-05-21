/* ================================================
   bug_form.js
   Handles the "Report a Bug" modal:
     - Open / close / Escape key
     - Multi-select checkboxes  → field 7 (Affected System)
     - Conditional text input   → field 9 (Define Other)
       visible + required only when "Other" is checked
     - Long-text textarea       → field 8 (Description/Issue)
     - POSTs to QuickBase table bvxc9t2rh
     - Refreshes bug table on success

   Table ID  : bvxc9t2rh
   Field 7   : Affected System  (multi-select)
   Field 8   : Description/Issue (long text)
   Field 9   : Define Other      (text, conditional)
   ================================================ */

window.initBugForm = function () {

    var TABLE_ID = "bvxc9t2rh";
    var REALM    = "team.quickbase.com";

    /* ── Element refs ── */
    var modal           = document.getElementById("bugModal");
    var openBtn         = document.getElementById("open-bug-modal-btn");
    var closeBtn        = document.getElementById("closeBugModal");
    var submitBtn       = document.getElementById("submit-bug-btn");
    var descField       = document.getElementById("bug-description");
    var errorMsg        = document.getElementById("bug-form-error");
    var otherCheckbox   = document.getElementById("other-checkbox");
    var defineOtherWrap = document.getElementById("define-other-field");
    var defineOtherInput= document.getElementById("define-other");

    if (!modal || !openBtn) {
        console.warn("bug_form.js — modal elements not found.");
        return;
    }

    /* ── Show / hide "Define Other" when Other is toggled ── */
    otherCheckbox.addEventListener("change", function () {
        if (otherCheckbox.checked) {
            defineOtherWrap.style.display = "block";
            defineOtherWrap.classList.add("visible");
            defineOtherInput.focus();
        } else {
            defineOtherWrap.style.display = "none";
            defineOtherWrap.classList.remove("visible");
            defineOtherInput.value = "";
            defineOtherInput.classList.remove("field-error");
        }
    });

    /* Clear the red border on define-other as soon as user starts typing */
    defineOtherInput.addEventListener("input", function () {
        if (defineOtherInput.value.trim()) {
            defineOtherInput.classList.remove("field-error");
        }
    });

    /* ── Open modal ── */
    openBtn.addEventListener("click", function () {
        resetForm();
        modal.classList.remove("hidden");
    });

    /* ── Close — button ── */
    closeBtn.addEventListener("click", function () {
        modal.classList.add("hidden");
    });

    /* ── Close — click backdrop ── */
    modal.addEventListener("click", function (e) {
        if (e.target === modal) modal.classList.add("hidden");
    });

    /* ── Close — Escape ── */
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !modal.classList.contains("hidden")) {
            modal.classList.add("hidden");
        }
    });

    /* ── Submit ── */
    submitBtn.addEventListener("click", function () {

        /* Read multi-select values (field 7) */
        var checked = Array.from(
            document.querySelectorAll("#affected-system-options input[type='checkbox']:checked")
        ).map(function (cb) { return cb.value; });

        var description  = descField.value.trim();
        var otherChecked = otherCheckbox.checked;
        var defineOther  = defineOtherInput.value.trim();

        /* ── Validation ── */
        var valid = true;
        errorMsg.classList.add("hidden");
        defineOtherInput.classList.remove("field-error");

        if (!checked.length || !description) {
            valid = false;
        }

        /* "Other" is checked but Define Other is empty → invalid */
        if (otherChecked && !defineOther) {
            defineOtherInput.classList.add("field-error");
            defineOtherInput.focus();
            valid = false;
        }

        if (!valid) {
            errorMsg.classList.remove("hidden");
            return;
        }

        /* ── Disable while submitting ── */
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting…";

        /* ── Auth → POST ── */
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

            /* Build record payload */
            var record = {
                7: { value: checked },      /* Affected System — array */
                8: { value: description }   /* Description/Issue */
            };

            /* Only include field 9 when Other was selected */
            if (otherChecked && defineOther) {
                record[9] = { value: defineOther };
            }

            var payload = {
                to: TABLE_ID,
                data: [record],
                fieldsToReturn: [3, 7, 8, 9]
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
                console.log("Bug submitted:", data);
                modal.classList.add("hidden");
                resetForm();

                /* Refresh bug table */
                if (typeof window.loadBugs === "function") {
                    window.loadBugs();
                }
            })
            .catch(function (err) {
                console.error("bug_form.js — submit failed:", err);
                errorMsg.textContent = "Submission failed. Please try again.";
                errorMsg.classList.remove("hidden");
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = "Submit Bug Report";
            });
        };

        xhr.send();
    });

    /* ── Reset everything to blank ── */
    function resetForm() {
        /* Uncheck all checkboxes */
        document.querySelectorAll(
            "#affected-system-options input[type='checkbox']"
        ).forEach(function (cb) { cb.checked = false; });

        /* Hide Define Other */
        defineOtherWrap.style.display = "none";
        defineOtherWrap.classList.remove("visible");
        defineOtherInput.value = "";
        defineOtherInput.classList.remove("field-error");

        /* Clear textarea */
        descField.value = "";

        /* Reset error */
        errorMsg.classList.add("hidden");
        errorMsg.textContent = "Please fill in all required fields before submitting.";

        /* Reset button */
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Bug Report";
    }

};
