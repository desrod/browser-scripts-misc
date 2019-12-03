// ==UserScript==
// @name           Salesforce Useful UI Tweaks
// @namespace      http://salesforce.com/
// @description    Style and tweak Salesforce to be more productive for Engineers and Support
// @include        /^https?://.*.salesforce\.com/.*$/
// @author         setuid@gmail.com
// @version        1.9
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @grant          GM_addStyle
// ==/UserScript==

// e1, e2, e3       == element 1, 2
// els1, els2, els3 == element selector 1, 2

var goog_search = "http://www.google.com/search?q=";
var c_cvesearch = "https://cve.mitre.org/cgi-bin/cvename.cgi?name=cve-";
var u_cvesearch = "https://people.canonical.com/~ubuntu-security/cve/";


// This first one is for the header/summary of the case
// modify font size and colors however you need for your preferences
document.styleSheets[0].insertRule('div#cas15_ileinner { font:8pt !important; padding:1em; color:black; background-color: lightgreen;border:1px solid #cecece;font:8pt monospace;', 0);

// Hacky, but checks for CVE references in the case summary, re-links them as below
var els2 = document.querySelectorAll('#cas15_ileinner');
for (var r = 0, s = els2.length; r < s; r++) {
 var el2 = els2[r];
    el2.innerHTML = el2.innerHTML.replace(/cve-(\d{4})-(\b\d{4,9}\b)/gi, '<span title="Search for CVE-$1-$2"><a style="color:blue;" href="' + u_cvesearch + '$1/CVE-$1-$2.html" target="_blank">CVE-$1-$2</a></span>');
}

// This modifies each individual row of the case comments
document.styleSheets[0].insertRule('.noStandardTab td.dataCell { word-wrap:break-word;font:8pt monospace !important;', 1);

var els1 = document.querySelectorAll('.noStandardTab .dataRow');
for (var i = 0, l = els1.length; i < l; i++) {
  var el1 = els1[i];

  // Theses will alternate row colors between internal vs. external case comments
  el1.innerHTML = el1.innerHTML.replace(/(Created By:.*)/, '<span style="background-color:lightgreen;display:block;">$1</span>');
  el1.innerHTML = el1.innerHTML.replace(/(Created By: .+ \(portal\).*<\/b>)/gi, '<div style="background-color: yellow; display: block;">$1</div><\/b>');

  // Special handling for attachments inline
  el1.innerHTML = el1.innerHTML.replace(/New Attachment added: ([^()]+) \((https?:\/\/[.a-z0-9A-Z]+\/.+)\)/gi, '<strong style="color: red;">IMPORTANT New Attachment added</strong>: <a style="color:blue;" href="$2">$1</a>');

  // This will hyperlink the keywords off to Google searches for those words
  // Feel free to build up a dict of any you wish to search for, samples below
  // el1.innerHTML = el1.innerHTML.replace(/(openstack|Liberty|Mitaka|Newton|Queens|Pike|github|chef|preseed)/gi, '<a style="color:blue;" href="' + goog_search + '$&' + " title="Search Google for $&..." target="_blank">$&</a>');

  // These will dynamically link in any references to CVEs to their requisite search URLs
  // el1.innerHTML = el1.innerHTML.replace(/cve-(\d{4})-(\d{4})/gi, '<span title="Search for CVE-$1"><a style="color:blue;" href="' + c_cvesearch + '$1-$2" target="_blank">CVE-$1-$2</a></span>');
  el1.innerHTML = el1.innerHTML.replace(/cve-(\d{4})-(\b\d{4,9}\b)/gi, '<span title="Search for CVE-$1-$2"><a style="color:blue;" href="' + u_cvesearch + '$1/CVE-$1-$2.html" target="_blank">CVE-$1-$2</a></span>');

  // Attempt to turn anything that looks like a URL in a case comment, into a clickable link
  // el1.innerHTML = el1.innerHTML.replace(/(?=(https?:\/{2}[.a-z0-9A-Z%=\~\+\/&\:\?\-#]+))\1(?!['"]|<\/a>)+/gi, '<a style="color:blue;" href="$&">$&</a>');
}

var els3 = document.querySelectorAll('.noStandardTab .dataRow.even');
for (var k = 0, n = els3.length; k < n; k++) {
  var el3 = els3[k];
  el3.innerHTML = el3.innerHTML.replace(/<td class="\s+dataCell\s+"/gi, '<td class=" dataCell " style="border:1px solid #cecece; background-color: #f0f0f5;"');
}

function getElementByXpath(path) {
  return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.textContent;
}

// Warning, this is bound to be brittle, until it's optimized, but Salesforce HTML is... also brittle.
var contact = getElementByXpath("/html/body/div[1]/div[3]/table/tbody/tr/td/div[2]/div[1]/div/div[1]/table/tbody/tr/td[1]/div[3]/span/div")
var acct_tam = getElementByXpath("/html/body/div[1]/div[3]/table/tbody/tr/td/div[2]/div[3]/div[1]/div[2]/div[2]/div[1]/div[2]/div/div[1]/div[1]/div/div[2]/table/tbody/tr[2]/th/a")

acct_tam = acct_tam.replace(/User:(.*?)/, '$1')

$(".efhpDescription").prepend ( `
<style>
#tam {
    position: absolute;
    border-radius: 0 0 10px 10px;
    z-index: 9;
    background-color: #f1f1f1;
    border: 1px solid #d3d3d3;
    text-align: center
}

#tam_header {
    cursor: move;
    z-index: 10;
    background-color: red;
    color: #fff
}

#acc_tam {
    margin: 1em;
    font-weight: 400
}

</style>
<div id="tam">
   <div id="tam_header">TechOps Toolbox</div>
   <p id="acc_tam">The customer user is: <strong>` + contact + `</strong><br />
   The TAM for this account is: <strong>` + acct_tam + `</strong></p>
</div>
</div>
` );


dragElement(document.getElementById("tam"));

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
