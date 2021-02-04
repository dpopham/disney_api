const baseURI="https://disney.darrenpopham.com/api";

async function getURL(url) {
    try {
        let res = await fetch(url);
        return await res.json();
    } catch (error) {
        console.log(error);
    }
}

async function renderURL(url) {
    let apiObj = await getURL(url);
    let items = apiObj._embedded.items
    let buttons = document.getElementById('container1');
    let container = document.getElementById('container2');
    let urldiv = document.getElementById('urldiv');
    let intro = document.getElementById('intro');
    let buttons_html = "<b>Links from the JSON Response:</b>\n<br>\n";
    buttons_html += "These buttons are for testing and allow you to browse through the JSON links displayed to the right.<br>\n";
    buttons_html += "<p>Any application you write would receive the JSON and operate on the links directly.<br>\n";

    buttons.style.display = "block";
    urldiv.style.display = "block";
    container.style.display = "block";
    if (url && url.substring(0, baseURI.length) === baseURI) {
        intro.style.display = "block";
    } else {
        intro.style.display = "none";
    }

    buttons_html += "<p>_links:\n<ul>\n";
    for (var u in apiObj._links) {
        buttons_html += '<li><button onclick="renderURL(\'' + apiObj._links[u].href +  '\')">' + u + '</button></li>\n';
    }
    buttons_html += "</ul>\n_embedded -> items:\n<ol>\n";
    let links = null;
    for (let i=0; i<apiObj.count; i++) {
        links = items[i]._links;
        buttons_html += '<li>' + items[i].name + '\n<br><br>\n<ul>\n';
        for (var link in links) {
            buttons_html += '<li><button onclick="renderURL(\'' + links[link].href +  '\')">' + link + '</button></li>\n';
        }
        buttons_html += '</ul>\n<br>\n</li>\n';
    }
    buttons_html += '</ol>\n';
    if (apiObj.moreinfo && window.location === window.parent.location) { 
        buttons_html += 'For more info, go to: <a href="' + apiObj.moreinfo.href +  '" class="button">' + apiObj.moreinfo.href + '</a>';
    }

    let myJSON = JSON.stringify(apiObj, undefined, 4);

    urldiv.innerHTML = `<b>API URL: ${url}</b>`;
    container.innerHTML = `<b>JSON Response:</b>\n<pre>${myJSON}</pre>`;
    buttons.innerHTML = buttons_html;
}

function init() {
    let buttons = document.getElementById('container1');
    let container = document.getElementById('container2');
    let urldiv = document.getElementById('urldiv');
    let intro = document.getElementById('intro');
    let homelink = document.getElementById('homelink');
    container.style.display = "none";
    intro.style.display = "block";
    urldiv.style.display = "block";
    buttons.style.display = "none";
    if(window.location !== window.parent.location) { 
        homelink.style.display = "none";
    } else {
        homelink.style.display = "block";
    }
    let html = '<b>API ROOT</b><br><br>Start here to explore the API: <button onclick="renderURL(\'' + baseURI +  '\')">' + baseURI + '/</button>';
    urldiv.innerHTML = html;
}

init();
