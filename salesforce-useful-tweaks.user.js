// ==UserScript==
// @name           Salesforce Useful UI Tweaks
// @namespace      http://salesforce.com/
// @description    Style and tweak Salesforce to be more productive for Engineers and Support
// @include        /^https?://.*my.salesforce\.com/.*$/
// @author         setuid@gmail.com
// @updateUrl      https://raw.githubusercontent.com/desrod/browser-scripts-misc/master/salesforce-useful-tweaks.user.js
// @downloadUrl    https://raw.githubusercontent.com/desrod/browser-scripts-misc/master/salesforce-useful-tweaks.user.js
// @require        https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @require        https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js
// @version        2.101
// @grant          GM_addStyle
//
// ==========================================================================
// Key Features:
//
// - The left-side menu now floats with the page. You can also drag and move
//   this box to anywhere on the page you might want to place it. This is being
//   referred to as the 'floating toolbox'
//
// - The floating menu now has 'Go to Top' and 'Go to Bottom' of page accels,
//   accessible by clicking the up and down arrows on the top-right of the
//   toolbox.
//
// - New items have been added to the "Related Items" menu, for convenience,
//   these are:
//
//   * Case Header
//     - The new Case Header includes Customer, Customer Contact, internal
//       owner(s), and Severity.
//
//     - If the case severity is an L1, the floating menu will be highlighted in
//       a red border and the header will indicate an urgenty status, until it
//       has been downgraded below L1.
//
//     - If the current date happens to be on a weekend, and the customer's a
//       ssets/account does not merit weekend support, the floating menu will be
//       'hashed out' with gray bars, and the status will indicate that the case
//       should not be worked at that time.
//
//   * Case accelerator 'hotkeys'
//     - You can now press keyboard keys to activate new options on the page (h)
//       will show/hide any private comments in each new case (t) will launch a
//       new tab to create a new time card for the case (l) [ell] will launch a
//       new tab to log a new customer call for the case
//     - You can also access these options by their links on the floating
//       toolbox
//
//   * Any text highlighted on the page can be sent to the services below by
//     clickinng on their relevant icons on the bottom portion of the floating
//     toolbox:
//     - Google Translate
//     - Search Launchpad
//     - Search Google
//
// - The title of Case pages is now changed to reflect the case number, severity
//   and case subject, so it can be easily found in each tab of a browser with
//   many cases open.
//
// - Case comment headers are colorized depending on whether they come from an
//   internal or external author.
//
// - Case comments are also numbered, with clickable links next to each one so
//   they can be directly linked to in other comments or discussions by named
//   anchors.
//
// - Any files that are uploaded to the case or support portal, will be linked
//   into the floating toolbox. If the number of files exceeds (5), the list
//   will collapse, and you'll have to click the 'uploads' link to expand and
//   scroll the menu.
//
// - Any pastebin links found in case comments will also be linked in the
//   floating toolbox. The normal and raw versions will have separate links, so
//   you can visit either of them directly.
//
// - Any case mentioning a CVE, by referring to its CVE number directly (for
//   example, CVE-2017-8365), will have that CVE text hyperlinked directly to
//   the CVE tracker.
//
// - If a case's accounts, assets or other table data shows as either Active,
//   Expiring soon or Expired, the rows of the tabular data will be indicated in
//   Green, Yellow or Red accordingly. This will help guide support staff to
//   know if a customer has active support, expired support or support nearing
//   expiration, so they can take appropriate action.
//
// - Any table on a page can be sorted by clicking its header label. This is
//   true for any and all tables on any pages.
//
// - Any case comment that has what appears to be formatted text included in it,
//   will retain that formatting, so viewing pasted tables or output, is not
//   illegibly reflowed
//
// - Overall case list will now be colorized based on the case Status (nicked
//   from Roy's version, rewritten for faster rendering)
//
// ==========================================================================
// ==/UserScript==

'use strict';

