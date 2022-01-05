const axios = require('axios');
const security = require('./security');
const db = require('./db');

const signingSecret = process.env.SLACK_SIGNING_SECRET;
const token = process.env.SLACK_BOT_TOKEN;

const rewardsData = {"Kaffee": 1, "Tee": 2, "Pizza": 3}

exports.handler = (event, context, callback) => {
        if (security.validateSlackRequest(event, signingSecret)) {
            const body = JSON.parse(event.body);
            console.log("body", body);
            console.log("body.type", body.type);
            switch (body.type) {
                case "url_verification": callback(null, body.challenge); break;
                case "event_callback": processRequest(body, callback); break;
                default: callback(null);
            }
        }
        else callback("verification failed");
    };
    
const processRequest = (body, callback) => {
    console.log("processRequest", body);
        switch (body.event.type) { 
            case "app_mention": processAppMention(body, callback); break;
            case "app_home_opened": welcomeMessage(body, callback); break;
            default: callback(null);
        }
    };

    const processAppMention = (body, callback) => {

        let text = body.event.text.split("/").pop().trim();
        text = text.toLowerCase();
    
        if(text.slice(0,4) == "task") {
            getTodos(body, callback);
        }else if(text.slice(0,10) == "add todos:") {
            saveItem(body, callback);
        }else if(text.slice(0,6) == "thanks") {
            setPoints(body, callback);
        }else if(text.slice(0,7) == "ranking") {
            showPointsList(body, callback);
        }else if(text.slice(0,4) == "help") {
            showhelp(body, callback);
        }else if(text.slice(0,7) == "rewards") {
            getRewards(body, callback);
        }else if(text.slice(0,3) == "buy") {
            buyReward(body, callback);
        }else if(text.slice(0,5) == "goals") {
            showGoals(body, callback);
        }else if(text.slice(0,6) == "points") {
            getPoints(body, callback);
        }else if(text.slice(0,5) == "rules") {
            getRules(body, callback);
        }
    };

const welcomeMessage = (body, callback) => {
    let block = [{
        "type": "header",
        "text": {
            "type": "plain_text",
            "text": "Add Todos to List",
            "emoji": true
        }
    },
    {
        "type": "input",
        "element": {
            "type": "plain_text_input",
            "action_id": "plain_text_input-action"
        },
        "label": {
            "type": "plain_text",
            "text": "Todo",
            "emoji": true
        }
    },
    {
        "type": "input",
        "element": {
            "type": "plain_text_input",
            "action_id": "plain_text_input-action"
        },
        "label": {
            "type": "plain_text",
            "text": "Ponis",
            "emoji": true
        }
    },
    {
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "Add todo to list",
                    "emoji": true
                },
                "value": "click_add_todo",
                "action_id": "actionId-0"
            }
        ]
    },
    {
        "type": "divider"
    }
    ];

    const message = {
        "user_id": body.event.user,
        view: {
            type:"home",
            blocks: block
        }
    };
      
    axios({
        method: 'post',
        url: 'https://slack.com/api/views.publish',
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': `Bearer ${token}` },
        data: message
    }).then((response) => { 
        callback(null);
    }).catch((error) => {
        callback("failed to process app_mention");
    }); 
};

