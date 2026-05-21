/* ================================================
   bug_form.js
   Handles the "Report a Bug" modal:
     - Open / close
     - Reads multi-select checkboxes (field 7)
     - Reads description textarea (field 8)
     - POSTs a new record to QuickBase table bvxc9t2rh
     - Refreshes the bug table on success

   Table ID : bvxc9t2rh
   Field 7  : Affected System  (multi-select → array)
   Field 8  : Description/Issue (long text)
   ================================================ */

window.initBugForm = function () {

    var TABLE_ID = "bvxc9t2rh";
    var REALM    = "team.quickbase.com";

    var modal       = document.getElementById("bugModal");
    var openBtn     = document.getElementById("open-bug-modal-btn");
    var closeBtn    = document.getElementById("closeBugModal");
    var submitBtn   = document.getElementById("submit-bug-btn");
    var descField   = document.getElementById("bug-description");
    var errorMsg    = document.getElementById("bug-form-error");

    if (!modal || !openBtn) {
        console.warn("bug_form.js — modal elements not found.");
        return;
    }

    /* ── Open ── */
    openBtn.addEventListener("click", function () {
        resetForm();
        modal.classList.remove("hidden");
    });

    /* ── Close (button) ── */
    closeBtn.addEventListener("click", function () {
        modal.classList.add("hidden");
    });

    /* ── Close (click outside modal box) ── */
    modal.addEventListener("click", function (e) {
        if (e.target === modal) modal.classList.add("hidden");
    });

    /* ── Close (Escape key) ── */
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !modal.classList.contains("hidden")) {
            modal.classList.add("hidden");
        }
    });

    /* ── Submit ── */
    submitBtn.addEventListener("click", function () {

        /* Read multi-select values */
        var checked = Array.from(
            document.querySelectorAll("#affected-system-options input[type='checkbox']:checked")
        ).map(function (cb) { return cb.value; });

        var description = descField.value.trim();

        /* Validate */
        if (!checked.length || !description) {
            errorMsg.classList.remove("hidden");
            return;
        }
        errorMsg.classList.add("hidden");

        /* Disable button while submitting */
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting…";

        /* Get temp token then POST */
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

            /* QuickBase multi-select field expects an array of strings */
            var payload = {
                to: TABLE_ID,
                data: [{
                    7: { value: checked },      /* Affected System — multi-select */
                    8: { value: description }   /* Description/Issue */
                }],
                fieldsToReturn: [3, 7, 8]
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

                /* Refresh the bug table */
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

    /* ── Reset form to blank state ── */
    function resetForm() {
        document.querySelectorAll(
            "#affected-system-options input[type='checkbox']"
        ).forEach(function (cb) { cb.checked = false; });

        descField.value = "";
        errorMsg.classList.add("hidden");
        errorMsg.textContent = "Please fill in all required fields before submitting.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Bug Report";
    }

};