// Try to extract the Community URL to KB articles, link in the Properties box
if ( window.location.href.match(/articles\/.*\/Knowledge\//gi) ) {
    var community_url = getElementByXpath("//*[contains(text(),'Community URL')]/following::span[1]");
    var ss_url = community_url.replace(/\/ua\//, '/selfservice/')
    document.getElementsByClassName('panelTitle')[0].insertAdjacentHTML('afterend',
                                    `<hr /><span>
                                     Community URL: <a title="${community_url}" href="${community_url}">${community_url.slice(0,20)}...</a><br />
                                     Self-service URL: <a title="${ss_url}" href="${ss_url}">${ss_url.slice(0,20)}...</a>
                                     </span>`)};

var public_url = `https://support.canonical.com/ua/s/case/${window.location.pathname.split('/')[1]}`
var u_cvesearch = "https://people.canonical.com/~ubuntu-security/cve/";

var attachments = getElementByXpath("/html/body//a[contains(text(),'Files')]/@href");

var uploaded_files = []
var case_attachments = []
var pastebin_links = []
var do_search = 0
var highlight = ''
var url = ''

var style = document.createElement('style');
style.innerHTML += `@import url("https://use.fontawesome.com/releases/v5.12.1/css/all.css");`;

// var profile_details = document.querySelectorAll('.efhpLabeledFieldValue > a');

// Keycodes interrogated here: https://keycode.info/
// const KEY_A = 65; // Add to case team
const KEY_E = 69; // (e) to Edit case
const KEY_H = 72; // (h) to Show/Hide private comments
const KEY_L = 76; // (l) to Log a call
const KEY_T = 84; // (t) Create a new Time Card
const KEY_U = 85; // (u) Upload a file to the case

// Remove duplicate entries from the arrays we populate with links
Array.prototype.unique = function() {
  return this.filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });
}

function match_keypress(selector) {
  if (document.activeElement) {
    return document.activeElement.matches(selector);
  } else {
    return false;
  }
}

function listen_keypress(keyCode, handler) {
  window.addEventListener('keydown', function(event) {
    if (event.keyCode !== keyCode) {
      return;
    } else if (event.keyCode !== '17') {
        handler(event);
    }
  });
}

// listen_keypress(KEY_A, function(event) {
//  if (!match_keypress('textarea')) {
//   document.querySelector('input[value="Add Me to Case Team"]').click();
//  }
// })

listen_keypress(KEY_E, function(event) {
    if (!match_keypress('textarea') && !match_keypress('input')) {
        document.querySelector('input[value=" Edit "]').click();
    }
})
listen_keypress(KEY_H, function(event) {
    if (!match_keypress('textarea') && !match_keypress('input')) {
        toggle();
    }
})
listen_keypress(KEY_L, function(event) {
    if (!match_keypress('textarea') && !match_keypress('input')) {
        document.getElementById("log_call").click();
    }
})
listen_keypress(KEY_T, function(event) {
    if (!match_keypress('textarea') && !match_keypress('input')) {
        document.getElementById("new_timecard").click();
    }
})
listen_keypress(KEY_U, function(event) {
    if (!match_keypress('textarea') && !match_keypress('input')) {
        document.querySelector('input[value="Upload Files"]').click();
    }
})

// Get the selected text so we can do fun things with it
function get_highlighted_text(e) {
    var t = ''
    t = (document.all) ? document.selection.createRange().text : document.getSelection();
    highlight = t.toString();
    return false;
}

document.onmouseup = get_highlighted_text;

if (!document.all) document.captureEvents(Event.MOUSEUP);
function do_search_msg(highlight, engine) {
    return confirm(`WARNING: about to send the text "${highlight}" to ${engine} on the public Internet. Proceed?`)
}

// Translate highighted text on the page
function translate_text(highlight) {
    do_search = do_search_msg(highlight, 'Google Translate');
    if (do_search === true) {
        var w = window,
            o = w.open('http://translate.google.com/translate_t#auto|en|' + highlight, '', 'left=' +
                       ((w.screenX || w.screenLeft) + 10) + ',top=' +
                       ((w.screenY || w.screenTop) + 10) +
                       ',height=620px,width=950px,resizable=1,alwaysRaised=1');
        w.setTimeout(function() {
            o.focus()
        }, 300)
    } else {
        return false;
    }
}