const getRewards = (body, callback) => {   
    let blocks = [];
    for (const key in rewardsData) {
        blocks.push({
            "type": "context",
            "elements": [
                {
                    "type": "plain_text",
                    "text": `Reward: ${key}  Punkte: ${rewardsData[key]}` ,
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
                        "text": `Task: ${result.Items[i].item.S}  Points: ${result.Items[i].points.S}` ,
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
    
    let words = body.event.text.split('points:');
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
    objson["name"] = words[0].replace(/\s*\@*\<*\>*/g, '');

    getItemFromTodos(objson, getPointsFromList);

    const message = {
        channel: body.event.channel,
        text: `\`<@${objson["name"]}>\` get points.`
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
        if (result == {}) {
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

const buyReward = (body, callback) => { 
    let words = body.event.text.split('/buy');
    let objson = JSON.parse('{"name": ""}');
    let answer = "Nicht genug Punkte :(";
    objson["name"] = body.event.user;
    objson["reward"] = words[1].replace(/\s/g, '');

   db.getPoints(objson, (error, result) => {
        let jsonStr = result;
        let newPoints = parseInt(jsonStr["Item"]["points"]) - parseInt(rewardsData[objson["reward"]]);
        if (newPoints >= 0) {
            db.savePoints(objson["name"], newPoints.toString(), (error, result) => { 
                if (error !== null) {
                    callback(error);
                } else {
                    callback(null);
                }
            });  
            answer = `${objson["reward"]} gekauft!!` 
        } 
            
        const message = {
            channel: body.event.channel,
            text: answer
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


const getRules = (body, callback) => {
    const message = {
        channel: body.event.channel,
        text: `Rules description :)`
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

const getPoints = (body, callback) => {
    let objson = JSON.parse('{"name": ""}');
    objson["name"] = body.event.user;
    db.getPoints(objson, (error, result) => {
        if (error !== null) {
            callback(error);
        } else {
            let num = parseInt(result.Item.points);
            const message = {
                channel: body.event.channel,
                text: `You have ${num} Ponits!`
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
    })
};

const showPointsList = (body, callback) => {
    db.getPointsList((error, result) => {
        if (error !== null) {
            callback(error);
        } else {
       
        let blocks = [];
       
        result.Items.sort(function (a, b) {
            return b.points.S.localeCompare(a.points.S);
        });

        for (let i = 0; i < result.Items.length; i++) {
            blocks.push({
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `<@${result.Items[i].name.S}>  Punkte: ${result.Items[i].points.S}` 
                }
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
    let blocks = [
        {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":white_check_mark:  */goals* \t\t\t See company goals"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":page_with_curl: */task*  \t\t\t   The current karma task list"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":trophy: */ranking* \t\t  Current leaderboard of persons"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":chart_with_upwards_trend: */points* \t\t\t Your toatal collected karma points"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":gift: */rewards* \t\t  Rewards that can be purchased with the karma points"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":speech_balloon: */rules* \t\t\t   Informations, how to be get karma points"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":innocent: */help* \t\t\t\tOverview of bot-commands"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":clap: */thanks* \t\t\tExampel: /thanks *@Username* for: *Taskname*"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":muscle: */add todos:* \t  Add a Task to the list. \n\t\t\t\t\t\t\t\t Exampel: /add todos: *Taskename* points: *Number of Points*"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":credit_card: */buy* \t\t\t     Buying some Rewards. Exampel: /buy *Reward Name*"
			}
		}
    ]
    
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

const showGoals = (body, callback) => {  
    let blocks = [
        {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "You're looking forward to your morning coffee at the office, but notice that the coffee machines haven't been cleaned in weeks?😐 You're looking forward to a coffee in the office and then notice that it smells like rotten banana everywhere because the trash can hasn't been emptied?😶 You don't have much time for an upcoming meeting and are annoyed that all your colleagues are there 10 minutes later?🤐 "
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "To solve these annoying but easily avoidable problems, there's our Karma Slack app! 🎯🔥  "
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Karma: You can earn Karma points for completing pre-set Karma tasks. Each team can create its own tasks. But what is Karma good for? The principle behind it is this: 'Do good and good will come to you.' 🍀 \nYou can also get Karma points by communicating kindly and productively with your colleagues, which triggers our bot. "
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Rewards: With us, however, you'll definitely get something back if you've accumulated a lot of karma points, because you can buy great rewards (like a free coffee) with your current karma score.🎁 "
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Team-Work: By completing the Karma-tasks you have more fun at work, you spur each other on, support each other and thereby the cohesion with your colleagues increases.💪🤝 "
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "Constant optimization: By documenting completed Karma tasks, you can always see what is going well at work and where there is still potential for optimization.🤓📈"
			}
		}
    ]
    
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