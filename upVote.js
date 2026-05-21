window.initVoteSystem = function () {

    document.addEventListener("click", async (e) => {
        const btn = e.target.closest(".vote-btn");
        if (!btn) return;

        const urlString = btn.dataset.voteUrl;
        const url = new URL(urlString);
        const params = url.searchParams;

        const fid6 = params.get("_fid_6");
        const fid7 = params.get("_fid_7");
        const fid8 = params.get("_fid_8");

        console.log("Voting URL:", urlString);

        try {
            const res = await fetch("https://api.quickbase.com/v1/records", {
                method: "POST",
                headers: {
                    "QB-Realm-Hostname": "team.quickbase.com",
                    "Authorization": "QB-USER-TOKEN <token>",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    to: "bvxkwg978",
                    data: [{
                        6: { value: fid6 },
                        7: { value: fid7 },
                        8: { value: fid8 }
                    }],
                    fieldsToReturn: [6, 7, 8]
                })
            });

            const data = await res.json();
            console.log("Success:", data);

            window.location.reload();

        } catch (err) {
            console.error("Vote error:", err);
        }
    });

};
