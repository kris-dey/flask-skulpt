function goURL() { 
    if (compiledMod != null) {
     renderPage(document.getElementById("url_bar").value)
    } else {
     document.getElementById("output").innerHTML = "  Please click 'Run' to run Flask web app first."
    }
 }  
 
function renderPage(url_requested, requestData) {
    const app = Sk.builtin.getattr(compiledMod, new Sk.builtin.str("app"));
    const handleRouteFn = Sk.builtin.getattr(app, new Sk.builtin.str("handleRoute"));
    document.getElementById("url_bar").value = url_requested;

    if (!requestData) requestData = {}
    if (!("method" in requestData)) requestData["method"] = "GET";

    console.log(url_requested)
    console.log(requestData)

    const pyDict = handleRouteFn.tp$call([new Sk.builtin.str(url_requested), Sk.ffi.remapToPy(requestData)], {});

    var jsDict = Sk.ffi.remapToJs(pyDict)
    console.log(jsDict);
    var jsHtmlString = fixURL(jsDict["html"])
    jsHtmlString = fixForms(jsHtmlString)
    if ("template_params" in jsDict) {
        jsHtmlString = jinja.compile(jsHtmlString, {}).render(jsDict["template_params"]).toString()
    }
    console.log("Rendered HTML: " + jsHtmlString);

    const tag_id = document.getElementById("embedded_browser");
    tag_id.innerHTML = Sk.ffi.remapToJs(jsHtmlString);
}

function fixURL(jsHtmlString){
    var el = document.createElement("html");
    el.innerHTML = jsHtmlString;

    const allLinkTags = el.getElementsByTagName("a");
    for (let i = 0; i < allLinkTags.length; i++) {
        let hrefValue = allLinkTags[i].getAttribute("href");
        allLinkTags[i].setAttribute("href", "#");

        const newAction = "renderPage('" + hrefValue + "')"; 
        allLinkTags[i].setAttribute("onclick", newAction);
    }
    return el.innerHTML;
}

var formIdToMethod = {}

function fixForms(jsHtmlString){
    var el = document.createElement("html");
    el.innerHTML = jsHtmlString;

    var all_forms = el.getElementsByTagName("form");
    function handleForm(event) { 
        event.preventDefault();
    }

    var idCounter = 8634;   // A very random counter for forms with no IDs.
    for (var i = 0; i < all_forms.length; i++) {
        if (all_forms[i].id == "codeForm") continue
        if (all_forms[i].id == "") {
        all_forms[i].id = String(idCounter);
        all_forms[i].setAttribute("id", all_forms[i].id);
        idCounter++;
        }

        var formMethod = all_forms[i].getAttribute("method")
        if (formMethod == "") formMethod = "GET"
        formIdToMethod[all_forms[i].id] = formMethod;
        all_forms[i].removeAttribute("method")

        all_forms[i].addEventListener('submit', handleForm);

        route = all_forms[i].getAttribute("action")
        const newAction = "return onFormSubmit('" + all_forms[i].id + "', '" + route + "')"; 
        all_forms[i].setAttribute("onsubmit", newAction);
        all_forms[i].setAttribute("action", "#");
    }

    return el.innerHTML;
}

function onFormSubmit(formID, url_requested) {
    var formData = {}
    var inputs = document.getElementById(formID);
    for (var i = inputs.length - 1; i >= 0; i--) {
        if (inputs[i].type == "submit")
            continue;
        formData[inputs[i].name] = inputs[i].value;
    }
    formMethod = formIdToMethod[formID];
    if (!formMethod){
        formMethod = "GET";
    }

    requestData = {
        "method": formMethod,
        "data": formData,
    }

    renderPage(url_requested, requestData)
}