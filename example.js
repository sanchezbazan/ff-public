// Quickbase REST API endpoint
const tableId = "bvxc9tgei";
const url = "https://api.quickbase.com/v1/records/query";

// Query body
const body = {
  from: tableId,
  select: [6, 7, 8]
};

// Headers for getting temp token
const authHeaders = {
  "QB-Realm-Hostname": "team.quickbase.com",
  "QB-App-Token": "{QB-App-Token}",
  "Content-Type": "application/json"
};

// STEP 1: Get temporary token
const xmlHttp = new XMLHttpRequest();

xmlHttp.open(
  "GET",
  `https://api.quickbase.com/v1/auth/temporary/${tableId}`,
  true
);

for (const key in authHeaders) {
  xmlHttp.setRequestHeader(key, authHeaders[key]);
}

xmlHttp.withCredentials = true;

xmlHttp.onreadystatechange = function () {
  if (xmlHttp.readyState === XMLHttpRequest.DONE) {

    // Parse response
    const response = JSON.parse(xmlHttp.responseText);

    console.log(response);

    // Extract temporary token
    const tempToken = response.temporaryAuthorization;

    // STEP 2: Use token in query request
    fetch(url, {
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

      console.log(data);

      const container = document.getElementById("feature-list");
      container.innerHTML = "";

      data.data.forEach(record => {

        const title = record["6"].value;
        const votes = record["8"].value;

        const item = document.createElement("div");

        item.className = "top-card";

        item.innerHTML = `
          <h4>${title}</h4>
          <p>&#128077; ${votes}</p>
        `;

        container.appendChild(item);
      });
    })
    .catch(err => {
      console.error("Fetch error:", err);
    });
  }
};

xmlHttp.send();
