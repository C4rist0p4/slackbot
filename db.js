const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({ region: 'eu-central-1' });

const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const docClient = new AWS.DynamoDB.DocumentClient();

exports.saveItem = (item, points, callback) => {
    const params = {
        TableName: 'todos',
        Item: {
            'item': {S: item } ,
            'points':{S:  points} 
        }
    };      
    ddb.putItem(params, (error, data) => {
        if (error) {
            callback(new Error(error));
        } else {
            callback(null);
        }
    });
};


exports.savePoints = (item, points, callback) => {
    const params = {
        TableName: 'points',
        Item: {
            'name': {S: item } ,
            'points':{S:  points} 
        }
    };      
    ddb.putItem(params, (error, data) => {
        if (error) {
            callback(new Error(error));
        } else {
            callback(null);
        }
    });
};

exports.getPoints = async (item, callback) => {
    var params = {
        TableName: 'points',
        Key:{ "name": item['name'],}
    };
    
    docClient.get(params, function(err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            callback(new Error(error));
        } else {
            callback(null, data);
        }
    });
};


exports.getPointsList = async (callback) => {
    const params = {
        TableName: 'points',
        Limit: 10
    };
    ddb.scan(params, (error, data) => {
        if (error) {
            callback(new Error(error));
        } else {
            callback(null, data);
        }
    });
};

exports.getItemTodos = async (item, callback) => {
    var params = {
        TableName: 'todos',
        Key:{
            "item": item['itemkey']
        }
    };
    docClient.get(params, function(err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            callback(null);
        } else {
            callback(null, data);
        }
    });
};

exports.getItmes = async (callback) => {
    const params = {
        TableName: 'todos',
        Limit: 10
    };
    ddb.scan(params, (error, data) => {
        if (error) {
            callback(new Error(error));
        } else {
            callback(null, data);
        }
    });
};


exports.deleteItem = (itme, callback) =>{
    var params = {
        TableName:'todos',
        Key:{
            'item': itme
        }
    };
    docClient.delete(params, (err, data) => {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
            callback(new Error(error));
        } else {
            callback(null, data);
        }
    });
};