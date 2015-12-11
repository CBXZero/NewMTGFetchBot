var Slack = require('slack-client');
var tutor = require('tutor');
var $ = require('jquery');

var config = require('./config');

var token = config.api.token;

var slack = new Slack(token, true, true);

var last_card:any;

function getCard(text: string) : string {
    if (text == undefined || text == null) {
        return null;
    }
    var message = text;

    var original_string_pos = message.indexOf("{{");
    if (original_string_pos != -1) {
        var start_pos = message.indexOf("{{") + 2;
        var end_pos = message.indexOf("}}", start_pos);
        var text_to_get = message.substring(start_pos, end_pos);

        if (text_to_get) {
            return text_to_get;
        } else {
            return null;
        }
    }
}

function getChannels(channels: any) : any[] {
    return Object.keys(slack.channels).map(function (k) {
        return slack.channels[k];
    }).filter(function (c) {
        return c.is_member;
    }).map(function (c) {
        return c.name;
    });
}

function getGroups(groups: any) : any[] {
    return Object.keys(slack.groups).map(function (k) {
        return slack.groups[k];
    }).filter(function (g) {
        return g.is_open && !g.is_archived;
    }).map(function (g) {
        return g.name
    });
}

function handleNoCommand(message:any, channel:any) : void {
    var cardText = getCard(message.text);
    if (cardText != "" && cardText != undefined) {
        try {
            tutor.card({ name: cardText }, function (err, card) {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log(last_card);
                last_card = card;
                channel.send(card.image_url);
            });
        } catch (e) {
            console.log("Couldn't find " + cardText);
        }
    }
}

function checkCommand(message:string) : boolean {
    return message.toLowerCase().indexOf("mtgfetchbot") > -1;
}

function checkHelpCommand(message: string): boolean {
    return message.toLowerCase().indexOf("help") > -1
}

function checkCMCCommand(message: string): boolean {
    return message.toLowerCase().indexOf("cmc") > -1 || message.toLowerCase().indexOf("converted cana cost") > -1
}

function validateMessage(message:any, channelType:string): boolean {
    return message.type === 'message' && message.text != undefined && message.text != null && channelType != "general"
}

function handleHelpCommand(channel:any): void {
    channel.send("I currently support the commands for the last card fetched: cmc, converted mana cost, ruling, rulings, legal, and legality");
}

function checkRulingCommand(message:string): boolean {
    return message.toLowerCase().indexOf("ruling") > -1 || message.toLowerCase().indexOf("rulings") > -1
}

function handleCMCCommand(channel: any): void {
    return channel.send("CMC of " + last_card.name + " is " + last_card.converted_mana_cost);
}

function checkLegalityCommand(message:string): boolean {
    return message.toLowerCase().indexOf("legal") > -1 || message.toLowerCase().indexOf("legality") > -1
}

function handleRulings(channel: any) {
    if (last_card.rulings.length > 0) {
        channel.send("Rulings for " + last_card.name + " are...");
        var tempString: string = "";
        for (var i = 0; i < last_card.rulings.length; i++) {
            if (tempString == "") {
                tempString = i + ". " + last_card.rulings[i];
            } else {
                tempString = tempString + "\n" + i + ". " + last_card.rulings[i];
            }

        }
        channel.send(tempString);
    } else {
        channel.send("No rulings for " + last_card.name);
    }
}

function handleLegalityCommand(channel:any) {
    var formats: string[];
    var legality: string[];

    for (var key in last_card.legality) {
        formats.push(key);
        legality.push(last_card.legality[key]);
    }
    console.log(formats);
    console.log(legality);

    if (formats.length > 0) {
        channel.send("The card " + last_card.name + " is legal in the following formats: ");
        var tempString: string;
        for (var i = 0; i < formats.length; i++) {
            if (legality[i] == "Legal") {
                if (tempString == "") {
                    tempString = formats[i];
                } else {
                    tempString = tempString + ", " + formats[i];
                }
            }
        }
        channel.send(tempString);
    }
}

function handleMessage(message:any, channel:any) {

    if (validateMessage) {
        handleNoCommand(message, channel.name);
    } else {
        if (checkCommand(message.text)) {

            if (checkHelpCommand(message.text)) {
                handleHelpCommand(channel);
            }

            if (last_card != null && last_card != undefined && last_card != "") {

                // Converted Mana Cost
                if (checkCMCCommand(message.text)) {
                    handleCMCCommand(channel);
                }

                // Rulings
                if (checkRulingCommand(message.text)) {
                    handleRulings(channel);
                }

                // legality
                if (checkLegalityCommand(message.text)) {
                    handleLegalityCommand(channel);
                }
            }
        }
    }
};

slack.on('open', function () {
    var channels = getChannels(slack.channels);

    var groups = getGroups(slack.groups);

    console.log("Welcome to Slack.");

    if (channels.length > 0) {
        console.log("You are in: " + channels.join(", "));
    } else {
        console.log("You are not in any channels");
    }

    if (groups.length > 0) {
        console.log("As well as: " + groups.join(", "));
    }
});

slack.on("message", function (message:any) {
    var channel:any = slack.getChannelGroupOrDMByID(message.channel);

    handleMessage(message, channel)
});

slack.login();