// Search helpers for various upstream services
function search_highlight(highlight, loc) {
    if (loc === 'lp') {
        do_search = do_search_msg(highlight, 'Launchpad');
        url = `https://bugs.launchpad.net/bugs/+bugs?field.searchtext=${highlight}&search=Search+Bug+Reports`;
    }

    if (loc === 'google') {
        do_search = do_search_msg(highlight, 'Google Search');
        url = `https://www.google.com/search?source=hp&q=${highlight}`;
    }

    if (do_search === true) {
        window.open(url, "_blank");
    } else {
        return false;
    }
}

// Add a handler for the 'click' event on the hide/show private comments button
window.addEventListener("load", ()=> document.querySelector("[btn]").addEventListener("click", toggle, false), false);
window.addEventListener("load", ()=> document.querySelector("[translate]").addEventListener("click", () => translate_text(highlight), false));
window.addEventListener("load", ()=> document.querySelector("[launchpad]").addEventListener("click", () => search_highlight(highlight, 'lp'), false));
window.addEventListener("load", ()=> document.querySelector("[google]").addEventListener("click", () => search_highlight(highlight, 'google'), false));

// Toggle the display of private comments, off/on
function toggle() {
    let x = document.querySelectorAll("[id=\"private\"]");
    x.forEach( v => { v.style.display = v.style.display = ["","none"][+!(v.style.display === "none")]})
}

// Add column sorting to all table cells
const get_cell_val = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

const compare_cell = (idx, asc) => (a, b) => ((v1, v2) =>
 v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
)(get_cell_val(asc ? a : b, idx), get_cell_val(asc ? b : a, idx));

document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
    const table = th.closest('table');
    const tbody = table.querySelector('tbody');
    Array.from(tbody.querySelectorAll('tr:nth-child(n+2)'))
        .sort(compare_cell(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
        .forEach(tr => tbody.appendChild(tr) );
})));

// Query selectors by XPath
function getElementByXpath(path) {
	var xpath_fragment = document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	if (xpath_fragment) return xpath_fragment.textContent;
	else return "";
}

// Build the <li>${link}</li> list for the sidebar from array items
function create_link_list(title, array, slice) {
    var html_string = ''
    array = array.unique();

    if (array.length > 0) {
        html_string += `<hr /><div class="collapsible">${title}... (${array.length})</div>`
        if (array.length > 5) {
            html_string += `<div class="content uploads" style="display:none;">`;
        } else {
            html_string += `<div class="content uploads">`
        }
    }

    array.forEach((link, index) => {
        var raw = ''
        var icon = `<i class="far fa-folder-open"></i>`
        var counter = String(index+1).padStart(3, '0')

        if (link.match(/pastebin/)) {
            raw = `[<a href="${link}plain/" target="_blank">raw</a>]&nbsp;`
            icon = `<i class="far fa-clipboard"></i>`
        }
        html_string += `<li>${icon} [${counter}] ${raw}<a href="${link}" title="${link}"
                            target="_blank">${link.split('/').slice(slice)[0]} </a></li>`;
        index++
        if(array[array.length-1] === link) { html_string += `</div>` }
    });
    return html_string
}

// Set an interval to check for AJAX page load completion, loop for a small
// interval, then stop
const set_interval_x = (fn, delay, times) => {
    if(!times) return
    setTimeout(() => {
        fn()
        set_interval_x(fn, delay, times-1)
    }, delay)
}

set_interval_x(function () {
    colorize_case_list()
}, 1000, 3);

// Detect when the dropdown onchange event has fired, re-color cases
document.addEventListener('input', function (event) {
    if (event.target.id.includes('_listSelect')) {
        set_interval_x(function () {
            colorize_case_list()
        }, 1000, 3);
    } else {
        return;
    }

}, false);

const case_status_classes = {
    Customer:   'cus',
    Support:    'sup',
    Engineering:'eng',
    Upstream:   'ups',
    Operations: 'ops',
    CPC:        'cpc',
    SRU:        'sru',
    New:        'new',
};

