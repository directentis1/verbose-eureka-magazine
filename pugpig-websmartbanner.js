/*jshint -W097,-W117,-W069,-W033,-W030,-W109,-W054,-W116 */

var gaAccount;
var ga4Account;
var additionalGAAccounts
var smartBannerConfig = {};
var dataLayer = [];
var ppVersion = '6.14.0';
var articleMetadata; // read from json-ld
var cookieName = 'kaldor-pugpig-visited';
var fromPublishSearch = document.referrer.indexOf('/search.html') !== -1;
var fromBoltSearch =  document.referrer.indexOf('/bolt_search.html') !== -1;
var fromSearch = fromPublishSearch || fromBoltSearch;

function xhrFetch(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback(null, JSON.parse(xhr.responseText))
            } else {
                callback(xhr.status, null);
            }
        }
    }
    xhr.open('GET', url, true);
    xhr.send(null);
}


function loadScripts(scripts) {
    var h = document.getElementsByTagName('head')[0];
    Object.keys(scripts).forEach(function(script) {
        var s = document.createElement("script");
        s.type = "text/javascript";
        s.id = script
        s.src = scripts[script];
        h.append(s);
    })
}

function startSmartBanner(fallback) {
    const endpoint = fallback ? '/config_banner_active.json' : '/config_banner_active_bolt.json'
    xhrFetch(endpoint, function(err, res) {
        if (err) {
            if(!fallback) return startSmartBanner(true)
            console.error(err);
            return;
        }
        smartBannerConfig = res;
        smartBanner = smartBannerConfig.smartBanner
        additionalGAAccounts = smartBannerConfig.smartBanner.additionalAnalyticsKeys

        var dimensionData = {
            'appName': smartBannerConfig.name,
            'appVersion': smartBannerConfig.version + ' (Web SmartBanner ' + ppVersion + ')'
        }

        if (typeof smartBannerConfig.googleAnalyticsUA !== 'undefined') {
            insertGAScript();
            gaAccount = smartBannerConfig.googleAnalyticsUA;

            // Set Base GA Configuration.
            window.ga('create', gaAccount, 'auto');
            window.ga('set', dimensionData);
        }

        if (typeof smartBannerConfig.googleAnalyticsMeasurementID !== 'undefined') {
            ga4Account = smartBannerConfig.googleAnalyticsMeasurementID
            insertGA4Script(ga4Account);
            // Set Base GA4 Configuration.
            window.gtag = function(){dataLayer.push(arguments);}
            window.gtag('js', new Date())
            window.gtag('config', ga4Account)
        }   

        // Push Name and Version info to GTM
        dataLayer.push(dimensionData);

        // We override auto_login_cookie if we want to only redirect if the user has LOGGED IN to either
        // the web or bolt reader, not simply just visited it. This is a good idea in particular for the hard
        // paywall. Make sure that the name of this cookie matches the cookie used by reader
        if (typeof smartBanner.auto_login_cookie !== 'undefined' && smartBanner.auto_login_cookie !== '') {
            cookieName = smartBanner.auto_login_cookie;
            // For backwards compat reasons, we want to unset any custom login cookie with the value of "true"
            // as previous versions of this file used to set it and kill a valid login token value
            if (docCookies.hasItem(cookieName, '/') && docCookies.getItem(cookieName, '/') === 'true') {
                docCookies.removeItem(cookieName, '/')
            }
        } 

        if(typeof smartBanner.customScripts !== 'undefined') {
          loadScripts(smartBanner.customScripts)
        }

        initSmartBanner();
    })
}

