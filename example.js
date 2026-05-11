// Quickbase REST API endpoint for querying records
const tableId = "YOUR_TABLE_ID";
const url = `https://api.quickbase.com/v1/records/query`;

// Your query parameters
const body = {
  "from": tableId,
  "select": [3, 6, 7, 8], // The Field IDs you want to pull (e.g., Record ID, Title, Status, Votes)
  "where": "{'7'.EX.'Planned'}" // Optional: Filter the data (e.g., Status == Planned)
};

const headers = {
  "QB-Realm-Hostname": "yourrealm.quickbase.com",
  "Authorization": "QB-USER-TOKEN your_user_token_here",
  "Content-Type": "application/json"
};

// Fetch the data
fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(body)
})
.then(response => response.json())
.then(data => {
  // Clear the loading text
  const container = document.getElementById('feature-list');
  container.innerHTML = ''; 

  // Loop through the Quickbase data and build HTML
  data.data.forEach(record => {
    // Assuming Field 6 is 'Title' and Field 8 is 'Votes'
    const title = record['6'].value;
    const votes = record['8'].value;

    // Create a new HTML element for each record
    const item = document.createElement('div');
    item.className = 'top-card'; // Reusing your CSS class!
    item.innerHTML = `<h4>${title}</h4> <p>👍 ${votes}</p>`;
    
    // Add it to the page
    container.appendChild(item);
  });
})
.catch(error => console.error('Error fetching Quickbase data:', error));
