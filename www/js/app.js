// Global variables
var active;
var router;
var sessionID;
var responseForms;
var formMessages;
var backButtons;
var lang = 'en';
var request = superagent;
var requestHeaders = {
    'Accept': 'application/json'
}

var onDocumentLoad = function(e) {
    var routes = {
        '/:cardID': navigateToCard
    }

    router = Router(routes);
    router.init([COPY.content.initial_card]);

    var againLink = document.getElementsByClassName('submit-again-link')[0];
    againLink.addEventListener('click', startProcessOver);

    listenResponseFormSubmit();
}

var startProcessOver = function(e) {
    e.preventDefault();

    lscache.remove('sessionID');

    for (var i = 0; i < responseForms.length; ++i) {
        var responseForm = responseForms[i];
        responseForm.reset();
        responseForm.className = 'user-info';
        var formMessage = formMessages[i];
        formMessage.className += ' message-hidden';
    }

    navigateToCard('water-meter');
}

var navigateToCard = function(cardID) {
    document.body.scrollTop = 0;
    var nextCard = document.getElementById(cardID);
    if (nextCard) {
        if (active) {
            active.classList.remove('active');
        }
        nextCard.classList.add('active');
        active = nextCard;

        backButtons = document.getElementsByClassName('back');
        listenBackButtonClick();

        responseForms = document.getElementsByClassName('user-info');
        formMessages = document.getElementsByClassName('submit-message');

        if (nextCard.querySelector('form.user-info')) {
            makeSessionID();
        }

        ANALYTICS.trackEvent('navigate', cardID);
    } else {
        console.error('Route "' + cardID + '" does not exist');
    }
    if (!APP_CONFIG.DEBUG) {
        router.setRoute('');
    }
}

var listenBackButtonClick = function() {
    for (var i = 0; i < backButtons.length; ++i) {
        var backButton = backButtons[i];
        backButton.addEventListener('click', onBackButtonClick);
    }
}


var onBackButtonClick = function(e) {
    e.preventDefault();
    window.history.go(-1);
}


var makeSessionID = function() {
    var storedID = lscache.get('sessionID');
    if (!storedID || storedID === 'undefined') {
        request
            .get(APP_CONFIG.LEADPIPES_API_BASEURL + '/uuid')
            .set(requestHeaders)
            .end(handleSessionRequest);
    }
}

var handleSessionRequest = function(err, res) {
    if (err || !res.ok) {
        console.error('ajax error', err, res);
    } else {
        lscache.set('sessionID', res.body, APP_CONFIG.LEADPIPES_SESSION_TTL);
        sessionID = res.body;
    }
}

var listenResponseFormSubmit = function() {
    for (var i = 0; i < responseForms.length; ++i) {
        var responseForm = responseForms[i];
        responseForm.addEventListener('submit', onSubmitResponseForm);
    }
}

var onSubmitResponseForm = function(e, data) {
    e.preventDefault();
    var data = serialize(e.target);
    data.sessionid = lscache.get('sessionID');
    request
        .post(APP_CONFIG.LEADPIPES_API_BASEURL + '/form')
        .send(data)
        .set(requestHeaders)
        .set('Content-Type', 'application/json')
        .end(handleSubmitResponse);

}

var handleSubmitResponse = function(err, res) {
    for (var i = 0; i < responseForms.length; ++i) {
        var responseForm = responseForms[i];
        responseForm.className += ' form-hidden';
        var formMessage = formMessages[i];
        formMessage.className = 'submit-message';
    }
    // Reset ttl
    lscache.set('sessionID', sessionID, APP_CONFIG.LEADPIPES_SESSION_TTL);
}

document.addEventListener('DOMContentLoaded', onDocumentLoad);