// https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie/Simple_document.cookie_framework
var docCookies={getItem:function(e){return e?decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*"+encodeURIComponent(e).replace(/[\-\.\+\*]/g,"\\$&")+"\\s*\\=\\s*([^;]*).*$)|^.*$"),"$1"))||null:null},setItem:function(e,n,o,t,c,r){if(!e||/^(?:expires|max\-age|path|domain|secure)$/i.test(e))return!1;var s="";if(o)switch(o.constructor){case Number:s=o===1/0?"; expires=Fri, 31 Dec 9999 23:59:59 GMT":"; max-age="+o;break;case String:s="; expires="+o;break;case Date:s="; expires="+o.toUTCString()}return document.cookie=encodeURIComponent(e)+"="+encodeURIComponent(n)+s+(c?"; domain="+c:"")+(t?"; path="+t:"")+(r?"; secure":""),!0},removeItem:function(e,n,o){return this.hasItem(e)?(document.cookie=encodeURIComponent(e)+"=; expires=Thu, 01 Jan 1970 00:00:00 GMT"+(o?"; domain="+o:"")+(n?"; path="+n:""),!0):!1},hasItem:function(e){return e?new RegExp("(?:^|;\\s*)"+encodeURIComponent(e).replace(/[\-\.\+\*]/g,"\\$&")+"\\s*\\=").test(document.cookie):!1},keys:function(){for(var e=document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g,"").split(/\s*(?:\=[^;]*)?;\s*/),n=e.length,o=0;n>o;o++)e[o]=decodeURIComponent(e[o]);return e}};

// Add ga script
var insertGAScript = function() {
    (function(i, s, o, g, r, a, m) {
        i['GoogleAnalyticsObject'] = r;
        i[r] = i[r] || function() {
            (i[r].q = i[r].q || []).push(arguments)
        }, i[r].l = 1 * new Date();
        a = s.createElement(o), m = s.getElementsByTagName(o)[0];
        a.async = 1;
        a.src = g;
        m.parentNode.insertBefore(a, m)
    })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
}

var insertGA4Script = function(id) {
    var script = document.createElement('script')
    script.async = 1
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id
    document.getElementsByTagName('head')[0].appendChild(script)
}

var insertGTM = function(key, url) {
    (function(w,d,s,l,i,u){
        w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl+u;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer', key, url);
}

// /Share/PageView/<edition-id>/<page-id>
var sendAnalyticsPageView = function() {
    if (typeof gaAccount !== 'undefined') {
        window.ga('send', 'screenview', { screenName: '/Share/PageView/' + articleMetadata.idEdition + '/' + articleMetadata.idArticle });
    }

    if(typeof ga4Account !== 'undefined') {
        window.gtag('event', 'screen_view', { screenName: '/Share/PageView/' + articleMetadata.idEdition + '/' + articleMetadata.idArticle })
    }
};

var sendAnalyticsEvent = function(action) {
    var label = window.location.href;
    if (typeof label !== 'undefined') label = label.split('?')[0];

    if (typeof gaAccount !== 'undefined') {
        window.ga('send', 'event', '/Share/PageView', action, label);
    }

    if (typeof ga4Account !== 'undefined') {
        window.gtag('event', action, { eventCategory: '/Share/PageView', eventLabel: label })
    }
};

var isBolt = function(){
    // Check bridges to resolve `publish` or `bolt`.
    if(typeof parent.pugpigBridgeService !== 'undefined') return true
    if(typeof ppCustomData !== 'undefined') return false

    // Fallback to checking check if platform is Bolt via config.
    if (Array.isArray(smartBannerConfig.smartBannerType))
        return (smartBannerConfig.smartBannerType[0] === 'bolt');
    else
        return (smartBannerConfig.smartBannerType === 'bolt');
}

var redirectWithMetadata = function(forceUrl) {
    var url = new URL(window.location.origin)
    var params = new URLSearchParams(window.location.search)
    params.delete('article')
    params.delete('edition')
    params.append('article', articleMetadata.idArticle)
    params.append('edition', articleMetadata.idEdition)
    url.hash = window.location.hash
    url.search = params.toString()
    window.location.href = forceUrl || url.toString()
}

var readerStart = function(e) {

    if (smartBannerConfig.hasLiveWebReader) {
        var isOnWeb = window.location.protocol.toLowerCase().search(/http(s)?/) !== -1;
        
        var isPreview = false;
        location.search.substr(1).split("&").forEach(function (item) {
            if (item.split("=")[0] == 'preview') isPreview = true;
        });

        if (isOnWeb && !isPreview) {
            if(!isBolt()) return redirectWithMetadata()
            const url = new URL(`/search/item/${articleMetadata.idEdition}/${articleMetadata.idArticle}.json`, window.location.href);
            xhrFetch(url, function(err, res) {
                if(err || res.stories.length <= 0) return;
                return redirectWithMetadata();
            })
        }
     } else {
         var buttonClass = 'KGPugpigSmartBanner-bootstrap-buttonRead'
         var buttonsInBanner = document.getElementsByClassName(buttonClass)
         if(buttonsInBanner.length >= 1) {
            var currentButton = (buttonsInBanner.length === 1) ? buttonsInBanner[0] : e.target
            if (buttonsInBanner.length === 1 || currentButton.className === buttonClass) {
                redirectForPlatform(currentButton.dataset.platform)
            }
        }
     }
}

var closePopup = function(ev) {
    ev.stopPropagation();
    var popup = document.getElementById('KGPugpigSmartBanner-bootstrap-popup');
    popup.classList.remove('KGPugpigSmartBanner-bootstrap-popup-isVisible');
    document.body.classList.remove('KGPugpigSmartBanner-body-popup');
};

// basic method to search json-ld objects by .type
var getJsonLdObject = function(jsonld, objType) {
    var obj, regexObjType = new RegExp(objType, 'i');
    jsonld['@graph'].forEach(function(o) {
        if (regexObjType.test(o.type)) {
            obj = o;
        }
    });
    return obj;
};

// read data from json-ld
var readArticleMetadata = function() {
    var jsonldScript = document.querySelector('head script[type="application/ld+json"]').innerHTML,
        jsonld = JSON.parse(jsonldScript),
        publication = getJsonLdObject(jsonld, 'Periodical'),
        edition = getJsonLdObject(jsonld, 'PublicationIssue'),
        article = getJsonLdObject(jsonld, 'Article');

    var getUrlFeed = function() {
        return window.location.protocol + '//' + window.location.host +
            document.querySelector('head link[rel="DCTERMS.isRequiredBy"]').getAttribute('href');
    };

    // if there's a theme.BrandLogo use it, if not og:image (article screenshot)
    var getBannerImage = function() {
        return (typeof smartBannerConfig.smartBanner !== 'undefined' && typeof smartBannerConfig.smartBanner.icon !== 'undefined') ?
            smartBannerConfig.smartBanner.icon :
            document.querySelector('head meta[property="og:image"]').getAttribute('content')
    }

    // global var use to send parameters to deep links, and style the smart banners
    articleMetadata = {
        feed: getUrlFeed(),
        idEdition: (edition && edition.editionId) ? edition.editionId : undefined,
        idArticle: (article && article.articleId) ? article.articleId : undefined,
        urlArticle: window.location.href,
        articleTitle: (article && article.headline) ? article.headline : undefined,
        editionTitle: (edition && edition.name) ? edition.name : undefined,
        publicationName: (publication && publication.name) ? publication.name : undefined,
        bannerImage: getBannerImage()
    };
};

// OS detection
var regex = {
    ios: /iPad|iPhone|iPod/i,
    android: /Android/i
};
var isMobileOs = function(platform) {
    return regex[platform].test(navigator.userAgent || navigator.vendor || window.opera);
};


// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
var tmpl = function(str, data) {
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn =
      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +

        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +

        // Convert the template into pure JavaScript
        str
          .replace(/[\r\t\n]/g, " ")
          .split("<%").join("\t")
          .replace(/((^|%>)[^\t]*)'/g, "$1\r")
          .replace(/\t=(.*?)%>/g, "',$1,'")
          .split("\t").join("');")
          .split("%>").join("p.push('")
          .split("\r").join("\\'") +
         "');}return p.join('');");

    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
};

function fetchCanonicalUrl() {
    var canonical = document.querySelector('head link[rel="canonical"]')
    return (canonical && canonical.href) ? canonical.href : undefined
}

// Redirect based on the detected or explicitly passed platform
var redirectForPlatform = function (explicitPlatform) {
    if (explicitPlatform === undefined) explicitPlatform = false
    var userAgent = window.navigator.userAgent.toLowerCase(),
        ios = /iphone|ipod|ipad/.test(userAgent) || explicitPlatform === 'ios',
        android = /android/.test(userAgent) || explicitPlatform === 'android',
        safari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    chrome = /chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

    var editionMeta = document.querySelector('meta[name="DCTERMS.isPartOf"]');
    var store = (typeof smartBannerConfig.smartBanner.store === 'undefined') ? 'gb' : smartBannerConfig.smartBanner.store

    // Browser dectection logic
    if ((ios && safari) && explicitPlatform !== 'android') {
        // redirection
        if (editionMeta !== null && editionMeta.getAttribute('content') !== undefined) {
            window.location.href = smartBannerConfig.smartBanner.appleBundleId + '://content?editionID=' + editionMeta.getAttribute('content').replace(/,\s*/, '&') + '&pageURL=' + window.location.href;
        }
        setTimeout(function () {
            window.location.href = 'https://itunes.apple.com/'+  store + '/app/id' + smartBannerConfig.smartBanner.appleAppId + '?mt=8';
        }, 25);

    } else if (android && explicitPlatform !== 'ios') {
        if (editionMeta !== null && editionMeta.getAttribute('content') !== undefined) {
            window.location.href = smartBannerConfig.smartBanner.googleAppId + '://content?editionID=' + editionMeta.getAttribute('content').replace(/,\s*/, '&');
        }
        setTimeout(function () {
            if (isMobileOs('android')) {
                window.location.href = 'market://details?id=' + smartBannerConfig.smartBanner.googleAppId;
            } else {
                window.location.href = 'https://play.google.com/store/apps/details?id=' + smartBannerConfig.smartBanner.googleAppId;
            }
        }, 25);
    } else {
        if (ios) {
            // redirection: iOS but not safari
            if (editionMeta !== null && editionMeta.getAttribute('content') !== undefined) {
                if (smartBannerConfig.hasOwnProperty('smartBannerType') && isBolt()) {
                    var locUrl = window.location.href;
                    window.location.href = smartBannerConfig.smartBanner.appleBundleId + '://' + locUrl.replace(/(^\w+:|^)\/\//, '');
                } else {
                     if (isMobileOs('ios')) {
                        window.location.href = smartBannerConfig.smartBanner.appleBundleId + '://content?editionID=' + editionMeta.getAttribute('content').replace(/,\s*/, '&') + '&pageURL=' + window.location.href;
                     } else {
                        window.location.href = 'https://itunes.apple.com/' + store + '/app/id' + smartBannerConfig.smartBanner.appleAppId + '?mt=8';
                     }
                }
            }
            setTimeout(function () {
                window.location.href = 'https://itunes.apple.com/'+  store + '/app/id' + smartBannerConfig.smartBanner.appleAppId + '?mt=8';
            }, 25);
        }
    }
}

var generateButtons = function() {
    var isAndroid = isMobileOs('android');
    var isIOS = isMobileOs('ios');
    var platform = (isIOS) ? 'ios' : (isAndroid) ? 'android' : 'Web';
    var buttons  = [{ label: 'View', platform: platform }];
    var config   = smartBannerConfig.smartBanner;
    var isNativeRedirect = true;
    
    if ((isAndroid && !config.googleAppId) || (isIOS && !config.appleAppId) || !isAndroid && !isIOS) {
        isNativeRedirect = false;
        if (!smartBannerConfig.hasLiveWebReader) {
            buttons = [];
            if(config.appleAppId) buttons.push({ label: 'iTunes', platform: 'ios' });
            if(config.googleAppId) buttons.push({ label: 'Google Play', platform: 'android' });
        }
    }

    return {
        generated: buttons,
        isEmpty: buttons.length <= 0,
        isNativeRedirect: isNativeRedirect
    }
}

/* Custom Smart Banner (Header and Footer) */
function startCustomBanners(markup) {
    if (markup.header) {
        var tmHeader = document.createElement('div')
        tmHeader.className = 'tm-smartbanner-header'
        tmHeader.innerHTML = markup.header
        document.body.prepend(tmHeader)
    }

    if (markup.footer) {
        var tmFooter = document.createElement('div')
        tmFooter.className = 'tm-smartbanner-footer'
        tmFooter.innerHTML = markup.footer
        document.body.appendChild(tmFooter)
    }

    if (markup.styles) {
        var tmStyle = document.createElement('style')
        tmStyle.setAttribute('type', 'text/css');
        tmStyle.innerText = markup.styles
        document.head.appendChild(tmStyle);
    }

    if (markup.header || markup.footer) {
        var links = document.querySelectorAll('.tm-smartbanner-header a, .tm-smartbanner-footer a')
        for (var i = 0; i < links.length; i++) {
            links[i].addEventListener('click', function () {
                sendAnalyticsEvent('WebSmartBanner' + 'Clicked');
            });
        }
    }

    if (!smartBannerConfig.smartBanner.display) {
        sendAnalyticsPageView();
    }
}

// Paint the PugpigSmartBanner
var showPugpigSmartBanner = function() {
    // Generate buttons.
    var buttons = generateButtons();
    if(buttons.isEmpty) return;

    // Send Analytics Event.
    var analyticsPlatform = 'WebSmartBanner';
    if(isMobileOs('ios') || isMobileOs('android')) analyticsPlatform = 'AppSmartBanner';
    sendAnalyticsEvent(analyticsPlatform + 'Viewed');

    // Style banner.
    var strCss = bannerStyle();
    var strHtml = bannerHtml(buttons.generated);
    var body = document.querySelector('body');
    var style = document.createElement('style');
    body.classList.add('KGPugpigSmartBanner-body-popup');
    style.setAttribute('id', 'KGPugpigSmartBanner-body-popup-style');
    style.setAttribute('type', 'text/css');
    document.body.insertBefore(style, document.body.firstChild);
    style.innerText = strCss;

    // Insert the popup at the start of <body>.
    var popup = document.createElement('div');
    var baseClass = 'KGPugpigSmartBanner-bootstrap-popup';
    popup.setAttribute('id', baseClass);
    if (buttons.generated.length > 1) popup.classList.add(baseClass + '-hasMultiple');
    popup.innerHTML = tmpl(strHtml, articleMetadata);

    // https://www.google.com/support/enterprise/static/gsa/docs/admin/70/gsa_doc_set/admin_crawl/preparing.html
    var googleoff = document.createComment('googleoff: all');
    var googleon = document.createComment('googleon: all');
    // There must be a space or newline before the googleon tag.
    var spaceBeforeGoogleOn = document.createTextNode('\u00A0');
    popup.insertBefore(googleoff, popup.firstChild);
    popup.appendChild(spaceBeforeGoogleOn);
    popup.appendChild(googleon);
    document.body.classList.add('KGPugpigSmartBanner-body-popup');
    document.body.insertBefore(popup, document.body.firstChild);

    // Setup event callbacks.
    var closeBtn = document.getElementById('KGPugpigSmartBanner-bootstrap-buttonClose')
    closeBtn.addEventListener('click', function (event) {
        sendAnalyticsEvent(analyticsPlatform + 'Dismissed');
        closePopup(event);
    });

    popup.addEventListener('click', function (event) {
        sendAnalyticsEvent(analyticsPlatform + 'Clicked');
        if (buttons.isNativeRedirect) {
            redirectForPlatform();
        } else {
            readerStart(event);
        }
    });

    window.setTimeout(function() {
        popup.classList.add('KGPugpigSmartBanner-bootstrap-popup-isVisible');
    }, 50);

    sendAnalyticsPageView();
};

var bannerHtml = function(buttons){
    // Append dynamic buttons
    var buttonMarkup = '';
    for(var i=0; i<buttons.length; i++) {
        var button = buttons[i];
        buttonMarkup += '<p class="KGPugpigSmartBanner-bootstrap-buttonRead" data-platform="' + button.platform + '">' + button.label + '</p>';
    }

    return '<div id="KGPugpigSmartBanner-bootstrap-popupContainer">' +
            buttonMarkup +
            '<figure id="KGPugpigSmartBanner-bootstrap-buttonClose"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEsAAABLCAYAAAA4TnrqAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAkdJREFUeNrs3OttwyAQAGBT9X89QkbICNmk7gYZKd2gI2SDdoR0g2yQguRIVYsdMPfmkCyrLiLmk41tOAi3223wVJaenMCxHIs7PTvBMIQQdnGXtiG24edqrFjAFHeHeyExfcWCjgah9nH3+evv71TvWNfLv8zpaZjbYrqmf//ZTkv5NW4x7RfqecjlX2uzXjLHXqP8ydAVdV6oJ1gDrx6sAGqEfBqqBSu8onbZoyv385S5l1W3YSttVFGdHhVuBqwV6iGWFTAIqCIs7WBQUMVYWsEgoaqwtIFBQ1VjaQHDgNqEJR0MC2ozllQwTKgmLGlg2FDNWFLAKKBAsLjBqKDAsLjAKKFAsajBqKHAsajAOKBQsLDBuKDQsLDAOKFQsaDBuKHQsaDAJECRYLWCSYEiw9oKJgmKFKsWTBoUOVYF2Ic0KBasCjB5fWWMvZmTJihWrI1grN3VrMFs8QRSCMBbYfb3mH/yyD8tyW9Db+D91aG7V4dCqLNEMMmfO/LGJYV/SIsC09BFI2cgV0nnnwgwTd3K/CPfygYsWME0DoXxhQooHWRlAdM8fE8fW6E8MIT0Ny2EHNFdzUaC2UjOwVKYJP6DxVgALuo5WQztxnvHMzppAOUcLU9Hgf/cMj7RCfSce5hCB9fz0cnkTJA69DTtt70TsrMJ5U11WivYFFQlWPWKIaKDNIiCUZoDQ9RCNYN1vnDP0i055vKvrZ91nJcZGedgWHNLQqUrLIRwR7vMWzp+zS7N4gskejCbYzmWYzlW9+lHgAEAdZrORPfPUe0AAAAASUVORK5CYII=" alt="Close Banner"></figure>'+
            '<div id="KGPugpigSmartBanner-bootstrap-bannerImage-wrapper">'+
                '<img id="KGPugpigSmartBanner-bootstrap-bannerImage" src="<%=bannerImage%>">'+
            '</div>'+
            '<div id="KGPugpigSmartBanner-bootstrap-metadata">'+
                '<span>'+
                    '<p id="KGPugpigSmartBanner-bootstrap-articleTitle"><%=articleTitle%></p>'+
                    '<p id="KGPugpigSmartBanner-bootstrap-editionTitle"><%=editionTitle%></p>'+
                    '<p id="KGPugpigSmartBanner-bootstrap-publication"><%=publicationName%></p>'+
                    '<p id="KGPugpigSmartBanner-bootstrap-info"></p>'+
                '</span>'+
            '</div>'+
        '</div>';
};

var bannerStyle = function(){

    return '.KGPugpigSmartBanner-body-popup {top:92px;transition:all 200ms ease;margin-top:92px;}'+
    '#KGPugpigSmartBanner-bootstrap-popup {background:#f6f6f6;top:-92px;cursor:pointer;position:fixed;z-index:1001;left:0;display:block;width:100%;height:92px;padding:10px 20px;border-bottom:1px solid #e6e6e6;box-sizing:border-box;font-family:sans-serif;text-decoration:none;transition:top 200ms ease;margin-top:0;overflow:hidden;}'+
    '#KGPugpigSmartBanner-bootstrap-popup.KGPugpigSmartBanner-bootstrap-popup-isVisible {top:0;}'+
    '#KGPugpigSmartBanner-bootstrap-popup.KGPugpigSmartBanner-bootstrap-popup-isVisible:hover {text-decoration:none;}'+
    '#KGPugpigSmartBanner-bootstrap-popupContainer {position:relative;max-width:768px;line-height:70px;height:70px;text-align:left;margin:0 auto;width: auto;}'+
    '#KGPugpigSmartBanner-bootstrap-buttonClose {z-index:10;line-height:0px;display:block;background-color:transparent;top:0px;width:30px;height:82px;border:0;color:#666666;font-family:sans-serif;text-align:center;font-size: 16px;position: absolute; margin: 0px;margin-top:-5px;}'+
    '#KGPugpigSmartBanner-bootstrap-buttonClose:before {display:none;}'+
    '#KGPugpigSmartBanner-bootstrap-buttonClose:after {display:none;}'+
    '#KGPugpigSmartBanner-bootstrap-buttonClose:hover {color:#016F94;}'+
    '#KGPugpigSmartBanner-bootstrap-buttonClose img {width: 10px;position:absolute;left:0px;top:50%;margin-top:-5px;}'+
    '@media only screen and (max-width: 600px) {#KGPugpigSmartBanner-bootstrap-buttonClose  {left: -4px;}}'+
    '#KGPugpigSmartBanner-bootstrap-bannerImage-wrapper {border: 1px solid #e6e6e6;width: 70px; height:70px; position: relative; overflow: hidden; border-radius: 10px; margin: 0px; float: left; margin-left: 30px;}'+
    '#KGPugpigSmartBanner-bootstrap-bannerImage {width:100%; vertical-align: middle; margin: 0px;}'+
    '#KGPugpigSmartBanner-bootstrap-metadata {width:440px;float:left; margin-left:20px;margin-top: 0px; text-align: left;}' +
    '.KGPugpigSmartBanner-bootstrap-popup-hasMultiple #KGPugpigSmartBanner-bootstrap-metadata {width:380px;}' +
    '#KGPugpigSmartBanner-bootstrap-metadata > span {vertical-align:middle;display:inline-block;}'+
    '#KGPugpigSmartBanner-bootstrap-popup #KGPugpigSmartBanner-bootstrap-articleTitle {white-space:nowrap;font-size:13px;font-weight:700;width: 100%}'+
    '#KGPugpigSmartBanner-bootstrap-metadata p {width:100%;letter-spacing:0;vertical-align:middle;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;font-family:helvetica, arial, sans-serif;margin:0;padding:0;line-height:1.4em;margin-bottom:2px;font-size:11px;color:#000000;}' +
    '#KGPugpigSmartBanner-bootstrap-metadata span{width: 100%;}' +
    'div p#KGPugpigSmartBanner-bootstrap-editionTitle {width: 100%}'+
    'div p#KGPugpigSmartBanner-bootstrap-publication {color:#666666;width: 100%}'+
    'div p#KGPugpigSmartBanner-bootstrap-info {color:#666666;width: 100%}'+
    '@media only screen and (max-width: 768px) { #KGPugpigSmartBanner-bootstrap-popup #KGPugpigSmartBanner-bootstrap-metadata {width:300px;} #KGPugpigSmartBanner-bootstrap-popup.KGPugpigSmartBanner-bootstrap-popup-hasMultiple #KGPugpigSmartBanner-bootstrap-metadata {width:240px;}}' +
    '@media only screen and (max-width: 640px) { #KGPugpigSmartBanner-bootstrap-popup #KGPugpigSmartBanner-bootstrap-metadata {width:220px;} #KGPugpigSmartBanner-bootstrap-popup.KGPugpigSmartBanner-bootstrap-popup-hasMultiple #KGPugpigSmartBanner-bootstrap-metadata {width:150px;}}' +
    '@media only screen and (max-width: 460px) { #KGPugpigSmartBanner-bootstrap-popup #KGPugpigSmartBanner-bootstrap-metadata {width:145px;} #KGPugpigSmartBanner-bootstrap-popup.KGPugpigSmartBanner-bootstrap-popup-hasMultiple #KGPugpigSmartBanner-bootstrap-metadata {width:90px;}}' +
    '@media only screen and (max-width: 374px) { #KGPugpigSmartBanner-bootstrap-popup #KGPugpigSmartBanner-bootstrap-metadata {width:120px;} #KGPugpigSmartBanner-bootstrap-popup.KGPugpigSmartBanner-bootstrap-popup-hasMultiple #KGPugpigSmartBanner-bootstrap-metadata {width:50px;}}' +
    '.KGPugpigSmartBanner-bootstrap-buttonRead {letter-spacing:0.01em;font-family:Helvetica, Arial, sans-serif;float:right;font-size:13px;font-weight:400;color:#016F94;line-height:26px;padding: 0px 20px;margin-top:22px;border:1px solid #016F94;border-radius:2px;margin-left:15px;}'+
    '.KGPugpigSmartBanner-bootstrap-buttonRead:active {border-color:#ccc;}' +
    '@media only screen and (max-width: 380px) {p.KGPugpigSmartBanner-bootstrap-buttonRead {font-size:12px;padding: 0 10px;}}' +
    '@media only screen and (max-width: 600px) {' +
        '.KGPugpigSmartBanner-body-popup{top:72px;margin-top:72px;}' +
        '#KGPugpigSmartBanner-bootstrap-popup{top:-72px;height:72px;}' +
        '#KGPugpigSmartBanner-bootstrap-popup{padding:10px;}' +
        '#KGPugpigSmartBanner-bootstrap-metadata{margin-left:10px;}' +
        '#KGPugpigSmartBanner-bootstrap-bannerImage-wrapper{width:50px;height:50px; margin-left:15px;}' +
        '#KGPugpigSmartBanner-bootstrap-metadata p{font-size:10px;line-height: 0.8rem;}' +
        '#KGPugpigSmartBanner-bootstrap-popupContainer{line-height:50px;height:50px;}' +
        '#KGPugpigSmartBanner-bootstrap-buttonClose{font-size:14px;left:0px;width: 30px;height:62px;}' +
        '#KGPugpigSmartBanner-bootstrap-buttonClose img {width: 8px;margin-top:-4px;}' +
        '#KGPugpigSmartBanner-bootstrap-popup #KGPugpigSmartBanner-bootstrap-articleTitle{font-size: 11px;margin-top:2px;}' +
        '.KGPugpigSmartBanner-bootstrap-buttonRead{margin-top:13px;line-height:25px;margin-right:0px;}' +
        '.KGPugpigSmartBanner-bootstrap-buttonRead:nth-child(2){margin-left: 0px;}' +
    '}';

}

// this should only run when not inside an iframe and not from search
var initSmartBanner = function() {
    if(typeof smartBannerConfig.smartBanner.redirect === 'undefined') {
         smartBannerConfig.smartBanner.redirect = true
    }

    if (window.self === window.top && !fromPublishSearch) {
        // a query param explicit to disable the banner (?nobanner) and we aren't displaying the content in bolt
        if (!/nobanner/i.test(window.location.search) && !/PugpigBolt/i.test(navigator.userAgent)) {
            // read state from json-ld
            readArticleMetadata();

            // Redirect using canonical url
            if(smartBannerConfig.smartBanner.useCanonicalUrl) {
                var canonicalUrl = fetchCanonicalUrl()
                if(canonicalUrl) redirectWithMetadata(canonicalUrl)
            }
            // explicitly configured to bypass the smartbanner
            else if (smartBannerConfig.smartBanner && smartBannerConfig.smartBanner.bypassSmartbanner) {
                readerStart();
            }
            // if the cookie is there, bootstrap the webreader
            else if (docCookies.hasItem(cookieName) && smartBannerConfig.smartBanner.redirect) {
                readerStart();
            }
            else {
                var showWebBanner = true;
                var showAppBanner = false;

                // there's a native smartbanner configured
                if (typeof smartBannerConfig.smartBanner !== 'undefined') {
                    // we're on iOS and there's an app configured
                    if (isMobileOs('ios') && typeof smartBannerConfig.smartBanner.appleAppId !== 'undefined') {
                        //inject meta tag
                        showWebBanner = false;
                        if (typeof smartBannerConfig.smartBanner.appleAppId !== 'undefined') {
                        if(document.querySelector('meta[name="apple-itunes-app"]') === null){
                            var isiPad = /iPad/.test(navigator.userAgent || navigator.vendor || window.opera),
                                appId = smartBannerConfig.smartBanner.appleAppId;
                            //We're on ipad and there is an ipad app
                            if(isiPad && smartBannerConfig.smartBanner.appleAppIdiPad !== undefined){
                                appId = smartBannerConfig.smartBanner.appleAppIdiPad;
                            //We're not on ipad and there is an iphone app
                            }else if(smartBannerConfig.smartBanner.appleAppIdiPhone !== undefined){
                                appId = smartBannerConfig.smartBanner.appleAppIdiPhone;
                            }

                            //Inject the app meta tag
                            var meta = document.createElement('meta');
                            meta.setAttribute('name', 'apple-itunes-app');
                            meta.setAttribute('content', 'app-id=' + appId + ', app-argument=' + window.location.href);
                            document.head.appendChild(meta);
                        }}

                        //If we are not on safari (browser or webview) show the App Banner
                        var isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
                        if(!isSafari || /CriOS/.test(navigator.userAgent) || /FxiOS/.test(navigator.userAgent) || /OPiOS/.test(navigator.userAgent)){
                            showAppBanner = true;
                        }

                    }
                    // we're on Android and there's an app configured
                    if (isMobileOs('android') && typeof smartBannerConfig.smartBanner.googleAppId !== 'undefined') {
                        showWebBanner = false;
                        showAppBanner = true;
                    }
                }
                
                var isSafari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/);

                if (isSafari && isMobileOs('ios') && typeof smartBannerConfig.smartBanner.appleAppId !== 'undefined') {
                    showWebBanner = false;
                }

                if (showWebBanner || showAppBanner) {
                    if(smartBannerConfig.smartBanner.display) {
                        showPugpigSmartBanner();
                    }
                }

                if (smartBannerConfig.smartBanner.custom_markup) {
                    startCustomBanners(smartBannerConfig.smartBanner.custom_markup);
                }

                if (typeof smartBannerConfig.smartBanner.gtm_settings !== 'undefined') {
                    var gtmKey = smartBannerConfig.smartBanner.gtm_settings.key
                    var gtmUrl = smartBannerConfig.smartBanner.gtm_settings.url || ''
                    insertGTM(gtmKey, gtmUrl)
                }
            }
        }
    }

    if (fromPublishSearch) {
        readArticleMetadata()
        var backbutton = document.createElement('div');
        var backbuttonSpacer = document.createElement('div');
        backbuttonSpacer.setAttribute("style", "width: 100%; height: 40px;");
        backbuttonSpacer.setAttribute("class", "KGPugpigSmartBanner-spacer");
        backbutton.innerHTML = "<button class='KGPugpigSmartBanner-body-back-btn' onclick='window.history.back()' style='position:fixed; top:0; height: 40px; width:100%; -webkit-appearance:none; text-align:center; font-size:14px; background-color:#ddd; border:0px; '><svg style='width: 24px;position:absolute;left:15px;top:8px;fill:#555;' x='0px' y='0px' viewBox='-322 443 75 75' style='enable-background:new -322 443 75 75;'' xml:space='preserve'><path d='M-301.1,480.6c0,0,28.9,28.8,29.1,28.9c0.2,0.2,2,1.3,3.4-0.1s0.4-2.8,0.2-3c-0.1-0.1-25.6-25.8-25.6-25.8  l25.4-25.4c0,0,1.7-1.8,0-3.5c-1.6-1.6-3.4-0.1-3.4-0.1L-301.1,480.6z'/></svg>" + articleMetadata.editionTitle + "</button>";
        var body = document.querySelector('body');
        body.insertBefore(backbuttonSpacer, body.firstChild);
        body.appendChild(backbutton);
    }
}

// START SMARTBANNER
startSmartBanner();

// START IMAGE HANDLING
// Arguably this should live somewhere else - it is the code that fixes images when offline
// Maybe it should be on every page, but technically it is nothing to do with the smart banner

var pugpigImages = {
  els: null,
  init: function() {
    this.cacheDom();
    this.bindEvents();
  },
  cacheDom: function() {
    this.els = document.getElementsByTagName('img');
  },
  bindEvents: function() {
    var self = this;
    for (var i = 0; i < this.els.length; i++) {
      var el = this.els[i];
      if(typeof el.naturalWidth !== 'undefined' && el.naturalWidth === 0 && el.getAttribute('loading') !== 'lazy') {
        this.handleImageError(el);
      }
    }
  },
  handleImageError: function(image) {
    var parent = image.parentElement;
    var placeholder = document.createElement('div');
    placeholder.className = image.className + ' pp-no-image';
    parent.insertBefore(placeholder, image);
    if(parent.tagName === 'FIGURE') {
      parent.classList.remove('pp-media--thumbnail')
      parent.classList.add('pp-media-error')
    }
  }      
}

if(isBolt()) {
    window.addEventListener('load', function () {
        pugpigImages.init()
    })
}

// END IMAGE HANDLING