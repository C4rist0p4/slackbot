const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({ region: 'eu-central-1' });

const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

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
}


exports.deleteItem = (itme, callback) =>{

    var docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
        TableName:'todos',
        Key:{
            'item': itme,
        }
    };
    docClient.delete(params, (err, data) => {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
            callback(new Error(error));
        } else {
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            callback(null, data);
        }
    });
} 