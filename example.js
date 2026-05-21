const tableId = "bvxc9tgei";

const body = {
    from: tableId,
    select: [6, 7, 9, 17, 16, 3, 20]
};

const xmlHttp = new XMLHttpRequest();

xmlHttp.open(
    "GET",
    `https://api.quickbase.com/v1/auth/temporary/${tableId}`,
    true
);

xmlHttp.setRequestHeader("QB-Realm-Hostname", "team.quickbase.com");
xmlHttp.setRequestHeader("QB-App-Token", "{QB-App-Token}");
xmlHttp.setRequestHeader("Content-Type", "application/json");

xmlHttp.withCredentials = true;

xmlHttp.onreadystatechange = function () {

    if (xmlHttp.readyState === XMLHttpRequest.DONE) {

        const authResponse = JSON.parse(xmlHttp.responseText);

        const tempToken = authResponse.temporaryAuthorization;

        fetch("https://api.quickbase.com/v1/records/query", {
            method: "POST",
            headers: {
                "QB-Realm-Hostname": "team.quickbase.com",
                "Authorization": "QB-TEMP-TOKEN " + tempToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        })
        .then(res => res.json())
        .then(data => {
            
            console.log(data)

            const tbody = document.getElementById("feature-table-body");

            tbody.innerHTML = "";

            data.data.forEach(record => {

                const requestedDate = record["6"].value;
                const category = record["7"].value;
                const description = record["9"].value;
                const votes = record["17"].value;
                const voteUrl = record["16"].value
                const status = record["20"].value

                const row = document.createElement("tr");
     

                row.innerHTML = `
                    <td>${description}</td>

                    <td>
                        <span class="badge status-review">
                            ${status}
                        </span>
                    </td>

                    <td>${category}</td>

                    <td class="vote-count">${votes}</td>

                    <td>${requestedDate}</td>

                    <td>
                        <button 
                        class="action-btn vote-btn"
                        data-url="https://www.pipelines.quickbase.com/hooks/webhooks/1dqfpoltam8"
                        data-vote-url="${voteUrl}"
                    >
                        &#128077; Vote
                    </button>
                    </td>
                `;

                tbody.appendChild(row);
                
                

            });
            
            

        })
        .catch(err => {
            console.error(err);
        });
    }
};

xmlHttp.send();
