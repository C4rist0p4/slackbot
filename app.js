const axios = require('axios');
const security = require('./security');

const db = require('./db');

const signingSecret = process.env.SLACK_SIGNING_SECRET;
const token = process.env.SLACK_BOT_TOKEN;

exports.handler = (event, context, callback) => {
        if (security.validateSlackRequest(event, signingSecret)) {
            const body = JSON.parse(event.body);
            switch (body.type) {
                case "url_verification": callback(null, body.challenge); break;
                case "event_callback": processRequest(body, callback); break;
                default: callback(null);
            }
        }
        else callback("verification failed");
    };
    
const processRequest = (body, callback) => {
        switch (body.event.type) { 
            case "app_mention": processAppMention(body, callback); break;
            case "app_home_opened'": welcomeMessage(body, callback); break; //Todo: test welecome Function 
            default: callback(null);
        }
    };

const welcomeMessage = (body, callback) => {
    console.debug("welcome Message", "okay");
    let blocks = [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Welcome to your _App's Home_* :tada:"
            }
          },
          {
            "type": "divider"
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "This button won't do much for now."
            }
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "Click me!"
                }
              }
            ]
          }
        
        ];

        const message = {
            channel: body.event.channel,
            blocks: blocks
            };
      
    

    axios({
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': `Bearer ${token}` },
        blocks: message
    }).then((response) => { 
        callback(null);
    }).catch((error) => {
        callback("failed to process app_mention");
    }); 
}

const processAppMention = (body, callback) => {

    let text = body.event.text.split("/").pop().trim();
    text = text.toLowerCase();

    if(text.slice(0,9) == "get todos") {
        getTodos(body, callback);
    } else if(text.slice(0,10) == "add todos:") {
        saveItem(body, callback);
    } else if(text.slice(0,12) == "delete todo:") {
        deleteItem(body, callback);
    };     
};

const getTodos = (body, callback) => {
    db.getItmes((error, result) => {
        if (error !== null) {
            callback(error);
        } else {
       
        let blocks = [];

        for (let i = 0; i < result.Items.length; i++) {
            blocks.push({
                "type": "context",
                "elements": [
                    {
                        "type": "plain_text",
                        "text": `Aufagbe: ${result.Items[i].item.S}  Punkte: ${result.Items[i].points.S}` ,
                        "emoji": true
                    }
                ]
            })
        }
        
        const message = {
        channel: body.event.channel,
        blocks: blocks
        };

        axios({
            method: 'post',
            url: 'https://slack.com/api/chat.postMessage',
            headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': `Bearer ${token}` },
            data: message
        }).then((response) => { 
            callback(null);
        }).catch((error) => {
            callback("failed to process app_mention");
        }); 
        }
    });
}

const saveItem = (body, callback) => {
    
    let words = body.event.text.split('p:');
    let points = words[1];
    let item = words[0].split(':').pop().trim();
    
    db.saveItem(item, points, (error, result) => {
        if (error !== null) {
            callback(error);
        } else {
            const message = {
                channel: body.event.channel,
                text: `\`${item}\` and \`${points}\` points are saved to *Todo list*!`
            };
            axios({
                method: 'post',
                url: 'https://slack.com/api/chat.postMessage',
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': `Bearer ${token}` },
                data: message
            })
            .then((response) => {
                    callback(null);
                })
                .catch((error) => {
                    callback("failed to process app_mention");
                });
        }
    });

}

const deleteItem = (body, callback) => {
    let item = body.event.text.split(':').pop().trim();
    db.deleteItem(item, (error, result) => {
        if (error !== null) {
            callback(error);
        } else {
            const message = {
                channel: body.event.channel,
                text: `Item \`${item}\` deleted from *Todo list*!`
            };
            axios({
                method: 'post',
                url: 'https://slack.com/api/chat.postMessage',
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': `Bearer ${token}` },
                data: message
            })
            .then((response) => {
                    callback(null);
                })
                .catch((error) => {
                    callback("failed to process app_mention");
                });
        }
    });

}