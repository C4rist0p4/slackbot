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
            case "app_home_opened": welcomeMessage(body, callback); break;
            default: callback(null);
        }
    };

const welcomeMessage = (body, callback) => {
    let blocks = [{
        type: 'modal',
        title: {
          type: 'plain_text',
          text: 'Create a stickie note'
        },
        submit: {
          type: 'plain_text',
          text: 'Create'
        },
        blocks: [
          // Text input
          {
            "type": "input",
            "block_id": "note01",
            "label": {
              "type": "plain_text",
              "text": "Note"
            },
            "element": {
              "action_id": "content",
              "type": "plain_text_input",
              "placeholder": {
                "type": "plain_text",
                "text": "Take a note... "
              },
              "multiline": true
            }
          },
          
          // Drop-down menu      
          {
            "type": "input",
            "block_id": "note02",
            "label": {
              "type": "plain_text",
              "text": "Color",
            },
            "element": {
              "type": "static_select",
              "action_id": "color",
              "options": [
                {
                  "text": {
                    "type": "plain_text",
                    "text": "yellow"
                  },
                  "value": "yellow"
                },
                {
                  "text": {
                    "type": "plain_text",
                    "text": "blue"
                  },
                  "value": "blue"
                }
              ]
            }
          }
        ]
      }];

    const message = {
        channel: body.event.channel,
        view: blocks
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
};

const processAppMention = (body, callback) => {

    let text = body.event.text.split("/").pop().trim();
    text = text.toLowerCase();

    if(text.slice(0,9) == "get todos") {
        getTodos(body, callback);
    } else if(text.slice(0,10) == "add todos:") {
        saveItem(body, callback);
    } else if(text.slice(0,6) == "thanks") {
        setPoints(body, callback);
    } else if(text.slice(0,11) == "show points") {
        showPointsList(body, callback);
    } else if(text.slice(0,4) == "help") {
        showhelp(body, callback);
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
};

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
};


const setPoints = (body, callback) => {

    let words = body.event.text.split('/thanks');
    words = words[1].split('for:');

    objson = JSON.parse('{"itemkey": "", "name": "", "points": ""}');
    objson["itemkey"] = words[1].replace(/\s/g, '');
    objson["name"] = words[0].replace(/\s/g, '');
     
    getItemFromTodos(objson, getPointsFromList);

    const message = {
        channel: body.event.channel,
        text: `\`${objson["name"]}\` get points.`
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
};

const getItemFromTodos = (objson, callback) => {
    db.getItemTodos(objson, (error, result) => {
        if (error !== null) {
            callback(error);
        } else {
            let jsonStr = JSON.stringify(result); 
            let jdata = JSON.parse(jsonStr);

            objson["points"] = jdata["Item"]["points"];
            
            callback(objson, setPointsList);
        }
    });
};

const getPointsFromList = (objson, callback) => { 
    db.getPoints(objson, (error, result) => {
        let jsonStr = JSON.stringify(result); 
        let jdata = JSON.parse(jsonStr);
       
        if (Object.keys(jdata).length == 0) {
            callback(objson, deleteItem);
        } else {
            let num = parseInt(objson["points"]) + parseInt(jdata["Item"]["points"])
            objson["points"] = num.toString();

            callback(objson, deleteItem);
        }
    });
};

const setPointsList = (jdata, callback) => {
    db.savePoints(jdata["name"], jdata["points"], (error, result) => { 
        if (error !== null) {
            callback(error);
        } else {
            callback(jdata ,null);
        }
    });  
};

const showPointsList = (body, callback) => {
    db.getPointsList((error, result) => {
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
                        "text": `${result.Items[i].name.S}  Punkte: ${result.Items[i].points.S}` ,
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
};

const deleteItem = (jdata, callback) => {
    db.deleteItem(jdata["itemkey"], (error, result) => {
        if (error !== null) {
            callback(error);
        } 
    });
};

const showhelp = (body, callback) => {
       
    let blocks = [{
        "type": "image",
        "title": {
          "type": "plain_text",
          "text": "Please enjoy the photo of the help"
        },
        "block_id": "image4",
        "image_url": "http://placekitten.com/500/500",
        "alt_text": "An incredibly help"
    } ]
    
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
};