// Colorize the cases by status
function colorize_case_list() {
    var now = Date();
    document.querySelectorAll('[class*="col-CASES_STATUS"], [class*="col-CASES_LAST_UPDATE"]').forEach(node => {
        for (const [status, cls] of Object.entries(case_status_classes)) {
            if (node.innerHTML.includes(status)) {
                node.classList.add(`status-wo${cls}`);
                break;
            }
        }
 });
}

var cols = document.evaluate("//th[contains(text(),'Member Role')]", document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
let map = {};
let roles = [];
let role_node = null;

do {
    role_node = cols.iterateNext();
    if (role_node) {
        roles.push(role_node);
    }
} while (role_node);

roles.forEach((thisHeading) => {
    let cellIndex = thisHeading.cellIndex;
    let table = thisHeading.parentNode.parentNode.parentNode;

    table.querySelectorAll('tr td:nth-child(' + (cellIndex + 1) + ')').forEach(function(td) {
        let category = td.innerText.trim();
        let th = td.previousElementSibling;
        let name = th.innerText.trim().replace(/^User: /, '');

        if (!map.hasOwnProperty(category)) {
            map[category] = [];
        }
        map[category].push(name);
    });
});

var sev_level = getElementByXpath("//*[contains(text(),'Severity Level')]/following::div[1]").replace(/.*L(\d+).*/, 'L$1');

var toolbox = ''
var customer_name = getElementByXpath("//*[contains(text(),'Customer')]/following::a[1]");
var customer_contact = getElementByXpath("//*[contains(text(),'Customer')]/following::a[2]").replace(/(\w+).*/, '$1');
if (customer_name) { toolbox += `Customer: <strong>${customer_name.trim()}</strong><br />Contact: <strong>${customer_contact.trim()}</strong><hr />`}

var case_owner = getElementByXpath("//*[contains(text(),'Case Owner')]/following::td[1]");
if (case_owner) { toolbox += `Case owner: <strong>${case_owner.trim()}</strong><br />`}

var case_comments = getElementByXpath("//*[contains(text(),'Case Comments')]").replace(/.*[\[\(](\d+)[\)\]].*/g, '$1');
var case_asset = getElementByXpath("//*[contains(text(),'Product Service SLA')]/following::td[1]");
var case_subject = getElementByXpath("//*[contains(text(),'Subject')]/following::td[1]");
if (document.title.includes('Case:')) {
    document.title = document.title.replace(/.*(Case: \d+).*/, `$1 - ${sev_level} - ${case_subject}`);
}

var acct_dse = map["Dedicated Services Engineer"]
var acct_tam = map["Technical Account Manager"]
toolbox += (acct_dse||[]).map( value => `DSE: <strong>${value}</strong><br />`).join('')
toolbox += (acct_tam||[]).map( value => `TAM: <strong>${value}</strong><br />`).join('')

// Hacky, but checks for CVE references in the case summary, re-links them as below
document.querySelectorAll('#cas15_ileinner').forEach(node => {
	node.innerHTML = node.innerHTML.replace(/(?:[^\/])(cve-\d{4}-\d{4,7})/gim,
		'<span title="Search for $1">&nbsp;<a style="color:blue;" href="' + u_cvesearch + '$1.html" target="_blank">$1</a></span>')
});

// Pull various URL links out of the case comments as we iterate through them
var links_array = []
function push_links(node, uri, links_array) {
    var re = new RegExp(uri, 'gim');
    var results = node.innerHTML.match(re);
    if(results !== null) {
        results.forEach(url => {
            // console.log('DEBUG', url)
            if(url.match(/https?:\/\/([-a-zA-Z0-9()@:%_\+.~#?&\;//=]*)?/gim)) {
                links_array.push(url);
            }
        }
                       )
    }
    return links_array
}

// Search the table for active, nearing and expired rows
const check_table_rows = Array.from(
    document.querySelectorAll(`div.assetBlock > div > div > table tbody tr,
                               div.contractBlock > div > div > table tbody tr,
                               div.taskBlock  > div > div > table tbody tr`), (row) => {
    const dates = row.querySelectorAll('td.DateElement')
    return dates[dates.length - 1] || null;
}).filter(Boolean);
check_table_rows.forEach(el => check_date(el, el.innerText));

function check_date(el, date) {
  var now = new Date();
  if (Date.parse(date) < Date.parse(now)) {
      return el.closest("tr").classList.add('ae')
  } else if (Math.round(Math.abs((Date.parse(date) - Date.parse(now)) / 86400000)) < 30) {
      return el.closest("tr").classList.add('ane')
  } else {
      return el.closest("tr").classList.add('aa')
  }
}

document.querySelectorAll('.dataCell b').forEach((el) => {
    if(el.innerText.includes('portal')) {
        el.classList.add('external')
        el.closest("td").classList.add('formatted')
    } else {
        el.classList.add('internal')
    }
});

var comment_count = case_comments;
document.querySelectorAll('.noStandardTab .dataRow').forEach(node => {
    // Build an array of all attachments linked in the case comments
    case_attachments = push_links(node, 'https?:\/\/files\.support[^\/\s]+\/files\/[^<\\s]+', case_attachments)
    pastebin_links = push_links(node, 'https?:\/\/pastebin[^\/\s]+[^<\\s\.]+', pastebin_links)

    // Sort the file attachments by name, vs. default sort by newest -> oldest
    // case_attachments.sort()

    node.innerHTML = node.innerHTML.replace(/(Created By:.*)/, `<span id="${comment_count}"><a title="Right-click to link to comment #${comment_count}"
                                            name="#${comment_count}" href="${window.location.href.split('?')[0]}#${comment_count}">
                                            <i class="fas fa-link"></i></a>(${comment_count})&nbsp;$1</span>`)

    // Special handling for attachments in case comments
    node.innerHTML = node.innerHTML.replace(/\-New Attachment added: ([^()]+)/gi,
                                            `&#128206; <span style="color:red;">IMPORTANT New Attachment added</span>: <a href="${attachments}">$1</a>`)

    // Attempt to turn anything that looks like a URL in a case comment, into a clickable link
    node.innerHTML = node.innerHTML.replace(/(?=(https?:\/{2}[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\;//=]*)?))\1(?!['"]|<\/a>)+/gim,
                                            `<a style="color:blue;" href="$&">$&</a>`)

    // These will dynamically link in any references to CVEs to their requisite search URLs
    node.innerHTML = node.innerHTML.replace(/(?:[^\/])(cve-\d{4}-\d{4,7})/gim,
                                            '<span title="Search for $1">&nbsp;<a style="color:blue;" href="' +
                                            u_cvesearch +
                                            '$1.html" target="_blank">$1</a></span>')

    // This is brittle, it should be: getElementByXpath("//*[contains(text(),'Make Public')]/following::td[1]")
    // I don't like it, I'll fix it later.
    node.innerHTML = node.innerHTML.replace(/<a href(.*) title="Make Public(.*?)<td class="\s+dataCell\s+">(.*)/gi,
                                            '<a href $1 title="Make Public $2<td class="dataCell" id="private"><span class="watermark">private comment</span>$3')
    comment_count--
});

// Build a list of files uploaded to the case, deploy them into the sidebar
document.querySelectorAll(`[id*="RelatedFileList_body"] a[title*="Download"`).forEach(node => {
    // Small feature gap here, only the first 10 attached files are visible, unless AJAX function is run
    uploaded_files.push(`${node.href}/${node.title.match(/Download - Record \d+ - (.*)/)[1]}`);
});

style.innerHTML += `
.status-wocus{background-color:#9eebcf;}
.status-wosup{background-color:#ff725c;}
.status-woeng{background-color:#fbf1a9;}
.status-woups{background-color:#96ccff;}
.status-woops{background-color:#cdecff;}
.status-wocpc{background-color:#ad99ff;}
.status-wosru{background-color:#ff99e0;}
.status-wonew{background-color:#debe66;}
#private{background-color:#fff2e6;}
#tools{background-color:#f1f1f1;border:1px solid #d3d3d3;border-radius:0 0 10px 10px;text-align:center;z-index:9;}
/* #toolbox{-moz-column-width:160px;column-width:160px;font-weight:400 0;margin:1em;text-align:left;} */
.efdvJumpLink{position:fixed;z-index:8;border:1px solid #000;background-color:#ddeef4;border-radius:5px;box-shadow: 5px 5px #ccc;left:1.8em;width:165px;}
.uploads{overflow-x:hidden;overflow-y:auto;max-height:300px;scrollbar-width: thin;}
.content uploads {margin-left:3em;}
/* Active asset */
.aa{background-color:#b3ffb3;}
/* Asset nearing expiry */
.ane{background-color:#ffffb3;}
/* Expired asset */
.ae{background-color:#ffc9c9;}
.efdvJumpLinkTitle{font-weight:bold;text-align:center;color:#916363;width:100%;}
.efdvJumpLinkTitle a{all:unset;color:gray;float:right;text-decoration:none;}
.noStandardTab td.dataCell{font:8pt monospace!important;word-wrap:break-word;}
.noStandardTab tr.dataRow.even td.dataCell:nth-of-type(2){background:#f0f0f5;border:1px solid #cecece;}
div.listRelatedObject.caseBlock div.bPageBlock.brandSecondaryBrd.secondaryPalette table.list tr.even {background: #f0f0f0;}
.external{background-color:#ff0;display:block;margin:-.5em;padding-left:.5em;}
.internal{background-color:#90ee90;display:block;margin:-.5em;padding-left:.5em;}
.formatted {white-space: pre-wrap;}
b:not(.formatted) {white-space:normal;}
.urgent{animation:urgent 1.0s infinite;}
.urgent::before{content:"\uD83D\uDD25";}
.watermark{color:red;font-size:1em;left:1.2em;opacity:0.5;position:absolute;vertical-align:bottom;z-index:1000;}
div #cas15_ileinner{background-color:#90ee90;border:1px solid #cecece;color:#000;font:8pt monospace !important;padding:1em;}
hr {border: 0; height: 1px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));}
.efdvJumpLinkBody a {all:unset;margin:0;padding:0em;}
.efdvJumpLinkBody ul {margin:0em;padding:0em;}
.efdvJumpLinkBody li {overflow-wrap:break-word;font-size:0.9em;padding:0.3em;cursor:pointer;}
.tbox_call, .tbox_time{margin:0;padding:0;text-align: left;}
.fa-phone {color: #000 !important;}
.fa-history {color: #f00 !important;}
.fa-folder-open {color: #33beff !important;}
#top, #end, #refresh{float:right;margin-left:0.5em;margin-top:0.1em;}
@keyframes urgent{
  0%{color:#f00;}
 49%{color:#dc143c;}
 50%{color:#dc143c;}
 99%{color:transparent;}
 100%{color:#000;}
`;

var is_weekend = ([0,6].indexOf(new Date().getDay()) != -1);
if (is_weekend === true && case_asset.includes("Essential")) {
    toolbox += `Weekend: <strong style="color:#f00;">8x5 support</strong><br />`
    document.getElementsByClassName("efdvJumpLink")[0].style = "border: 2px solid #ff9494; background: repeating-linear-gradient(45deg,#f7f7f7,#f7f7f7 10px,#fff 10px, #fff 20px);"
}

if (sev_level) {
    // Add some urgency to the L1 level cases
    sev_level.includes('L1') ? sev_level = `<span class="urgent">${sev_level}</span>` : sev_level
    sev_level.includes('L1') ? document.getElementsByClassName("efdvJumpLink")[0].style = "border:2px solid #f00 !important;border-radius:10px !important;" : ''
    toolbox += `Severity: <strong>${sev_level.trim()}</strong><br />`

}

if (document.getElementsByClassName('efdvJumpLinkBody').length > 0) {
    var log_call = document.querySelector('input[value="Log a Call"]').getAttribute('onclick');
    var log_call_match = log_call.match(/navigateToUrl(.*?['"]([^'"]*)['"])/);
    var log_call_msg = document.domain + log_call_match[2]

    var related_list_box = document.querySelectorAll('.efdvJumpLinkBody');
    var related_list_items = document.querySelectorAll('.efdvJumpLinkBody > ul');

    // Reload page
    document.querySelectorAll('.efdvJumpLinkTitle')[0].insertAdjacentHTML('afterbegin', '<a id="refresh" onclick="document.location.reload(true);"><i class="fas fa-sync-alt"></i></a>');

    // Jump to top of the page
    document.querySelectorAll('.efdvJumpLinkTitle')[0].insertAdjacentHTML('afterbegin', '<a id="top" title="Jump to top" href="#"><i class="fas fa-arrow-up"></i></a>');

    // Jump to bottom of the page
    document.querySelectorAll('.efdvJumpLinkTitle')[0].insertAdjacentHTML('afterbegin', '<a id="end" title="Jump to bottom" href="#footer"><i class="fas fa-arrow-down"></i></a>');
    document.getElementsByClassName('sfdcBody')[0].insertAdjacentHTML('beforeend', '<footer id="footer"></footer>')

    related_list_items[0].insertAdjacentHTML('beforebegin', `<br />${toolbox}<hr />`)

    var new_timecard_link = document.querySelector('input[value="New time card"]').getAttribute('onClick').match(/this.form.action = (.*?['"]([^'"]*)['"])/);
    if (new_timecard_link) {
        var new_timecard_msg = document.domain + new_timecard_link[2];
    }

    var sidebar_html = `<hr />
    <li>&nbsp;<i class="fas fa-eye"></i>&nbsp;&nbsp;(H) <a btn>Show/Hide comments</a></li>
    <li>&nbsp;<i class="fas fa-phone"></i>&nbsp;&nbsp;(L) <a id="log_call" class="tbox_call" title="All calls must be logged separately from time cards"
       href="https://${log_call_msg}" target="_blank">Log a Customer Call</a></li>
    <li>&nbsp;<i class="fas fa-history"></i>&nbsp;&nbsp;(T) <a id="new_timecard" class="tbox_time" title="Add a new time card. Must be done by EOD!"
       href="https://${new_timecard_msg}" target="_blank">New time card</a></li>
    <li style="text-align: center;"><br />
       <a title="Public URL to case" target="_blank" href="${public_url}"><i class="fas fa-link"></i></a>&nbsp;&nbsp;&nbsp;
       <a translate title="Translate highlighted text" target="_blank"><i class="fa fa-globe-europe fa-lg"></i></a>&nbsp;&nbsp;&nbsp;
       <a launchpad title="Search Launchpad" target="_blank"><i class="fa fa-bug fa-lg"></i></a>&nbsp;&nbsp;&nbsp;
       <a google title="Search Google" target="_blank"><i class="fab fa-google fa-lg"></i></a>&nbsp;&nbsp;&nbsp;
    </li>`;

    sidebar_html += create_link_list('&nbsp;&nbsp;sFTP uploads...', case_attachments, -1)
    sidebar_html += create_link_list('&nbsp;&nbsp;Pastebin pastes', pastebin_links, -2)
    sidebar_html += create_link_list("Uploaded files", uploaded_files, -1);

    related_list_items[0].insertAdjacentHTML('beforeend', sidebar_html)
}

// Add the injected stylesheet to the bottom of the page's <head> tag
document.head.appendChild(style);

// Create the collapsible 'sFTP uploads...' dialog actions
var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  });
}

// This is needed to create the draggable toolbox around the page
const qsa = (selector, parent = document) => parent.querySelectorAll(selector)
qsa('[id^="efJumpLink"]').forEach(element => { dragElement(document.getElementById(element.id)); })

function dragElement(n){var t=0,o=0,u=0,l=0;function e(e){(e=e||window.event).preventDefault();u=e.clientX;l=e.clientY;document.onmouseup=m;document.onmousemove=d}
function d(e){(e=e||window.event).preventDefault();t=u-e.clientX;o=l-e.clientY;u=e.clientX;l=e.clientY;n.style.top=n.offsetTop-o+"px";n.style.left=n.offsetLeft-t+"px"}
function m(){document.onmouseup=null;document.onmousemove=null}
document.getElementById(n.id+"header")?document.getElementById(n.id+"header").onmousedown=e:n.onmousedown=e}
